import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// --- Mocks (inline para vi.mock hoisting) ---

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/theme/tokens', () => ({
  ICON_SIZE_MD: 16,
}));

vi.mock('@mui/material/Snackbar', () => ({
  default: function MockSnackbar({ open, children }: { open: boolean; children: ReactNode }) {
    return open ? <div data-testid="snackbar">{children}</div> : null;
  },
}));

vi.mock('@mui/material/Alert', () => ({
  default: function MockAlert({ children }: { children: ReactNode }) {
    return <div data-testid="alert">{children}</div>;
  },
}));

vi.mock('@mui/material/IconButton', () => ({
  default: function MockIconButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
    return <button data-testid="icon-button" onClick={onClick}>{children}</button>;
  },
}));

vi.mock('@mui/icons-material/Close', () => ({
  default: () => <span>CloseIcon</span>,
}));

import { AudioProvider, useGlobalAudioState, useGlobalAudioActions } from '../../src/contexts/AudioContext';
import { useAudioIsPlaying, useAudioCurrentTime, useAudioDuration, useAudioProgress, useAudioActiveId } from '../../src/contexts/AudioContext';

describe('AudioContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioProvider', () => {
    it('deve renderizar sem crash', () => {
      render(
        <AudioProvider>
          <div>child</div>
        </AudioProvider>
      );
      expect(screen.getByText('child')).toBeTruthy();
    });

    it('deve renderizar elemento <audio> oculto', () => {
      render(
        <AudioProvider>
          <div>test</div>
        </AudioProvider>
      );
      const audio = document.querySelector('audio');
      expect(audio).toBeTruthy();
      expect(audio?.style.display).toBe('none');
    });
  });

  describe('useGlobalAudioState', () => {
    function TestComponent() {
      const state = useGlobalAudioState();
      return (
        <div>
          <span data-testid="isPlaying">{String(state.isPlaying)}</span>
          <span data-testid="currentTime">{state.currentTime}</span>
          <span data-testid="duration">{state.duration}</span>
          <span data-testid="progress">{state.progress}</span>
          <span data-testid="activeId">{state.activeId ?? 'null'}</span>
          <span data-testid="time">{state.formatTime(125)}</span>
        </div>
      );
    }

    it('deve retornar estado inicial', () => {
      render(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('isPlaying').textContent).toBe('false');
      expect(screen.getByTestId('currentTime').textContent).toBe('0');
      expect(screen.getByTestId('duration').textContent).toBe('0');
      expect(screen.getByTestId('progress').textContent).toBe('0');
      expect(screen.getByTestId('activeId').textContent).toBe('null');
    });

    it('deve formatar tempo corretamente', () => {
      render(
        <AudioProvider>
          <TestComponent />
        </AudioProvider>
      );
      expect(screen.getByTestId('time').textContent).toBe('02:05');
    });

    it('deve formatar NaN como 00:00', () => {
      function NaNTimeComponent() {
        const { formatTime } = useGlobalAudioState();
        return <span data-testid="nanTime">{formatTime(NaN)}</span>;
      }

      render(
        <AudioProvider>
          <NaNTimeComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('nanTime').textContent).toBe('00:00');
    });
  });

  describe('useGlobalAudioActions', () => {
    function ActionsTestComponent() {
      const actions = useGlobalAudioActions();
      return (
        <div>
          <span data-testid="has-play">{typeof actions.play === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-pause">{typeof actions.pause === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-seek">{typeof actions.seek === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-toggle">{typeof actions.toggle === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-formatTime">{typeof actions.formatTime === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-setDuration">{typeof actions.setDurationOverride === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-audioRef">{actions.audioRef !== null ? 'yes' : 'no'}</span>
        </div>
      );
    }

    it('deve expor todas as ações', () => {
      render(
        <AudioProvider>
          <ActionsTestComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('has-play').textContent).toBe('yes');
      expect(screen.getByTestId('has-pause').textContent).toBe('yes');
      expect(screen.getByTestId('has-seek').textContent).toBe('yes');
      expect(screen.getByTestId('has-toggle').textContent).toBe('yes');
      expect(screen.getByTestId('has-formatTime').textContent).toBe('yes');
      expect(screen.getByTestId('has-setDuration').textContent).toBe('yes');
      expect(screen.getByTestId('has-audioRef').textContent).toBe('yes');
    });

    // REM-003: Teste "fora do provider" removido — IIFE com hooks não funciona
    // no jsdom. O erro real "useGlobalAudioState must be used within an AudioProvider"
    // é suprimido pelo React error boundary e retorna "Invalid hook call".
  });

  // ──────────────────────────────────────────────────────────────────────
  // Hooks seletivos (usados via useSyncExternalStore)
  // ──────────────────────────────────────────────────────────────────────

  describe('useAudioIsPlaying', () => {
    function PlayingComponent() {
      const isPlaying = useAudioIsPlaying();
      return <span data-testid="result">{String(isPlaying)}</span>;
    }

    it('deve retornar false como valor inicial dentro do provider', () => {
      render(
        <AudioProvider>
          <PlayingComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('result').textContent).toBe('false');
    });

    it('deve lançar erro se usado fora do provider', () => {
      // useAudioIsPlaying faz useContext + throw — precisa de render + expect error
      // Em jsdom, hooks fora de provider lançam erros que o React catch internamente
      // Testamos que o componente não renderiza normalmente
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<PlayingComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('useAudioCurrentTime', () => {
    function CurrentTimeComponent() {
      const time = useAudioCurrentTime();
      return <span data-testid="result">{time}</span>;
    }

    it('deve retornar 0 como valor inicial dentro do provider', () => {
      render(
        <AudioProvider>
          <CurrentTimeComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('result').textContent).toBe('0');
    });

    it('deve lançar erro se usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<CurrentTimeComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('useAudioDuration', () => {
    function DurationComponent() {
      const duration = useAudioDuration();
      return <span data-testid="result">{duration}</span>;
    }

    it('deve retornar 0 como valor inicial dentro do provider', () => {
      render(
        <AudioProvider>
          <DurationComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('result').textContent).toBe('0');
    });

    it('deve lançar erro se usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<DurationComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('useAudioProgress', () => {
    function ProgressComponent() {
      const progress = useAudioProgress();
      return <span data-testid="result">{progress}</span>;
    }

    it('deve retornar 0 como valor inicial dentro do provider', () => {
      render(
        <AudioProvider>
          <ProgressComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('result').textContent).toBe('0');
    });

    it('deve lançar erro se usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ProgressComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('useAudioActiveId', () => {
    function ActiveIdComponent() {
      const activeId = useAudioActiveId();
      return <span data-testid="result">{activeId ?? 'null'}</span>;
    }

    it('deve retornar null como valor inicial dentro do provider', () => {
      render(
        <AudioProvider>
          <ActiveIdComponent />
        </AudioProvider>
      );

      expect(screen.getByTestId('result').textContent).toBe('null');
    });

    it('deve lançar erro se usado fora do provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ActiveIdComponent />);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });
});
