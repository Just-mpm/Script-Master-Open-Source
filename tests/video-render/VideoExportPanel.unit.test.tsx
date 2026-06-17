import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { useVideoRenderBridge } from '../../src/features/video-render/store/videoRenderBridge';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  getResolutionFromQuality: () => ({ width: 1920, height: 1080 }),
  getResolutionFromRatio: () => ({ width: 1920, height: 1080 }),
  estimateFileSize: () => 50_000_000,
  DEFAULT_EXPORT_QUALITY: '1080p',
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassPanelSx: () => ({}),
  glassSurfaceSx: () => ({ p: 2, borderRadius: 3 }),
}));

vi.mock('../../src/theme/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
  return { ...actual, GAP_COMPACT: 0.5,
  GAP_DEFAULT: 1,
  GAP_MEDIUM: 1.5,
  RADIUS_CHIP: 8,
  RADIUS_SM: 3,
  RADIUS_XS: 2,
  ICON_SIZE_MD: 18,
  APP_BORDER: 'rgba(255,255,255,0.08)',
  GLASS_BG: 'rgba(16,23,42,0.78)',
  BRAND_GRADIENT: 'linear-gradient(135deg, #2e75b6, #ff8c00)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #3a8bd4, #ff9d33)',
  BRAND_GLOW: '0 0 20px rgba(46,117,182,0.4)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  BRAND_PRIMARY_LIGHT: '#5ba3d0',
  WHITE_08: 'rgba(255,255,255,0.08)',
  WHITE_14: 'rgba(255,255,255,0.14)',
  SUCCESS_MAIN: '#22c55e',
  SUCCESS_BORDER: 'rgba(16,185,129,0.18)',
  SUCCESS_GLOW: 'rgba(16,185,129,0.2)',
  SUCCESS_BG_SUBTLE: 'rgba(16,185,129,0.08)',
  ERROR_BORDER: 'rgba(239,68,68,0.14)',
  ERROR_GLOW: 'rgba(239,68,68,0.15)',
  WARNING_BORDER: 'rgba(245,158,11,0.14)',
  WARNING_GLOW: 'rgba(245,158,11,0.15)',
  BRAND_SECONDARY_GLOW_SOFT: 'rgba(247,148,30,0.12)',
  WARNING_BG_SUBTLE: 'rgba(245,158,11,0.1)',
  ERROR_BG_SUBTLE: 'rgba(239,68,68,0.1)',
  WHITE: '#ffffff', };
});;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { VideoExportPanel } from '../../src/features/video-render/components/VideoExportPanel';

// ---------------------------------------------------------------------------
// Helpers de teste
// ---------------------------------------------------------------------------

function makeExporter(overrides: Record<string, unknown> = {}) {
  return {
    checkSupport: vi.fn().mockResolvedValue(undefined),
    startRender: vi.fn().mockResolvedValue(undefined),
    canRender: true,
    isRendering: false,
    outputUrl: null as string | null,
    outputBlob: null as Blob | null,
    renderProgress: 0,
    renderStatusText: '',
    resolvedVideoCodec: 'h264',
    resolvedContainer: 'mp4',
    error: null as string | null,
    speedPaintWarnings: [] as string[],
    exportFileName: 'test-video',
    reset: vi.fn(),
    handleCancel: vi.fn(),
    handleDownload: vi.fn(),
    saveWarning: null as string | null,
    dismissSaveWarning: vi.fn(),
    supportsHtmlInCanvas: true,
    ...overrides,
  };
}

const defaultScenes = [
  { imageUrl: 'https://example.com/scene1.png', timestamp: 0 },
  { imageUrl: 'https://example.com/scene2.png', timestamp: 5 },
];

const defaultProps = {
  scenes: defaultScenes,
  audioUrl: 'https://example.com/audio.wav',
  fps: 30,
  durationInFrames: 300,
  ratio: '16:9' as const,
  projectId: 'proj-1',
  userId: 'user-1',
  exporter: makeExporter(),
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('VideoExportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Renderização básica ---

  describe('renderização', () => {
    it('renderiza o painel quando há conteúdo (áudio + cenas)', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: /exportar vídeo/i })).toBeInTheDocument();
    });

    it('não renderiza quando não há áudio', () => {
      render(<VideoExportPanel {...defaultProps} audioUrl={null} />);
      expect(screen.queryByRole('button', { name: /exportar vídeo/i })).not.toBeInTheDocument();
    });

    it('não renderiza quando não há cenas', () => {
      render(<VideoExportPanel {...defaultProps} scenes={[]} />);
      expect(screen.queryByRole('button', { name: /exportar vídeo/i })).not.toBeInTheDocument();
    });

    it('exibe informações de resolução', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByText(/1920x1080/i)).toBeInTheDocument();
      expect(screen.getByText(/30 fps/i)).toBeInTheDocument();
    });

    it('exibe estimativa de tamanho quando durationInSeconds é fornecido', () => {
      render(<VideoExportPanel {...defaultProps} durationInSeconds={60} />);
      // formatFileSize(50000000) ≈ "47.7 MB"
      expect(screen.getByText(/47\.7 MB/i)).toBeInTheDocument();
    });
  });

  // --- Opções de qualidade ---

  describe('seletor de qualidade', () => {
    it('renderiza opções de qualidade 720p, 1080p, 1440p e 4K', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByText('720p')).toBeInTheDocument();
      expect(screen.getByText('1080p')).toBeInTheDocument();
      expect(screen.getByText('1440p')).toBeInTheDocument();
      expect(screen.getByText('4K')).toBeInTheDocument();
    });

    it('seleciona qualidade ao clicar', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const button720 = screen.getByText('720p');
      act(() => {
        fireEvent.click(button720);
      });
      expect(button720).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // --- Speed Paint ---

  describe('speed paint', () => {
    it('não exibe controles avançados de velocidade', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.queryByText(/Velocidade do Speed Paint/i)).not.toBeInTheDocument();
    });

it('exporta speed paint sem enviar ajustes manuais de velocidade', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);

      // Clica exportar
      const exportBtn = screen.getByRole('button', { name: /exportar vídeo/i });
      act(() => {
        fireEvent.click(exportBtn);
      });

      expect(exporter.startRender).toHaveBeenCalledTimes(1);
      const callArgs = exporter.startRender.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.animateScenes).toBe(true);
      expect(callArgs.showDrawTool).toBe(true);
      expect(callArgs.speedPaintMultipliers).toBeUndefined();
      expect(callArgs.speedPaintSpeed).toBeUndefined();
    });

    it('não exibe controles avançados nem durante renderização', () => {
      const exporter = makeExporter({ isRendering: true });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.queryByText(/Velocidade do Speed Paint/i)).not.toBeInTheDocument();
    });
  });

  // --- Campo de nome do arquivo ---

  describe('nome do arquivo', () => {
    it('renderiza o campo de nome do arquivo', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByLabelText(/Nome do arquivo de exportação/i)).toBeInTheDocument();
    });

    it('sanitiza caracteres especiais no nome do arquivo', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const input = screen.getByLabelText(/Nome do arquivo de exportação/i);
      act(() => {
        fireEvent.change(input, { target: { value: 'meu video@#$%' } });
      });
      expect(input).toHaveValue('meuvideo');
    });
  });

  // --- Botão exportar ---

describe('botão exportar', () => {
    it('habilita o botão quando canRender é true e há conteúdo', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const exportBtn = screen.getByRole('button', { name: /exportar vídeo/i });
      expect(exportBtn).not.toBeDisabled();
    });

    it('desabilita o botão quando canRender é false', () => {
      const exporter = makeExporter({ canRender: false });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      // O botão aparece mas está desabilitado
      const btn = screen.getByRole('button', { name: /exportar vídeo/i });
      expect(btn).toBeDisabled();
    });

    it('desabilita o botão quando a duração do áudio ainda está em 0', () => {
      render(<VideoExportPanel {...defaultProps} durationInFrames={0} durationInSeconds={0} />);
      const btn = screen.getByRole('button', { name: /exportar vídeo/i });
      expect(btn).toBeDisabled();
      expect(screen.getByText(/Aguardando a duração do áudio/i)).toBeInTheDocument();
    });

it('chama startRender ao clicar em exportar', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      const exportBtn = screen.getByRole('button', { name: /exportar vídeo/i });
      act(() => {
        fireEvent.click(exportBtn);
      });
      expect(exporter.startRender).toHaveBeenCalledTimes(1);
    });
  });

  // --- Legenda toggle ---

  describe('toggle de legenda', () => {
    it('exibe toggle de legenda quando há captions', () => {
      const captions = [
        { text: 'Olá', startFrame: 0, endFrame: 30, bold: false },
      ];
      render(<VideoExportPanel {...defaultProps} captions={captions} />);
      expect(screen.getByText('Incluir legendas')).toBeInTheDocument();
    });

    it('não exibe toggle de legenda quando não há captions', () => {
      render(<VideoExportPanel {...defaultProps} captions={[]} />);
      expect(screen.queryByText('Incluir legendas')).not.toBeInTheDocument();
    });

    it('chama onIncludeSubtitlesChange ao mudar toggle', () => {
      const onIncludeSubtitlesChange = vi.fn();
      const captions = [
        { text: 'Olá', startFrame: 0, endFrame: 30, bold: false },
      ];
      render(
        <VideoExportPanel
          {...defaultProps}
          captions={captions}
          onIncludeSubtitlesChange={onIncludeSubtitlesChange}
        />,
      );

      // Encontra o switch de legenda (segundo switch na página)
      const switches = screen.getAllByRole('switch');
      const subtitleSwitch = switches[switches.length - 1];
      act(() => {
        fireEvent.click(subtitleSwitch);
      });
      expect(onIncludeSubtitlesChange).toHaveBeenCalledWith(false);
    });
  });

  // --- Alertas ---

  describe('alertas', () => {
    it('exibe alerta de aviso quando canRender é false', () => {
      const exporter = makeExporter({
        canRender: false,
        error: 'Navegador não suporta H.264',
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText(/Navegador não suporta H\.264/i)).toBeInTheDocument();
    });

    it('exibe alerta de erro quando há erro de renderização', () => {
      const exporter = makeExporter({
        canRender: true,
        error: 'Erro de memória insuficiente',
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText(/Erro de memória insuficiente/i)).toBeInTheDocument();
    });

    it('exibe alerta de speed paint warnings', () => {
      const exporter = makeExporter({
        speedPaintWarnings: ['Cena 3: formato não suportado'],
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText(/Algumas cenas não puderam ser animadas/i)).toBeInTheDocument();
      expect(screen.getByText(/Cena 3: formato não suportado/i)).toBeInTheDocument();
    });
  });

  // --- Progresso de renderização ---

  describe('progresso de renderização', () => {
    it('exibe barra de progresso durante renderização', () => {
      const exporter = makeExporter({
        isRendering: true,
        renderProgress: 45,
        renderStatusText: 'Renderizando cena 2/4...',
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText(/Renderizando cena 2\/4/i)).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('exibe botão cancelar durante renderização', () => {
      const exporter = makeExporter({ isRendering: true });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    it('chama handleCancel ao clicar em cancelar', () => {
      const exporter = makeExporter({ isRendering: true });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      act(() => {
        fireEvent.click(screen.getByText('Cancelar'));
      });
      expect(exporter.handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  // --- Resultado de exportação ---

  describe('resultado de exportação', () => {
    it('exibe botões de download após exportação concluída', () => {
      const exporter = makeExporter({
        outputUrl: 'blob:https://example.com/video.mp4',
        outputBlob: new Blob(['fake'], { type: 'video/mp4' }),
        renderStatusText: 'Exportação concluída!',
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByText(/Exportação concluída/i)).toBeInTheDocument();
      expect(screen.getByText(/Baixar vídeo/i)).toBeInTheDocument();
      expect(screen.getByText(/Exportar novamente/i)).toBeInTheDocument();
      expect(screen.getByText(/Limpar/i)).toBeInTheDocument();
    });

    it('exibe tamanho do arquivo resultante', () => {
      const blob = new Blob(['fake'], { type: 'video/mp4' });
      const exporter = makeExporter({
        outputUrl: 'blob:https://example.com/video.mp4',
        outputBlob: blob,
        renderStatusText: 'Concluído',
      });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      // Deve mostrar tamanho em MB
      expect(screen.getByText(/\(\d+\.\d+ MB\)/i)).toBeInTheDocument();
    });
  });

  // --- Acessibilidade ---

  describe('acessibilidade', () => {
    it('possui aria-label no seletor de qualidade', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByLabelText(/Qualidade de exportação/i)).toBeInTheDocument();
    });

    it('possui aria-label na barra de progresso', () => {
      const exporter = makeExporter({ isRendering: true, renderProgress: 50 });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByLabelText(/Progresso da exportação de vídeo/i)).toBeInTheDocument();
    });

    it('possui role="status" durante renderização', () => {
      const exporter = makeExporter({ isRendering: true });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // --- Verificação de suporte ao montar ---

  describe('verificação de suporte', () => {
    it('chama checkSupport ao montar quando há conteúdo', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      expect(exporter.checkSupport).toHaveBeenCalledWith(1920, 1080);
    });

    it('não chama checkSupport quando não há áudio', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} audioUrl={null} exporter={exporter} />);
      expect(exporter.checkSupport).not.toHaveBeenCalled();
    });
  });

  // --- L7 (RF-06): seletor de modo (Clássico | Desenho) ---

  describe('L7 — seletor de modo Clássico/Desenho', () => {
    it('CT-F36: ToggleButtonGroup aparece quando animateScenes === true', () => {
      // Arrange — defaultProps tem animateScenes = true (prop default)
      render(<VideoExportPanel {...defaultProps} />);
      // Assert
      expect(screen.getByTestId('video-export-mode-toggle')).toBeInTheDocument();
      // Botões individuais existem
      expect(screen.getByTestId('video-export-mode-mask')).toBeInTheDocument();
      expect(screen.getByTestId('video-export-mode-vetorial')).toBeInTheDocument();
    });

    it('CT-F37: ToggleButtonGroup NÃO aparece quando animateScenes === false', () => {
      // Arrange — animação desligada explicitamente
      render(<VideoExportPanel {...defaultProps} animateScenes={false} />);
      // Assert — toggle sumiu
      expect(screen.queryByTestId('video-export-mode-toggle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('video-export-mode-mask')).not.toBeInTheDocument();
      expect(screen.queryByTestId('video-export-mode-vetorial')).not.toBeInTheDocument();
    });

    it('CT-F38: clicar em "Desenho" dispara syncRenderMode da videoRenderBridge (override local)', () => {
      // Arrange — reset do bridge para estado conhecido
      useVideoRenderBridge.getState().resetBridge();
      const initialAnimationRenderMode = useAnimationStore.getState().renderMode;
      const initialAnimationPreset = useAnimationStore.getState().vetorialPreset;
      const initialBridgePreset = useVideoRenderBridge.getState().vetorialPreset;

      render(<VideoExportPanel {...defaultProps} />);

      // Act — clica no botão "Desenho" (vetorial)
      act(() => {
        fireEvent.click(screen.getByTestId('video-export-mode-vetorial'));
      });

      // Assert — bridge foi atualizada para vetorial
      const bridgeState = useVideoRenderBridge.getState();
      expect(bridgeState.renderMode).toBe('vetorial');
      // Preset vigente é preservado (não troca junto)
      expect(bridgeState.vetorialPreset).toBe(initialBridgePreset);

      // Assert — animationStore global NÃO foi tocada (escopo de sessão)
      const animationState = useAnimationStore.getState();
      expect(animationState.renderMode).toBe(initialAnimationRenderMode);
      expect(animationState.vetorialPreset).toBe(initialAnimationPreset);
    });

    it('CT-F39: renderMode e vetorialPreset da bridge são propagados para startRender', () => {
      // Arrange — força modo vetorial na bridge
      useVideoRenderBridge.getState().resetBridge();
      useVideoRenderBridge.getState().syncRenderMode('vetorial', 'curvy');
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);

      // Act — clica em exportar
      const exportBtn = screen.getByRole('button', { name: /exportar vídeo/i });
      act(() => {
        fireEvent.click(exportBtn);
      });

      // Assert — options do startRender carregam renderMode + vetorialPreset
      expect(exporter.startRender).toHaveBeenCalledTimes(1);
      const callArgs = exporter.startRender.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.renderMode).toBe('vetorial');
      expect(callArgs.vetorialPreset).toBe('curvy');
    });
  });
});
