import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { createWavBlob, base64ToUint8Array, extractPcmFromData } from '../lib/audio';
import { CHUNK_LIMIT, MAX_CHARS, PACE_INSTRUCTIONS } from '../lib/constants';
import { generateScenePrompts, generateImageFromPrompt } from '../lib/gemini';
import { saveProject, saveAudioToProject, saveImageToProject, Project, AudioSource, ProjectImage } from '../lib/db';
import { getGeminiApiKey } from '../lib/env';
import { calculateDurationFromWav } from '../features/video-render/lib/videoUtils';

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

/**
 * Mapeia erros técnicos do Gemini para mensagens amigáveis em pt-BR (UX-2).
 */
function toUserFriendlyError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }

  const msg = err.message.toLowerCase();

  if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('429')) {
    return 'Limite de uso atingido. Aguarde alguns minutos e tente novamente.';
  }
  if (msg.includes('api key') || msg.includes('key not valid') || msg.includes('permission_denied')) {
    return 'Erro de autenticação. Verifique sua chave de API nas configurações.';
  }
  if (msg.includes('deadline_exceeded') || msg.includes('504')) {
    return 'O servidor demorou demais para responder. Tente um roteiro menor ou aguarde.';
  }
  if (msg.includes('unavailable') || msg.includes('503')) {
    return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
  }
  if (msg.includes('safety') || msg.includes('blocked')) {
    return 'Conteúdo bloqueado por filtros de segurança. Altere o roteiro e tente novamente.';
  }
  if (msg.includes('contexto') && msg.includes('longo')) {
    return 'O roteiro é muito longo para o modelo atual. Reduza o texto ou divida em partes.';
  }

  // Mensagem genérica sem expor detalhes técnicos
  return 'Não foi possível concluir a geração. Verifique o roteiro e tente novamente.';
}

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
  const [scenes, setScenes] = useState<{ imageUrl: string; timestamp: number }[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);

  // Memoiza instância do GoogleGenAI (tech #9 + bp #8 + perf #9)
  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  const lastSuccessfulStateRef = useRef<{
    audioUrl: string | null;
    audioBlob: Blob | null;
    scenes: { imageUrl: string; timestamp: number }[];
  }>({
    audioUrl: null,
    audioBlob: null,
    scenes: [],
  });

  // Cleanup object URL para evitar memory leaks (tech #6 parcial)
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const loadProjectData = (url: string, scenesData: { imageUrl: string; timestamp: number }[], audioBlobData?: Blob, id?: string) => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(url);
    if (audioBlobData) setAudioBlob(audioBlobData);
    setScenes(scenesData);
    if (id) setProjectId(id);
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const restoreLastSuccessfulState = () => {
    setAudioUrl(lastSuccessfulStateRef.current.audioUrl);
    setAudioBlob(lastSuccessfulStateRef.current.audioBlob);
    setScenes(lastSuccessfulStateRef.current.scenes);
  };

  const generateAudio = async (options: GenerateOptions, onStart?: () => void) => {
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

    const previousState = { audioUrl, audioBlob, scenes };
    lastSuccessfulStateRef.current = previousState;
    setAudioUrl(null);
    setAudioBlob(null);
    setScenes([]);

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
          console.warn('Erro na divisão via LLM, usando fallback programático', e);
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
        let retries = 0;
        const MAX_RETRIES = 3;

        while (retries < MAX_RETRIES && !base64Audio) {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
          try {
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

            const response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-tts-preview',
              contents: [{ parts: [{ text: finalPrompt }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig,
              },
            });

            base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;

            if (!base64Audio) {
              throw new Error('O modelo retornou texto em vez de áudio (comportamento intermitente conhecido).');
            }
          } catch (chunkErr: unknown) {
            retries++;
            console.warn(`Tentativa ${retries} falhou para a parte ${i + 1}:`, chunkErr);
            if (retries >= MAX_RETRIES) {
              throw new Error(
                `Falha ao gerar a parte ${i + 1} após ${MAX_RETRIES} tentativas.`,
                { cause: chunkErr },
              );
            }
            setStatusText(`Falha na parte ${i + 1}, tentando novamente (${retries}/${MAX_RETRIES})...`);
            await new Promise(r => setTimeout(r, 1500));
          }
        }

        if (base64Audio) {
          const rawData = await base64ToUint8Array(base64Audio);
          const pcmData = extractPcmFromData(rawData);
          pcmChunks.push(pcmData);
          totalLength += pcmData.length;
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
      setAudioBlob(wavBlob);
      setAudioUrl(url);

      // --- Auto-save áudio (UX-5: feedback em caso de falha) ---
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
        await saveAudioToProject(audioSource, userId);
      } catch (saveError) {
        console.warn('Erro no auto-save do áudio:', saveError);
        setError('O áudio foi gerado, mas houve um erro ao salvar na nuvem. Tente salvar manualmente.');
        setTimeout(() => setError(''), 8000);
      }

      // --- Geração de cenas visuais ---
      if (generateScenes) {
        setStatusText('Criando roteiro visual...');
        setGenerationProgress(75);
        const durationInSeconds = totalLength / 48000;
        const style = `${scene} ${styleNotes}`.trim();

        const prompts = await generateScenePrompts(script, durationInSeconds, style, sceneDensity, visualFramework);
        updateProgress(0.5);

        const generatedScenes: { imageUrl: string; timestamp: number }[] = [];
        const scenesToGenerate = prompts.length;
        const stepPerScene = 4 / scenesToGenerate;

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
              console.warn('Erro no auto-save da imagem:', imageSaveErr);
            }
          }
          updateProgress(stepPerScene * 0.8);
        }

        setScenes(generatedScenes);
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: generatedScenes,
        };
      } else {
        lastSuccessfulStateRef.current = {
          audioUrl: url,
          audioBlob: wavBlob,
          scenes: [],
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

      console.error('Error generating audio:', err);
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
  };

  // Duração do áudio em segundos, derivada do blob WAV (24 kHz, mono, 16-bit)
  const durationInSeconds = useMemo(() => {
    if (!audioBlob || audioBlob.size <= 44) return 0;
    return calculateDurationFromWav(audioBlob.size, 24000);
  }, [audioBlob]);

  return {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    projectId,
    error,
    setError,
    generateAudio,
    handleCancel,
    loadProjectData,
    durationInSeconds,
  };
}
