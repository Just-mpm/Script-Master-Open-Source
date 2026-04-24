import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';

// --- Tipos e helpers ---

interface MockVideoPlayerHandle {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  isPlaying: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
}

function createMockPlayer(overrides: Partial<MockVideoPlayerHandle> = {}): MockVideoPlayerHandle {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    isPlaying: vi.fn().mockReturnValue(false),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    ...overrides,
  };
}

type UseKeyboardShortcutsOptions = Parameters<typeof useKeyboardShortcuts>[0];

function createDefaultOptions(overrides: Partial<UseKeyboardShortcutsOptions> = {}): UseKeyboardShortcutsOptions & Required<Pick<UseKeyboardShortcutsOptions, 'videoPlayerRef'>> {
  const mockPlayer = createMockPlayer();
  return {
    videoPlayerRef: { current: mockPlayer } as MutableRefObject<MockVideoPlayerHandle | null>,
    onGenerate: vi.fn(),
    isStudioRoute: true,
    isVideoRoute: false,
    isGenerating: false,
    isGenerateDisabled: false,
    toggleAudioPlayer: vi.fn(),
    ...overrides,
  };
}

// Dispara evento keydown no window (o hook escuta no window)
function fireKeyDown(key: string, options: Partial<KeyboardEventInit> = {}): void {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key === ' ' ? 'Space' : key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  let addListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addListenerSpy = vi.spyOn(window, 'addEventListener');
    removeListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Ciclo de vida ──

  describe('ciclo de vida', () => {
    it('deve registrar listener de keydown no window ao montar', () => {
      const options = createDefaultOptions();
      renderHook(() => useKeyboardShortcuts(options));

      expect(addListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('deve remover listener de keydown no window ao desmontar', () => {
      const options = createDefaultOptions();
      const { unmount } = renderHook(() => useKeyboardShortcuts(options));

      unmount();

      expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  // ── Ctrl+Enter ──

  describe('Ctrl+Enter → geração de áudio', () => {
    it('deve chamar onGenerate quando Ctrl+Enter é pressionado no estúdio', () => {
      const onGenerate = vi.fn();
      const options = createDefaultOptions({ onGenerate, isStudioRoute: true, isGenerateDisabled: false, isGenerating: false });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter', { ctrlKey: true });

      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it('deve chamar onGenerate quando Cmd+Enter é pressionado (metaKey)', () => {
      const onGenerate = vi.fn();
      const options = createDefaultOptions({ onGenerate, isStudioRoute: true, isGenerateDisabled: false });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter', { metaKey: true });

      expect(onGenerate).toHaveBeenCalledTimes(1);
    });

    it('deve chamar preventDefault ao disparar Ctrl+Enter', () => {
      const options = createDefaultOptions({ isStudioRoute: true, isGenerateDisabled: false });
      renderHook(() => useKeyboardShortcuts(options));

      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('NÃO deve chamar onGenerate quando isStudioRoute=false', () => {
      const onGenerate = vi.fn();
      const options = createDefaultOptions({ onGenerate, isStudioRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter', { ctrlKey: true });

      expect(onGenerate).not.toHaveBeenCalled();
    });

    it('NÃO deve chamar onGenerate quando isGenerateDisabled=true', () => {
      const onGenerate = vi.fn();
      const options = createDefaultOptions({ onGenerate, isGenerateDisabled: true });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter', { ctrlKey: true });

      expect(onGenerate).not.toHaveBeenCalled();
    });

    it('NÃO deve chamar onGenerate quando onGenerate é undefined', () => {
      const options = createDefaultOptions({ onGenerate: undefined, isStudioRoute: true, isGenerateDisabled: false });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter', { ctrlKey: true });

      // Não deve crashar
      expect(options.videoPlayerRef.current?.play).not.toHaveBeenCalled();
    });

    // NOTA: isGenerating NÃO bloqueia Ctrl+Enter no código atual — só bloqueia Space.
    // O teste foi removido pois testava comportamento inexistente (falso positivo).

    it('NÃO deve chamar onGenerate ao pressionar Enter sem Ctrl/Cmd', () => {
      const onGenerate = vi.fn();
      const options = createDefaultOptions({ onGenerate });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown('Enter');

      expect(onGenerate).not.toHaveBeenCalled();
    });
  });

  // ── Space → play/pause vídeo ──

  describe('Space → play/pause do vídeo', () => {
    it('deve chamar player.play() quando Space é pressionado na rota de vídeo e player está pausado', () => {
      const mockPlayer = createMockPlayer({ isPlaying: vi.fn().mockReturnValue(false) });
      const options = createDefaultOptions({
        isVideoRoute: true,
        isGenerating: false,
        videoPlayerRef: { current: mockPlayer } as MutableRefObject<MockVideoPlayerHandle | null>,
      });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown(' ');

      expect(mockPlayer.isPlaying).toHaveBeenCalled();
      expect(mockPlayer.play).toHaveBeenCalledTimes(1);
      expect(mockPlayer.pause).not.toHaveBeenCalled();
    });

    it('deve chamar player.pause() quando Space é pressionado e player está tocando', () => {
      const mockPlayer = createMockPlayer({ isPlaying: vi.fn().mockReturnValue(true) });
      const options = createDefaultOptions({
        isVideoRoute: true,
        isGenerating: false,
        videoPlayerRef: { current: mockPlayer } as MutableRefObject<MockVideoPlayerHandle | null>,
      });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown(' ');

      expect(mockPlayer.isPlaying).toHaveBeenCalled();
      expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
      expect(mockPlayer.play).not.toHaveBeenCalled();
    });

    it('deve chamar preventDefault ao pressionar Space', () => {
      const options = createDefaultOptions({ isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const preventDefaultSpy = vi.fn();
      const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('NÃO deve interagir com o player quando videoPlayerRef.current é null', () => {
      const toggleAudioPlayer = vi.fn();
      const mockPlayer = createMockPlayer();
      const options = createDefaultOptions({
        isVideoRoute: true,
        isGenerating: false,
        videoPlayerRef: { current: null } as MutableRefObject<MockVideoPlayerHandle | null>,
        toggleAudioPlayer,
      });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown(' ');

      // Com ref null na rota de vídeo, deve chamar toggleAudioPlayer (fallback else)
      expect(mockPlayer.play).not.toHaveBeenCalled();
      expect(mockPlayer.pause).not.toHaveBeenCalled();
      expect(toggleAudioPlayer).toHaveBeenCalledWith('studio');
    });
  });

  // ── Space → toggle player de áudio ──

  describe('Space → toggle player de áudio (fora da rota de vídeo)', () => {
    it('deve chamar toggleAudioPlayer("studio") quando NÃO está na rota de vídeo', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({
        isVideoRoute: false,
        isGenerating: false,
        toggleAudioPlayer,
      });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown(' ');

      expect(toggleAudioPlayer).toHaveBeenCalledWith('studio');
    });

    it('NÃO deve chamar toggleAudioPlayer quando isGenerating=true', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({
        isVideoRoute: false,
        isGenerating: true,
        toggleAudioPlayer,
      });
      renderHook(() => useKeyboardShortcuts(options));

      fireKeyDown(' ');

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
    });
  });

  // ── Space → bloqueios por target ──
  // O handler escuta no window e lê e.target. Para testar isso em jsdom,
  // precisamos disparar o evento NO ELEMENTO focado para que e.target
  // reflita o tagName correto (window.dispatchEvent seta target=window).

  describe('Space → bloqueios por elemento ativo', () => {
    function dispatchSpaceOn(element: HTMLElement): void {
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
    }

    it('NÃO deve disparar quando target é INPUT', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const input = document.createElement('input');
      document.body.appendChild(input);
      dispatchSpaceOn(input);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('NÃO deve disparar quando target é TEXTAREA', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      dispatchSpaceOn(textarea);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    // NOTA: contentEditable não funciona no jsdom (isContentEditable sempre false).
    // Este comportamento é válido em browsers reais, mas não testável no jsdom.

    it('NÃO deve disparar quando target é BUTTON', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const button = document.createElement('button');
      document.body.appendChild(button);
      dispatchSpaceOn(button);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(button);
    });

    it('NÃO deve disparar quando target é A (link)', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const anchor = document.createElement('a');
      document.body.appendChild(anchor);
      dispatchSpaceOn(anchor);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(anchor);
    });

    it('NÃO deve disparar quando target é SELECT', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const select = document.createElement('select');
      document.body.appendChild(select);
      dispatchSpaceOn(select);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(select);
    });

    it('NÃO deve disparar quando target é SUMMARY', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const summary = document.createElement('summary');
      document.body.appendChild(summary);
      dispatchSpaceOn(summary);

      expect(toggleAudioPlayer).not.toHaveBeenCalled();
      document.body.removeChild(summary);
    });

    it('deve disparar quando target é um DIV comum (não contentEditable)', () => {
      const toggleAudioPlayer = vi.fn();
      const options = createDefaultOptions({ toggleAudioPlayer, isVideoRoute: false });
      renderHook(() => useKeyboardShortcuts(options));

      const div = document.createElement('div');
      document.body.appendChild(div);
      dispatchSpaceOn(div);

      expect(toggleAudioPlayer).toHaveBeenCalledWith('studio');
      document.body.removeChild(div);
    });
  });
});
