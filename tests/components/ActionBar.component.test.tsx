import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ActionBar } from '../../src/components/ActionBar';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>;
}

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/estudio' }),
}));

vi.mock('../../src/contexts/AudioContext', () => ({
  useGlobalAudioState: () => ({
    isPlaying: false,
    activeId: null,
    currentTime: 0,
    duration: 120,
    progress: 0,
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
    play: vi.fn(),
    toggle: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    audioRef: { current: null },
  }),
  useGlobalAudioActions: () => ({
    toggle: vi.fn(),
    seek: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    audioRef: { current: null },
    getSnapshot: vi.fn(),
    setDurationOverride: vi.fn(),
  }),
}));

vi.mock('../../src/lib/download', () => ({
  downloadFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({}),
}));

vi.mock('../../src/theme/tokens', () => ({
  APP_ACTION_BAR_BOTTOM: 16,
  BRAND_GRADIENT: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #0891b2, #7c3aed)',
  BRAND_GLOW: '0 4px 16px rgba(6, 182, 212, 0.3)',
  BRAND_GLOW_FOCUS: '0 0 0 3px rgba(6, 182, 212, 0.3)',
  WHITE_08: 'rgba(255,255,255,0.08)',
  ICON_SIZE_MD: 20,
  GAP_COMPACT: 4,
  GAP_DEFAULT: 8,
  GAP_MEDIUM: 12,
  RADIUS_SM: 8,
  RADIUS_CHIP: 16,
  CYAN_GLOW_SOFT: 'rgba(6, 182, 212, 0.1)',
}));

const defaultProps = {
  isGenerating: false,
  audioUrl: 'blob:http://localhost/audio.wav',
  statusText: '',
  generationProgress: 0,
  handleDownload: vi.fn(),
  handleCancel: vi.fn(),
};

describe('ActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null quando não está gerando e não há audioUrl', () => {
    const { container } = render(
      <ActionBar {...defaultProps} audioUrl={null} />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza o botão play quando há audioUrl', () => {
    render(<ActionBar {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: /Iniciar reprodução/i })).toBeDefined();
  });

  it('renderiza a barra de progresso quando está gerando', () => {
    render(
      <ActionBar {...defaultProps} isGenerating={true} audioUrl={null} generationProgress={45} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('45%')).toBeDefined();
  });

  it('renderiza o botão Cancelar quando está gerando', () => {
    render(
      <ActionBar {...defaultProps} isGenerating={true} audioUrl={null} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeDefined();
  });

  it('chama handleCancel ao clicar em Cancelar', async () => {
    const user = userEvent.setup();
    render(
      <ActionBar {...defaultProps} isGenerating={true} audioUrl={null} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(defaultProps.handleCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra o texto de status quando está gerando áudio', () => {
    render(
      <ActionBar {...defaultProps} isGenerating={true} audioUrl={null} statusText='Sintetizando voz...' generationProgress={30} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Sintetizando voz...')).toBeDefined();
  });

  it('renderiza o region com aria-label correto', () => {
    render(<ActionBar {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('region', { name: /Controles de áudio e geração/i })).toBeDefined();
  });

  it('renderiza o slider de progresso quando está tocando', () => {
    render(<ActionBar {...defaultProps} />, { wrapper: Wrapper });

    expect(screen.getByRole('slider', { name: /Progresso do áudio/i })).toBeDefined();
  });

  it('mostra botão de download quando handleSaveToLibrary está disponível', () => {
    const handleSave = vi.fn();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );

    // O botão de download só aparece quando handleSaveToLibrary está presente
    expect(screen.getByRole('button', { name: /Opções de download/i })).toBeDefined();
  });

  it('mostra botão de salvar quando handleSaveToLibrary está disponível', () => {
    const handleSave = vi.fn();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: /Salvar áudio na biblioteca/i })).toBeDefined();
  });

  it('mostra progresso da geração de imagens quando está em image phase', () => {
    render(
      <ActionBar
        {...defaultProps}
        isGenerating={true}
        audioUrl='blob:audio'
        statusText='Gerando cena 3/5...'
        generationProgress={60}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Gerando cena 3/5...')).toBeDefined();
    expect(screen.getByText('60%')).toBeDefined();
  });

  it('mostra botão de cancelar imagem quando está em image phase', () => {
    render(
      <ActionBar
        {...defaultProps}
        isGenerating={true}
        audioUrl='blob:audio'
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: /Cancelar geração de imagens/i })).toBeDefined();
  });
});
