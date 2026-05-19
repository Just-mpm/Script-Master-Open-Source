import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalAudioActions } from '../../contexts/AudioContext';
import { useAudioGenerator } from '../../hooks/useAudioGenerator';
import { MAX_CHARS } from '../../lib/constants';
import { saveGeneration, type SavedAudio } from '../../lib/db';
import { createLogger } from '../../lib/logger';
import { useStudioStore, VIDEO_FPS, buildGenerateOptions } from '../../features/studio/store';
import type { SceneItem } from '../../features/studio/store';
import { useVideoRenderBridge } from '../../features/video-render/store/videoRenderBridge';

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
 * - Aviso beforeunload durante geração/exportação
 */
export function useAudioGenerationHandler(): AudioGenerationHandlerReturn {
  const { authError, clearAuthError, user } = useAuth();
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

  // Derivações para ActionBar e atalhos
  const isGenerateDisabled = isGenerating || !script.trim() || script.length > MAX_CHARS;
  const durationInFrames = useMemo(
    () => Math.round(durationInSeconds * VIDEO_FPS),
    [durationInSeconds],
  );

  // Sincroniza duração com AudioContext
  useEffect(() => {
    setDurationOverride(durationInSeconds > 0 ? durationInSeconds : null);
  }, [durationInSeconds, setDurationOverride]);

  // ─── UI state transitório ─────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

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
    generateAudio(buildGenerateOptions(userId, useStudioStore.getState()));
  }, [generateAudio, userId]);

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
        name: `Roteiro - ${voiceLabel} - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        audioBlob,
        script: s.script,
        voice: voiceLabel,
        scenes: scenes.length > 0 ? [...scenes] : [],
      };

      await saveGeneration(newItem, userId);
      setIsSaved(true);
      setSuccessMsg(user
        ? 'Áudio salvo na nuvem com sucesso!'
        : 'Áudio salvo na biblioteca local!');
    } catch (saveError: unknown) {
      log.error('Erro ao salvar na biblioteca', { error: saveError });
      setError('Erro ao salvar na biblioteca.');
    }
  }, [audioBlob, isSaved, scenes, user, userId, setError]);

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
  };
}
