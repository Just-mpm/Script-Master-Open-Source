import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clapperboard } from 'lucide-react';

interface VideoPreviewProps {
  scenes: { imageUrl: string; timestamp: number }[];
  currentTime: number;
  script: string;
}

export function VideoPreview({ scenes, currentTime, script }: VideoPreviewProps) {
  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
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

  if (!scenes || scenes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--text-tertiary)] bg-[var(--bg-surface)] rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
          <Clapperboard className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">Gere um conteúdo com cenas visuais para ver o vídeo aqui.</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl">
      {/* Dynamic Background */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentScene?.imageUrl}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${currentScene?.imageUrl})` }}
        >
          {/* Subtle zoom effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        </motion.div>
      </AnimatePresence>

      {/* Label */}
      <div className="absolute top-4 left-4 z-50">
        <span className="px-3 py-1 bg-[var(--accent)] text-white text-[10px] font-bold rounded-xl border-none uppercase shadow-lg">Preview de Vídeo</span>
      </div>
    </div>
  );
}
