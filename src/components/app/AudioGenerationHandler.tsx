import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalAudioActions } from '../../contexts/AudioContext';
import { useAudioGenerator } from '../../hooks/useAudioGenerator';
import { MAX_CHARS } from '../../lib/constants';
import { saveGeneration, type SavedAudio } from '../../lib/db';
import { createLogger } from '../../lib/logger';
import { functions } from '../../lib/firebase';
import { getCallableErrorInfo } from '../../lib/callable-errors';
import { useStudioStore, VIDEO_FPS, buildGenerateOptions } from '../../features/studio/store';
import type { SceneItem } from '../../features/studio/store';
import { useVideoRenderBridge } from '../../features/video-render/store/videoRenderBridge';
import type { AudioPreflightSummary } from './AudioPreflightDialog';
import { useLocale } from '../../features/i18n';

const log = createLogger('AudioGenerationHandler');

interface AudioGenerationHandlerReturn {
  // Estado de geração de áudio
  isGenerating: boolean;
  statusText: string;
  generationProgress: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  scenes: SceneItem[];
  // Handlers
  handleGenerate: () => void;
  confirmGenerate: () => void;
  closePreflightDialog: () => void;
  handleDownload: () => void;
  handleSaveToLibrary: () => void;
  handleCancel: () => void;
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
}

type BuiltGenerateOptions = ReturnType<typeof buildGenerateOptions>;

type AudioPreflightInput = BuiltGenerateOptions & {
  preflight?: {
    availableCredits: number;
    totalPlanned: number;
    unlimited: boolean;
  };
};

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
 * - Aviso beforeunload durante geração/exportação
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
    error,
    setError,
    sceneGenerationWarning,
    generateAudio,
    handleCancel,
    durationInSeconds,
    creditsExhausted,
  } = useAudioGenerator();

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
  const [pendingGenerateOptions, setPendingGenerateOptions] = useState<AudioPreflightInput | null>(null);
  const preflightRequestTokenRef = useRef(0);

  // Derivações para ActionBar e atalhos
  const isGenerateDisabled = isGenerating || isPreparingPreflight || creditsExhausted || !script.trim() || script.length > MAX_CHARS;
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

  // Aviso antes de fechar aba durante geração ou exportação
  useEffect(() => {
    if (!isGenerating && !isExportingVideo) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating, isExportingVideo]);

  // ─── Handlers ─────────────────────────────────────────────

  // handleGenerate: lê config do store via getState() no momento da execução.
  // Deps apenas em generateAudio (estável via useCallback) e userId.
  const handleGenerate = useCallback(() => {
    if (isGenerating || isPreparingPreflight) return;

    const options = buildGenerateOptions(userId, useStudioStore.getState());
    setPendingGenerateOptions(options);
    setPreflight(null);
    setPreflightError(null);
    setIsPreflightOpen(true);
    setIsPreparingPreflight(true);
    const requestToken = preflightRequestTokenRef.current + 1;
    preflightRequestTokenRef.current = requestToken;

    void audioPreflightCallable(options)
      .then((result) => {
        if (preflightRequestTokenRef.current !== requestToken) return;
        setPreflight(result.data);
      })
      .catch((preflightErr: unknown) => {
        if (preflightRequestTokenRef.current !== requestToken) return;
        log.error('Erro ao preparar prévia da geração', { error: preflightErr });
        const errorInfo = getCallableErrorInfo(preflightErr);
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
  }, [audioPreflightCallable, isGenerating, isPreparingPreflight, t, userId]);

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

    const nextOptions: AudioPreflightInput = {
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
    generateAudio(nextOptions);
  }, [generateAudio, pendingGenerateOptions, preflight]);

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

  return {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    handleGenerate,
    confirmGenerate,
    closePreflightDialog,
    handleDownload,
    handleSaveToLibrary,
    handleCancel,
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
  };
}
