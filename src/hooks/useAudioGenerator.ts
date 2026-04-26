import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { createWavBlob, base64ToUint8Array, extractPcmFromData } from '../lib/audio';
import { CHUNK_LIMIT, MAX_CHARS, PACE_INSTRUCTIONS } from '../lib/constants';
import { generateScenePrompts, generateImageFromPrompt, type ScenePromptResult } from '../lib/gemini';
import { saveProject, saveAudioToProject, saveImageToProject, Project, AudioSource, ProjectImage } from '../lib/db';
import type { AudioSegment } from '../lib/db/types';
import { saveAudioSegments } from '../lib/db/audio-segments';
import { getGeminiApiKey } from '../lib/env';
import { calculateDurationFromWav } from '../features/video-render/lib/videoUtils';
import { withRetry } from '../lib/rate-limiter';
import { detectSceneBoundaries } from '../lib/audio-analysis';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';

const log = createLogger('useAudioGenerator');

// ---------------------------------------------------------------------------
// Utilitários extraídos do handler (bp #13)
// ---------------------------------------------------------------------------

/**
 * Divide um texto em pedaços de no máximo `limit` caracteres,
 * respeitando quebras de frase (. ! ? \n) quando possível.
 */
function splitTextProgrammatically(text: string, limit: number): string[] {
  const result: string[] = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      if (current) { result.push(current.trim()); current = ''; }
      let remaining = sentence;
      while (remaining.length > 0) {
        result.push(remaining.slice(0, limit).trim());
        remaining = remaining.slice(limit);
      }
    } else if (current.length + sentence.length > limit) {
      if (current) result.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence.trim();
    }
  }

  if (current) result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// Mapeamento de erros amigáveis
// ---------------------------------------------------------------------------

const toUserFriendlyError = createErrorMapper({
  nonErrorMessage: 'Ocorreu um erro inesperado. Tente novamente.',
  defaultMessage: 'Não foi possível concluir a geração. Verifique o roteiro e tente novamente.',
  rules: [
    ...sharedErrorRules,
    {
      match: (m) => m.includes('deadline_exceeded') || m.includes('504'),
      message: 'O servidor demorou demais para responder. Tente um roteiro menor ou aguarde.',
    },
    {
      match: (m) => m.includes('safety') || m.includes('blocked'),
      message: 'Conteúdo bloqueado por filtros de segurança. Altere o roteiro e tente novamente.',
    },
    {
      match: (m) => m.includes('context') && m.includes('long'),
      message: 'O roteiro é muito longo para o modelo atual. Reduza o texto ou divida em partes.',
    },
  ],
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface GenerateOptions {
  userId?: string;
  projectName?: string;
  script: string;
  isMultiSpeaker?: boolean;
  selectedVoice: string;
  speakerAName?: string;
  speakerBVoice?: string;
  speakerBName?: string;
  audioProfile: string;
  scene: string;
  pace: string;
  styleNotes: string;
  generateScenes?: boolean;
  sceneDensity?: number;
  sceneRatio?: '16:9' | '9:16' | '1:1';
  visualFramework?: string;
  referenceImage?: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [scenes, setScenes] = useState<{ imageUrl: string; timestamp: number }[]>([]);
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sceneGenerationWarning, setSceneGenerationWarning] = useState<string | null>(null);

  const cancelRef = useRef(false);

  // Refs espelhadas para evitar stale closure em generateAudio (deps [])
  // Mantém valores sempre atualizados independentemente do closure do useCallback
  const audioUrlRef = useRef<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const scenesRef = useRef<{ imageUrl: string; timestamp: number }[]>([]);
  const audioSegmentsRef = useRef<AudioSegment[]>([]);

  // Wrappers que sincronizam ref + state — usados dentro de generateAudio
  const updateAudioUrl = useCallback((url: string | null) => {
    audioUrlRef.current = url;
    setAudioUrl(url);
  }, []);
  const updateAudioBlob = useCallback((blob: Blob | null) => {
    audioBlobRef.current = blob;
    setAudioBlob(blob);
  }, []);
  const updateScenes = useCallback((s: { imageUrl: string; timestamp: number }[]) => {
    scenesRef.current = s;
    setScenes(s);
  }, []);
  const updateAudioSegments = useCallback((s: AudioSegment[]) => {
    audioSegmentsRef.current = s;
    setAudioSegments(s);
  }, []);

  // Memoiza instância do GoogleGenAI (tech #9 + bp #8 + perf #9)
  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  const lastSuccessfulStateRef = useRef<{
    audioUrl: string | null;
    audioBlob: Blob | null;
    scenes: { imageUrl: string; timestamp: number }[];
    audioSegments: AudioSegment[];
  }>({
    audioUrl: null,
    audioBlob: null,
    scenes: [],
    audioSegments: [],
  });

  // Cleanup object URL para evitar memory leaks (tech #6 parcial)
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // loadProjectData usa useCallback com dep em audioUrl — quando audioUrl muda
  // (nova geração), o callback é recriado para revogar o blob URL antigo corretamente.
  const loadProjectData = useCallback(async (
    url: string,
    scenesData: { imageUrl: string; timestamp: number }[],
    audioBlobData?: Blob,
    id?: string,
  ) => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(url);
    setScenes(scenesData);
    if (id) setProjectId(id);

    // Reseta duração via URL ao carregar novo projeto
    setAudioDuration(0);

    if (audioBlobData) {
      setAudioBlob(audioBlobData);
    } else if (url) {
      if (url.startsWith('blob:')) {
        // Blob URL: fetch para obter blob (sem problema de CORS)
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          setAudioBlob(blob);
        } catch (err) {
          log.warn('Falha ao buscar blob do áudio', { error: err });
        }
      } else {
        // URL externa (ex: Firebase Storage): usa <audio> para obter
        // a duração via loadedmetadata, sem baixar o arquivo inteiro
        const audio = new Audio();
        const handleLoaded = () => {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
          }
          audio.removeEventListener('loadedmetadata', handleLoaded);
          audio.removeEventListener('error', handleError);
        };
        const handleError = () => {
          log.warn('Falha ao carregar metadados do áudio pela URL');
          audio.removeEventListener('loadedmetadata', handleLoaded);
          audio.removeEventListener('error', handleError);
        };
        audio.addEventListener('loadedmetadata', handleLoaded);
        audio.addEventListener('error', handleError);
        audio.preload = 'metadata';
        audio.src = url;
      }
    }
  }, [audioUrl]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const restoreLastSuccessfulState = () => {
    updateAudioUrl(lastSuccessfulStateRef.current.audioUrl);
    updateAudioBlob(lastSuccessfulStateRef.current.audioBlob);
    updateScenes(lastSuccessfulStateRef.current.scenes);
    updateAudioSegments(lastSuccessfulStateRef.current.audioSegments);
  };

  // generateAudio usa useCallback com deps [] — acessa refs internas (cancelRef,
  // lastSuccessfulStateRef) e setters (estáveis) diretamente. A instância `ai`
  // já é useMemo (estável). As opções de config são recebidas por parâmetro.
  const generateAudio = useCallback(async (options: GenerateOptions, onStart?: () => void) => {
    const {
      userId,
      projectName,
      script,
      selectedVoice,
      audioProfile,
      scene,
      pace,
      styleNotes,
      generateScenes,
      isMultiSpeaker,
      speakerAName,
      speakerBVoice,
      speakerBName,
      sceneDensity = 15,
      sceneRatio = '16:9',
      visualFramework = 'general',
      referenceImage,
    } = options;

    if (!script.trim()) {
      setError('Por favor, insira um roteiro antes de gerar o áudio.');
      return;
    }

    if (script.length > MAX_CHARS) {
      setError(`O roteiro excede o limite de ${MAX_CHARS} caracteres. Por favor, divida o texto.`);
      return;
    }

    cancelRef.current = false;
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    setSceneGenerationWarning(null);
    setStatusText('Iniciando...');

    // Cria Project ID antecipadamente
    const currentProjectId = crypto.randomUUID();
    setProjectId(currentProjectId);

    // Inicializa projeto no DB
    const projectMetadata: Project = {
      id: currentProjectId,
      userId,
      name: projectName || `Projeto - ${new Date().toLocaleDateString()}`,
      script,
      createdAt: Date.now(),
      settings: {
        selectedVoice,
        pace,
        styleNotes,
        isMultiSpeaker: !!isMultiSpeaker,
        speakerAName: speakerAName || '',
        speakerBName: speakerBName || '',
        speakerBVoice: speakerBVoice || '',
        audioProfile,
        scene,
        sceneDensity,
        sceneRatio,
        visualFramework,
      },
    };

    await saveProject(projectMetadata, userId);

    if (onStart) onStart();

    // Captura estado anterior via refs (evita stale closure — generateAudio usa deps [])
    const previousState = {
      audioUrl: audioUrlRef.current,
      audioBlob: audioBlobRef.current,
      scenes: scenesRef.current,
      audioSegments: audioSegmentsRef.current,
    };
    lastSuccessfulStateRef.current = previousState;
    updateAudioUrl(null);
    updateAudioBlob(null);
    setAudioDuration(0);
    updateScenes([]);
    updateAudioSegments([]);

    let generatedAudioUrl: string | null = null;

    try {
      let chunks: string[] = [];

      // --- Divisão do roteiro em chunks ---
      if (script.length <= CHUNK_LIMIT) {
        chunks = [script];
      } else {
        setStatusText('Analisando e dividindo o roteiro longo...');
        try {
          const chunkingResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: [{
              role: 'user',
              parts: [{ text: `Divida o seguinte roteiro em partes sequenciais. É CRÍTICO que cada parte tenha no MÁXIMO ${CHUNK_LIMIT} caracteres. Faça as quebras em pausas lógicas (pontos finais, fim de parágrafo). NÃO altere, adicione ou remova nenhuma palavra do texto original, apenas divida-o.\n\nRoteiro:\n${script}` }],
            }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          });

          let chunkText = chunkingResponse.text;
          if (chunkText) {
            chunkText = chunkText.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(chunkText);
            if (!Array.isArray(parsed)) throw new Error('Resposta não é um array');

            for (const c of parsed) {
              if (c.length > CHUNK_LIMIT) {
                chunks.push(...splitTextProgrammatically(c, CHUNK_LIMIT));
              } else {
                chunks.push(c);
              }
            }
          } else {
            throw new Error('Resposta vazia do modelo de divisão.');
          }
        } catch (e) {
          log.warn('Erro na divisão via LLM, usando fallback programático', { error: e });
          chunks = splitTextProgrammatically(script, CHUNK_LIMIT);
        }
      }

      chunks = chunks.filter(c => c.trim().length > 0);

      let currentStep = 0;
      const totalAudioSteps = chunks.length;
      const totalSceneSteps = generateScenes ? 5 : 0;
      const totalSteps = totalAudioSteps + totalSceneSteps + 1;

      const updateProgress = (stepIncrement = 1) => {
        currentStep += stepIncrement;
        const percent = Math.min(Math.round((currentStep / totalSteps) * 100), 99);
        setGenerationProgress(percent);
      };

      const pcmChunks: Uint8Array[] = [];
      const generatedSegments: AudioSegment[] = [];
      let totalLength = 0;

      const paceNote = PACE_INSTRUCTIONS[pace];
      const combinedNotes = [styleNotes, paceNote].filter(Boolean).join('\n* ');

      // --- Geração TTS ---
      for (let i = 0; i < chunks.length; i++) {
        if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
        setStatusText(`Gerando áudio (parte ${i + 1} de ${chunks.length})...`);
        updateProgress(0.2);

        const chunk = chunks[i];

        const continuityContext = i > 0
          ? `[CRÍTICO] TAKES CONTÍNUOS: Você está renderizando a parte ${i + 1} de um único roteiro. MANTENHA estritamente o mesmo tom, humor, energia, velocidade e volume da parte anterior. Evite entonações de início ou fim de frase onde não houver pontuação.`
          : '';

        const multiCtx = isMultiSpeaker
          ? `## MÚLTIPLOS LOCUTORES\nAtenção: a transcrição é um diálogo. Fale o texto de "${speakerAName}" com a Voz A e o texto de "${speakerBName}" com a Voz B.`
          : '';

        const finalPrompt = [
          'Gere a fala para a seguinte transcrição, interpretando a persona e as notas de direção fornecidas. NÃO leia o perfil, a cena ou as notas em voz alta. APENAS fale a transcrição.',
          continuityContext,
          multiCtx,
          audioProfile ? `# PERFIL DE ÁUDIO: ${audioProfile}` : '',
          scene ? `## A CENA: ${scene}` : '',
          combinedNotes ? `### NOTAS DE DIREÇÃO\n* ${combinedNotes}` : '',
          `#### TRANSCRIÇÃO\n${chunk}`,
        ].filter(Boolean).join('\n\n');

        let base64Audio: string | null = null;

        try {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');

          const speechConfig = isMultiSpeaker ? {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speakerAName || 'Speaker1',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
                },
                {
                  speaker: speakerBName || 'Speaker2',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: speakerBVoice || 'Puck' } },
                },
              ],
            },
          } : {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          };

          const { value: response } = await withRetry(
            async () => {
              const ttsResponse = await ai.models.generateContent({
                model: 'gemini-3.1-flash-tts-preview',
                contents: [{ parts: [{ text: finalPrompt }] }],
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig,
                },
              });
              const data = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
              if (!data) {
                throw new Error('O modelo retornou texto em vez de áudio (comportamento intermitente conhecido).');
              }
              return data;
            },
            { maxRetries: 3, baseDelayMs: 1500, jitterMs: 500 },
          );

          base64Audio = response;
        } catch (chunkErr: unknown) {
          log.warn(`Falha ao gerar a parte ${i + 1} após retries`, { error: chunkErr });
          throw new Error(
            `Falha ao gerar a parte ${i + 1} após múltiplas tentativas.`,
            { cause: chunkErr },
          );
        }

        if (base64Audio) {
          const rawData = await base64ToUint8Array(base64Audio);
          const pcmData = extractPcmFromData(rawData);
          pcmChunks.push(pcmData);
          totalLength += pcmData.length;

          // Mapeia o texto do chunk para o timing real no áudio final
          // PCM 24kHz 16-bit mono = 48.000 bytes por segundo
          const chunkDurationSec = pcmData.length / 48000;
          const chunkStartSec = pcmChunks
            .slice(0, i)
            .reduce((sum, prevPcm) => sum + prevPcm.length / 48000, 0);
          const chunkEndSec = chunkStartSec + chunkDurationSec;

          generatedSegments.push({
            text: chunk,
            startSec: chunkStartSec,
            endSec: chunkEndSec,
            chunkIndex: i,
          });

          updateProgress(0.8);
        }
      }

      // --- Montagem WAV ---
      setStatusText('Montando áudio final...');
      updateProgress(0.5);

      const combinedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const pcm of pcmChunks) {
        combinedPcm.set(pcm, offset);
        offset += pcm.length;
      }

      const wavBlob = createWavBlob(combinedPcm, 24000);
      const url = URL.createObjectURL(wavBlob);
      generatedAudioUrl = url;
      updateAudioBlob(wavBlob);
      updateAudioUrl(url);
      updateAudioSegments(generatedSegments);

      // --- Auto-save áudio (UX-5: feedback em caso de falha) ---
      let savedAudioId: string | null = null;
      try {
        setStatusText('Salvando áudio na nuvem...');
        const audioSource: AudioSource = {
          id: crypto.randomUUID(),
          projectId: currentProjectId,
          userId,
          audioUrl: '',
          audioBlob: wavBlob,
          createdAt: Date.now(),
        };
        savedAudioId = audioSource.id;
        await saveAudioToProject(audioSource, userId);

        // Persiste segmentos APÓS salvar a AudioSource (GAP-001: key mismatch corrigido)
        void saveAudioSegments(currentProjectId, savedAudioId, generatedSegments, userId).catch((err: unknown) => {
          log.warn('Erro ao salvar segmentos de áudio', { error: err });
        });
      } catch (saveError) {
        log.warn('Erro no auto-save do áudio', { error: saveError });
        setError('O áudio foi gerado, mas houve um erro ao salvar na nuvem. Tente salvar manualmente.');
        setTimeout(() => setError(''), 8000);
      }

      // --- Geração de cenas visuais ---
      if (generateScenes) {
        setStatusText('Criando roteiro visual...');
        setGenerationProgress(75);
        const durationInSeconds = totalLength / 48000;
        const style = `${scene} ${styleNotes}`.trim();

        const result: ScenePromptResult = await generateScenePrompts(script, durationInSeconds, style, sceneDensity, visualFramework);

        // Avisa o usuário quando o Gemini falhou e usou fallback genérico
        if (result.isFallback) {
          setSceneGenerationWarning('Não foi possível gerar o roteiro visual automaticamente. As cenas usarão prompts genéricos — a qualidade visual será reduzida.');
        }

        const prompts = result.prompts;
        updateProgress(0.5);

        const generatedScenes: { imageUrl: string; timestamp: number }[] = [];
        const scenesToGenerate = prompts.length;
        const stepPerScene = 4 / scenesToGenerate;
        let failedSceneCount = 0;

        for (let i = 0; i < prompts.length; i++) {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
          setStatusText(`Pintando cena ${i + 1} de ${prompts.length}...`);
          updateProgress(stepPerScene * 0.2);

          const imageUrl = await generateImageFromPrompt(prompts[i].prompt, sceneRatio, referenceImage || undefined);
          if (imageUrl) {
            generatedScenes.push({
              imageUrl,
              timestamp: prompts[i].timestamp,
            });

            try {
              const res = await fetch(imageUrl);
              const blob = await res.blob();
              const projectImage: ProjectImage = {
                id: crypto.randomUUID(),
                projectId: currentProjectId,
                userId,
                imageUrl: '',
                imageBlob: blob,
                prompt: prompts[i].prompt,
                timestamp: prompts[i].timestamp,
                createdAt: Date.now(),
              };
              await saveImageToProject(projectImage, userId);
            } catch (imageSaveErr) {
              log.warn('Erro no auto-save da imagem', { error: imageSaveErr });
            }
          } else {
            failedSceneCount++;
          }
          updateProgress(stepPerScene * 0.8);
        }

        // Notifica o usuário se houve falhas na geracao de cenas
        if (failedSceneCount > 0 && failedSceneCount < scenesToGenerate) {
          const warning = `${generatedScenes.length} de ${scenesToGenerate} cenas geradas com sucesso. ${failedSceneCount} cena(s) falharam apos tentativas de retry.`;
          setSceneGenerationWarning(warning);
        } else if (failedSceneCount === scenesToGenerate) {
          const warning = 'Nenhuma cena foi gerada. Todas falharam apos tentativas de retry. Verifique sua conexao ou tente novamente.';
          setSceneGenerationWarning(warning);
        }

        // --- Refinamento de timestamps via detecção de silêncio ---
        // Se o número de cenas geradas for próximo do detectado no áudio,
        // substitui os timestamps estimados do Gemini por timestamps reais
        if (generatedScenes.length > 0) {
          try {
            const detectedBoundaries = await detectSceneBoundaries(wavBlob, prompts.length);

            if (detectedBoundaries.length >= generatedScenes.length) {
              for (let i = 0; i < generatedScenes.length; i++) {
                generatedScenes[i].timestamp = detectedBoundaries[i];
              }
            }
          } catch (err) {
            log.warn('Falha na detecção de silêncio, mantendo timestamps do Gemini', { error: err });
          }
        }

        updateScenes(generatedScenes);
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: generatedScenes,
          audioSegments: generatedSegments,
        };
      } else {
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: [],
          audioSegments: generatedSegments,
        };
      }

      if (previousState.audioUrl && previousState.audioUrl.startsWith('blob:') && previousState.audioUrl !== url) {
        URL.revokeObjectURL(previousState.audioUrl);
      }

      setGenerationProgress(100);
    } catch (err: unknown) {
      const errorMessageText = err instanceof Error ? err.message : '';

      if (errorMessageText === 'Geração cancelada pelo usuário.') {
        if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(generatedAudioUrl);
        }
        restoreLastSuccessfulState();
        setIsGenerating(false);
        setStatusText('');
        return;
      }

      log.error('Erro ao gerar áudio', { error: err });
      const errorMessage = toUserFriendlyError(err);

      if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      restoreLastSuccessfulState();
      setError(errorMessage);
      setTimeout(() => setError(''), 8000);
    } finally {
      setIsGenerating(false);
      setStatusText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Duração do áudio em segundos: prioriza blob WAV (tamanho exato),
  // fallback para duração via metadados de URL (carregamento da galeria)
  const durationInSeconds = useMemo(() => {
    if (audioBlob && audioBlob.size > 44) {
      return calculateDurationFromWav(audioBlob.size, 24000);
    }
    return audioDuration;
  }, [audioBlob, audioDuration]);

  return {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    audioSegments,
    projectId,
    error,
    setError,
    sceneGenerationWarning,
    generateAudio,
    handleCancel,
    loadProjectData,
    durationInSeconds,
  };
}
