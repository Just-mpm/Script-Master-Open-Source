import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="glass-panel bg-green-500/10 border-green-500/20 text-green-400 px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 max-w-md">
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm flex-1 leading-relaxed">{message}</p>
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-green-500/20 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
