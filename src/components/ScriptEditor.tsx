import React, { useMemo, useState } from 'react';
import { Mic } from 'lucide-react';
import { MAX_CHARS } from '../lib/constants';

interface ScriptEditorProps {
  script: string;
  setScript: (script: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  isGenerateDisabled: boolean;
  scenes?: { imageUrl: string; timestamp: number }[];
  currentTime?: number;
  notes?: string;
}

export function ScriptEditor({ 
  script, 
  setScript, 
  isGenerating,
  handleGenerate,
  isGenerateDisabled,
  scenes = [],
  currentTime = 0
}: ScriptEditorProps) {
  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    // Find the last scene that has a timestamp <= currentTime
    let active = scenes[0];
    for (const scene of scenes) {
      if (scene.timestamp <= currentTime) {
        active = scene;
      } else {
        break;
      }
    }
    return active;
  }, [scenes, currentTime]);

  return (
    <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
      <div className="glass-panel rounded-3xl flex flex-col h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-12rem)] relative overflow-hidden group">
        
        {/* Scene Background */}
        {currentScene && (
          <div 
            className="absolute inset-0 z-0 transition-all duration-1000 ease-in-out bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: `url(${currentScene.imageUrl})`,
              opacity: 0.4
            }}
          />
        )}
        
        {/* Subtle gradient overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[var(--bg-surface)] to-transparent opacity-80 pointer-events-none z-10" />
        
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6 sm:pt-8 pb-4 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]" id="script-label">Script</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {script.length > 0 && !isGenerating && (
              <button 
                onClick={() => setScript('')}
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                aria-label="Limpar roteiro"
              >
                Limpar
              </button>
            )}
            <span 
              className={`text-[10px] sm:text-xs font-mono ${script.length > MAX_CHARS ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`}
              aria-label={`${script.length} de ${MAX_CHARS} caracteres utilizados`}
            >
              {script.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
        </div>

        <textarea
          id="script-editor"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          disabled={isGenerating}
          aria-labelledby="script-label"
          placeholder="Comece a escrever sua história aqui..."
          className="flex-1 w-full resize-none outline-none text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-transparent px-6 sm:px-8 pb-24 font-serif z-20 custom-scrollbar focus:ring-0 disabled:opacity-50 drop-shadow-md"
          spellCheck={false}
          maxLength={MAX_CHARS + 500}
        />
      </div>

      {/* Generate Button below the editor */}
      <div className="flex justify-center sm:justify-end mt-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          className={`
            relative group overflow-hidden
            w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-2xl 
            accent-gradient text-white font-bold text-base sm:text-lg
            shadow-[0_10px_30px_var(--accent-glow)]
            hover:shadow-[0_15px_40px_var(--accent-glow)]
            hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-300
            disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none
            flex items-center justify-center gap-3
          `}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Mic className="w-4 sm:w-5 h-4 sm:h-5" />
          <span>Gerar Áudio</span>
          <div className="hidden sm:flex ml-2 px-2 py-0.5 rounded bg-black/20 text-[10px] font-mono border border-white/10">
            ⌘ ↵
          </div>
        </button>
      </div>
    </section>
  );
}
