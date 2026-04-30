import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  getResolutionFromQuality: () => ({ width: 1920, height: 1080 }),
  getResolutionFromRatio: () => ({ width: 1920, height: 1080 }),
  estimateFileSize: () => 50_000_000,
  DEFAULT_EXPORT_QUALITY: '1080p',
}));

vi.mock('../../src/features/video-render/components/SpeedPaintControls', () => ({
  SpeedPaintControls: ({ sketch, reveal, onSketchChange, onRevealChange }: { sketch: number; reveal: number; onSketchChange: (v: number) => void; onRevealChange: (v: number) => void }) => (
    <div data-testid="speed-paint-controls" data-sketch={sketch} data-reveal={reveal}>
      <button
        data-testid="sketch-slider"
        onClick={() => onSketchChange(2.0)}
        aria-label="Velocidade do desenho (sketch)"
      />
      <button
        data-testid="reveal-slider"
        onClick={() => onRevealChange(3.0)}
        aria-label="Velocidade da coloração (reveal)"
      />
    </div>
  ),
}));

vi.mock('../../src/theme/surfaces', () => ({
  glassSurfaceSx: () => ({ p: 2, borderRadius: 3 }),
}));

vi.mock('../../src/theme/tokens', () => ({
  GAP_COMPACT: 0.5,
  GAP_DEFAULT: 1,
  GAP_MEDIUM: 1.5,
  RADIUS_CHIP: 8,
  ICON_SIZE_MD: 18,
  BRAND_GRADIENT: 'linear-gradient(135deg, #2e75b6, #ff8c00)',
  BRAND_GRADIENT_HOVER: 'linear-gradient(135deg, #3a8bd4, #ff9d33)',
  BRAND_GLOW: '0 0 20px rgba(46,117,182,0.4)',
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
  BRAND_PRIMARY_LIGHT: '#5ba3d0',
  WHITE_08: 'rgba(255,255,255,0.08)',
  WHITE_14: 'rgba(255,255,255,0.14)',
  SUCCESS_MAIN: '#22c55e',
  SUCCESS_GLOW: 'rgba(16,185,129,0.2)',
  WARNING_BG_SUBTLE: 'rgba(245,158,11,0.1)',
  ERROR_BG_SUBTLE: 'rgba(239,68,68,0.1)',
  WHITE: '#ffffff',
}));

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
      expect(screen.getByText(/Exportar vídeo/i)).toBeInTheDocument();
    });

    it('não renderiza quando não há áudio', () => {
      render(<VideoExportPanel {...defaultProps} audioUrl={null} />);
      expect(screen.queryByText(/Exportar vídeo/i)).not.toBeInTheDocument();
    });

    it('não renderiza quando não há cenas', () => {
      render(<VideoExportPanel {...defaultProps} scenes={[]} />);
      expect(screen.queryByText(/Exportar vídeo/i)).not.toBeInTheDocument();
    });

    it('exibe informações de resolução e codec', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.getByText(/1920x1080/i)).toBeInTheDocument();
      expect(screen.getByText(/H264/i)).toBeInTheDocument();
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
    it('não exibe controles de velocidade quando toggle está desligado', () => {
      render(<VideoExportPanel {...defaultProps} />);
      expect(screen.queryByTestId('speed-paint-controls')).not.toBeInTheDocument();
    });

    it('renderiza SpeedPaintControls quando toggle é ativado', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const switchEl = screen.getByRole('switch');
      act(() => {
        fireEvent.click(switchEl);
      });
      expect(screen.getByTestId('speed-paint-controls')).toBeInTheDocument();
    });

    it('passa DEFAULT_SPEED_PAINT_MULTIPLIERS iniciais para SpeedPaintControls', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const switchEl = screen.getByRole('switch');
      act(() => {
        fireEvent.click(switchEl);
      });

      const controls = screen.getByTestId('speed-paint-controls');
      // Valores iniciais: sketch=0.25, reveal=0.25 (DEFAULT_SPEED_PAINT_MULTIPLIERS)
      expect(controls.getAttribute('data-sketch')).toBe('0.25');
      expect(controls.getAttribute('data-reveal')).toBe('0.25');
    });

    it('atualiza multipliers ao interagir com slider de sketch', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const switchEl = screen.getByRole('switch');
      act(() => {
        fireEvent.click(switchEl);
      });

      const sketchSlider = screen.getByTestId('sketch-slider');
      act(() => {
        fireEvent.click(sketchSlider);
      });

      const controls = screen.getByTestId('speed-paint-controls');
      expect(controls.getAttribute('data-sketch')).toBe('2');
      expect(controls.getAttribute('data-reveal')).toBe('0.25');
    });

    it('atualiza multipliers ao interagir com slider de reveal', () => {
      render(<VideoExportPanel {...defaultProps} />);
      const switchEl = screen.getByRole('switch');
      act(() => {
        fireEvent.click(switchEl);
      });

      const revealSlider = screen.getByTestId('reveal-slider');
      act(() => {
        fireEvent.click(revealSlider);
      });

      const controls = screen.getByTestId('speed-paint-controls');
      expect(controls.getAttribute('data-sketch')).toBe('0.25');
      expect(controls.getAttribute('data-reveal')).toBe('3');
    });

    it('passa speedPaintMultipliers atualizados no handleStartExport', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);

      // Ativa speed paint
      const switchEl = screen.getByRole('switch');
      act(() => {
        fireEvent.click(switchEl);
      });

      // Altera sketch multiplier
      const sketchSlider = screen.getByTestId('sketch-slider');
      act(() => {
        fireEvent.click(sketchSlider);
      });

      // Clica exportar
      const exportBtn = screen.getByText(/Exportar MP4/i);
      act(() => {
        fireEvent.click(exportBtn);
      });

      // Verifica que startRender foi chamado com speedPaintMultipliers atualizados
      expect(exporter.startRender).toHaveBeenCalledTimes(1);
      const callArgs = exporter.startRender.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.speedPaintMultipliers).toEqual({ sketch: 2.0, reveal: 0.25 });
    });

    it('esconde SpeedPaintControls durante renderização', () => {
      const exporter = makeExporter({ isRendering: true });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);

      // Mesmo que animateScenes estivesse ativado, durante renderização o painel de configuração não é exibido
      expect(screen.queryByTestId('speed-paint-controls')).not.toBeInTheDocument();
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
      const exportBtn = screen.getByText(/Exportar MP4/i);
      expect(exportBtn).not.toBeDisabled();
    });

    it('desabilita o botão quando canRender é false', () => {
      const exporter = makeExporter({ canRender: false });
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      // O botão aparece mas está desabilitado
      const btn = screen.getByText(/Exportar MP4/i);
      expect(btn).toBeDisabled();
    });

    it('chama startRender ao clicar em exportar', () => {
      const exporter = makeExporter();
      render(<VideoExportPanel {...defaultProps} exporter={exporter} />);
      const exportBtn = screen.getByText(/Exportar MP4/i);
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
      expect(screen.getByText('Legenda')).toBeInTheDocument();
    });

    it('não exibe toggle de legenda quando não há captions', () => {
      render(<VideoExportPanel {...defaultProps} captions={[]} />);
      expect(screen.queryByText('Legenda')).not.toBeInTheDocument();
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
      expect(screen.getByText(/Baixar MP4/i)).toBeInTheDocument();
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
});
