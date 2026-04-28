import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ActionBar } from '../../src/components/ActionBar';
import { I18nProvider } from '../../src/features/i18n';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/app/estudio' }),
}));

vi.mock('../../src/contexts/AudioContext', () => ({
  useAudioIsPlaying: () => false,
  useAudioCurrentTime: () => 0,
  useAudioDuration: () => 120,
  useAudioProgress: () => 0,
  useAudioActiveId: () => null as unknown as string,
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
    formatTime: (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
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
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(6, 182, 212, 0.1)',
}));

vi.mock('../../src/features/video-render/store/videoRenderBridge', () => ({
  useVideoRenderBridge: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector({
      currentFrame: 0,
      isPlaying: false,
    }),
    {
      getState: () => ({ currentFrame: 0, isPlaying: false }),
    },
  ),
}));

const defaultProps = {
  isGenerating: false,
  audioUrl: 'blob:http://localhost/audio.wav',
  statusText: '',
  generationProgress: 0,
  handleDownload: vi.fn(),
  handleCancel: vi.fn(),
};

describe('ActionBar — Features atualizadas', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');
    vi.clearAllMocks();
  });

  it('mostra botão de salvar (bookmark) quando handleSaveToLibrary está disponível', () => {
    const handleSave = vi.fn();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('button', { name: /Salvar áudio na biblioteca/i })).toBeDefined();
  });

  it('chama handleSaveToLibrary ao clicar no botão de salvar', async () => {
    const handleSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Salvar áudio na biblioteca/i }));
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('desabilita botão de salvar quando isSaved é true', () => {
    const handleSave = vi.fn();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} isSaved={true} />,
      { wrapper: Wrapper },
    );
    const saveBtn = screen.getByRole('button', { name: /Salvo na biblioteca/i });
    expect(saveBtn.hasAttribute('disabled')).toBe(true);
  });

  it('mostra botão de opções de download quando handleSaveToLibrary está disponível', () => {
    const handleSave = vi.fn();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('button', { name: /Opções de download/i })).toBeDefined();
  });

  it('abre menu de download ao clicar no botão de opções', async () => {
    const handleSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Opções de download/i }));

    // Menu deve conter "Download áudio (.wav)" (i18n: studio.actionBar.downloadAudio)
    expect(screen.getByText('Download áudio (.wav)')).toBeDefined();
  });

  it('chama handleDownload ao selecionar Baixar áudio no menu', async () => {
    const handleSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Opções de download/i }));
    await user.click(screen.getByText('Download áudio (.wav)'));

    expect(defaultProps.handleDownload).toHaveBeenCalledTimes(1);
  });

  it('mostra itens de download de cenas no menu quando há scenes', async () => {
    const handleSave = vi.fn();
    const scenes = [
      { imageUrl: 'blob:image1', timestamp: 0 },
      { imageUrl: 'blob:image2', timestamp: 5 },
    ];
    const user = userEvent.setup();
    render(
      <ActionBar {...defaultProps} handleSaveToLibrary={handleSave} scenes={scenes} />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByRole('button', { name: /Opções de download/i }));

    // i18n: downloadAllImages = "Download todas as imagens"
    expect(screen.getByText('Download todas as imagens')).toBeDefined();
    // i18n: scene = "Cena {number}"
    expect(screen.getByText('Cena 1')).toBeDefined();
    expect(screen.getByText('Cena 2')).toBeDefined();
  });

  it('mostra botão de reprodução mesmo em image phase (play fica visível)', () => {
    render(
      <ActionBar
        {...defaultProps}
        isGenerating={true}
        audioUrl='blob:audio'
      />,
      { wrapper: Wrapper },
    );

    // Em image phase, o player de áudio continua visível (showPlayer=true quando audioUrl existe)
    // O que é ocultado é a seção de exportar vídeo/download/save
    expect(screen.getByRole('button', { name: /Iniciar reprodução/i })).toBeDefined();
    // Botão de cancelar imagem deve aparecer
    expect(screen.getByRole('button', { name: /Cancelar geração de imagens/i })).toBeDefined();
  });
});
