import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { ScriptEditor } from './components/ScriptEditor';
import { ImageStudio } from './components/ImageStudio';
import { ActionBar } from './components/ActionBar';
import { ErrorToast } from './components/ErrorToast';
import { SuccessToast } from './components/SuccessToast';
import { Assistant } from './components/Assistant';
import { Library } from './components/Library';
import { VideoPreview } from './components/VideoPreview';
import { VideoLibrary } from './components/VideoLibrary';
import { useAudioGenerator } from './hooks/useAudioGenerator';
import { useGlobalAudio } from './contexts/AudioContext';
import { useAuth } from './contexts/AuthContext';
import { AssistantSettings } from './hooks/useAssistant';
import { saveGeneration, SavedAudio } from './lib/db';
import { VOICES, MAX_CHARS } from './lib/constants';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  
  const [script, setScript] = useState(() => localStorage.getItem('s2a_script') || '');
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(() => localStorage.getItem('s2a_multi') === 'true');
  const [speakerAName, setSpeakerAName] = useState(() => localStorage.getItem('s2a_spaname') || 'Voz A');
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('s2a_voice') || VOICES[0].id);
  const [speakerBName, setSpeakerBName] = useState(() => localStorage.getItem('s2a_spbname') || 'Voz B');
  const [speakerBVoice, setSpeakerBVoice] = useState(() => localStorage.getItem('s2a_spbvoice') || VOICES[1].id);
  
  const [audioProfile, setAudioProfile] = useState(() => localStorage.getItem('s2a_profile') || '');
  const [scene, setScene] = useState(() => localStorage.getItem('s2a_scene') || '');
  const [styleNotes, setStyleNotes] = useState(() => localStorage.getItem('s2a_notes') || '');
  const [pace, setPace] = useState(() => localStorage.getItem('s2a_pace') || 'normal');
  const [generateScenes, setGenerateScenes] = useState(() => localStorage.getItem('s2a_gen_scenes') === 'true');
  const [sceneDensity, setSceneDensity] = useState(() => Number(localStorage.getItem('s2a_scene_density')) || 15);
  const [sceneRatio, setSceneRatio] = useState<'16:9' | '9:16' | '1:1'>(() => (localStorage.getItem('s2a_scene_ratio') as '16:9' | '9:16' | '1:1') || '16:9');
  const [visualFramework, setVisualFramework] = useState(() => localStorage.getItem('s2a_visual_framework') || 'general');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

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
    projectId: currentProjectId
  } = useAudioGenerator();

  const {
    isPlaying,
    progress,
    currentTime,
    duration,
    activeId,
    play,
    toggle,
    seek,
    formatTime
  } = useGlobalAudio();

  const isGenerateDisabled = isGenerating || !script.trim() || script.length > MAX_CHARS;

  const handleGenerate = () => {
    setIsSaved(false);
    generateAudio({
      userId: user?.uid,
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
      referenceImage
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerateDisabled && currentPath === '/') {
          e.preventDefault();
          handleGenerate();
        }
      }

      if (e.code === 'Space' && !isTyping) {
        if (activeId === 'studio' && !isGenerating) {
          e.preventDefault();
          toggle('studio');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioUrl, isGenerating, isGenerateDisabled, currentPath, activeId, toggle, handleGenerate]);

  // Auto-save state
  useEffect(() => {
    localStorage.setItem('s2a_script', script);
    localStorage.setItem('s2a_voice', selectedVoice);
    localStorage.setItem('s2a_multi', String(isMultiSpeaker));
    localStorage.setItem('s2a_spaname', speakerAName);
    localStorage.setItem('s2a_spbvoice', speakerBVoice);
    localStorage.setItem('s2a_spbname', speakerBName);
    localStorage.setItem('s2a_profile', audioProfile);
    localStorage.setItem('s2a_scene', scene);
    localStorage.setItem('s2a_notes', styleNotes);
    localStorage.setItem('s2a_pace', pace);
    localStorage.setItem('s2a_gen_scenes', String(generateScenes));
    localStorage.setItem('s2a_scene_density', String(sceneDensity));
    localStorage.setItem('s2a_scene_ratio', sceneRatio);
    localStorage.setItem('s2a_visual_framework', visualFramework);
  }, [script, selectedVoice, isMultiSpeaker, speakerAName, speakerBVoice, speakerBName, audioProfile, scene, styleNotes, pace, generateScenes, sceneDensity, sceneRatio, visualFramework]);

  const handleApplySettings = (settings: AssistantSettings) => {
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
  };

  const handleDownload = () => {
    if (audioUrl) {
      const safeVoiceName = selectedVoice.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `roteiro-${safeVoiceName}-${new Date().getTime()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!audioBlob || isSaved) return;
    try {
      const voiceLabel = isMultiSpeaker ? `${selectedVoice} & ${speakerBVoice}` : selectedVoice;
      const newItem: SavedAudio = {
        id: crypto.randomUUID(),
        name: `Roteiro - ${voiceLabel} - ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        audioBlob: audioBlob,
        script,
        voice: voiceLabel,
        scenes: scenes.length > 0 ? scenes : []
      };
      
      await saveGeneration(newItem, user?.uid);
      setIsSaved(true);
      setSuccessMsg(user ? 'Áudio salvo na nuvem com sucesso!' : 'Áudio salvo na biblioteca local!');
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar na biblioteca.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)]/30">
      <Header />

      <main className={`mx-auto ${currentPath === '/assistant' ? 'w-full h-[calc(100vh-4rem)] p-0 overflow-hidden' : 'max-w-[1600px] p-4 md:p-6 lg:p-8 pb-32'}`}>
        <Routes>
          <Route path="/" element={
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
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

              <ScriptEditor 
                script={script}
                setScript={setScript}
                isGenerating={isGenerating}
                handleGenerate={handleGenerate}
                isGenerateDisabled={isGenerateDisabled}
                scenes={scenes}
                currentTime={activeId === 'studio' ? currentTime : 0}
              />
            </div>
          } />

          <Route path="/video" element={
            <div className="max-w-5xl mx-auto space-y-12">
              <div className="glass-panel rounded-[2rem] overflow-hidden aspect-video flex flex-col relative group shadow-2xl border border-[var(--border-hover)]">
                <VideoPreview 
                  scenes={scenes} 
                  currentTime={activeId === 'studio' ? currentTime : 0} 
                  script={script} 
                />
              </div>

              <VideoLibrary 
                activeProjectId={currentProjectId}
                onSelect={(pid, url, sceneList, projScript) => {
                  loadProjectData(url, sceneList, undefined, pid);
                  setScript(projScript);
                  play(url, 'studio');
                }}
              />
            </div>
          } />

          <Route path="/image" element={<ImageStudio />} />
          
          <Route path="/assistant" element={
            <div className="w-full h-full">
              <Assistant 
                onApplySettings={handleApplySettings}
                currentState={{
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
                  referenceImage
                }}
              />
            </div>
          } />

          <Route path="/library" element={
            <div className="max-w-[1600px] mx-auto">
              <Library />
            </div>
          } />
        </Routes>
      </main>

      <ErrorToast error={error} onDismiss={() => setError('')} />
      <SuccessToast message={successMsg} onDismiss={() => setSuccessMsg(null)} />

      {(currentPath === '/' || currentPath === '/video') && (
        <ActionBar 
          isGenerating={isGenerating}
          audioUrl={audioUrl}
          statusText={statusText}
          generationProgress={generationProgress}
          isPlaying={isPlaying && activeId === 'studio'}
          progress={activeId === 'studio' ? progress : 0}
          currentTime={activeId === 'studio' ? currentTime : 0}
          duration={activeId === 'studio' ? duration : 0}
          togglePlayPause={() => toggle('studio')}
          handleSeek={(e) => {
            if (activeId === 'studio') {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              seek(percentage);
            }
          }}
          handleDownload={handleDownload}
          handleCancel={handleCancel}
          handleSaveToLibrary={handleSaveToLibrary}
          isSaved={isSaved}
          formatTime={formatTime}
          scenes={scenes}
        />
      )}
    </div>
  );
}
