import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/theme/surfaces', () => ({
  insetPanelSx: () => ({ p: 2 }),
}));

vi.mock('../../src/theme/tokens', () => ({
  GAP_COMPACT: 0.5,
  GAP_DEFAULT: 1,
  ICON_SIZE_MD: 20,
  BRAND_PRIMARY_GLOW_SOFT: 'rgba(46,117,182,0.12)',
}));

// ---------------------------------------------------------------------------
// Imports (apos mocks)
// ---------------------------------------------------------------------------

import { SpeedPaintControls } from '../../src/features/video-render/components/SpeedPaintControls';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderControls(props: {
  sketch?: number;
  reveal?: number;
  onSketchChange?: (v: number) => void;
  onRevealChange?: (v: number) => void;
} = {}) {
  const onSketchChange = vi.fn();
  const onRevealChange = vi.fn();
  return render(
    <SpeedPaintControls
      sketch={props.sketch ?? 1.0}
      reveal={props.reveal ?? 0.25}
      onSketchChange={props.onSketchChange ?? onSketchChange}
      onRevealChange={props.onRevealChange ?? onRevealChange}
    />,
  );
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('SpeedPaintControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Renderizacao basica ---

  describe('renderizacao', () => {
    it('renderiza o titulo "Velocidade do Speed Paint"', () => {
      renderControls();
      expect(screen.getByText('Velocidade do Speed Paint')).toBeInTheDocument();
    });

    it('renderiza a descricao do controle', () => {
      renderControls();
      expect(
        screen.getByText('Controle separado de velocidade para desenho e coloração.'),
      ).toBeInTheDocument();
    });

    it('renderiza os labels dos sliders colapsados (sketch e reveal)', () => {
      renderControls({ sketch: 1.0, reveal: 0.25 });
      // sketch=1.0 -> "1.0x Normal"; reveal=0.25 -> 0.25*4=1.0 -> "1.0x Normal"
      // Ambos os labels coincidem, entao usamos getAllByText
      const labels = screen.getAllByText('1.0x Normal');
      expect(labels).toHaveLength(2);
    });

    it('comeca colapsado (aria-expanded=false)', () => {
      renderControls();
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('expande ao clicar no header', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('colapsa ao clicar novamente no header', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      act(() => {
        fireEvent.click(button);
      });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // --- formatSpeedLabel (testado via render com diferentes valores de sketch) ---

  describe('formatSpeedLabel (via prop sketch)', () => {
    it.each([
      { value: 0.25, expected: '0.25x Muito lento' },
      { value: 0.5, expected: '0.5x Lento' },
      { value: 0.75, expected: '0.75x' },
      { value: 1.0, expected: '1.0x Normal' },
      { value: 1.5, expected: '1.5x Rápido' },
      { value: 2.0, expected: '2.0x Rápido' },
      { value: 3.0, expected: '3.0x Muito rápido' },
      { value: 4.0, expected: '4.0x Máximo' },
    ])('sketch=$value exibe label "$expected"', ({ value, expected }) => {
      renderControls({ sketch: value, reveal: 0.25 });
      // O label aparece como texto visivel no cabecalho
      const allLabels = screen.getAllByText(expected);
      expect(allLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('valor fora do range exibe label generico (ex: 1.25x)', () => {
      renderControls({ sketch: 1.25, reveal: 0.25 });
      // 1.25 nao tem label especifico, cai no fallback `${value}x`
      expect(screen.getAllByText('1.25x').length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- formatRevealLabel (testado via render com diferentes valores de reveal) ---

  describe('formatRevealLabel (via prop reveal)', () => {
    it.each([
      { value: 0.25, expected: '1.0x Normal' },   // 0.25 * 4 = 1.0
      { value: 0.5, expected: '2.0x Rápido' },    // 0.5 * 4 = 2.0
      { value: 0.75, expected: '3.0x' },           // 0.75 * 4 = 3.0
      { value: 1.0, expected: '4.0x' },            // 1.0 * 4 = 4.0
      { value: 1.5, expected: '6.0x' },            // 1.5 * 4 = 6.0
      { value: 2.0, expected: '8.0x' },            // 2.0 * 4 = 8.0
      { value: 3.0, expected: '12.0x' },           // 3.0 * 4 = 12.0
      { value: 4.0, expected: '16.0x Máximo' },    // 4.0 * 4 = 16.0
    ])('reveal=$value exibe label "$expected"', ({ value, expected }) => {
      renderControls({ sketch: 1.0, reveal: value });
      const allLabels = screen.getAllByText(expected);
      expect(allLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('valor fora do range usa formula display = value * 4 (ex: reveal=1.25 -> 5x)', () => {
      renderControls({ sketch: 1.0, reveal: 1.25 });
      // 1.25 * 4 = 5 (JavaScript remove .0 de inteiros no template literal)
      // cai no fallback `${display}x` -> "5x"
      expect(screen.getAllByText('5x').length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Sliders internos (apos expandir) ---

  describe('sliders internos', () => {
    it('renderiza slider de sketch com aria-label correto', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      expect(screen.getByLabelText('Velocidade do desenho (sketch)')).toBeInTheDocument();
    });

    it('renderiza slider de reveal com aria-label correto', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      expect(screen.getByLabelText('Velocidade da coloração (reveal)')).toBeInTheDocument();
    });

    it('renderiza label "Desenho (Sketch)" ao expandir', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      expect(screen.getByText('Desenho (Sketch)')).toBeInTheDocument();
    });

    it('renderiza label "Colorir (Reveal)" ao expandir', () => {
      renderControls();
      const button = screen.getByRole('button');
      act(() => {
        fireEvent.click(button);
      });
      expect(screen.getByText('Colorir (Reveal)')).toBeInTheDocument();
    });
  });

  // --- Acessibilidade ---

  describe('acessibilidade', () => {
    it('button do header possui aria-controls com id do Collapse', () => {
      renderControls();
      const button = screen.getByRole('button');
      const controlsId = button.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
    });

    it('Collapse possui id correspondente ao aria-controls do button', () => {
      renderControls();
      const button = screen.getByRole('button');
      const controlsId = button.getAttribute('aria-controls')!;
      // O Collapse usa esse id — verificamos que o elemento com esse id existe no DOM
      const collapseEl = document.getElementById(controlsId);
      expect(collapseEl).toBeInTheDocument();
    });
  });
});
