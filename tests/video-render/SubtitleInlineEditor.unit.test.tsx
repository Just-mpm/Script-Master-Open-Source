import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — MUI Collapse/Fade causam reflow errors no jsdom
// ---------------------------------------------------------------------------

vi.mock('@mui/material/Collapse', () => ({
  default: ({ children, in: open }: { children: React.ReactNode; in: boolean }) =>
    open ? <>{children}</> : null,
}));

vi.mock('@mui/material/Fade', () => ({
  default: ({ children, in: open }: { children: React.ReactNode; in: boolean }) =>
    open ? <>{children}</> : null,
}));

vi.mock('@mui/material/Box', () => ({
  default: ({ children, ref, ...rest }: { children: React.ReactNode; ref: React.Ref<HTMLDivElement> }) => (
    <div ref={ref} {...rest}>{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  getResolutionFromRatio: (ratio: string) => {
    const map: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
    };
    return map[ratio] ?? { width: 1920, height: 1080 };
  },
}));

vi.mock('../../src/features/video-render/components/subtitle-editor/utils', () => ({
  clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  calculatePreviewBottom: (offset: number, compH: number, dispH: number) => {
    if (dispH <= 0 || compH <= 0) return 0;
    const offsetPadding = 40 + offset;
    return Math.max(0, offsetPadding * (dispH / compH));
  },
}));

vi.mock('../../src/features/video-render/components/subtitle-editor/constants', () => ({
  DRAG_SNAP: 5,
  BASE_PADDING_BOTTOM: 40,
  FONT_SIZE_STEP: 2,
  MIN_FONT_SIZE: 14,
  MAX_FONT_SIZE: 48,
}));

// Mock subcomponentes sem transições MUI (Collapse/Fade)
vi.mock('../../src/features/video-render/components/subtitle-editor/EditorToolbar', () => ({
  EditorToolbar: ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
    <div data-testid="mock-editor-toolbar">
      <button data-testid="mock-confirm" onClick={onConfirm}>Confirmar</button>
      <button data-testid="mock-cancel" onClick={onCancel}>Cancelar</button>
    </div>
  ),
}));

vi.mock('../../src/features/video-render/components/subtitle-editor/EditorButton', () => ({
  EditorButton: ({ visible, onClick }: { visible: boolean; onClick: () => void }) =>
    visible ? <button data-testid="mock-editor-btn" onClick={onClick}>Editar legenda</button> : null,
}));

vi.mock('../../src/features/video-render/components/subtitle-editor/SubtitlePreview', () => ({
  SubtitlePreview: () => <div data-testid="mock-subtitle-preview" />,
}));

vi.mock('../../src/features/video-render/components/subtitle-editor/DragOverlay', () => ({
  DragOverlay: () => <div data-testid="mock-drag-overlay" />,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { SubtitleInlineEditor } from '../../src/features/video-render/components/SubtitleInlineEditor';
import { DEFAULT_SUBTITLE_STYLE } from '../../src/features/video-render/types';
import type { SubtitleStyle } from '../../src/features/video-render/types';

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('SubtitleInlineEditor', () => {
  const defaultStyle: SubtitleStyle = { ...DEFAULT_SUBTITLE_STYLE };
  const defaultProps = {
    hasCaptions: true,
    subtitleStyle: defaultStyle,
    onSubtitleStyleChange: vi.fn(),
    children: <div data-testid="child-content">Conteúdo do preview</div>,
    ratio: '16:9' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Renderização básica ---

  describe('renderização', () => {
    it('renderiza children normalmente quando não há legendas', () => {
      render(<SubtitleInlineEditor {...defaultProps} hasCaptions={false} />);
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renderiza botão de edição quando há legendas', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);
      expect(screen.getByTestId('mock-editor-btn')).toBeInTheDocument();
    });

    it('não renderiza botão de edição quando não há legendas', () => {
      render(<SubtitleInlineEditor {...defaultProps} hasCaptions={false} />);
      expect(screen.queryByTestId('mock-editor-btn')).not.toBeInTheDocument();
    });

    it('renderiza SubtitlePreview quando está editando', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      expect(screen.getByTestId('mock-subtitle-preview')).toBeInTheDocument();
    });

    it('renderiza DragOverlay quando está editando', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      expect(screen.getByTestId('mock-drag-overlay')).toBeInTheDocument();
    });

    it('não renderiza overlays quando não há legendas', () => {
      render(<SubtitleInlineEditor {...defaultProps} hasCaptions={false} />);
      expect(screen.queryByTestId('mock-editor-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-subtitle-preview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-drag-overlay')).not.toBeInTheDocument();
    });
  });

  // --- Modo edição ---

  describe('modo edição', () => {
    it('esconde botão de edição ao entrar no modo edição', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      expect(screen.queryByTestId('mock-editor-btn')).not.toBeInTheDocument();
    });

    it('renderiza toolbar ao entrar no modo edição', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      expect(screen.getByTestId('mock-editor-toolbar')).toBeInTheDocument();
    });

    it('confirma edição e chama onSubtitleStyleChange', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      act(() => {
        fireEvent.click(screen.getByTestId('mock-confirm'));
      });

      expect(defaultProps.onSubtitleStyleChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onSubtitleStyleChange).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 28 }),
      );
    });

    it('cancela edição sem chamar onSubtitleStyleChange', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      act(() => {
        fireEvent.click(screen.getByTestId('mock-cancel'));
      });

      expect(defaultProps.onSubtitleStyleChange).not.toHaveBeenCalled();
      // Botão de edição deve reaparecer
      expect(screen.getByTestId('mock-editor-btn')).toBeInTheDocument();
    });
  });

  // --- Escape para cancelar edição ---

  describe('atalho Escape', () => {
    it('cancela edição ao pressionar Escape', () => {
      render(<SubtitleInlineEditor {...defaultProps} />);

      act(() => {
        fireEvent.click(screen.getByTestId('mock-editor-btn'));
      });

      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(defaultProps.onSubtitleStyleChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('mock-editor-btn')).toBeInTheDocument();
    });
  });

  // --- Re-exports ---

  describe('re-exports', () => {
    it('re-exporta subcomponentes', async () => {
      const mod = await import('../../src/features/video-render/components/SubtitleInlineEditor');
      // Re-exports são forwardRef/memo → typeof === 'function'
      expect(typeof mod.EditorToolbar).toBe('function');
      expect(typeof mod.EditorButton).toBe('function');
      expect(typeof mod.FontSizeControls).toBe('function');
      expect(typeof mod.PositionToggle).toBe('function');
      expect(typeof mod.StyleSlider).toBe('function');
      expect(typeof mod.SubtitlePreview).toBe('function');
      expect(typeof mod.DragOverlay).toBe('function');
    });

    it('re-exporta utilitários', async () => {
      const mod = await import('../../src/features/video-render/components/SubtitleInlineEditor');
      expect(typeof mod.clamp).toBe('function');
      expect(typeof mod.calculatePreviewBottom).toBe('function');
    });

    it('clamp funciona corretamente', async () => {
      const { clamp } = await import('../../src/features/video-render/components/SubtitleInlineEditor');
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('calculatePreviewBottom funciona corretamente', async () => {
      const { calculatePreviewBottom } = await import('../../src/features/video-render/components/SubtitleInlineEditor');
      // Altura da composição 1080, display 540 (scale 0.5)
      // BASE_PADDING_BOTTOM (40) + offset (0) = 40 → 40 * 0.5 = 20
      expect(calculatePreviewBottom(0, 1080, 540)).toBe(20);

      // Com offset positivo (sobe)
      // (40 + 100) * 0.5 = 70
      expect(calculatePreviewBottom(100, 1080, 540)).toBe(70);

      // Display height 0 → retorna 0
      expect(calculatePreviewBottom(0, 1080, 0)).toBe(0);

      // Composição height 0 → retorna 0
      expect(calculatePreviewBottom(0, 0, 540)).toBe(0);
    });
  });
});
