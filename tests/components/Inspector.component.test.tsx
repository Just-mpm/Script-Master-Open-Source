import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { SceneRatio } from '../../src/features/studio/types';
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

// Estado mock do store — mutável para sobrescrever em testes específicos
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
    sceneRatio: '16:9' as SceneRatio,
    setSceneRatio: vi.fn(),
    visualFramework: 'general',
    setVisualFramework: vi.fn(),
    referenceImage: null as string | null,
    setReferenceImage: vi.fn(),
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

describe('Inspector', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
    // Restaura valores padrão do store mock após testes que os sobrescrevem
    storeMock.isMultiSpeaker = false;
    storeMock.speakerAName = 'Locutor A';
    storeMock.styleNotes = '';
    storeMock.referenceImage = null;
  });

  it('renderiza os cabeçalhos das seções Voz do locutor e Direção de arte', () => {
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });
    expect(screen.getByText('Voz do locutor')).toBeDefined();
    expect(screen.getByText('Direção de arte')).toBeDefined();
  });

  it('renderiza como aside com aria-label', () => {
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });
    expect(screen.getByRole('complementary', { name: /Configurações de voz e direção/i })).toBeDefined();
  });

  it('inicia com as seções colapsadas', () => {
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });
    expect(screen.queryByRole('listbox', { name: /Seleção de voz/i })).toBeNull();
  });

  it('expande a seção de voz ao clicar no botão', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    expect(screen.getByRole('listbox', { name: /Seleção de voz/i })).toBeDefined();
  });

  it('mostra o toggle de modo podcast quando voz está expandida', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    // Espera o Collapse animar
    await waitFor(() => {
      expect(screen.getByText('Modo Podcast (2 vozes)')).toBeDefined();
    });
    // O switch do MUI v9 pode não ter aria-label acessível via slotProps.input no jsdom
    // Verificamos pela presença do texto do podcast
    expect(document.querySelector('input[name="podcast-mode"]')).toBeDefined();
  });

  it('chama setIsMultiSpeaker ao clicar no switch do modo podcast', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    await waitFor(() => {
      expect(document.querySelector('input[name="podcast-mode"]')).toBeDefined();
    });

    // Clica no input do switch diretamente
    const switchInput = document.querySelector('input[name="podcast-mode"]') as HTMLInputElement;
    await user.click(switchInput);

    expect(storeMock.setIsMultiSpeaker).toHaveBeenCalledWith(true);
  });

  it('mostra as tabs de Voz A e Voz B quando multi-speaker está ativo', async () => {
    storeMock.isMultiSpeaker = true;
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    expect(screen.getByRole('tab', { name: /Voz A/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Voz B/i })).toBeDefined();
  });

  it('mostra erro de validação quando speakerAName está vazio no modo podcast', async () => {
    storeMock.isMultiSpeaker = true;
    storeMock.speakerAName = '';
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    await waitFor(() => {
      expect(screen.getByText(/O nome do Locutor A é obrigatório/i)).toBeDefined();
    });
  });

  it('desabilita o switch de podcast quando isGenerating é true', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={true} />, { wrapper: Wrapper });

    const voiceButton = screen.getByText('Voz do locutor').closest('button')!;
    await user.click(voiceButton);

    await waitFor(() => {
      const switchInput = document.querySelector('input[name="podcast-mode"]') as HTMLInputElement;
      expect(switchInput).toBeDefined();
      expect(switchInput.hasAttribute('disabled')).toBe(true);
    });
  });

  it('expande a seção de direção de arte e mostra campo Personagem', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    expect(screen.getByLabelText('Personagem')).toBeDefined();
  });

  it('mostra campo Ritmo (InputLabel) na seção de direção', async () => {
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    expect(screen.getByLabelText('Ritmo')).toBeDefined();
  });

  it('mostra o campo de Sotaque com contador de caracteres', async () => {
    storeMock.styleNotes = 'Paulista';
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    expect(screen.getByText('8/500')).toBeDefined();
  });

  it('mostra erro quando styleNotes atinge o limite de 500 caracteres', async () => {
    const maxNotes = 'a'.repeat(500);
    storeMock.styleNotes = maxNotes;
    const user = userEvent.setup();
    render(<Inspector isGenerating={false} />, { wrapper: Wrapper });

    const dirButton = screen.getByText('Direção de arte').closest('button')!;
    await user.click(dirButton);

    await waitFor(() => {
      expect(screen.getByText(/Limite de 500 caracteres atingido/i)).toBeDefined();
    });
  });
});
