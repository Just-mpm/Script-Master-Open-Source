import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full glass-panel border-red-500/20 bg-red-950/40 shadow-[0_10px_40px_rgba(239,68,68,0.15)] backdrop-blur-xl"
        >
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-200/90 whitespace-nowrap">{error}</p>
          <button 
            onClick={onDismiss} 
            className="ml-2 w-6 h-6 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400/70 hover:text-red-300 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
