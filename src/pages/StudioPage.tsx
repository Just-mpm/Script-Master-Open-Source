import Grid from '@mui/material/Grid';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useAudioCurrentTime } from '../contexts/AudioContext';
import type { StudioStateController } from '../features/studio/useStudioState';

// Props da página via Pick — mantém compatibilidade com spread de useStudioState (bp #1)
type StudioPageProps = Pick<StudioStateController,
  | 'script' | 'setScript'
  | 'isGenerating'
  | 'handleGenerate' | 'isGenerateDisabled' | 'scenes'
  | 'isMultiSpeaker' | 'setIsMultiSpeaker'
  | 'speakerAName' | 'setSpeakerAName'
  | 'selectedVoice' | 'setSelectedVoice'
  | 'speakerBName' | 'setSpeakerBName'
  | 'speakerBVoice' | 'setSpeakerBVoice'
  | 'audioProfile' | 'setAudioProfile'
  | 'scene' | 'setScene'
  | 'pace' | 'setPace'
  | 'styleNotes' | 'setStyleNotes'
  | 'generateScenes' | 'setGenerateScenes'
  | 'sceneDensity' | 'setSceneDensity'
  | 'sceneRatio' | 'setSceneRatio'
  | 'visualFramework' | 'setVisualFramework'
  | 'referenceImage' | 'setReferenceImage'
>;

export function StudioPage(props: StudioPageProps) {
  const currentTime = useAudioCurrentTime();

  const {
    script,
    setScript,
    handleGenerate,
    isGenerateDisabled,
    scenes,
    // Remaining (inclui isGenerating) vai para Inspector
    ...inspectorProps
  } = props;

  return (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Inspector {...inspectorProps} />
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <ScriptEditor
          script={script}
          setScript={setScript}
          isGenerating={props.isGenerating}
          handleGenerate={handleGenerate}
          isGenerateDisabled={isGenerateDisabled}
          scenes={scenes}
          currentTime={currentTime}
        />
      </Grid>
    </Grid>
  );
}
