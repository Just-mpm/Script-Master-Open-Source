import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CaptionWord } from '../../src/features/video-render/types';

// ─── Mock do Remotion ────────────────────────────────────────
let mockFrame = 0;

vi.mock('remotion', () => ({
  useCurrentFrame: () => mockFrame,
  useVideoConfig: () => ({
    fps: 30,
    durationInFrames: 300,
    width: 1920,
    height: 1080,
    id: 'test-composition',
  }),
  interpolate: vi.fn((value: number, inputRange: number[], outputRange: number[]) => {
    // Interpolação linear simples para testes
    const [inMin, inMax] = [inputRange[0], inputRange[inputRange.length - 1]];
    const [outMin, outMax] = [outputRange[0], outputRange[outputRange.length - 1]];
    if (inMax === inMin) return outMin;
    const clamped = Math.max(inMin, Math.min(inMax, value));
    const t = (clamped - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
  }),
  spring: vi.fn(() => 1),
  AbsoluteFill: ({ children, style, ...props }: React.PropsWithChildren<{ style?: React.CSSProperties }>) => (
    <div data-testid="absolute-fill" style={style} {...props}>{children}</div>
  ),
  Sequence: ({ children, from, durationInFrames, ...props }: React.PropsWithChildren<{ from?: number; durationInFrames?: number }>) => (
    <div data-testid="sequence" data-from={from} data-duration={durationInFrames} {...props}>{children}</div>
  ),
  Img: ({ src, alt, style, onLoad, onError, ...props }: { src: string; alt: string; style?: React.CSSProperties; onLoad?: () => void; onError?: (e: Error) => void }) => (
    <img data-testid="remotion-img" src={src} alt={alt} style={style} {...props} />
  ),
  delayRender: vi.fn(() => 'test-handle'),
  continueRender: vi.fn(),
  cancelRender: vi.fn(),
}));

// Mock do @remotion/media (usado por VideoComposition e WaveformOverlay)
vi.mock('@remotion/media', () => ({
  Audio: ({ src }: { src: string }) => <audio data-testid="remotion-audio" src={src} />,
}));

// Mock do @remotion/media-utils (usado por WaveformOverlay)
vi.mock('@remotion/media-utils', () => ({
  useAudioData: vi.fn(() => null),
  visualizeAudioWaveform: vi.fn(() => []),
  createSmoothSvgPath: vi.fn(() => 'M0,0 L100,0'),
}));

// Mock dos tokens de tema (mínimo necessário)
vi.mock('../../src/theme/tokens', () => ({
  WHITE: '#ffffff',
  BRAND_PRIMARY: '#00e5ff',
  BRAND_PRIMARY_LIGHT: '#80f0ff',
  BRAND_PRIMARY_DARK: '#00b8d4',
  BRAND_GRADIENT: 'linear-gradient(135deg, #00e5ff, #7c4dff)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #80f0ff, #b388ff)',
  BRAND_GLOW: '0 0 20px rgba(0, 229, 255, 0.3)',
  CYAN_GLOW: '0 0 30px rgba(0, 229, 255, 0.5)',
  CYAN_GLOW_SOFT: '0 0 15px rgba(0, 229, 255, 0.15)',
  SUCCESS_MAIN: '#10b981',
  ERROR_MAIN: '#ef4444',
  WARNING_BG_SUBTLE: 'rgba(245, 158, 11, 0.08)',
  ERROR_BG_SUBTLE: 'rgba(239, 68, 68, 0.08)',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: 'rgba(255, 255, 255, 0.7)',
  TEXT_DISABLED: 'rgba(255, 255, 255, 0.38)',
  APP_SURFACE: 'rgba(255, 255, 255, 0.06)',
  APP_BORDER: 'rgba(255, 255, 255, 0.1)',
  ACTION_SELECTED: 'rgba(0, 229, 255, 0.1)',
  WHITE_04: 'rgba(255, 255, 255, 0.04)',
  WHITE_05: 'rgba(255, 255, 255, 0.05)',
  WHITE_06: 'rgba(255, 255, 255, 0.06)',
  WHITE_08: 'rgba(255, 255, 255, 0.08)',
  WHITE_10: 'rgba(255, 255, 255, 0.10)',
  WHITE_14: 'rgba(255, 255, 255, 0.14)',
  WHITE_22: 'rgba(255, 255, 255, 0.22)',
  WHITE_50: 'rgba(255, 255, 255, 0.50)',
  BLACK_40: 'rgba(0, 0, 0, 0.40)',
  BLACK_50: 'rgba(0, 0, 0, 0.50)',
  BLACK_55: 'rgba(0, 0, 0, 0.55)',
  GLASS_BG: 'rgba(15, 15, 30, 0.75)',
  SHADOW_DEEP: 'rgba(0, 0, 0, 0.5)',
  RADIUS_CHIP: 8,
  GAP_DEFAULT: 8,
  GAP_COMPACT: 4,
  GAP_MEDIUM: 12,
  ICON_SIZE_LG: 18,
  ICON_SIZE_MD: 16,
  APP_SURFACE_ELEVATED: 'rgba(30, 30, 50, 0.9)',
}));

// Mock do logger
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { ScrollingPhrase } from '../../src/features/video-render/components/ScrollingPhrase';
import { SubtitleOverlay } from '../../src/features/video-render/components/SubtitleOverlay';
import { WaveformOverlay } from '../../src/features/video-render/components/WaveformOverlay';

// ─── ScrollingPhrase ──────────────────────────────────────────

describe('ScrollingPhrase', () => {
  const baseWords: CaptionWord[] = [
    { text: 'Olá', startFrame: 10, endFrame: 30, bold: false },
    { text: 'mundo', startFrame: 30, endFrame: 50, bold: false },
  ];

  it('retorna fragmento vazio para words vazio', () => {
    const { container } = render(<ScrollingPhrase words={[]} variant="active" />);
    expect(container.innerHTML).toBe('');
  });

  it('renderiza texto das palavras na variante active', () => {
    mockFrame = 20; // Dentro do range [10, 50]
    const { getByText } = render(<ScrollingPhrase words={baseWords} variant="active" />);
    // ScrollingPhrase junta palavras via parseBoldMarkdown → "Olá mundo"
    expect(getByText('Olá mundo')).toBeDefined();
  });

  it('renderiza texto das palavras na variante previous', () => {
    mockFrame = 30; // Frame de transição
    const { getByText } = render(<ScrollingPhrase words={baseWords} variant="previous" />);
    expect(getByText('Olá mundo')).toBeDefined();
  });

  it('renderiza bold com fontWeight 800', () => {
    mockFrame = 20;
    const boldWords: CaptionWord[] = [
      { text: '**negrito**', startFrame: 10, endFrame: 50, bold: true },
    ];
    const { container } = render(<ScrollingPhrase words={boldWords} variant="active" />);
    // parseBoldMarkdown extrai "negrito" com bold=true → fontWeight 800
    const boldSpan = container.querySelector('span[style*="800"]');
    expect(boldSpan).not.toBeNull();
  });

  it('renderiza com fontSize customizado', () => {
    mockFrame = 20;
    const { container } = render(
      <ScrollingPhrase words={baseWords} variant="active" fontSize={42} />,
    );
    const div = container.querySelector('div');
    expect(div?.style.fontSize).toBe('42px');
  });

  it('renderiza com borderRadius customizado', () => {
    mockFrame = 20;
    const { container } = render(
      <ScrollingPhrase words={baseWords} variant="active" borderRadius={20} />,
    );
    const div = container.querySelector('div');
    expect(div?.style.borderRadius).toBe('20px');
  });

  it('variant active aplica opacidade via interpolate (fade in)', () => {
    mockFrame = 10; // Frame exato do start — início do fade
    const { container } = render(<ScrollingPhrase words={baseWords} variant="active" />);
    const div = container.querySelector('div');
    // No frame 10 = startFrame, interpolate [10, 18] [0, 1] → 0
    expect(parseFloat(div?.style.opacity ?? '1')).toBe(0);
  });

  it('variant active com frame após fade tem opacidade 1', () => {
    mockFrame = 50; // Muito depois do fade (SUBTITLE_FADE=8, start=10 → fade ends at 18)
    const { container } = render(<ScrollingPhrase words={baseWords} variant="active" />);
    const div = container.querySelector('div');
    expect(parseFloat(div?.style.opacity ?? '0')).toBe(1);
  });
});

// ─── SubtitleOverlay ─────────────────────────────────────────

describe('SubtitleOverlay', () => {
  const captions: CaptionWord[] = [
    { text: 'Primeira', startFrame: 0, endFrame: 30, bold: false },
    { text: 'frase.', startFrame: 30, endFrame: 60, bold: false },
    { text: 'Segunda', startFrame: 60, endFrame: 90, bold: false },
    { text: 'frase.', startFrame: 90, endFrame: 120, bold: false },
  ];

  it('retorna null para captions vazio e sem text', () => {
    const { container } = render(
      <SubtitleOverlay durationInFrames={300} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('retorna null para text vazio', () => {
    const { container } = render(
      <SubtitleOverlay text="" durationInFrames={300} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza AbsoluteFill quando há captions', () => {
    mockFrame = 30;
    const { getByTestId } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    expect(getByTestId('absolute-fill')).toBeDefined();
  });

  it('renderiza AbsoluteFill quando há text (backward compat)', () => {
    mockFrame = 15;
    const { getByTestId } = render(
      <SubtitleOverlay text="Texto de teste" durationInFrames={300} />,
    );
    expect(getByTestId('absolute-fill')).toBeDefined();
  });

  it('renderiza texto do caption na frase ativa', () => {
    mockFrame = 10;
    const { getByText } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    // Frases são agrupadas: "Primeira frase." é a primeira frase (termina com .)
    expect(getByText('Primeira frase.')).toBeDefined();
  });

  it('usa DEFAULT_SUBTITLE_STYLE quando não fornecido subtitleStyle', () => {
    mockFrame = 10;
    const { container } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    // Deve renderizar sem erro usando estilo padrão
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('scroll vertical quando frase ativa muda', () => {
    // Na primeira frase (frame 10)
    mockFrame = 10;
    const { container: c1 } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    // Na segunda frase (frame 70) — deve ter scrollY diferente
    mockFrame = 70;
    const { container: c2, unmount } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    // Ambos renderizam sem crash
    expect(c1.querySelector('div')).not.toBeNull();
    expect(c2.querySelector('div')).not.toBeNull();
    unmount();
  });

  it('legenda permanece visível durante gap entre frases (sticky fallback)', () => {
    // captions com gap explícito entre frase 1 e frase 2
    const gapCaptions: CaptionWord[] = [
      { text: 'Primeira', startFrame: 0, endFrame: 30, bold: false },
      { text: 'frase.', startFrame: 30, endFrame: 60, bold: false },
      // Gap: frames 60-80 sem frase
      { text: 'Segunda', startFrame: 80, endFrame: 110, bold: false },
      { text: 'frase.', startFrame: 110, endFrame: 140, bold: false },
    ];

    // Frame 70: no gap entre frases (primeira terminou em 60, segunda começa em 80)
    mockFrame = 70;
    const { getByTestId } = render(
      <SubtitleOverlay captions={gapCaptions} durationInFrames={300} />,
    );
    // Com sticky fallback, a legenda NÃO deve desaparecer
    expect(getByTestId('absolute-fill')).toBeDefined();
  });

  it('última frase permanece visível após terminar (sticky)', () => {
    mockFrame = 150; // Última frase termina em 120
    const { getByTestId } = render(
      <SubtitleOverlay captions={captions} durationInFrames={300} />,
    );
    expect(getByTestId('absolute-fill')).toBeDefined();
  });

  it('scroll absoluto sem drift vertical com múltiplas frases', () => {
    // Captions com 4 frases
    const longCaptions: CaptionWord[] = [
      { text: 'Primeira frase.', startFrame: 0, endFrame: 60, bold: false },
      { text: 'Segunda frase.', startFrame: 60, endFrame: 120, bold: false },
      { text: 'Terceira frase.', startFrame: 120, endFrame: 180, bold: false },
      { text: 'Quarta frase.', startFrame: 180, endFrame: 240, bold: false },
    ];

    // Frame 150: terceira frase ativa (activePhraseIndex = 2, >= 1)
    mockFrame = 150;
    const { container, getByTestId } = render(
      <SubtitleOverlay captions={longCaptions} durationInFrames={300} />,
    );

    // scrollY deve ser interpolado com base em phrases[1][0].startFrame (60)
    // Não deve acumular drift — deve ser no máximo -phraseHeight
    expect(getByTestId('absolute-fill')).toBeDefined();
    // Verifica que o container tem transform (scroll aplicado)
    const innerDiv = container.querySelector('div[style*="transform"]');
    expect(innerDiv).not.toBeNull();
  });
});

// ─── WaveformOverlay ─────────────────────────────────────────

describe('WaveformOverlay', () => {
  beforeEach(() => {
    mockFrame = 60;
  });

  it('retorna null quando isExporting é true', () => {
    const { container } = render(
      <WaveformOverlay
        audioUrl="blob:http://test"
        sceneStartTime={0}
        sceneEndTime={10}
        frame={60}
        fps={30}
        isExporting={true}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando audioUrl é null', () => {
    const { container } = render(
      <WaveformOverlay
        audioUrl={null}
        sceneStartTime={0}
        sceneEndTime={10}
        frame={60}
        fps={30}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando overlayOpacity é 0', () => {
    // frame=0, sceneStartTime=2 → timeInSeconds=0 < 2 → sceneTime=null → overlayOpacity=0
    const { container } = render(
      <WaveformOverlay
        audioUrl="blob:http://test"
        sceneStartTime={2}
        sceneEndTime={10}
        frame={0}
        fps={30}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('retorna null quando audioUrl é string vazia', () => {
    const { container } = render(
      <WaveformOverlay
        audioUrl=""
        sceneStartTime={0}
        sceneEndTime={10}
        frame={60}
        fps={30}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('não crasha quando frame está fora da cena', () => {
    // frame=300, sceneEndTime=10 → timeInSeconds=10 > 10 → sceneTime=null
    const { container } = render(
      <WaveformOverlay
        audioUrl="blob:http://test"
        sceneStartTime={0}
        sceneEndTime={10}
        frame={300}
        fps={30}
      />,
    );
    // Deve retornar null porque overlayOpacity será 0
    expect(container.innerHTML).toBe('');
  });
});
