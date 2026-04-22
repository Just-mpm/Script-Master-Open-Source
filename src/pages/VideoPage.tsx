import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGlobalAudioActions } from '../contexts/AudioContext';
import { VideoLibrary } from '../components/VideoLibrary';
import { VideoPreview, type VideoPreviewHandle } from '../components/VideoPreview';
import { VideoExportPanel } from '../features/video-render/components/VideoExportPanel';
import { TranscriptionPanel } from '../features/video-render/components/TranscriptionPanel';
import { useVideoExporter } from '../features/video-render/hooks/useVideoExporter';
import { useTranscription } from '../features/video-render/hooks/useTranscription';
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
  sceneRatio,
  videoPlayerRef,
}: VideoPageProps) {
  const { pause: pauseGlobalAudio } = useGlobalAudioActions();
  const { user } = useAuth();
  const userId = user?.uid;

  // Hook de exportação — instanciado aqui para code-splitting
  // (Remotion só é carregado quando a rota /video é acessada)
  const videoExporter = useVideoExporter();

  // Hook de transcrição Whisper — instanciado aqui para code-splitting
  // (@remotion/whisper-web só é carregado quando a rota /video é acessada)
  const {
    captions,
    isTranscribing,
    transcriptionProgress,
    transcriptionStatusText,
    transcribeAudio,
    cancelTranscription,
    clearTranscription,
    error: transcriptionError,
    source: transcriptionSource,
    whisperSupported,
  } = useTranscription(currentProjectId);

  // Mapeia cenas para o formato esperado pela transcrição
  const scenesForTranscription = useMemo(
    () => scenes.map(s => ({
      timestamp: s.timestamp,
      prompt: s.prompt ?? '',
      imageUrl: s.imageUrl,
    })),
    [scenes],
  );

  // --- Sincronização com o bridge store ---

  useEffect(() => {
    useVideoRenderBridge.getState().syncExportState(videoExporter.isRendering, videoExporter.renderProgress);
  }, [videoExporter.isRendering, videoExporter.renderProgress]);

  useEffect(() => {
    useVideoRenderBridge.getState().syncTranscriptionState(isTranscribing, transcriptionProgress, transcriptionStatusText);
  }, [isTranscribing, transcriptionProgress, transcriptionStatusText]);

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

  // --- Handlers ---

  // Inicia transcrição manual (disparado pelo TranscriptionPanel)
  const handleTranscribe = () => {
    if (!audioUrl || !script.trim()) return;
    void transcribeAudio({
      audioUrl,
      script,
      scenes: scenesForTranscription,
      totalDurationFrames: durationInFrames,
      fps: videoFps,
    });
  };

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
        captions={captions.length > 0 ? captions : undefined}
      />

      {/* Painel de legendas */}
      <TranscriptionPanel
        audioUrl={audioUrl}
        script={script}
        scenes={scenesForTranscription}
        durationInFrames={durationInFrames}
        fps={videoFps}
        transcriptionSource={transcriptionSource}
        isTranscribing={isTranscribing}
        transcriptionProgress={transcriptionProgress}
        transcriptionStatusText={transcriptionStatusText}
        transcriptionError={transcriptionError}
        whisperSupported={whisperSupported}
        captionCount={captions.length}
        onTranscribe={handleTranscribe}
        onCancel={cancelTranscription}
        onClear={clearTranscription}
      />

      {/* Painel de exportação MP4 */}
      <VideoExportPanel
        scenes={scenes}
        audioUrl={audioUrl}
        fps={videoFps}
        durationInFrames={durationInFrames}
        ratio={sceneRatio}
        projectId={currentProjectId ?? undefined}
        userId={userId}
        exporter={videoExporter}
        captions={captions.length > 0 ? captions : undefined}
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
