/**
 * Testes unitários de `filterContoursByCompactness()` — helper do pipeline
 * edge+bezier do Speed Paint (v0.133.0).
 *
 * ## Contexto
 *
 * O helper foi introduzido na v0.133.0 para filtrar contours de Canny
 * por compacidade isoperimétrica (`4π·A/P²`) e perímetro mínimo. Foi
 * **deliberadamente não conectado ao pipeline** porque o Canny do
 * projeto gera contours de 1px de espessura, onde a compacidade é ~0
 * mesmo para formas legítimas.
 *
 * Estes testes validam o **algoritmo** do filtro (puro), para que
 * possa ser conectado quando o detector de bordas for melhorado.
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 */

import { describe, it, expect } from 'vitest';
import { filterContoursByCompactness } from '../../src/features/speed-paint/lib/vectorizer';
import type { Contour } from '../../src/features/speed-paint/lib/contourTracing';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Cria um quadrado fechado (N×N pixels) como `Contour`. A área do
 * quadrado é `N²` (real, não degenerada) — bom para validar compacidade.
 */
function makeSquareContour(size: number, offsetX = 0, offsetY = 0): Contour {
  const points = [];
  for (let i = 0; i < size; i++) {
    points.push({ x: offsetX + i, y: offsetY });
  }
  for (let i = 1; i < size; i++) {
    points.push({ x: offsetX + size - 1, y: offsetY + i });
  }
  for (let i = size - 2; i >= 0; i--) {
    points.push({ x: offsetX + i, y: offsetY + size - 1 });
  }
  for (let i = size - 2; i >= 1; i--) {
    points.push({ x: offsetX, y: offsetY + i });
  }
  return { points, closed: true };
}

/**
 * Cria uma linha reta horizontal de `length` pixels. A "área" de
 * shoelace é 0 (polígono 1D) — compacidade 0 — deve ser filtrada.
 */
function makeHorizontalLineContour(length: number, y = 0, xStart = 0): Contour {
  const points = [];
  for (let i = 0; i < length; i++) {
    points.push({ x: xStart + i, y });
  }
  return { points, closed: false };
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('filterContoursByCompactness', () => {
  describe('casos básicos', () => {
    it('retorna o array original se todos os contours passam', () => {
      // 1 quadrado 10×10 = área 100, perímetro ~40, compacidade ~0.78
      const contours: Contour[] = [makeSquareContour(10)];
      const result = filterContoursByCompactness(contours, 0.05, 2.0);
      expect(result).toHaveLength(1);
    });

    it('filtra contour de linha (área 0, compacidade 0)', () => {
      // Linha de 50 pixels: área 0, perímetro 50, compacidade = 0 < 0.05
      const contours: Contour[] = [makeHorizontalLineContour(50)];
      const result = filterContoursByCompactness(contours, 0.05, 2.0);
      expect(result).toHaveLength(0);
    });

    it('filtra contour com perímetro < epsilon * 3', () => {
      // epsilon = 5 → minPerimeter = 15. Linha de 10 < 15 → filtrada.
      const contours: Contour[] = [makeHorizontalLineContour(10)];
      const result = filterContoursByCompactness(contours, 0.05, 5.0);
      expect(result).toHaveLength(0);
    });

    it('preserva quadrado grande (compacidade > threshold)', () => {
      // Quadrado 20×20: área 400, perímetro ~80, compacidade ~0.78
      const contours: Contour[] = [makeSquareContour(20)];
      const result = filterContoursByCompactness(contours, 0.05, 2.0);
      expect(result).toHaveLength(1);
    });
  });

  describe('lista mista (linhas + blobs)', () => {
    it('mantém apenas os contours densos', () => {
      // 2 linhas (devem ser filtradas) + 1 quadrado (deve passar)
      const contours: Contour[] = [
        makeHorizontalLineContour(50), // linha: filtrada
        makeHorizontalLineContour(30), // linha: filtrada
        makeSquareContour(15), // quadrado: mantido
      ];
      const result = filterContoursByCompactness(contours, 0.05, 2.0);
      expect(result).toHaveLength(1);
      expect(result[0]?.closed).toBe(true); // o quadrado
    });
  });

  describe('filtro é escala-invariante', () => {
    it('mesma forma em escalas diferentes tem mesma compacidade', () => {
      // Quadrado 5×5 e 50×50: mesma compacidade (~0.78) — ambos passam
      const small: Contour[] = [makeSquareContour(5)];
      const big: Contour[] = [makeSquareContour(50)];
      expect(filterContoursByCompactness(small, 0.05, 2.0)).toHaveLength(1);
      expect(filterContoursByCompactness(big, 0.05, 2.0)).toHaveLength(1);
    });
  });

  describe('documentação do motivo de não-conexão (v0.133.0)', () => {
    it('contours 1D do Canny (linhas de 1px) sempre são filtrados, mesmo quando legítimos', () => {
      // Demonstra o motivo de o helper não estar conectado: contornos
      // de borda reais (lados de quadrados, contornos de letras) têm
      // 1px de espessura e portanto compacidade ~0. Conectar este
      // filtro quebraria o pipeline em casos reais.
      const linhaDeBordaReal = makeHorizontalLineContour(100); // 100px de lado
      const result = filterContoursByCompactness([linhaDeBordaReal], 0.05, 2.0);
      expect(result).toHaveLength(0);
    });
  });
});
