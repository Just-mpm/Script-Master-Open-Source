import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useGlobalAudioActions } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioGenerator } from '../../hooks/useAudioGenerator';
import { MAX_CHARS, VOICES } from '../../lib/constants';
import { saveGeneration, type SavedAudio } from '../../lib/db';
import type { SceneRatio, StudioDraftState, StudioSettingsPatch } from './types';

const STORAGE_KEYS = {
  script: 's2a_script',
  isMultiSpeaker: 's2a_multi',
  speakerAName: 's2a_spaname',
  selectedVoice: 's2a_voice',
  speakerBName: 's2a_spbname',
  speakerBVoice: 's2a_spbvoice',
  audioProfile: 's2a_profile',
  scene: 's2a_scene',
  styleNotes: 's2a_notes',
  pace: 's2a_pace',
  generateScenes: 's2a_gen_scenes',
  sceneDensity: 's2a_scene_density',
  sceneRatio: 's2a_scene_ratio',
  visualFramework: 's2a_visual_framework',
  hasReferenceImage: 's2a_has_ref_image',
} as const;

const SCENE_RATIOS: SceneRatio[] = ['16:9', '9:16', '1:1'];

/** FPS padrão para composição de vídeo Remotion */
const VIDEO_FPS = 30;

/** Salva no localStorage silenciando erros de quota/segurança (preferências não-críticas) */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari Private Browsing lança SecurityError; quota cheia lança QuotaExceededError
    // Preferências não são críticas — falha silenciosa
  }
}

function getStoredValue(key: string, fallbackValue: string): string {
  return localStorage.getItem(key) ?? fallbackValue;
}

function getStoredBoolean(key: string, fallbackValue = false): boolean {
  const storedValue = localStorage.getItem(key);
  return storedValue === null ? fallbackValue : storedValue === 'true';
}

function getStoredNumber(key: string, fallbackValue: number): number {
  const storedValue = Number(localStorage.getItem(key));

  return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : fallbackValue;
}

function isSceneRatio(value: string | null): value is SceneRatio {
  return value !== null && SCENE_RATIOS.includes(value as SceneRatio);
}

function getStoredSceneRatio(): SceneRatio {
  const storedValue = localStorage.getItem(STORAGE_KEYS.sceneRatio);
  return isSceneRatio(storedValue) ? storedValue : '16:9';
}

type StringSetter = Dispatch<SetStateAction<string>>;
type BooleanSetter = Dispatch<SetStateAction<boolean>>;
type NumberSetter = Dispatch<SetStateAction<number>>;
type SceneRatioSetter = Dispatch<SetStateAction<SceneRatio>>;
type NullableStringSetter = Dispatch<SetStateAction<string | null>>;

export function useStudioState() {
  const { user } = useAuth();
  const userId = user?.uid;
  const [script, setScript] = useState(() => getStoredValue(STORAGE_KEYS.script, ''));
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(() => getStoredBoolean(STORAGE_KEYS.isMultiSpeaker));
  const [speakerAName, setSpeakerAName] = useState(() => getStoredValue(STORAGE_KEYS.speakerAName, 'Voz A'));
  const [selectedVoice, setSelectedVoice] = useState(() => getStoredValue(STORAGE_KEYS.selectedVoice, VOICES[0]?.id ?? ''));
  const [speakerBName, setSpeakerBName] = useState(() => getStoredValue(STORAGE_KEYS.speakerBName, 'Voz B'));
  const [speakerBVoice, setSpeakerBVoice] = useState(() => getStoredValue(STORAGE_KEYS.speakerBVoice, VOICES[1]?.id ?? VOICES[0]?.id ?? ''));
  const [audioProfile, setAudioProfile] = useState(() => getStoredValue(STORAGE_KEYS.audioProfile, ''));
  const [scene, setScene] = useState(() => getStoredValue(STORAGE_KEYS.scene, ''));
  const [styleNotes, setStyleNotes] = useState(() => getStoredValue(STORAGE_KEYS.styleNotes, ''));
  const [pace, setPace] = useState(() => getStoredValue(STORAGE_KEYS.pace, 'normal'));
  const [generateScenes, setGenerateScenes] = useState(() => getStoredBoolean(STORAGE_KEYS.generateScenes));
  const [sceneDensity, setSceneDensity] = useState(() => getStoredNumber(STORAGE_KEYS.sceneDensity, 15));
  const [sceneRatio, setSceneRatio] = useState<SceneRatio>(() => getStoredSceneRatio());
  const [visualFramework, setVisualFramework] = useState(() => getStoredValue(STORAGE_KEYS.visualFramework, 'general'));
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { play, setDurationOverride } = useGlobalAudioActions();

  const {
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    error,
    setError,
    generateAudio,
    handleCancel,
    loadProjectData,
    projectId,
    durationInSeconds,
  } = useAudioGenerator();

  const isGenerateDisabled = isGenerating || !script.trim() || script.length > MAX_CHARS;

  // Sincroniza a duração calculada do blob WAV com o AudioContext
  // para que o player mostre a duração real mesmo sem loadedmetadata
  useEffect(() => {
    setDurationOverride(durationInSeconds > 0 ? durationInSeconds : null);
  }, [durationInSeconds, setDurationOverride]);

  // Duração total do vídeo em frames (derivada do áudio e FPS)
  const durationInFrames = useMemo(
    () => Math.round(durationInSeconds * VIDEO_FPS),
    [durationInSeconds],
  );

  const currentState = useMemo<StudioDraftState>(
    () => ({
      script,
      selectedVoice,
      isMultiSpeaker,
      audioProfile,
      scene,
      pace,
      styleNotes,
      generateScenes,
      sceneRatio,
      sceneDensity,
      visualFramework,
      referenceImage,
    }),
    [
      audioProfile,
      generateScenes,
      isMultiSpeaker,
      pace,
      referenceImage,
      scene,
      sceneDensity,
      sceneRatio,
      script,
      selectedVoice,
      styleNotes,
      visualFramework,
    ],
  );

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.script, script);
    safeSetItem(STORAGE_KEYS.selectedVoice, selectedVoice);
    safeSetItem(STORAGE_KEYS.isMultiSpeaker, String(isMultiSpeaker));
    safeSetItem(STORAGE_KEYS.speakerAName, speakerAName);
    safeSetItem(STORAGE_KEYS.speakerBVoice, speakerBVoice);
    safeSetItem(STORAGE_KEYS.speakerBName, speakerBName);
    safeSetItem(STORAGE_KEYS.audioProfile, audioProfile);
    safeSetItem(STORAGE_KEYS.scene, scene);
    safeSetItem(STORAGE_KEYS.styleNotes, styleNotes);
    safeSetItem(STORAGE_KEYS.pace, pace);
    safeSetItem(STORAGE_KEYS.generateScenes, String(generateScenes));
    safeSetItem(STORAGE_KEYS.sceneDensity, String(sceneDensity));
    safeSetItem(STORAGE_KEYS.sceneRatio, sceneRatio);
    safeSetItem(STORAGE_KEYS.visualFramework, visualFramework);
    safeSetItem(STORAGE_KEYS.hasReferenceImage, String(referenceImage !== null));
  }, [
    audioProfile,
    generateScenes,
    isMultiSpeaker,
    pace,
    referenceImage,
    scene,
    sceneDensity,
    sceneRatio,
    script,
    selectedVoice,
    speakerAName,
    speakerBName,
    speakerBVoice,
    styleNotes,
    visualFramework,
  ]);

  const handleGenerate = useCallback(() => {
    setIsSaved(false);
    generateAudio({
      userId,
      projectName: `Projeto ${new Date().toLocaleDateString()}`,
      script,
      selectedVoice,
      audioProfile,
      scene,
      pace,
      styleNotes,
      generateScenes,
      isMultiSpeaker,
      speakerAName,
      speakerBVoice,
      speakerBName,
      sceneDensity,
      sceneRatio,
      visualFramework,
      referenceImage,
    });
  }, [
    audioProfile,
    generateAudio,
    generateScenes,
    isMultiSpeaker,
    pace,
    referenceImage,
    scene,
    sceneDensity,
    sceneRatio,
    script,
    selectedVoice,
    speakerAName,
    speakerBName,
    speakerBVoice,
    styleNotes,
    userId,
    visualFramework,
  ]);

  const handleApplySettings = useCallback((settings: StudioSettingsPatch) => {
    if (settings.script !== undefined) setScript(settings.script);
    if (settings.isMultiSpeaker !== undefined) setIsMultiSpeaker(settings.isMultiSpeaker);
    if (settings.speakerAName !== undefined) setSpeakerAName(settings.speakerAName);
    if (settings.speakerBVoice !== undefined) setSpeakerBVoice(settings.speakerBVoice);
    if (settings.speakerBName !== undefined) setSpeakerBName(settings.speakerBName);
    if (settings.selectedVoice !== undefined) setSelectedVoice(settings.selectedVoice);
    if (settings.audioProfile !== undefined) setAudioProfile(settings.audioProfile);
    if (settings.scene !== undefined) setScene(settings.scene);
    if (settings.pace !== undefined) setPace(settings.pace);
    if (settings.styleNotes !== undefined) setStyleNotes(settings.styleNotes);
    if (settings.generateScenes !== undefined) setGenerateScenes(settings.generateScenes);
    if (settings.sceneDensity !== undefined) setSceneDensity(settings.sceneDensity);
    if (settings.sceneRatio !== undefined) setSceneRatio(settings.sceneRatio);
    if (settings.visualFramework !== undefined) setVisualFramework(settings.visualFramework);
  }, []);

  const handleDownload = useCallback(() => {
    if (!audioUrl) {
      return;
    }

    const safeVoiceName = selectedVoice.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = `roteiro-${safeVoiceName}-${Date.now()}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [audioUrl, selectedVoice]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!audioBlob || isSaved) {
      return;
    }

    try {
      const voiceLabel = isMultiSpeaker ? `${selectedVoice} & ${speakerBVoice}` : selectedVoice;
      const newItem: SavedAudio = {
        id: crypto.randomUUID(),
        name: `Roteiro - ${voiceLabel} - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        audioBlob,
        script,
        voice: voiceLabel,
        scenes: scenes.length > 0 ? scenes : [],
      };

      await saveGeneration(newItem, user?.uid);
      setIsSaved(true);
      setSuccessMsg(user ? 'Áudio salvo na nuvem com sucesso!' : 'Áudio salvo na biblioteca local!');
    } catch (saveError: unknown) {
      console.error(saveError);
      setError('Erro ao salvar na biblioteca.');
    }
  }, [audioBlob, isMultiSpeaker, isSaved, scenes, script, selectedVoice, setError, speakerBVoice, user]);

  return {
    script,
    setScript: setScript as StringSetter,
    isMultiSpeaker,
    setIsMultiSpeaker: setIsMultiSpeaker as BooleanSetter,
    speakerAName,
    setSpeakerAName: setSpeakerAName as StringSetter,
    selectedVoice,
    setSelectedVoice: setSelectedVoice as StringSetter,
    speakerBName,
    setSpeakerBName: setSpeakerBName as StringSetter,
    speakerBVoice,
    setSpeakerBVoice: setSpeakerBVoice as StringSetter,
    audioProfile,
    setAudioProfile: setAudioProfile as StringSetter,
    scene,
    setScene: setScene as StringSetter,
    pace,
    setPace: setPace as StringSetter,
    styleNotes,
    setStyleNotes: setStyleNotes as StringSetter,
    generateScenes,
    setGenerateScenes: setGenerateScenes as BooleanSetter,
    sceneDensity,
    setSceneDensity: setSceneDensity as NumberSetter,
    sceneRatio,
    setSceneRatio: setSceneRatio as SceneRatioSetter,
    visualFramework,
    setVisualFramework: setVisualFramework as StringSetter,
    referenceImage,
    setReferenceImage: setReferenceImage as NullableStringSetter,
    successMsg,
    setSuccessMsg,
    isSaved,
    isGenerateDisabled,
    currentState,
    isGenerating,
    statusText,
    generationProgress,
    audioUrl,
    audioBlob,
    scenes,
    error,
    setError,
    handleGenerate,
    handleApplySettings,
    handleDownload,
    handleCancel,
    handleSaveToLibrary,
    loadProjectData,
    currentProjectId: projectId,
    play,
    // Valores derivados para integração Remotion
    videoFps: VIDEO_FPS,
    durationInSeconds,
    durationInFrames,
  };
}

export type StudioStateController = ReturnType<typeof useStudioState>;
