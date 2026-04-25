import { useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Inspector } from '../components/Inspector';
import { ScriptEditor } from '../components/ScriptEditor';
import { useAudioCurrentTime } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useAudioGenerator } from '../hooks/useAudioGenerator';
import { MAX_CHARS } from '../lib/constants';
import { useStudioStore, buildGenerateOptions } from '../features/studio/store';
import { useShallow } from 'zustand/react/shallow';

export function StudioPage() {
  const { user } = useAuth();
  const currentTime = useAudioCurrentTime();

  // Estado de config do store (Zustand) — useShallow evita re-renders ao digitar
  const config = useStudioStore(useShallow((s) => ({
    script: s.script,
    setScript: s.setScript,
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

  // Estado de geração de áudio (hook)
  const { isGenerating, scenes, generateAudio } = useAudioGenerator();

  // Derivação
  const isGenerateDisabled = isGenerating || !config.script.trim() || config.script.length > MAX_CHARS;

  // handleGenerate: lê config do store via getState() no momento da execução.
  // Deps apenas em generateAudio (estável via useCallback) e userId.
  const handleGenerate = useCallback(() => {
    generateAudio(buildGenerateOptions(user?.uid, useStudioStore.getState()));
  }, [generateAudio, user?.uid]);

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
