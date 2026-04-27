import Grid from '@mui/material/Grid';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useAudioCurrentTime } from '../contexts/AudioContext';
import { useStudioStore } from '../features/studio/store';
import { useShallow } from 'zustand/react/shallow';

interface StudioPageProps {
  isGenerating: boolean;
  scenes: { imageUrl: string; timestamp: number }[];
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
}

export function StudioPage({ isGenerating, scenes, handleGenerate, isGenerateDisabled }: StudioPageProps) {
  const currentTime = useAudioCurrentTime();

  // Estado de config do store — apenas script para o ScriptEditor (Inspector usa o store diretamente)
  const { script, setScript } = useStudioStore(useShallow((s) => ({
    script: s.script,
    setScript: s.setScript,
  })));

  return (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Inspector isGenerating={isGenerating} />
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <ScriptEditor
          script={script}
          setScript={setScript}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          isGenerateDisabled={isGenerateDisabled}
          scenes={scenes}
          currentTime={currentTime}
        />
      </Grid>
    </Grid>
  );
}
