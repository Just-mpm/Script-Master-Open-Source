import { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { base64ToBlobSync } from '../lib/audio';
import { MAX_CHARS } from '../lib/constants';
import type { EmotionType } from '../features/studio/types';
import { generateScenePrompts, generateImageFromPrompt, type ScenePromptResult } from '../lib/gemini';
import { saveProject, saveAudioToProject, saveImageToProject, Project, AudioSource, ProjectImage } from '../lib/db';
import type { Locale } from '../features/i18n/types';
import type { AudioSegment } from '../lib/db/types';
import { saveAudioSegments } from '../lib/db/audio-segments';
import { detectSceneBoundaries } from '../lib/audio-analysis';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useAudioGeneratorStore, getAudioDurationSeconds } from '../features/studio/store';
import type { SceneItem } from '../features/studio/store';

const log = createLogger('useAudioGenerator');

// ---------------------------------------------------------------------------
// Mapeamento de erros amigáveis
// ---------------------------------------------------------------------------

const toUserFriendlyError = createErrorMapper({
  nonErrorMessage: 'Ocorreu um erro inesperado. Tente novamente.',
  defaultMessage: 'Não foi possível concluir a geração. Verifique o roteiro e tente novamente.',
  rules: [
    ...sharedErrorRules,
    {
      match: (m) => m.includes('app-check') || m.includes('AppCheck') || m.includes('permission-denied'),
      message: 'Erro de segurança da sessão. Recarregue a página e tente novamente.',
    },
    {
      match: (m) => m.includes('deadline_exceeded') || m.includes('504'),
      message: 'O servidor demorou demais para responder. Tente um roteiro menor ou aguarde.',
    },
    {
      match: (m) => m.includes('safety') || m.includes('blocked'),
      message: 'Conteúdo bloqueado por filtros de segurança. Altere o roteiro e tente novamente.',
    },
    {
      match: (m) => m.includes('saldo') || m.includes('crédito'),
      message: 'Créditos insuficientes. Seu saldo será renovado no início do próximo mês.',
    },
  ],
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Input para o flow audio no backend */
interface AudioFlowInput {
  script: string;
  voiceConfig: {
    voiceId: string;
    pace?: string;
    emotion?: string;
    emotionIntensity?: number;
  };
  isMultiSpeaker?: boolean;
  multiSpeakerConfig?: {
    speakerAName?: string;
    speakerBName?: string;
    speakerBVoice?: string;
  };
  audioProfile?: string;
  scene?: string;
  styleNotes?: string;
  requestId: string;
}

interface AudioFlowOutput {
  audioBase64: string;
  mimeType: string;
  durationInSeconds: number;
  chunks: number;
}

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
  emotion?: EmotionType;
  emotionIntensity?: number;
  locale?: Locale;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook de geração de áudio TTS com Gemini.
 *
 * O estado é gerenciado pelo `useAudioGeneratorStore` (Zustand global),
 * permitindo que App.tsx e VideoPage.tsx compartilhem o mesmo áudio/cenas
 * sem instanciar estados isolados.
 *
 * O hook retém apenas:
 * - Refs de cancelamento e restauração (escopo da geração, não compartilhados)
 * - Chamadas ao backend Genkit via httpsCallable
 * - Funções de geração (generateAudio, handleCancel)
 */
export function useAudioGenerator() {
  // Seletores primitivos — cada um re-renderiza apenas quando seu campo muda
  const isGenerating = useAudioGeneratorStore((s) => s.isGenerating);
  const statusText = useAudioGeneratorStore((s) => s.statusText);
  const generationProgress = useAudioGeneratorStore((s) => s.generationProgress);
  const audioUrl = useAudioGeneratorStore((s) => s.audioUrl);
  const audioBlob = useAudioGeneratorStore((s) => s.audioBlob);
  const scenes = useAudioGeneratorStore((s) => s.scenes);
  const audioSegments = useAudioGeneratorStore((s) => s.audioSegments);
  const projectId = useAudioGeneratorStore((s) => s.projectId);
  const error = useAudioGeneratorStore((s) => s.error);
  const setError = useAudioGeneratorStore((s) => s.setError);
  const sceneGenerationWarning = useAudioGeneratorStore((s) => s.sceneGenerationWarning);
  const loadProjectData = useAudioGeneratorStore((s) => s.loadProjectData);
  const audioDuration = useAudioGeneratorStore((s) => s.audioDuration);

  // Flag de créditos esgotados — persiste até nova geração com sucesso
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  // Refs para cancelamento e restauração (escopo da geração, não compartilhados)
  const cancelRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessfulStateRef = useRef<{
    audioUrl: string | null;
    audioBlob: Blob | null;
    scenes: SceneItem[];
    audioSegments: AudioSegment[];
  }>({
    audioUrl: null,
    audioBlob: null,
    scenes: [],
    audioSegments: [],
  });

  // Limpa timer de auto-dismiss do erro quando o hook desmonta
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const restoreLastSuccessfulState = () => {
    const prev = lastSuccessfulStateRef.current;
    useAudioGeneratorStore.getState().setAudioUrl(prev.audioUrl);
    useAudioGeneratorStore.getState().setAudioBlob(prev.audioBlob);
    useAudioGeneratorStore.getState().setScenes(prev.scenes);
    useAudioGeneratorStore.getState().setAudioSegments(prev.audioSegments);
  };

  // generateAudio usa useCallback com deps [] — acessa tudo via
  // useAudioGeneratorStore.getState() (setters estáveis) e refs internas.
  // As opções de config são recebidas por parâmetro.
  const generateAudio = useCallback(async (options: GenerateOptions, onStart?: () => void) => {
    const storeApi = useAudioGeneratorStore;
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
      emotion = 'neutral',
      emotionIntensity = 0.5,
      locale = 'pt-BR',
    } = options;

    if (!script.trim()) {
      storeApi.getState().setError('Por favor, insira um roteiro antes de gerar o áudio.');
      return;
    }

    if (script.length > MAX_CHARS) {
      storeApi.getState().setError(`O roteiro excede o limite de ${MAX_CHARS} caracteres. Por favor, divida o texto.`);
      return;
    }

    cancelRef.current = false;
    setCreditsExhausted(false);
    storeApi.getState().setIsGenerating(true);
    storeApi.getState().setGenerationProgress(0);
    storeApi.getState().setError(null);
    storeApi.getState().setSceneGenerationWarning(null);
    storeApi.getState().setStatusText('Iniciando...');

    // Cria Project ID antecipadamente
    const currentProjectId = crypto.randomUUID();
    storeApi.getState().setProjectId(currentProjectId);

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
        emotion,
        emotionIntensity,
      },
    };

    await saveProject(projectMetadata, userId);

    if (onStart) onStart();

    // Captura estado anterior via store (evita stale closure)
    const { audioUrl: prevAudioUrl, audioBlob: prevAudioBlob, scenes: prevScenes, audioSegments: prevSegments } = storeApi.getState();
    const previousState = { audioUrl: prevAudioUrl, audioBlob: prevAudioBlob, scenes: prevScenes, audioSegments: prevSegments };
    lastSuccessfulStateRef.current = previousState;
    storeApi.getState().setAudioUrl(null);
    storeApi.getState().setAudioBlob(null);
    storeApi.getState().setAudioDuration(0);
    storeApi.getState().setScenes([]);
    storeApi.getState().setAudioSegments([]);

    let generatedAudioUrl: string | null = null;

    try {
      // ------------------------------------------------------------------
      // 1. Geração de áudio via backend (Genkit flow)
      // ------------------------------------------------------------------
      if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');

      storeApi.getState().setStatusText('Gerando áudio...');
      storeApi.getState().setGenerationProgress(10);

      const audioInput: AudioFlowInput = {
        script,
        voiceConfig: {
          voiceId: selectedVoice,
          pace,
          emotion,
          emotionIntensity,
        },
        isMultiSpeaker: !!isMultiSpeaker,
        multiSpeakerConfig: isMultiSpeaker
          ? {
              speakerAName,
              speakerBName,
              speakerBVoice,
            }
          : undefined,
        audioProfile: audioProfile || undefined,
        scene: scene || undefined,
        styleNotes: styleNotes || undefined,
        requestId: crypto.randomUUID(),
      };

      const audioCallable = httpsCallable<AudioFlowInput, AudioFlowOutput>(functions, 'audio');
      const audioResult = await audioCallable(audioInput);

      const { audioBase64, mimeType, durationInSeconds: audioDurationSec, chunks: chunkCount } = audioResult.data;

      if (!audioBase64) {
        throw new Error('Resposta de áudio vazia do servidor.');
      }

      // Converte base64 para Blob WAV
      const wavBlob = base64ToBlobSync(audioBase64, mimeType);
      const url = URL.createObjectURL(wavBlob);
      generatedAudioUrl = url;
      storeApi.getState().setAudioBlob(wavBlob);
      storeApi.getState().setAudioUrl(url);
      storeApi.getState().setGenerationProgress(50);

      // Cria segmentos de áudio aproximados (o backend não retorna timestamps por chunk)
      // Os segmentos são baseados na contagem de chunks e duração total
      const generatedSegments: AudioSegment[] = [];
      if (chunkCount > 0 && audioDurationSec > 0) {
        const segmentDuration = audioDurationSec / chunkCount;
        for (let i = 0; i < chunkCount; i++) {
          generatedSegments.push({
            text: `parte_${i + 1}`,
            startSec: i * segmentDuration,
            endSec: (i + 1) * segmentDuration,
            chunkIndex: i,
          });
        }
      }
      storeApi.getState().setAudioSegments(generatedSegments);

      // --- Auto-save áudio (UX-5: feedback em caso de falha) ---
      let savedAudioId: string | null = null;
      try {
        storeApi.getState().setStatusText('Salvando áudio na nuvem...');
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

        // Persiste segmentos APÓS salvar a AudioSource
        void saveAudioSegments(currentProjectId, savedAudioId, generatedSegments, userId).catch((err: unknown) => {
          log.warn('Erro ao salvar segmentos de áudio', { error: err });
        });
      } catch (saveError) {
        log.warn('Erro no auto-save do áudio', { error: saveError });
        storeApi.getState().setError('O áudio foi gerado, mas houve um erro ao salvar na nuvem. Tente salvar manualmente.');
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => {
          storeApi.getState().setError('');
          errorTimerRef.current = null;
        }, 8000);
      }

      // --- Geração de cenas visuais ---
      if (generateScenes) {
        storeApi.getState().setStatusText('Criando roteiro visual...');
        storeApi.getState().setGenerationProgress(60);
        const style = `${scene} ${styleNotes}`.trim();

        const result: ScenePromptResult = await generateScenePrompts(script, audioDurationSec, style, sceneDensity, visualFramework, locale);

        // Avisa o usuário quando o backend falhou e usou fallback genérico
        if (result.isFallback) {
          storeApi.getState().setSceneGenerationWarning('Não foi possível gerar o roteiro visual automaticamente. As cenas usarão prompts genéricos — a qualidade visual será reduzida.');
        }

        const prompts = result.prompts;
        storeApi.getState().setGenerationProgress(70);

        const generatedScenes: SceneItem[] = [];
        const scenesToGenerate = prompts.length;
        let failedSceneCount = 0;

        for (let i = 0; i < prompts.length; i++) {
          if (cancelRef.current) throw new Error('Geração cancelada pelo usuário.');
          storeApi.getState().setStatusText(`Pintando cena ${i + 1} de ${prompts.length}...`);
          storeApi.getState().setGenerationProgress(Math.min(70 + Math.round((i / scenesToGenerate) * 25), 98));

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
        }

        // Notifica o usuário se houve falhas na geração de cenas
        if (failedSceneCount > 0 && failedSceneCount < scenesToGenerate) {
          const warning = `${generatedScenes.length} de ${scenesToGenerate} cenas geradas com sucesso. ${failedSceneCount} cena(s) falharam apos tentativas de retry.`;
          storeApi.getState().setSceneGenerationWarning(warning);
        } else if (failedSceneCount === scenesToGenerate) {
          const warning = 'Nenhuma cena foi gerada. Todas falharam apos tentativas de retry. Verifique sua conexao ou tente novamente.';
          storeApi.getState().setSceneGenerationWarning(warning);
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

        storeApi.getState().setScenes(generatedScenes);
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

      storeApi.getState().setGenerationProgress(100);
    } catch (err: unknown) {
      const errorMessageText = err instanceof Error ? err.message : '';

      if (errorMessageText === 'Geração cancelada pelo usuário.') {
        if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(generatedAudioUrl);
        }
        restoreLastSuccessfulState();
        storeApi.getState().setIsGenerating(false);
        storeApi.getState().setStatusText('');
        return;
      }

      log.error('Erro ao gerar áudio', { error: err });
      const errorMessage = toUserFriendlyError(err);

      if (errorMessage.includes('crédito') || errorMessage.includes('saldo')) {
        setCreditsExhausted(true);
      }

      if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      restoreLastSuccessfulState();
      storeApi.getState().setError(errorMessage);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        storeApi.getState().setError('');
        errorTimerRef.current = null;
      }, 8000);
    } finally {
      storeApi.getState().setIsGenerating(false);
      storeApi.getState().setStatusText('');
    }
  }, []);

  // Duração do áudio em segundos: derivada do store via helper.
  // audioBlob e audioDuration são usados indirectamente via getAudioDurationSeconds,
  // mas precisam estar nas deps para re-computar quando mudam.
  const durationInSeconds = useMemo(
    () => getAudioDurationSeconds({ audioBlob, audioDuration }),
    [audioBlob, audioDuration],
  );

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
    creditsExhausted,
  };
}
