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

  // Estado de config do store (Zustand) — useShallow evita re-renders ao digitar
  const config = useStudioStore(useShallow((s) => ({
    isMultiSpeaker: s.isMultiSpeaker,
    setIsMultiSpeaker: s.setIsMultiSpeaker,
    speakerAName: s.speakerAName,
    setSpeakerAName: s.setSpeakerAName,
    selectedVoice: s.selectedVoice,
    setSelectedVoice: s.setSelectedVoice,
    speakerBName: s.speakerBName,
    setSpeakerBName: s.setSpeakerBName,
    speakerBVoice: s.speakerBVoice,
    setSpeakerBVoice: s.setSpeakerBVoice,
    audioProfile: s.audioProfile,
    setAudioProfile: s.setAudioProfile,
    scene: s.scene,
    setScene: s.setScene,
    pace: s.pace,
    setPace: s.setPace,
    styleNotes: s.styleNotes,
    setStyleNotes: s.setStyleNotes,
    script: s.script,
    setScript: s.setScript,
    generateScenes: s.generateScenes,
    setGenerateScenes: s.setGenerateScenes,
    sceneDensity: s.sceneDensity,
    setSceneDensity: s.setSceneDensity,
    sceneRatio: s.sceneRatio,
    setSceneRatio: s.setSceneRatio,
    visualFramework: s.visualFramework,
    setVisualFramework: s.setVisualFramework,
    referenceImage: s.referenceImage,
    setReferenceImage: s.setReferenceImage,
  })));

  return (
    <Grid container spacing={{ xs: 3, lg: 4 }}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Inspector
          isMultiSpeaker={config.isMultiSpeaker}
          setIsMultiSpeaker={config.setIsMultiSpeaker}
          speakerAName={config.speakerAName}
          setSpeakerAName={config.setSpeakerAName}
          selectedVoice={config.selectedVoice}
          setSelectedVoice={config.setSelectedVoice}
          speakerBName={config.speakerBName}
          setSpeakerBName={config.setSpeakerBName}
          speakerBVoice={config.speakerBVoice}
          setSpeakerBVoice={config.setSpeakerBVoice}
          audioProfile={config.audioProfile}
          setAudioProfile={config.setAudioProfile}
          scene={config.scene}
          setScene={config.setScene}
          pace={config.pace}
          setPace={config.setPace}
          styleNotes={config.styleNotes}
          setStyleNotes={config.setStyleNotes}
          isGenerating={isGenerating}
          generateScenes={config.generateScenes}
          setGenerateScenes={config.setGenerateScenes}
          sceneDensity={config.sceneDensity}
          setSceneDensity={config.setSceneDensity}
          sceneRatio={config.sceneRatio}
          setSceneRatio={config.setSceneRatio}
          visualFramework={config.visualFramework}
          setVisualFramework={config.setVisualFramework}
          referenceImage={config.referenceImage}
          setReferenceImage={config.setReferenceImage}
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <ScriptEditor
          script={config.script}
          setScript={config.setScript}
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
