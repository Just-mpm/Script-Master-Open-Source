import { useCallback, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGlobalAudioActions } from '../contexts/AudioContext';
import { VideoLibrary } from '../components/VideoLibrary';
import { VideoPreview, type VideoPreviewHandle } from '../components/VideoPreview';
import { EditingPlanInspector } from '../features/video-render/components/EditingPlanInspector';
import { VideoExportPanel } from '../features/video-render/components/VideoExportPanel';
import { useEditingPlan } from '../features/video-render/hooks/useEditingPlan';
import { useVideoExporter } from '../features/video-render/hooks/useVideoExporter';
import { useVideoRenderBridge } from '../features/video-render/store/videoRenderBridge';
import type { SceneRatio, StudioScene } from '../features/studio/types';
import type { StudioStateController } from '../features/studio/useStudioState';
import { useAuth } from '../contexts/AuthContext';

interface VideoPageProps {
  currentProjectId: StudioStateController['currentProjectId'];
  loadProjectData: StudioStateController['loadProjectData'];
  scenes: StudioScene[];
  setScript: StudioStateController['setScript'];
  script: string;
  audioUrl: string | null;
  videoFps: number;
  durationInFrames: number;
  durationInSeconds: number;
  sceneRatio: SceneRatio;
  videoPlayerRef: RefObject<VideoPreviewHandle | null>;
}

export function VideoPage({
  currentProjectId,
  loadProjectData,
  scenes,
  setScript,
  script,
  audioUrl,
  videoFps,
  durationInFrames,
  durationInSeconds,
  sceneRatio,
  videoPlayerRef,
}: VideoPageProps) {
  const { pause: pauseGlobalAudio } = useGlobalAudioActions();
  const { user } = useAuth();
  const userId = user?.uid;

  // Hooks de edição e exportação — instanciados aqui para code-splitting
  // (Remotion só é carregado quando a rota /video é acessada)
  const {
    editingPlan,
    originalPlan,
    isGeneratingPlan,
    error: planError,
    generatePlan,
    clearPlan,
    updateScene,
    resetToOriginal,
    undoLastEdit,
    canUndo,
    regenerateScene,
  } = useEditingPlan(currentProjectId);

  const videoExporter = useVideoExporter();

  // Mapeia cenas para o formato esperado pelo hook de edição
  const scenesForPlan = useMemo(
    () => scenes.map(s => ({
      timestamp: s.timestamp,
      prompt: s.prompt ?? '',
      imageUrl: s.imageUrl,
    })),
    [scenes],
  );

  // Indica se o botão de gerar plano está desabilitado
  const isPlanDisabled = isGeneratingPlan || !script.trim() || scenes.length === 0 || !audioUrl || durationInSeconds <= 0;

  // Wrapper para gerar plano de edição
  const handleGenerateEditingPlan = useCallback(() => {
    if (script.trim() && scenes.length > 0 && durationInSeconds > 0) {
      void generatePlan(script, scenesForPlan, durationInSeconds, audioUrl);
    }
  }, [script, scenes.length, scenesForPlan, durationInSeconds, audioUrl, generatePlan]);

  // --- Sincronização com o bridge store (ações estáveis via getState) ---

  useEffect(() => {
    useVideoRenderBridge.getState().syncPlanState(isGeneratingPlan, isPlanDisabled, planError);
  }, [isGeneratingPlan, isPlanDisabled, planError]);

  useEffect(() => {
    useVideoRenderBridge.getState().syncExportState(videoExporter.isRendering, videoExporter.renderProgress);
  }, [videoExporter.isRendering, videoExporter.renderProgress]);

  useEffect(() => {
    useVideoRenderBridge.getState().setGeneratePlanAction(handleGenerateEditingPlan);
  }, [handleGenerateEditingPlan]);

  useEffect(() => {
    const clearAction = () => clearPlan();
    useVideoRenderBridge.getState().setClearPlanErrorAction(clearAction);
    return () => { useVideoRenderBridge.getState().setClearPlanErrorAction(null); };
  }, [clearPlan]);

  // Reseta o bridge ao desmontar (navegação para fora de /video)
  useEffect(() => {
    return () => { useVideoRenderBridge.getState().resetBridge(); };
  }, []);

  // --- Efeitos locais ---

  // Na rota /video, o áudio global (AudioContext) não deve tocar —
  // pausa ao montar para evitar dual-play com o Remotion Player
  useEffect(() => {
    pauseGlobalAudio();
  }, [pauseGlobalAudio]);

  // Pausa o Remotion Player ao desmontar a página
  useEffect(() => {
    const playerHandle = videoPlayerRef.current;
    return () => {
      playerHandle?.pause();
    };
  }, [videoPlayerRef]);

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Montagem visual
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Revise a cena atual, confira a atmosfera do vídeo e carregue projetos anteriores sem sair do fluxo.
        </Typography>
      </Box>

      <VideoPreview
        ref={videoPlayerRef}
        scenes={scenes}
        audioUrl={audioUrl}
        fps={videoFps}
        durationInFrames={durationInFrames}
        ratio={sceneRatio}
        editingPlan={editingPlan ?? undefined}
      />

      {/* Inspector do plano de edição */}
      <EditingPlanInspector
        editingPlan={editingPlan}
        scenes={scenes}
        onUpdateScene={updateScene}
        onClearPlan={clearPlan}
        onRegenerateScene={regenerateScene ? (index) => {
          if (script.trim() && scenes.length > 0 && durationInSeconds > 0) {
            void regenerateScene(index, script, scenesForPlan, durationInSeconds);
          }
        } : undefined}
        canUndo={canUndo}
        onUndo={undoLastEdit}
        originalPlan={originalPlan}
        onResetToOriginal={resetToOriginal}
        onSeekToScene={(index) => {
          const timestamp = scenes[index]?.timestamp;
          if (timestamp !== undefined && videoPlayerRef.current) {
            videoPlayerRef.current.seekTo(Math.round(timestamp * videoFps));
          }
        }}
      />

      {/* Painel de exportação MP4 */}
      <VideoExportPanel
        scenes={scenes}
        audioUrl={audioUrl}
        fps={videoFps}
        durationInFrames={durationInFrames}
        ratio={sceneRatio}
        editingPlan={editingPlan ?? undefined}
        projectId={currentProjectId ?? undefined}
        userId={userId}
        exporter={videoExporter}
      />

      <VideoLibrary
        activeProjectId={currentProjectId}
        onSelect={(projectId, url, sceneList, projectScript) => {
          loadProjectData(url, sceneList, undefined, projectId);
          setScript(projectScript);
          // Áudio gerenciado pelo Remotion Player nesta rota —
          // não chamar play() do AudioContext para evitar dual-play
        }}
      />
    </Stack>
  );
}
