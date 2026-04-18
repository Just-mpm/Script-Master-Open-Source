import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useGlobalAudioState } from '../contexts/AudioContext';
import { VideoLibrary } from '../components/VideoLibrary';
import { VideoPreview } from '../components/VideoPreview';
import type { StudioScene } from '../features/studio/types';
import type { StudioStateController } from '../features/studio/useStudioState';

interface VideoPageProps {
  currentProjectId: StudioStateController['currentProjectId'];
  loadProjectData: StudioStateController['loadProjectData'];
  play: StudioStateController['play'];
  scenes: StudioScene[];
  script: string;
  setScript: StudioStateController['setScript'];
}

export function VideoPage({
  currentProjectId,
  loadProjectData,
  play,
  scenes,
  script,
  setScript,
}: VideoPageProps) {
  const { currentTime } = useGlobalAudioState();

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
        scenes={scenes}
        currentTime={currentTime}
        script={script}
      />

      <VideoLibrary
        activeProjectId={currentProjectId}
        onSelect={(projectId, url, sceneList, projectScript) => {
          loadProjectData(url, sceneList, undefined, projectId);
          setScript(projectScript);
          play(url, 'studio');
        }}
      />
    </Stack>
  );
}
