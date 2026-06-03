import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ConfiguracoesPage } from '../../src/pages/ConfiguracoesPage';
import { I18nProvider } from '../../src/features/i18n';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPlayPreview = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../src/hooks/useVoicePreviews', () => ({
  useVoicePreviews: () => ({
    playingId: null,
    errorId: null,
    playPreview: mockPlayPreview,
    clearError: mockClearError,
    stop: vi.fn(),
  }),
}));

const mockStoreReset = vi.fn();

vi.mock('../../src/features/studio/store', () => ({
  useStudioStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector({ reset: mockStoreReset }),
    { getState: () => ({ reset: mockStoreReset }) },
  ),
}));

vi.mock('../../src/features/studio/store/studio.utils', () => ({
  getInitialStudioConfig: () => ({
    script: '',
    isMultiSpeaker: false,
    speakerAName: 'Voz A',
    selectedVoice: 'Aoede',
    speakerBName: 'Voz B',
    speakerBVoice: 'Zephyr',
    audioProfile: '',
    scene: '',
    styleNotes: '',
    pace: 'normal',
    generateScenes: false,
    sceneDensity: 15,
    sceneRatio: '16:9',
    visualFramework: 'general',
    referenceImage: null,
    emotion: 'neutral',
    emotionIntensity: 0.5,
    imageTextLanguage: 'pt-BR',
  }),
  saveStudioDefaults: vi.fn(),
  clearStudioDefaults: vi.fn(),
  buildGenerateOptions: vi.fn(),
  VIDEO_FPS: 30,
}));

vi.mock('../../src/features/studio/components/EmotionSelector', () => ({
  EmotionSelector: () => <div data-testid="emotion-selector">EmotionSelector</div>,
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({ p: 2, borderRadius: 3 }),
  insetPanelSx: () => ({ p: 2 }),
}));

vi.mock('../../src/theme/tokens', async () => {
  const { createTokensMock: factory } = await import('../__mocks__/tokensMock');
  return factory({
    extras: {
      APP_MAX_WIDTH: 1600,
      ICON_SIZE_SM: 16,
      ICON_SIZE_MD: 20,
      GAP_COMPACT: 0.5,
      GAP_DEFAULT: 1,
      GAP_MEDIUM: 1.5,
      GAP_RELAXED: 2,
      RADIUS_SM: 8,
      RADIUS_XS: 4,
      BRAND_PRIMARY_GLOW_SOFT: 'rgba(99, 102, 241, 0.15)',
    },
  });
});

vi.mock('../../src/lib/constants', () => ({
  VOICES: [
    { id: 'Aoede', name: 'Aoede', styleKey: 'casual' },
    { id: 'Zephyr', name: 'Zephyr', styleKey: 'bright' },
    { id: 'Puck', name: 'Puck', styleKey: 'animated' },
  ],
  MAX_CHARS: 50000,
  CHUNK_LIMIT: 500,
  PACE_INSTRUCTIONS: {},
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../src/lib/db', () => ({
  saveUserSettings: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider>
        <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ConfiguracoesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('s2a_locale', 'pt-BR');
  });

  // --- Renderização básica ---

  describe('renderização do titulo e subtítulo', () => {
    it('renderiza o título da página', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Configurações Padrão')).toBeInTheDocument();
    });

    it('renderiza o subtítulo da página', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Defina os valores iniciais do estúdio de produção.')).toBeInTheDocument();
    });
  });

  // --- Seções colapsáveis ---

  describe('seções colapsáveis', () => {
    it('renderiza a seção "Voz"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Voz')).toBeInTheDocument();
    });

    it('renderiza a seção "Persona e Direção"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Persona e Direção')).toBeInTheDocument();
    });

    it('renderiza a seção "Cenas e Imagens"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Cenas e Imagens')).toBeInTheDocument();
    });

    it('renderiza a seção "Multi-locutor"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      // "Multi-locutor" aparece como titulo da secao, descricao e label do switch
      const matches = screen.getAllByText('Multi-locutor');
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });
  });

  // --- Grid de vozes ---

  describe('grid de vozes', () => {
    it('renderiza pelo menos as 3 vozes do mock', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getAllByText('Aoede').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Zephyr').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Puck').length).toBeGreaterThanOrEqual(1);
    });

    it('renderiza o estilo de cada voz', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getAllByText('Descontraída').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Brilhante').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Animada').length).toBeGreaterThanOrEqual(1);
    });

    it('traduz o estilo das vozes quando o idioma está em espanhol', () => {
      localStorage.setItem('s2a_locale', 'es');
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getAllByText('Desenfadada').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Brillante').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Descontraída')).not.toBeInTheDocument();
    });

    it('seleciona uma voz ao clicar nela', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      const voiceButton = screen.getByRole('option', { name: /Zephyr/i });
      fireEvent.click(voiceButton);
      expect(voiceButton).toHaveAttribute('aria-selected', 'true');
    });
  });

  // --- Seletor de idioma de textos ---

  describe('seletor de idioma de textos', () => {
    it('renderiza o label "Idioma dos textos"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      // O label aparece como InputLabel (label) e como span flutuante do Select
      const matches = screen.getAllByText('Idioma dos textos');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('renderiza o valor selecionado "pt-BR" como opcao no select', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      // O valor selecionado do select de idioma aparece como texto visivel
      // Agora há 2 selects com locale (imageTextLanguage + interfaceLocale)
      const matches = screen.getAllByText('🇧🇷 Português');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Botões de ação ---

  describe('botões de ação', () => {
    it('renderiza o botão "Salvar como padrões do estúdio"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Salvar como padrões do estúdio')).toBeInTheDocument();
    });

    it('renderiza o botão "Restaurar padrões"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Restaurar padrões')).toBeInTheDocument();
    });
  });

  // --- Confirmação de restauração ---

  describe('confirmação de restauração', () => {
    it('mostra alerta de confirmação ao clicar em "Restaurar padrões"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      const resetButton = screen.getByText('Restaurar padrões');
      fireEvent.click(resetButton);
      expect(
        screen.getByText(/Isso vai limpar todas as suas configurações salvas e restaurar os valores originais/i),
      ).toBeInTheDocument();
    });

    it('esconde a confirmação ao clicar em "Cancelar"', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      const resetButton = screen.getByText('Restaurar padrões');
      fireEvent.click(resetButton);

      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);

      expect(
        screen.queryByText(/Isso vai limpar todas as suas configurações salvas e restaurar os valores originais/i),
      ).not.toBeInTheDocument();
      // O botão "Restaurar padrões" deve voltar a aparecer
      expect(screen.getByText('Restaurar padrões')).toBeInTheDocument();
    });
  });

  // --- Switch de multi-locutor ---

  describe('switch de multi-locutor', () => {
    it('não exibe campos do locutor B quando multi-locutor está desligado', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.queryByText('Nome do locutor B')).not.toBeInTheDocument();
    });

    it('exibe campos do locutor B ao ativar o switch de multi-locutor', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      // O switch de multi-locutor e o ultimo checkbox na pagina
      // (MUI Switch usa input type="checkbox" internamente)
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const multiSpeakerCheckbox = checkboxes[checkboxes.length - 1];
      fireEvent.click(multiSpeakerCheckbox);
      // O TextField de "Nome do locutor B" deve aparecer com label acessivel
      expect(screen.getByLabelText('Nome do locutor B')).toBeInTheDocument();
    });
  });

  // --- Seção Persona ---

  describe('seção persona e direção', () => {
    it('renderiza o campo de nome do locutor', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByLabelText('Nome do locutor')).toBeInTheDocument();
    });

    it('renderiza o campo de cena', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByLabelText('Cena')).toBeInTheDocument();
    });

    it('renderiza o campo de notas de estilo', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByLabelText('Notas de estilo')).toBeInTheDocument();
    });

    it('renderiza o EmotionSelector', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByTestId('emotion-selector')).toBeInTheDocument();
    });
  });

  // --- Seção Cenas ---

  describe('seção cenas e imagens', () => {
    it('renderiza o switch de gerar cenas', () => {
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      // "Gerar cenas" aparece como descricao da secao e label do switch
      const matches = screen.getAllByText('Gerar cenas');
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('usa rótulos em espanhol sem misturar português', () => {
      localStorage.setItem('s2a_locale', 'es');
      render(<ConfiguracoesPage />, { wrapper: Wrapper });
      expect(screen.getByText('Escenas e imágenes')).toBeInTheDocument();
      expect(screen.getAllByText('Dos locutores').length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText('Cenas e Imagens')).not.toBeInTheDocument();
      expect(screen.queryByText('Multi-locutor')).not.toBeInTheDocument();
    });
  });
});
