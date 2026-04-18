import { useState, useRef } from 'react';

/**
 * Hook para preview de vozes.
 *
 * Os áudios de preview ficam em public/voice-previews/{voiceId}.wav,
 * gerados pelo script `bun run generate-previews`.
 * O playPreview apenas toca o arquivo estático -- sem Firebase Storage.
 */
export function useVoicePreviews() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = (): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId(null);
  };

  const playPreview = (voiceId: string): void => {
    if (playingId === voiceId) {
      stop();
      return;
    }

    stop();
    setPlayingId(voiceId);

    const audio = new Audio(`/voice-previews/${voiceId}.wav`);
    audioRef.current = audio;
    audio.onerror = () => {
      console.error(`Preview para ${voiceId} não encontrado. Execute "bun run generate-previews" para gerar.`);
      setPlayingId(null);
    };
    audio.onended = () => setPlayingId(null);
    void audio.play();
  };

  return {
    playingId,
    playPreview,
    stop,
  };
}
