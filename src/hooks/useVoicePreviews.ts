import { useState, useRef, useEffect } from 'react';
import { createLogger } from '../lib/logger';

const log = createLogger('useVoicePreviews');

/**
 * Hook para preview de vozes.
 *
 * Os áudios de preview ficam em public/voice-previews/{voiceId}.wav,
 * gerados pelo script `bun run generate-previews`.
 * O playPreview apenas toca o arquivo estático -- sem Firebase Storage.
 */
export function useVoicePreviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup ao desmontar: pausa preview em andamento se o usuário navegar para outra rota
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stop = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId(null);
  };

  const playPreview = (voiceId: string): void => {
    // Limpa erro anterior ao tentar nova voz
    setErrorId(null);

    if (playingId === voiceId) {
      stop();
      return;
    }

    stop();
    setPlayingId(voiceId);

    const audio = new Audio(`/voice-previews/${voiceId}.wav`);
    audioRef.current = audio;
    audio.onerror = () => {
      log.error(`Preview para ${voiceId} não encontrado. Execute "bun run generate-previews" para gerar.`);
      setPlayingId(null);
      setErrorId(voiceId);
    };
    audio.onended = () => setPlayingId(null);
    audio.play().catch((playErr: unknown) => {
      // play() é rejeitado quando o navegador bloqueia autoplay (sem interação prévia)
      const isAbort = playErr instanceof DOMException && playErr.name === 'AbortError';
      if (!isAbort) {
        log.warn('Preview bloqueado pela política de autoplay do navegador', { error: playErr });
      }
      setPlayingId(null);
    });
  };

  return {
    playingId,
    errorId,
    playPreview,
    stop,
  };
}
