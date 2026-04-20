import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react';

interface AudioSnapshot {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  activeId: string | null;
}

interface AudioContextType {
  audioRef: RefObject<HTMLAudioElement | null>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AudioSnapshot;
  play: (url: string, id: string) => void;
  pause: () => void;
  toggle: (id?: string) => void;
  seek: (percentage: number) => void;
  formatTime: (time: number) => string;
  /** Override da duração calculada a partir do blob WAV (evita depender de loadedmetadata) */
  setDurationOverride: (seconds: number | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const durationOverrideRef = useRef<number | null>(null);
  const snapshotRef = useRef<AudioSnapshot>({
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    activeId: null,
  });
  const listenersRef = useRef(new Set<() => void>());

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  const setSnapshot = useCallback((patch: Partial<AudioSnapshot>) => {
    snapshotRef.current = { ...snapshotRef.current, ...patch };
    notify();
  }, [notify]);

  const syncFromAudio = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    // Usa o override calculado do blob WAV; fallback para o audio.duration nativo
    const rawDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const duration = durationOverrideRef.current ?? rawDuration;
    const currentTime = audio.currentTime;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    setSnapshot({
      currentTime,
      duration,
      progress,
    });
  }, [audioRef, setSnapshot]);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      syncFromAudio();
    };

    const handleLoadedMetadata = () => {
      syncFromAudio();
    };

    const handleEnded = () => {
      setSnapshot({
        isPlaying: false,
        progress: 0,
        currentTime: 0,
      });
    };

    const handlePlay = () => setSnapshot({ isPlaying: true });
    const handlePause = () => setSnapshot({ isPlaying: false });

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioRef, setSnapshot, syncFromAudio]);

  const play = useCallback((url: string, id: string) => {
    const audio = audioRef.current;

    if (!audio) return;

    if (currentUrlRef.current !== url) {
      audio.src = url;
      currentUrlRef.current = url;
      // Limpa override ao trocar de URL — o novo áudio terá sua própria duração
      durationOverrideRef.current = null;
    }
    setSnapshot({ activeId: id });
    audio.play().catch((err: unknown) => console.error('Error playing audio:', err));
  }, [audioRef, setSnapshot]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, [audioRef]);

  const toggle = useCallback((id?: string) => {
    const audio = audioRef.current;

    if (!audio) return;

    if (id && id !== snapshotRef.current.activeId) {
      return;
    }

    if (snapshotRef.current.isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err: unknown) => console.error('Error playing audio:', err));
    }
  }, [audioRef]);

  const seek = useCallback((percentage: number) => {
    const audio = audioRef.current;

    if (audio && audio.duration) {
      audio.currentTime = (percentage / 100) * audio.duration;
      syncFromAudio();
    }
  }, [audioRef, syncFromAudio]);

  const formatTime = useCallback((time: number) => {
    if (Number.isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /** Override da duração calculada a partir do blob WAV (evita depender de loadedmetadata) */
  const setDurationOverride = useCallback((seconds: number | null) => {
    durationOverrideRef.current = seconds;
    // Se o override for aplicado, atualiza o snapshot imediatamente
    if (seconds !== null) {
      setSnapshot({ duration: seconds });
      notify();
    }
  }, [setSnapshot, notify]);

  const contextValue = useMemo<AudioContextType>(() => ({
    audioRef,
    subscribe,
    getSnapshot,
    play,
    pause,
    toggle,
    seek,
    formatTime,
    setDurationOverride,
  }), [audioRef, formatTime, getSnapshot, pause, play, seek, subscribe, toggle, setDurationOverride]);

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
      <audio ref={audioRef} aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
    </AudioContext.Provider>
  );
}

export function useGlobalAudioState() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useGlobalAudioState must be used within an AudioProvider');
  }

  const snapshot = useSyncExternalStore(context.subscribe, context.getSnapshot, context.getSnapshot);

  return {
    ...snapshot,
    audioRef: context.audioRef,
    play: context.play,
    pause: context.pause,
    toggle: context.toggle,
    seek: context.seek,
    formatTime: context.formatTime,
  };
}

export function useGlobalAudioActions() {
  const context = useContext(AudioContext);

  if (context === undefined) {
    throw new Error('useGlobalAudioActions must be used within an AudioProvider');
  }

  return {
    audioRef: context.audioRef,
    getSnapshot: context.getSnapshot,
    play: context.play,
    pause: context.pause,
    toggle: context.toggle,
    seek: context.seek,
    formatTime: context.formatTime,
    setDurationOverride: context.setDurationOverride,
  };
}
