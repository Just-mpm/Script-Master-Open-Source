import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalAudioActions } from '../../contexts/AudioContext';
import { buildAudioFlowInput, useAudioGenerator } from '../../hooks/useAudioGenerator';
import type { GenerateOptions } from '../../hooks/useAudioGenerator';
import { MAX_CHARS } from '../../lib/constants';
import { saveGeneration, type SavedAudio } from '../../lib/db';
import { createLogger } from '../../lib/logger';
import { functions } from '../../lib/firebase';
import { getCallableErrorInfo } from '../../lib/callable-errors';
import { useStudioStore, VIDEO_FPS, buildGenerateOptions, useAudioGeneratorStore } from '../../features/studio/store';
import type { SceneItem } from '../../features/studio/store';
import { useVideoRenderBridge } from '../../features/video-render/store/videoRenderBridge';
import type { AudioPreflightSummary } from './AudioPreflightDialog';
import { useLocale } from '../../features/i18n';
import { STEP_LABEL_KEYS } from '../../features/i18n/utils';
import type { AudioJobRecord } from '../../lib/audio-jobs';
import { fetchAudioJobBlob } from '../../lib/audio-jobs';
import {
  usePipelineOrchestrator,
  type PipelineState,
  type PipelineOptions,
} from '../../hooks/usePipelineOrchestrator';

const log = createLogger('AudioGenerationHandler');
const AUDIO_PREFLIGHT_TIMEOUT_MS = 15_000;
const SHOULD_SKIP_BROKEN_PREFLIGHT_IN_DEV =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

interface AudioGenerationHandlerReturn {
  // Estado de geração de áudio
  isGenerating: boolean;
  statusText: string;
  generationProgress: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  scenes: SceneItem[];
  audioJobs: AudioJobRecord[];
  // Handlers
  handleGenerate: () => void;
  confirmGenerate: () => void;
  closePreflightDialog: () => void;
  handleDownload: () => void;
  handleSaveToLibrary: () => void;
  handleCancel: () => void;
  openCompletedAudioJob: (job: AudioJobRecord) => Promise<void>;
  scrollToExport: () => void;
  // Derivações
  isGenerateDisabled: boolean;
  durationInFrames: number;
  // Estado de toasts
  activeError: string | null;
  dismissError: () => void;
  warning: string | null;
  dismissWarning: () => void;
  successMessage: string | null;
  dismissSuccess: () => void;
  // Exportação de vídeo
  isExportingVideo: boolean;
  videoExportProgress: number;
  // Toggle de áudio (para atalhos de teclado)
  toggleAudioPlayer: (source: 'studio') => void;
  // Estado de salvamento
  isSaved: boolean;
  // Créditos esgotados
  creditsExhausted: boolean;
  isPreparingPreflight: boolean;
  isPreflightOpen: boolean;
  preflight: AudioPreflightSummary | null;
  preflightError: string | null;
  // Pipeline (jobs assíncronos)
  pipelineState: PipelineState | null;
}

type AudioPreflightInput = ReturnType<typeof buildAudioFlowInput>;
type AudioPreflightCallableResult = {
  data?: AudioPreflightSummary;
  result?: AudioPreflightSummary;
};

function isAudioPreflightSummary(value: unknown): value is AudioPreflightSummary {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<AudioPreflightSummary>;
  return (
    typeof candidate.summary === 'string' &&
    typeof candidate.estimatedDurationSeconds === 'number' &&
    typeof candidate.estimatedChunkCount === 'number' &&
    typeof candidate.estimatedSceneCount === 'number' &&
    Array.isArray(candidate.steps) &&
    typeof candidate.canProceed === 'boolean' &&
    Array.isArray(candidate.notes)
  );
}

function getAudioPreflightSummary(result: AudioPreflightCallableResult): AudioPreflightSummary | null {
  if (isAudioPreflightSummary(result.data)) return result.data;
  if (isAudioPreflightSummary(result.result)) return result.result;
  if (isAudioPreflightSummary(result)) return result;
  return null;
}

// ─── Hook ──────────────────────────────────────────────────

/**
 * Hook que encapsula toda a lógica de geração de áudio, handlers derivados
 * e estado de toasts relacionado. Centraliza a complexidade do App.tsx.
 *
 * Responsabilidades:
 * - Gerenciamento do hook useAudioGenerator
 * - Handlers de download e salvamento na biblioteca
 * - Priorização de erros (auth > studio)
 * - Sincronização de duração com AudioContext
 */
export function useAudioGenerationHandler(): AudioGenerationHandlerReturn {
  const { authError, clearAuthError, user } = useAuth();
  const { t, locale } = useLocale();
  const userId = user?.uid;
  const { toggle, setDurationOverride } = useGlobalAudioActions();

  // ─── Estado de geração de áudio (hook) ────────────────────
  const {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    audioJobs,
    error,
    setError,
    sceneGenerationWarning,
    handleCancel,
    openCompletedAudioJob,
    durationInSeconds,
    creditsExhausted,
  } = useAudioGenerator();

  // ─── Pipeline orchestrator (jobs assíncronos multi-etapa) ──────
  const pipeline = usePipelineOrchestrator();
  const pipelineActive = pipeline.isRunning;

  // ─── Estado de config do store (Zustand) ──────────────────
  const script = useStudioStore((s) => s.script);
  const audioPreflightCallable = useMemo(
    () => httpsCallable<AudioPreflightInput, AudioPreflightSummary>(functions, 'audioPreflight'),
    [],
  );

  // ─── UI state transitório ─────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isPreparingPreflight, setIsPreparingPreflight] = useState(false);
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [preflight, setPreflight] = useState<AudioPreflightSummary | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [pendingGenerateOptions, setPendingGenerateOptions] = useState<GenerateOptions | null>(null);
  const preflightRequestTokenRef = useRef(0);

  // Derivações para ActionBar e atalhos
  const isGenerateDisabled = isGenerating || pipelineActive || isPreparingPreflight || creditsExhausted || !script.trim() || script.length > MAX_CHARS;
  const durationInFrames = useMemo(
    () => Math.round(durationInSeconds * VIDEO_FPS),
    [durationInSeconds],
  );

  // Sincroniza duração com AudioContext
  useEffect(() => {
    setDurationOverride(durationInSeconds > 0 ? durationInSeconds : null);
  }, [durationInSeconds, setDurationOverride]);

  // Bridge store — lê apenas as slices necessárias (evita re-render 30x/s)
  const isExportingVideo = useVideoRenderBridge((s) => s.isExportingVideo);
  const videoExportProgress = useVideoRenderBridge((s) => s.videoExportProgress);

  // ─── Handlers ─────────────────────────────────────────────

  /** Cancelamento combinado: pipeline ou áudio, dependendo do que está ativo */
  const handleCancelCombined = useCallback(() => {
    if (pipelineActive) {
      pipeline.cancel();
      return;
    }
    handleCancel();
  }, [handleCancel, pipeline, pipelineActive]);

  // handleGenerate: lê config do store via getState() no momento da execução.

  /** Constrói PipelineOptions a partir de GenerateOptions + store */
  const buildPipelineOptions = useCallback(
    (options: GenerateOptions): PipelineOptions => ({
      userId: userId ?? '',
      projectName: options.projectName ?? '',
      script: options.script,
      voiceId: options.selectedVoice,
      pace: options.pace,
      emotion: options.emotion ?? 'neutral',
      emotionIntensity: options.emotionIntensity ?? 0.5,
      isMultiSpeaker: options.isMultiSpeaker ?? false,
      speakerAName: options.speakerAName ?? '',
      speakerBName: options.speakerBName ?? '',
      speakerBVoice: options.speakerBVoice ?? '',
      audioProfile: options.audioProfile,
      scene: options.scene,
      styleNotes: options.styleNotes,
      sceneDensity: options.sceneDensity ?? 15,
      sceneRatio: options.sceneRatio ?? '16:9',
      visualFramework: options.visualFramework ?? 'general',
      generateScenes: options.generateScenes ?? false,
      referenceImage: options.referenceImage ?? undefined,
      locale: options.locale ?? 'pt-BR',
      animateScenes: true,
      includeSubtitles: false,
      videoQuality: '1080p',
      codec: 'h264',
      fps: VIDEO_FPS,
    }),
    [userId],
  );

  const handleGenerate = useCallback(() => {
    if (isGenerating || pipelineActive || isPreparingPreflight) return;

    const options = buildGenerateOptions(userId, useStudioStore.getState());
    setPendingGenerateOptions(options);
    setPreflight(null);
    setPreflightError(null);
    setIsPreflightOpen(true);
    setIsPreparingPreflight(true);
    const requestToken = preflightRequestTokenRef.current + 1;
    preflightRequestTokenRef.current = requestToken;

    const preflightInput = buildAudioFlowInput(options, crypto.randomUUID());
    const preflightPromise = audioPreflightCallable(preflightInput);
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      window.setTimeout(() => {
        reject(new Error('audioPreflight timeout'));
      }, AUDIO_PREFLIGHT_TIMEOUT_MS);
    });

    void Promise.race([preflightPromise, timeoutPromise])
      .then((result) => {
        if (preflightRequestTokenRef.current !== requestToken) return;
        const nextPreflight = getAudioPreflightSummary(result);
        if (!nextPreflight) {
          log.warn('Prévia de áudio retornou sem payload utilizável', { result });
          if (SHOULD_SKIP_BROKEN_PREFLIGHT_IN_DEV) {
            setIsPreflightOpen(false);
            setPreflight(null);
            setPreflightError(null);
            setPendingGenerateOptions(null);
            void pipeline.start(buildPipelineOptions(options));
            return;
          }

          setPreflightError(t('audioPreflight.unavailableText'));
          return;
        }

        setPreflight(nextPreflight);
      })
      .catch((preflightErr: unknown) => {
        if (preflightRequestTokenRef.current !== requestToken) return;
        log.error('Erro ao preparar prévia da geração', { error: preflightErr });
        const errorInfo = getCallableErrorInfo(preflightErr);
        if (SHOULD_SKIP_BROKEN_PREFLIGHT_IN_DEV) {
          const isBusinessBlock = errorInfo.detailCode === 'INSUFFICIENT_CREDITS';
          if (!isBusinessBlock) {
            setIsPreflightOpen(false);
            setPreflight(null);
            setPreflightError(null);
            setPendingGenerateOptions(null);
            void pipeline.start(buildPipelineOptions(options));
            return;
          }
        }
        setPreflightError(
          errorInfo.detailCode === 'INSUFFICIENT_CREDITS'
            ? t('audioPreflight.insufficientCreditsError')
            : t('audioPreflight.unavailableText'),
        );
      })
      .finally(() => {
        if (preflightRequestTokenRef.current !== requestToken) return;
        setIsPreparingPreflight(false);
      });
  }, [audioPreflightCallable, pipeline, buildPipelineOptions, isGenerating, pipelineActive, isPreparingPreflight, t, userId]);

  const closePreflightDialog = useCallback(() => {
    preflightRequestTokenRef.current += 1;
    setIsPreflightOpen(false);
    setIsPreparingPreflight(false);
    setPreflight(null);
    setPreflightError(null);
    setPendingGenerateOptions(null);
  }, []);

  const confirmGenerate = useCallback(() => {
    if (!pendingGenerateOptions || !preflight || !preflight.canProceed) return;

    const nextOptions: GenerateOptions = {
      ...pendingGenerateOptions,
      preflight: {
        availableCredits: preflight.credits.available,
        totalPlanned: preflight.credits.totalPlanned,
        unlimited: preflight.credits.unlimited,
      },
    };

    setIsPreflightOpen(false);
    setPreflight(null);
    setPreflightError(null);
    setPendingGenerateOptions(null);

    // Sempre usa o pipeline (jobs assíncronos server-side)
    const pipelineOptions = buildPipelineOptions(nextOptions);
    void pipeline.start(pipelineOptions);
  }, [pipeline, buildPipelineOptions, pendingGenerateOptions, preflight]);

  const handleDownload = useCallback(() => {
    if (!audioUrl) return;

    const voice = useStudioStore.getState().selectedVoice;
    const safeVoiceName = voice.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = `roteiro-${safeVoiceName}-${Date.now()}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [audioUrl]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!audioBlob || isSaved) return;

    try {
      const s = useStudioStore.getState();
      const voiceLabel = s.isMultiSpeaker ? `${s.selectedVoice} & ${s.speakerBVoice}` : s.selectedVoice;
      const newItem: SavedAudio = {
        id: crypto.randomUUID(),
        name: `${t('audioPreflight.scriptNamePrefix')} - ${voiceLabel} - ${new Date().toLocaleDateString(locale)}`,
        createdAt: Date.now(),
        audioBlob,
        script: s.script,
        voice: voiceLabel,
        scenes: scenes.length > 0 ? [...scenes] : [],
      };

      await saveGeneration(newItem, userId);
      setIsSaved(true);
      setSuccessMsg(user
        ? t('audioPreflight.saveCloudSuccess')
        : t('audioPreflight.saveLocalSuccess'));
    } catch (saveError: unknown) {
      log.error('Erro ao salvar na biblioteca', { error: saveError });
      setError(t('audioPreflight.saveError'));
    }
  }, [audioBlob, isSaved, scenes, user, userId, setError, t, locale]);

  const scrollToExport = useCallback(() => {
    const element = document.getElementById('video-export-panel');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Prioriza erros: authError > studio error
  const activeError = authError ?? error;
  const dismissError = useCallback(() => {
    if (authError) { clearAuthError(); return; }
    if (error) { setError(''); return; }
  }, [authError, clearAuthError, error, setError]);

  const [localSceneWarning, setLocalSceneWarning] = useState<string | null>(null);

  useEffect(() => {
    if (sceneGenerationWarning) {
      setLocalSceneWarning(sceneGenerationWarning);
    }
  }, [sceneGenerationWarning]);

  const dismissWarning = useCallback(() => setLocalSceneWarning(null), []);
  const dismissSuccess = useCallback(() => setSuccessMsg(null), []);

  // Reseta isSaved ao iniciar nova geração
  useEffect(() => {
    if (isGenerating) setIsSaved(false);
  }, [isGenerating]);

  // Marca isGenerating no store quando o pipeline inicia
  useEffect(() => {
    if (!pipeline.isRunning) return;

    const storeApi = useAudioGeneratorStore;
    if (!storeApi.getState().isGenerating) {
      storeApi.getState().setIsGenerating(true);
      storeApi.getState().setGenerationProgress(0);
      storeApi.getState().setError(null);
      storeApi.getState().setSceneGenerationWarning(null);
      storeApi.getState().setAudioUrl(null);
      storeApi.getState().setAudioBlob(null);
      storeApi.getState().setAudioDuration(0);
      storeApi.getState().setScenes([]);
      storeApi.getState().setAudioSegments([]);
    }
  }, [pipeline.isRunning]);

  // Sincroniza progresso do pipeline no store durante execução
  useEffect(() => {
    if (!pipeline.isRunning) return;

    const storeApi = useAudioGeneratorStore;
    const step = pipeline.steps[pipeline.currentStep];
    if (step) {
      storeApi.getState().setStatusText(t(STEP_LABEL_KEYS[step.step] ?? step.step));
      storeApi.getState().setGenerationProgress(step.progress ?? 0);
    }
  }, [pipeline.isRunning, pipeline.steps, pipeline.currentStep, t]);

  // Carrega áudio e imagens do pipeline no audioGeneratorStore quando o pipeline completa
  useEffect(() => {
    if (!pipeline.isCompleted || !pipeline.audioResultUrl) return;

    const loadPipelineResults = async () => {
      try {
        const blob = await fetchAudioJobBlob(pipeline.audioResultUrl!);
        const nextUrl = URL.createObjectURL(blob);
        const storeApi = useAudioGeneratorStore;
        const prevUrl = storeApi.getState().audioUrl;

        // Revoga blob URL anterior para evitar memory leak
        if (prevUrl && prevUrl.startsWith('blob:') && prevUrl !== nextUrl) {
          URL.revokeObjectURL(prevUrl);
        }

        storeApi.getState().setAudioBlob(blob);
        storeApi.getState().setAudioUrl(nextUrl);
        storeApi.getState().setAudioDuration(pipeline.audioResultDurationSecs ?? 0);
        storeApi.getState().setProjectId(pipeline.audioResultProjectId ?? '');
        storeApi.getState().setAudioSegments([]);
        storeApi.getState().setGenerationProgress(100);
        storeApi.getState().setIsGenerating(false);
        storeApi.getState().setStatusText('');

        // Carrega imagens do pipeline se disponíveis
        const imageResults = pipeline.results?.images?.images;
        if (imageResults && imageResults.length > 0) {
          const scenesFromPipeline: SceneItem[] = imageResults.map((img, idx) => ({
            imageUrl: img.downloadUrl,
            timestamp: pipeline.results?.scenePrompts?.prompts?.[idx]?.timestamp ?? idx * 10,
          }));
          storeApi.getState().setScenes(scenesFromPipeline);
          log.info('Imagens do pipeline carregadas no estúdio', { count: scenesFromPipeline.length });
        } else {
          storeApi.getState().setScenes([]);
        }

        log.info('Áudio do pipeline carregado no estúdio', {
          duration: pipeline.audioResultDurationSecs,
          projectId: pipeline.audioResultProjectId,
        });
      } catch (err) {
        log.error('Erro ao carregar áudio do pipeline', { error: err });
        useAudioGeneratorStore.getState().setIsGenerating(false);
        useAudioGeneratorStore.getState().setStatusText('');
      }
    };

    void loadPipelineResults();
  }, [pipeline.isCompleted, pipeline.audioResultUrl, pipeline.audioResultDurationSecs, pipeline.audioResultProjectId, pipeline.results]);

  // Trata falha/cancelamento do pipeline
  useEffect(() => {
    if (!pipeline.isFailed && !pipeline.isCancelled) return;
    if (!pipeline.isRunning) {
      // Pipeline parou — finaliza o store se ainda estiver em isGenerating
      const storeApi = useAudioGeneratorStore;
      if (storeApi.getState().isGenerating) {
        storeApi.getState().setIsGenerating(false);
        storeApi.getState().setStatusText('');
        if (pipeline.isFailed && pipeline.error) {
          storeApi.getState().setError(pipeline.error);
        }
      }
    }
  }, [pipeline.isFailed, pipeline.isCancelled, pipeline.isRunning, pipeline.error]);

  // ─── Estado derivado do pipeline para exibição ─────────────────

  /** Status text combinado: pipeline > audio */
  const combinedStatusText = useMemo(() => {
    if (pipelineActive) {
      const step = pipeline.steps[pipeline.currentStep];
      if (step) {
        return t(STEP_LABEL_KEYS[step.step] ?? step.step);
      }
      return t('audioPreflight.stepLabels.audio');
    }
    return statusText;
  }, [pipelineActive, pipeline.steps, pipeline.currentStep, statusText, t]);

  /** Progress combinado: pipeline > audio */
  const combinedProgress = useMemo(() => {
    if (pipelineActive) {
      const step = pipeline.steps[pipeline.currentStep];
      return step?.progress ?? 0;
    }
    return generationProgress;
  }, [pipelineActive, pipeline.steps, pipeline.currentStep, generationProgress]);

  /** isGenerating combinado: pipeline > audio */
  const combinedIsGenerating = pipelineActive || isGenerating;

  return {
    isGenerating: combinedIsGenerating,
    statusText: combinedStatusText,
    generationProgress: combinedProgress,
    audioUrl: pipelineActive ? null : audioUrl,
    audioBlob: pipelineActive ? null : audioBlob,
    scenes,
    audioJobs,
    handleGenerate,
    confirmGenerate,
    closePreflightDialog,
    handleDownload,
    handleSaveToLibrary,
    handleCancel: handleCancelCombined,
    openCompletedAudioJob,
    scrollToExport,
    isGenerateDisabled,
    durationInFrames,
    activeError,
    dismissError,
    warning: localSceneWarning,
    dismissWarning,
    successMessage: successMsg,
    dismissSuccess,
    isExportingVideo,
    videoExportProgress,
    toggleAudioPlayer: toggle,
    isSaved,
    creditsExhausted,
    isPreparingPreflight,
    isPreflightOpen,
    preflight,
    preflightError,
    pipelineState: pipeline,
  };
}
