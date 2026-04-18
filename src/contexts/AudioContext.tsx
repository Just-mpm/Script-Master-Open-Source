import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AudioContextType {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  activeId: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (url: string, id: string) => void;
  pause: () => void;
  toggle: (id?: string) => void;
  seek: (percentage: number) => void;
  formatTime: (time: number) => string;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

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
  }, []);

  const play = (url: string, id: string) => {
    if (!audioRef.current) return;

    if (currentUrl !== url) {
      audioRef.current.src = url;
      setCurrentUrl(url);
    }
    
    setActiveId(id);
    audioRef.current.play().catch(err => console.error("Error playing audio:", err));
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const toggle = (id?: string) => {
    if (!audioRef.current) return;
    
    if (id && id !== activeId) {
      // If a different ID is passed, we don't toggle, we just play the new one
      // This logic depends on how it's called. 
      // For simplicity, let's assume toggle is for the CURRENT activeId if none passed.
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Error playing audio:", err));
    }
  };

  const seek = (percentage: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (percentage / 100) * audioRef.current.duration;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AudioContext.Provider value={{
      isPlaying,
      progress,
      currentTime,
      duration,
      activeId,
      audioRef,
      play,
      pause,
      toggle,
      seek,
      formatTime
    }}>
      {children}
      <audio ref={audioRef} className="hidden" />
    </AudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useGlobalAudio must be used within an AudioProvider');
  }
  return context;
}
