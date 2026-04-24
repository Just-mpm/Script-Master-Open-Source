import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { VideoPreview } from '../../src/components/VideoPreview';
import type { StudioScene } from '../../src/features/studio/types';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@remotion/player', () => ({
  Player: ({ inputProps, durationInFrames, fps, compositionWidth, compositionHeight }: {
    inputProps: Record<string, unknown>;
    durationInFrames: number;
    fps: number;
    compositionWidth: number;
    compositionHeight: number;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="remotion-player"
      data-frames={durationInFrames}
      data-fps={fps}
      data-width={compositionWidth}
      data-height={compositionHeight}
    />
  ),
}));

vi.mock('../../src/features/video-render', () => ({
  VideoComposition: () => <div data-testid="video-composition" />,
  mapScenesToVideoScenes: () => [],
  getResolutionFromRatio: (ratio: string) => {
    switch (ratio) {
      case '9:16': return { width: 1080, height: 1920 };
      case '1:1': return { width: 1080, height: 1080 };
      default: return { width: 1920, height: 1080 };
    }
  },
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  GAP_COMPACT: 4,
  GAP_MEDIUM: 12,
  GAP_DEFAULT: 8,
  EMPTY_WRAPPER_MAX_WIDTH: 400,
  EMPTY_WRAPPER_PADDING_XS: 16,
  EMPTY_WRAPPER_PADDING_MD: 24,
  TEXT_SECONDARY: 'rgba(255,255,255,0.6)',
}));

describe('VideoPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza estado vazio quando não há áudio nem cenas', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl={null}
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Preview de vídeo aguardando cenas')).toBeDefined();
  });

  it('mostra botão Ir para o Estúdio no estado vazio', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl={null}
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: /Ir para o Estúdio/i })).toBeDefined();
  });

  it('renderiza o player Remotion quando há áudio', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl="blob:http://localhost/audio.wav"
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('remotion-player')).toBeDefined();
  });

  it('renderiza o player Remotion quando há cenas', () => {
    const scenes: StudioScene[] = [
      { imageUrl: 'blob:image1', timestamp: 0 },
    ];

    render(
      <VideoPreview
        scenes={scenes}
        audioUrl="blob:http://localhost/audio.wav"
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('remotion-player')).toBeDefined();
  });

  it('passa resolução correta para o player com ratio 16:9', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl="blob:audio"
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    const player = screen.getByTestId('remotion-player');
    expect(player.getAttribute('data-width')).toBe('1920');
    expect(player.getAttribute('data-height')).toBe('1080');
  });

  it('passa resolução correta para o player com ratio 9:16', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl="blob:audio"
        fps={30}
        durationInFrames={300}
        ratio="9:16"
      />,
      { wrapper: Wrapper },
    );

    const player = screen.getByTestId('remotion-player');
    expect(player.getAttribute('data-width')).toBe('1080');
    expect(player.getAttribute('data-height')).toBe('1920');
  });

  it('passa resolução correta para o player com ratio 1:1', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl="blob:audio"
        fps={30}
        durationInFrames={300}
        ratio="1:1"
      />,
      { wrapper: Wrapper },
    );

    const player = screen.getByTestId('remotion-player');
    expect(player.getAttribute('data-width')).toBe('1080');
    expect(player.getAttribute('data-height')).toBe('1080');
  });

  it('exibe mensagem informativa no estado vazio', () => {
    render(
      <VideoPreview
        scenes={[]}
        audioUrl={null}
        fps={30}
        durationInFrames={300}
        ratio="16:9"
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Gere o áudio e as cenas no estúdio para visualizar a montagem aqui.')).toBeDefined();
  });
});
