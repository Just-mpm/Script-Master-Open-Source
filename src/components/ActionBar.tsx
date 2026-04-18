import React, { RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Download, Bookmark, Check } from 'lucide-react';

interface ActionBarProps {
  isGenerating: boolean;
  audioUrl: string | null;
  statusText: string;
  generationProgress: number;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  togglePlayPause: () => void;
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleDownload: () => void;
  handleCancel: () => void;
  handleSaveToLibrary?: () => void;
  isSaved?: boolean;
  formatTime: (time: number) => string;
  scenes?: { imageUrl: string; timestamp: number }[];
}

export function ActionBar({
  isGenerating,
  audioUrl,
  statusText,
  generationProgress,
  isPlaying,
  progress,
  currentTime,
  duration,
  togglePlayPause,
  handleSeek,
  handleDownload,
  handleCancel,
  handleSaveToLibrary,
  isSaved,
  formatTime,
  scenes = []
}: ActionBarProps) {
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);
  if (!isGenerating && !audioUrl) return null;

  const showPlayer = !!audioUrl;
  const showProgressBar = isGenerating && !audioUrl;
  const isImagePhase = isGenerating && audioUrl;

  const downloadFileWithProxy = async (url: string, filename: string) => {
    try {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy falhou');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback
      if (url.startsWith('blob:') || url.startsWith('data:')) return;
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = proxyUrl;
      a.download = filename;
      a.target = "_blank";
      a.click();
    }
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full px-2 sm:px-4" role="region" aria-label="Controles de áudio e geração">
      {isImagePhase && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg glass-panel rounded-full px-4 py-1.5 flex items-center gap-3 pointer-events-auto border border-[var(--border)] shadow-xl"
        >
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                {statusText || 'Gerando cenas visuais...'}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{generationProgress}%</span>
            </div>
            <div className="w-full h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
               <motion.div 
                  className="h-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]"
                  animate={{ width: `${generationProgress}%` }}
               />
            </div>
          </div>
          <button 
             onClick={handleCancel}
             className="p-1 rounde-full hover:bg-red-500/10 text-red-500 transition-colors"
             title="Cancelar geração de imagens"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        </motion.div>
      )}

      <div className={`pointer-events-auto transition-all duration-500 ease-in-out flex items-center justify-between ${
        (isGenerating || audioUrl) 
          ? 'w-full max-w-3xl glass-panel rounded-2xl sm:rounded-full p-2 pl-4 sm:pl-6 pr-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-[var(--border-hover)]' 
          : 'w-auto'
      }`}>
        
        {/* Left side: Status or Player Controls */}
        <div className="flex-1 flex items-center mr-2 sm:mr-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {showProgressBar ? (
              <motion.div 
                key="generating"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 sm:gap-3 text-[var(--accent)] w-full"
                role="status"
                aria-live="polite"
              >
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 text-[var(--accent)] w-full">
                    <div className="relative flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/20"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-transparent bg-clip-text accent-gradient animate-pulse truncate leading-none">
                      {statusText || 'Sintetizando voz...'}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] shrink-0 ml-auto leading-none">
                      {generationProgress}%
                    </span>
                  </div>
                  
                  {/* Numerical Progress Bar for Generation */}
                  <div 
                    className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden relative border border-[var(--border-base)]"
                    role="progressbar"
                    aria-label="Progresso da geração"
                    aria-valuenow={generationProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <motion.div 
                      className="absolute top-0 left-0 h-full accent-gradient shadow-[0_0_10px_var(--accent-glow)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : showPlayer ? (
              <motion.div 
                key="player"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 sm:gap-4 w-full"
              >
                <button
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pausar áudio" : "Ouvir áudio"}
                  aria-pressed={isPlaying}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full accent-gradient text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_var(--accent-glow)] shrink-0"
                >
                  {isPlaying ? <Square className="w-3 h-3 sm:w-4 sm:h-4 fill-current" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current ml-0.5 sm:ml-1" />}
                </button>
                
                <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-mono text-[var(--text-tertiary)] shrink-0" aria-label="Tempo atual">{formatTime(currentTime)}</span>
                  <div 
                    className="flex-1 h-1 sm:h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden relative cursor-pointer group"
                    onClick={handleSeek}
                    role="slider"
                    aria-label="Progresso do áudio"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <div 
                      className="absolute top-0 left-0 h-full accent-gradient transition-all duration-100 ease-linear group-hover:brightness-125"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-[var(--text-tertiary)] shrink-0" aria-label="Duração total">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {handleSaveToLibrary && (
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={isSaved}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all flex items-center justify-center ${
                        isSaved 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)] text-[var(--text-secondary)] hover:text-white'
                      }`}
                      aria-label={isSaved ? "Áudio salvo na biblioteca" : "Salvar áudio na biblioteca"}
                      title={isSaved ? "Salvo na Biblioteca" : "Salvar na Biblioteca"}
                    >
                      {isSaved ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Bookmark className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </button>
                  )}
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Opções de download"
                      title="Opções de Download"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <AnimatePresence>
                      {showDownloadMenu && (
                        <motion.div 
                           initial={{ opacity: 0, scale: 0.95, y: 10 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: 10 }}
                           className="absolute bottom-full right-0 mb-3 w-48 glass-panel rounded-xl py-2 shadow-2xl border border-[var(--border)] overflow-hidden"
                        >
                           <button 
                             onClick={() => { handleDownload(); setShowDownloadMenu(false); }}
                             className="w-full text-left px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                           >
                              Download Áudio (.wav)
                           </button>
                           {scenes && scenes.length > 0 && (
                             <button 
                               onClick={() => { 
                                 scenes.forEach(async (s, idx) => {
                                   await new Promise(r => setTimeout(r, 400));
                                   downloadFileWithProxy(s.imageUrl, `cena-${idx}.png`);
                                 });
                                 setShowDownloadMenu(false);
                               }}
                               className="w-full text-left px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                             >
                                Download Todas as Imagens
                             </button>
                           )}
                           <div className="px-4 py-1.5 border-t border-[var(--border)]">
                              <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-widest">Imagens Individuais</span>
                           </div>
                           <div className="max-h-32 overflow-y-auto custom-scrollbar">
                              {scenes.map((s, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    downloadFileWithProxy(s.imageUrl, `cena-${idx}.png`);
                                    setShowDownloadMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--accent)]/5 hover:text-[var(--accent)] transition-colors flex items-center justify-between"
                                >
                                  Cena {idx + 1}
                                  <span className="text-[8px] opacity-50">{formatTime(s.timestamp)}</span>
                                </button>
                              ))}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right side: Action Button (only if not in image phase) */}
        {!isImagePhase && (
          <div className="shrink-0">
            <AnimatePresence mode="wait">
              {isGenerating && (
                <motion.button
                  key="cancel-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleCancel}
                  aria-label="Cancelar geração de áudio"
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs sm:text-sm font-bold transition-colors flex items-center gap-1 sm:gap-2 border border-red-500/20"
                >
                  <Square className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                  <span className="hidden xs:inline">Cancelar</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
