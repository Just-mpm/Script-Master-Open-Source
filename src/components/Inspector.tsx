import React, { useState } from 'react';
import { Volume2, Settings2, CheckCircle2, Image as ImageIcon, ChevronDown, ChevronUp, Users, Play, Pause, Loader2 } from 'lucide-react';
import { VOICES } from '../lib/constants';
import { useVoicePreviews } from '../hooks/useVoicePreviews';

interface InspectorProps {
  isMultiSpeaker: boolean;
  setIsMultiSpeaker: (val: boolean) => void;
  speakerAName: string;
  setSpeakerAName: (val: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  speakerBName: string;
  setSpeakerBName: (val: string) => void;
  speakerBVoice: string;
  setSpeakerBVoice: (voice: string) => void;
  audioProfile: string;
  setAudioProfile: (profile: string) => void;
  scene: string;
  setScene: (scene: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  styleNotes: string;
  setStyleNotes: (notes: string) => void;
  isGenerating: boolean;
  generateScenes: boolean;
  setGenerateScenes: (generate: boolean) => void;
  sceneDensity: number;
  setSceneDensity: (density: number) => void;
  sceneRatio: '16:9' | '9:16' | '1:1';
  setSceneRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  visualFramework: string;
  setVisualFramework: (framework: string) => void;
  referenceImage: string | null;
  setReferenceImage: (img: string | null) => void;
}

export function Inspector({
  isMultiSpeaker,
  setIsMultiSpeaker,
  speakerAName,
  setSpeakerAName,
  selectedVoice,
  setSelectedVoice,
  speakerBName,
  setSpeakerBName,
  speakerBVoice,
  setSpeakerBVoice,
  audioProfile,
  setAudioProfile,
  scene,
  setScene,
  pace,
  setPace,
  styleNotes,
  setStyleNotes,
  isGenerating,
  generateScenes,
  setGenerateScenes,
  sceneDensity,
  setSceneDensity,
  sceneRatio,
  setSceneRatio,
  visualFramework,
  setVisualFramework,
  referenceImage,
  setReferenceImage
}: InspectorProps) {
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(true);
  const [isDirectionCollapsed, setIsDirectionCollapsed] = useState(true);
  const [activeVoiceTab, setActiveVoiceTab] = useState<'A' | 'B'>('A');

  const { 
    playingId, 
    isGeneratingBatch, 
    batchProgress, 
    playPreview, 
    generateAllPreviews, 
    isAdmin 
  } = useVoicePreviews();

  return (
    <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 lg:gap-6" role="complementary" aria-label="Configurações de voz e direção">
      {/* Voice Selector Card */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <button 
          onClick={() => setIsVoiceCollapsed(!isVoiceCollapsed)}
          className="w-full flex items-center justify-between p-5 lg:cursor-default"
        >
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            Voz do Locutor
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-tertiary)] hidden sm:inline">{VOICES.length} opções</span>
            <div className="lg:hidden">
              {isVoiceCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>
        </button>
        
        <div className={`p-5 pt-0 flex flex-col gap-4 ${isVoiceCollapsed ? 'hidden lg:flex' : 'flex'}`}>
          <label className="flex items-center gap-3 cursor-pointer group mb-2 border border-[var(--border)] p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
            <div className="relative flex items-center justify-center shrink-0">
              <input 
                type="checkbox" 
                checked={isMultiSpeaker}
                onChange={(e) => setIsMultiSpeaker(e.target.checked)}
                disabled={isGenerating}
                className="peer sr-only"
              />
              <div className="w-9 h-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-colors duration-300"></div>
              <div className="absolute left-1 top-1 w-3 h-3 bg-[var(--text-secondary)] rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-transform duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                Modo Podcast (2 Vozes)
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)]">Permite que dois locutores interajam em um único roteiro</span>
            </div>
          </label>

          {isMultiSpeaker && (
             <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl mb-2">
               <button onClick={() => setActiveVoiceTab('A')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeVoiceTab === 'A' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-tertiary)]'}`}>Voz A</button>
               <button onClick={() => setActiveVoiceTab('B')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeVoiceTab === 'B' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-tertiary)]'}`}>Voz B</button>
             </div>
          )}

          {isMultiSpeaker && (
             <div className="mb-2">
                <input type="text"
                       value={activeVoiceTab === 'A' ? speakerAName : speakerBName}
                       onChange={(e) => activeVoiceTab === 'A' ? setSpeakerAName(e.target.value) : setSpeakerBName(e.target.value)}
                       disabled={isGenerating}
                       placeholder={`Nome no Roteiro (ex: Voz ${activeVoiceTab})`}
                       title="Digite o nome deste locutor exatamente como aparece no roteiro (Ex: 'Voz A:')"
                       className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <div className="text-[9px] text-[var(--text-tertiary)] mt-1 ml-1 cursor-help" title={`No editor, escreva '${activeVoiceTab === 'A' ? speakerAName : speakerBName}:' antes da fala desta pessoa.`}>Como interagir?</div>
             </div>
          )}

          <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1" role="listbox" aria-label="Seleção de voz">
            {VOICES.map((voice) => {
              const isActiveVoice = activeVoiceTab === 'A' ? selectedVoice === voice.id : speakerBVoice === voice.id;
              const isPlaying = playingId === voice.id;
              
              return (
              <div key={voice.id} className="relative group/voice">
                <button
                  onClick={() => activeVoiceTab === 'A' ? setSelectedVoice(voice.id) : setSpeakerBVoice(voice.id)}
                  disabled={isGenerating}
                  role="option"
                  aria-selected={isActiveVoice}
                  className={`w-full flex flex-col items-start p-3 rounded-xl text-left transition-all duration-200 ${
                    isActiveVoice
                      ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/50 shadow-[0_0_15px_var(--accent-glow)]'
                      : 'bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-hover)]'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-sm font-medium ${isActiveVoice ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {voice.name}
                    </span>
                    {isActiveVoice && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{voice.style}</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playPreview(voice.id);
                  }}
                  title="Ouvir amostra"
                  className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all ${
                    isPlaying 
                      ? 'bg-[var(--accent)] text-white' 
                      : 'bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:bg-[var(--accent)] hover:text-white opacity-0 group-hover/voice:opacity-100'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            )})}
          </div>

          {isAdmin && (
             <div className="mt-2 pt-2 border-t border-[var(--border)]">
               {isGeneratingBatch ? (
                 <div className="flex flex-col gap-2">
                   <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                     <span>GERANDO PRÉVIAS...</span>
                     <span>{Math.round(batchProgress)}%</span>
                   </div>
                   <div className="h-1 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                     <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${batchProgress}%` }}></div>
                   </div>
                 </div>
               ) : (
                 <button 
                  onClick={generateAllPreviews}
                  className="w-full py-2 px-3 bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] text-[9px] font-bold uppercase tracking-widest rounded-lg border border-dashed border-[var(--border)] transition-all flex items-center justify-center gap-2"
                 >
                   <Loader2 className="w-3 h-3" />
                   Gerar Todas as Prévias (Admin)
                 </button>
               )}
             </div>
          )}
        </div>
      </div>

      {/* Direction Context Card */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <button 
          onClick={() => setIsDirectionCollapsed(!isDirectionCollapsed)}
          className="w-full flex items-center justify-between p-5 lg:cursor-default"
        >
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
            Direção de Arte
          </h2>
          <div className="lg:hidden">
            {isDirectionCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>
        
        <div className={`p-5 pt-0 flex flex-col gap-5 ${isDirectionCollapsed ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-4">
            <div>
              <label htmlFor="character-input" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Personagem</label>
              <input 
                id="character-input"
                type="text" 
                value={audioProfile}
                onChange={(e) => setAudioProfile(e.target.value)}
                disabled={isGenerating}
                placeholder='Ex: "Jaz R., The Morning Hype"' 
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent-glow)] transition-all placeholder:text-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div>
              <label htmlFor="scene-input" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Ambiente</label>
              <textarea 
                id="scene-input"
                value={scene}
                onChange={(e) => setScene(e.target.value)}
                disabled={isGenerating}
                placeholder='Ex: "Estúdio de rádio, 10 PM. Caótico."' 
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent-glow)] transition-all resize-none h-20 placeholder:text-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed custom-scrollbar"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pace-select" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Ritmo</label>
                <select
                  id="pace-select"
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent-glow)] transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="very_slow">Muito Lento</option>
                  <option value="slow">Lento</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Rápido</option>
                  <option value="very_fast">Muito Rápido</option>
                </select>
              </div>

              <div>
                <label htmlFor="accent-input" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">Sotaque</label>
                <input 
                  id="accent-input"
                  type="text"
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                  disabled={isGenerating}
                  placeholder='Ex: "Paulista"' 
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent-glow)] transition-all placeholder:text-[var(--text-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="pt-2 border-t border-[var(--border)]">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={generateScenes}
                    onChange={(e) => setGenerateScenes(e.target.checked)}
                    disabled={isGenerating}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-colors duration-300"></div>
                  <div className="absolute left-1 top-1 w-3 h-3 bg-[var(--text-secondary)] rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-transform duration-300"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Gerar Cenas Visuais
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">Transforma o áudio num vídeo narrado.</span>
                </div>
              </label>

              {generateScenes && (
                <div className="mt-4 grid grid-cols-2 gap-3 pl-1">
                  <div className="col-span-2">
                    <label htmlFor="framework-select" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">Identidade Visual do Canal</label>
                    <select
                      id="framework-select"
                      value={visualFramework}
                      onChange={(e) => setVisualFramework(e.target.value)}
                      disabled={isGenerating}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="general">Cenário Padrão (Arte Guiada pelo Roteiro)</option>
                      <option value="whiteboard">Whiteboard Master (Desenho com Legendas)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ratio-select" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">Formato</label>
                    <select
                      id="ratio-select"
                      value={sceneRatio}
                      onChange={(e) => setSceneRatio(e.target.value as any)}
                      disabled={isGenerating}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="16:9">YouTube (16:9 Horizontal)</option>
                      <option value="9:16">Shorts/TikTok (9:16 Vertical)</option>
                      <option value="1:1">Instagram (1:1 Quadrado)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="density-select" className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">Frequência</label>
                    <select
                      id="density-select"
                      value={sceneDensity}
                      onChange={(e) => setSceneDensity(Number(e.target.value))}
                      disabled={isGenerating}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="15">Muito Rápido (15s)</option>
                      <option value="30">Dinâmico (30s)</option>
                      <option value="60">Lento (1min)</option>
                      <option value="120">Muito Lento (2min)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">Imagem de Referência (Opcional)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        disabled={isGenerating}
                        className="hidden"
                        id="reference-image-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setReferenceImage(result.split(',')[1]);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label 
                        htmlFor="reference-image-upload"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/10 text-[var(--text-secondary)] hover:text-[var(--accent)] text-[10px] font-bold tracking-wider rounded-lg border border-dashed ${referenceImage ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)]'} transition-all cursor-pointer ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        {referenceImage ? 'Imagem Selecionada (Trocar)' : 'Anexar Imagem de Personagem/Cenário'}
                      </label>
                      {referenceImage && (
                        <button
                          onClick={() => setReferenceImage(null)}
                          disabled={isGenerating}
                          className="p-2 bg-[var(--bg-bg-elevated)] hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-500 rounded-lg transition-colors border border-[var(--border)] hover:border-red-500/30"
                          title="Remover imagem"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--text-tertiary)] block mt-1">Isso ajuda a IA a manter personagens ou arte consistentes.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
