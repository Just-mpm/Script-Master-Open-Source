import { useEffect, type MutableRefObject } from 'react';
import type { VideoPreviewHandle } from '../components/VideoPreview';

interface UseKeyboardShortcutsOptions {
  /** Ref para o player de vídeo (controla play/pause) */
  videoPlayerRef: MutableRefObject<VideoPreviewHandle | null>;
  /** Atalho Ctrl+Enter: dispara geração no estúdio */
  onGenerate?: () => void;
  /** Indica se o estúdio está na rota ativa */
  isStudioRoute: boolean;
  /** Indica se a página de vídeo está na rota ativa */
  isVideoRoute: boolean;
  /** Indica se o estúdio está gerando áudio (bloqueia atalhos) */
  isGenerating: boolean;
  /** Indica se a geração está desabilitada (bloqueia Ctrl+Enter) */
  isGenerateDisabled: boolean;
  /** Alterna play/pause do player de áudio */
  toggleAudioPlayer?: (source: 'studio') => void;
  /** Carrega URL e toca áudio no elemento global */
  playAudio?: (url: string, id: string) => void;
  /** ID do áudio ativo no AudioContext */
  activeAudioId?: string | null;
  /** URL do áudio gerado no estúdio */
  audioUrl?: string | null;
}

/**
 * Hook que registra atalhos de teclado globais:
 * - Ctrl+Enter: gera áudio no estúdio
 * - Space: play/pause do vídeo ou do player de áudio
 */
export function useKeyboardShortcuts({
  videoPlayerRef,
  onGenerate,
  isStudioRoute,
  isVideoRoute,
  isGenerating,
  isGenerateDisabled,
  toggleAudioPlayer,
  playAudio,
  activeAudioId,
  audioUrl,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ctrl+Enter → gerar áudio no estúdio
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isGenerateDisabled && isStudioRoute && onGenerate) {
          e.preventDefault();
          onGenerate();
        }
      }

      // Space → play/pause vídeo ou player de áudio
      if (e.code === 'Space' && !isTyping) {
        const activeTag = target.tagName;
        const isControlTarget =
          activeTag === 'BUTTON' ||
          activeTag === 'A' ||
          activeTag === 'SELECT' ||
          activeTag === 'SUMMARY';

        if (isControlTarget) {
          return;
        }

        e.preventDefault();

        if (isGenerating) {
          return;
        }

        if (isVideoRoute && videoPlayerRef.current) {
          const player = videoPlayerRef.current;
          if (player.isPlaying()) {
            player.pause();
          } else {
            player.play();
          }
        } else if (!activeAudioId && audioUrl && playAudio) {
          // Carrega URL no elemento <audio> antes de tocar
          playAudio(audioUrl, 'studio-audio');
        } else {
          toggleAudioPlayer?.('studio');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onGenerate,
    isGenerateDisabled,
    isGenerating,
    isStudioRoute,
    isVideoRoute,
    toggleAudioPlayer,
    videoPlayerRef,
    playAudio,
    activeAudioId,
    audioUrl,
  ]);
}
