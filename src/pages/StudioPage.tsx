import Grid from '@mui/material/Grid';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useGlobalAudioState } from '../contexts/AudioContext';
import type { StudioStateController } from '../features/studio/useStudioState';

type StudioPageProps = Pick<
  StudioStateController,
  | 'audioProfile'
  | 'generateScenes'
  | 'handleGenerate'
  | 'isGenerateDisabled'
  | 'isGenerating'
  | 'isMultiSpeaker'
  | 'pace'
  | 'referenceImage'
  | 'scene'
  | 'sceneDensity'
  | 'sceneRatio'
  | 'scenes'
  | 'script'
  | 'selectedVoice'
  | 'setAudioProfile'
  | 'setGenerateScenes'
  | 'setIsMultiSpeaker'
  | 'setPace'
  | 'setReferenceImage'
  | 'setScene'
  | 'setSceneDensity'
  | 'setSceneRatio'
  | 'setScript'
  | 'setSelectedVoice'
  | 'setSpeakerAName'
  | 'setSpeakerBName'
  | 'setSpeakerBVoice'
  | 'setStyleNotes'
  | 'setVisualFramework'
  | 'speakerAName'
  | 'speakerBName'
  | 'speakerBVoice'
  | 'styleNotes'
  | 'visualFramework'
>;

export function StudioPage({
  audioProfile,
  generateScenes,
  handleGenerate,
  isGenerateDisabled,
  isGenerating,
  isMultiSpeaker,
  pace,
  referenceImage,
  scene,
  sceneDensity,
  sceneRatio,
  scenes,
  script,
  selectedVoice,
  setAudioProfile,
  setGenerateScenes,
  setIsMultiSpeaker,
  setPace,
  setReferenceImage,
  setScene,
  setSceneDensity,
  setSceneRatio,
  setScript,
  setSelectedVoice,
  setSpeakerAName,
  setSpeakerBName,
  setSpeakerBVoice,
  setStyleNotes,
  setVisualFramework,
  speakerAName,
  speakerBName,
  speakerBVoice,
  styleNotes,
  visualFramework,
}: StudioPageProps) {
  const { currentTime } = useGlobalAudioState();

  return (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Inspector
          isMultiSpeaker={isMultiSpeaker}
          setIsMultiSpeaker={setIsMultiSpeaker}
          speakerAName={speakerAName}
          setSpeakerAName={setSpeakerAName}
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          speakerBName={speakerBName}
          setSpeakerBName={setSpeakerBName}
          speakerBVoice={speakerBVoice}
          setSpeakerBVoice={setSpeakerBVoice}
          audioProfile={audioProfile}
          setAudioProfile={setAudioProfile}
          scene={scene}
          setScene={setScene}
          pace={pace}
          setPace={setPace}
          styleNotes={styleNotes}
          setStyleNotes={setStyleNotes}
          isGenerating={isGenerating}
          generateScenes={generateScenes}
          setGenerateScenes={setGenerateScenes}
          sceneDensity={sceneDensity}
          setSceneDensity={setSceneDensity}
          sceneRatio={sceneRatio}
          setSceneRatio={setSceneRatio}
          visualFramework={visualFramework}
          setVisualFramework={setVisualFramework}
          referenceImage={referenceImage}
          setReferenceImage={setReferenceImage}
        />
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
