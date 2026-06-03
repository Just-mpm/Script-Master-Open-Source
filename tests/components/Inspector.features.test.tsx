import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Inspector } from '../../src/components/Inspector';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    isMultiSpeaker: false,
    setIsMultiSpeaker: vi.fn(),
    speakerAName: 'Locutor A',
    setSpeakerAName: vi.fn(),
    selectedVoice: 'Aoede',
    setSelectedVoice: vi.fn(),
    speakerBName: 'Locutor B',
    setSpeakerBName: vi.fn(),
    speakerBVoice: 'Zephyr',
    setSpeakerBVoice: vi.fn(),
    audioProfile: '',
    setAudioProfile: vi.fn(),
    scene: '',
    setScene: vi.fn(),
    pace: 'normal',
    setPace: vi.fn(),
    styleNotes: '',
    setStyleNotes: vi.fn(),
    generateScenes: false,
    setGenerateScenes: vi.fn(),
    sceneDensity: 15,
    setSceneDensity: vi.fn(),
    sceneRatio: '16:9' as string,
    setSceneRatio: vi.fn(),
    visualFramework: 'general',
    setVisualFramework: vi.fn(),
    referenceImage: null as string | null,
    setReferenceImage: vi.fn(),
    emotion: 'neutral' as string,
    setEmotion: vi.fn(),
    emotionIntensity: 0.5,
    setEmotionIntensity: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useVoicePreviews', () => ({
  useVoicePreviews: () => ({
    playingId: null,
    playPreview: vi.fn(),
    errorId: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
  insetPanelSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', async () => {
  const { createTokensMock: factory } = await import('../__mocks__/tokensMock');
  return factory({
    extras: {
      ICON_SIZE_SM: 16,
      ICON_SIZE_MD: 20,
      ICON_SIZE_LG: 24,
      GAP_COMPACT: 4,
      GAP_DEFAULT: 8,
      GAP_MEDIUM: 12,
      RADIUS_SM: 8,
      RADIUS_XS: 4,
      BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
      WHITE_08: 'rgba(255,255,255,0.08)',
    },
  });
});

vi.mock('../../src/features/studio/store', () => ({
  useStudioStore: (selector: (state: typeof storeMock) => unknown) => selector(storeMock),
}));

vi.mock('../../src/features/studio/components/EmotionSelector', () => ({
  EmotionSelector: ({ value, intensity, onChange, disabled }: { value: string; intensity: number; onChange: (e: string, i: number) => void; disabled?: boolean }) => (
    <div data-testid="emotion-selector" data-value={value} data-intensity={intensity} data-disabled={String(disabled ?? false)}>
      EmotionSelector
    </div>
  ),
}));

// Novos testes para features atualizadas do Inspector
describe('Inspector — Features atualizadas', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    storeMock.isMultiSpeaker = false;
    storeMock.speakerAName = 'Locutor A';
    storeMock.styleNotes = '';
    storeMock.referenceImage = null;
    storeMock.emotion = 'neutral';
    storeMock.emotionIntensity = 0.5;
    storeMock.generateScenes = false;
  });

  it('renderiza EmotionSelector na seção de direção de arte quando expandida', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      expect(screen.getByTestId('emotion-selector')).toBeDefined();
    });
  });

  it('passa emotion e intensity corretos para EmotionSelector', async () => {
    storeMock.emotion = 'happy';
    storeMock.emotionIntensity = 0.8;

    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      const emotionEl = screen.getByTestId('emotion-selector');
      expect(emotionEl.getAttribute('data-value')).toBe('happy');
      expect(emotionEl.getAttribute('data-intensity')).toBe('0.8');
    });
  });

  it('passa disabled para EmotionSelector quando isGenerating é true', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={true} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      const emotionEl = screen.getByTestId('emotion-selector');
      expect(emotionEl.getAttribute('data-disabled')).toBe('true');
    });
  });

  it('mostra seção de cenas com switch para gerar cenas', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      // i18n: studio.inspector.scenes.title = "Gerar cenas visuais"
      expect(screen.getByText('Gerar cenas visuais')).toBeDefined();
    });
  });

  it('chama setGenerateScenes ao clicar no switch de cenas', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      expect(document.querySelector('input[name="generate-scenes"]')).toBeDefined();
    });

    const switchInput = document.querySelector('input[name="generate-scenes"]') as HTMLInputElement;
    await user.click(switchInput);

    expect(storeMock.setGenerateScenes).toHaveBeenCalledWith(true);
  });
});
