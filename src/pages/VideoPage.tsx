import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGlobalAudioActions } from '../contexts/AudioContext';
import { VideoLibrary } from '../components/VideoLibrary';
import { VideoPreview, type VideoPreviewHandle } from '../components/VideoPreview';
import { VideoExportPanel } from '../features/video-render/components/VideoExportPanel';
import { TranscriptionPanel } from '../features/video-render/components/TranscriptionPanel';
import { CaptionEditorPanel } from '../features/video-render/components/CaptionEditorPanel';
import { SubtitleInlineEditor } from '../features/video-render/components/SubtitleInlineEditor';
import { useVideoExporter } from '../features/video-render/hooks/useVideoExporter';
import { useTranscription } from '../features/video-render/hooks/useTranscription';
import { useVideoRenderBridge } from '../features/video-render/store/videoRenderBridge';
import { DEFAULT_SUBTITLE_STYLE } from '../features/video-render/types';
import type { SubtitleStyle, SubtitlePosition } from '../features/video-render/types';
import { useAudioGenerator } from '../hooks/useAudioGenerator';
import { useStudioStore, VIDEO_FPS } from '../features/studio/store';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../features/i18n';

interface VideoPageProps {
  videoPlayerRef: RefObject<VideoPreviewHandle | null>;
}

export function VideoPage({
  videoPlayerRef,
}: VideoPageProps) {
  const { t } = useLocale();
  const { pause: pauseGlobalAudio } = useGlobalAudioActions();
  const { user } = useAuth();
  const userId = user?.uid;

  // Estado de config do store — useShallow evita re-renders quando outros campos mudam
  const { script, setScript, sceneRatio } = useStudioStore(useShallow((s) => ({
    script: s.script,
    setScript: s.setScript,
    sceneRatio: s.sceneRatio,
  })));

  // Estado de geração de áudio (hook)
  const {
    audioUrl,
    scenes,
    audioSegments,
    projectId: currentProjectId,
    durationInSeconds: audioDuration,
    loadProjectData,
  } = useAudioGenerator();

  const videoFps = VIDEO_FPS;

  // Duração total do vídeo em frames (derivada do áudio e FPS)
  const durationInFrames = useMemo(
    () => Math.round(audioDuration * videoFps),
    [audioDuration, videoFps],
  );

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
    isStale,
    updateCaptions,
  } = useTranscription(currentProjectId, script, userId);

  // Estilo personalizável das legendas — controlado pelo SubtitleInlineEditor
  // Persistido no localStorage com prefixo s2a_ (padrão das 14 preferências do estúdio)
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    try {
      const stored = localStorage.getItem('s2a_subtitleStyle');
      if (stored) {
        return JSON.parse(stored) as SubtitleStyle;
      }
    } catch {
      // JSON malformado ou SecurityError (Safari Private Browsing)
    }
    return { ...DEFAULT_SUBTITLE_STYLE };
  });

  // Persiste subtitleStyle no localStorage quando muda
  useEffect(() => {
    try {
      localStorage.setItem('s2a_subtitleStyle', JSON.stringify(subtitleStyle));
    } catch {
      // Quota cheia ou SecurityError — falha silenciosa
    }
  }, [subtitleStyle]);

  // Toggle: exportar vídeo com legenda (default: true)
  const [includeSubtitles, setIncludeSubtitles] = useState(true);

  // Toggle: legenda visível no preview (estado local, não afeta exportação)
  const [captionVisible, setCaptionVisible] = useState(true);

  // Posição vertical da legenda — persistido no localStorage
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitlePosition>(() => {
    try {
      const stored = localStorage.getItem('s2a_subtitlePosition');
      if (stored === 'top' || stored === 'center') return stored;
    } catch {
      // SecurityError (Safari Private Browsing)
    }
    return 'bottom';
  });

  // Persiste posição no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('s2a_subtitlePosition', subtitlePosition);
    } catch {
      // Quota cheia ou SecurityError — falha silenciosa
    }
  }, [subtitlePosition]);

  // Sincroniza position no subtitleStyle para o VideoComposition
  const mergedSubtitleStyle = useMemo<SubtitleStyle>(() => ({
    ...subtitleStyle,
    position: subtitlePosition,
  }), [subtitleStyle, subtitlePosition]);

  // Duração total em segundos para estimativa de tamanho
  const durationInSeconds = useMemo(
    () => durationInFrames / videoFps,
    [durationInFrames, videoFps],
  );

  // Ref para portal da toolbar de legenda — renderizada fora do preview
  const toolbarPortalRef = useRef<HTMLDivElement>(null);

  // Mapeia cenas para o formato esperado pela transcrição
  const scenesForTranscription = useMemo(
    () => scenes.map(s => ({
      timestamp: s.timestamp,
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
      audioSegments: audioSegments.length > 0 ? audioSegments : undefined,
    });
  };

  // Pausa o Remotion Player ao desmontar a página
  useEffect(() => {
    const playerHandle = videoPlayerRef.current;
    return () => {
      playerHandle?.pause();
    };
  }, [videoPlayerRef]);

  // Callback memoizado para seleção no VideoLibrary (evita nova referência a cada render)
  const handleLibrarySelect = useCallback((
    projectId: string,
    url: string,
    sceneList: { imageUrl: string; timestamp: number }[],
    projectScript: string,
  ) => {
    loadProjectData(url, sceneList, undefined, projectId);
    setScript(projectScript);
    // Áudio gerenciado pelo Remotion Player nesta rota —
    // não chamar play() do AudioContext para evitar dual-play
  }, [loadProjectData, setScript]);

  // Callback memoizado para toggle de legenda visível no preview (Fix 4)
  const handleCaptionToggle = useCallback(() => setCaptionVisible((v) => !v), []);

  // Memoiza o JSX do VideoPreview — evita nova referência a children em cada render (Fix 4)
  const videoPreviewElement = useMemo(
    () => (
      <VideoPreview
        ref={videoPlayerRef}
        scenes={scenes}
        audioUrl={audioUrl}
        fps={videoFps}
        durationInFrames={durationInFrames}
        ratio={sceneRatio}
        captions={captions.length > 0 ? captions : undefined}
        subtitleStyle={mergedSubtitleStyle}
        showCaptionToggle={true}
        captionVisible={captionVisible}
        onCaptionToggle={handleCaptionToggle}
      />
    ),
    [scenes, audioUrl, videoFps, durationInFrames, sceneRatio, captions, mergedSubtitleStyle, captionVisible, handleCaptionToggle, videoPlayerRef],
  );

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          {t('video.pageTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('video.pageDescription')}
        </Typography>
      </Box>

       <SubtitleInlineEditor
            hasCaptions={captions.length > 0}
            subtitleStyle={subtitleStyle}
            onSubtitleStyleChange={setSubtitleStyle}
            ratio={sceneRatio}
            toolbarPortal={toolbarPortalRef}
            subtitlePosition={subtitlePosition}
            onSubtitlePositionChange={setSubtitlePosition}
          >
           {videoPreviewElement}
       </SubtitleInlineEditor>

       {/* Portal target para toolbar de legenda — renderizada abaixo do preview */}
       <Box ref={toolbarPortalRef} sx={{ minHeight: 0 }} />

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
        isStale={isStale}
        onTranscribe={handleTranscribe}
        onCancel={cancelTranscription}
        onClear={clearTranscription}
      />

      {/* Editor de legendas — visível quando há captions */}
      <CaptionEditorPanel
        captions={captions}
        onUpdateCaptions={updateCaptions}
        fps={videoFps}
        onSeekToFrame={(frame) => videoPlayerRef.current?.seekTo(frame)}
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
           subtitleStyle={mergedSubtitleStyle}
           includeSubtitles={includeSubtitles}
           onIncludeSubtitlesChange={setIncludeSubtitles}
           durationInSeconds={durationInSeconds}
           />

      <VideoLibrary
        activeProjectId={currentProjectId}
        onSelect={handleLibrarySelect}
      />
    </Stack>
  );
}
