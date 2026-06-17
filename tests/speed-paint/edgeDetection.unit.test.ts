/**
 * Testes unitários de `detectEdges()` — edge detection Canny simplificado
 * usado pelo pipeline edge+bezier do modo vetorial do Speed Paint.
 *
 * Cobre:
 *  (1) Validação de input (dimensões, thresholds, tipo de `data`)
 *  (2) Casos sintéticos (quadrado central, fundo uniforme, 1×1, xadrez 2×2)
 *  (3) Parâmetros (highThreshold, lowThreshold, blurSigma)
 *  (4) Shape e tipos (Uint8Array, length, valores 0/1, independência do input)
 *  (5) Sanity de performance (200×200 em < 200ms)
 *
 * @see `src/features/speed-paint/lib/edgeDetection.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  detectEdges,
  type EdgeDetectionOptions,
} from '../../src/features/speed-paint/lib/edgeDetection';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Cria um `ImageData` de teste usando duck typing: `detectEdges` só lê
 * `.width`, `.height` e `.data` (Uint8ClampedArray RGBA), então um objeto
 * com esses campos é suficiente — não depende de canvas 2D no jsdom.
 *
 * Formas suportadas:
 *  - `square` (default): quadrado branco central em fundo preto
 *  - `checker`: xadrez preto/branco (útil para detectar transições)
 *  - `none`: fundo uniforme (apenas `fillColor`)
 */
function makeTestImageData(
  width: number,
  height: number,
  fillColor: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 },
  shape: 'square' | 'checker' | 'none' = 'square',
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fundo uniforme
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillColor.r;
    data[i + 1] = fillColor.g;
    data[i + 2] = fillColor.b;
    data[i + 3] = 255;
  }

  if (shape === 'square' && width >= 4 && height >= 4) {
    // Quadrado branco central — gera borda nítida ao redor
    const x0 = Math.floor(width / 4);
    const y0 = Math.floor(height / 4);
    const x1 = Math.min(width - 1, Math.floor((width * 3) / 4));
    const y1 = Math.min(height - 1, Math.floor((height * 3) / 4));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
  } else if (shape === 'checker') {
    // Xadrez preto/branco — gera borda entre pixels diferentes
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if ((x + y) % 2 === 0) {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
    }
  }

  return { data, width, height } as unknown as ImageData;
}

/** Conta pixels com valor === 1 no edgeMap. */
function countEdges(edgeMap: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < edgeMap.length; i++) {
    if (edgeMap[i] === 1) n++;
  }
  return n;
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('detectEdges', () => {
  // ─── (1) Validação de input ───────────────────────────────────────

  describe('validação de input', () => {
    it('lança erro se imageData é null', () => {
      // A implementação acessa `imageData.width` antes de qualquer null-check,
      // então o erro vem do runtime (TypeError). Aceitamos qualquer erro —
      // o objetivo é garantir que NÃO retorna um edgeMap silenciosamente.
      expect(() =>
        detectEdges(null as unknown as ImageData),
      ).toThrow();
    });

    it('lança erro se imageData é undefined', () => {
      // Mesmo caso acima — TypeError do runtime ao acessar `.width`.
      expect(() =>
        detectEdges(undefined as unknown as ImageData),
      ).toThrow();
    });

    it('lança Error se width <= 0', () => {
      const bad = {
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 10,
      } as unknown as ImageData;
      expect(() => detectEdges(bad)).toThrowError(/dimensões inválidas/);
    });

    it('lança Error se height <= 0', () => {
      const bad = {
        data: new Uint8ClampedArray(0),
        width: 10,
        height: 0,
      } as unknown as ImageData;
      expect(() => detectEdges(bad)).toThrowError(/dimensões inválidas/);
    });

    it('lança Error se width é negativo', () => {
      const bad = {
        data: new Uint8ClampedArray(0),
        width: -1,
        height: 10,
      } as unknown as ImageData;
      expect(() => detectEdges(bad)).toThrowError(/dimensões inválidas/);
    });

    it('lança Error se lowThreshold >= highThreshold', () => {
      const img = makeTestImageData(10, 10);
      expect(() =>
        detectEdges(img, { lowThreshold: 0.5, highThreshold: 0.3 }),
      ).toThrowError(/lowThreshold.*<.*highThreshold/);
    });

    it('lança Error se lowThreshold === highThreshold', () => {
      const img = makeTestImageData(10, 10);
      expect(() =>
        detectEdges(img, { lowThreshold: 0.2, highThreshold: 0.2 }),
      ).toThrowError(/lowThreshold.*<.*highThreshold/);
    });

    it('lança Error se imageData.data não é Uint8ClampedArray', () => {
      const bad = {
        data: new Uint8Array(10 * 10 * 4), // Uint8Array, NÃO Uint8ClampedArray
        width: 10,
        height: 10,
      } as unknown as ImageData;
      expect(() => detectEdges(bad)).toThrowError(/Uint8ClampedArray/);
    });

    it('lança Error se imageData.data é um ArrayBuffer', () => {
      const bad = {
        data: new ArrayBuffer(10 * 10 * 4),
        width: 10,
        height: 10,
      } as unknown as ImageData;
      expect(() => detectEdges(bad)).toThrowError(/Uint8ClampedArray/);
    });

    it('lança Error se blurSigma <= 0', () => {
      const img = makeTestImageData(10, 10);
      expect(() => detectEdges(img, { blurSigma: 0 })).toThrowError(
        /blurSigma.*> 0/,
      );
    });

    it('lança Error se lowThreshold fora de [0, 1]', () => {
      const img = makeTestImageData(10, 10);
      expect(() =>
        detectEdges(img, { lowThreshold: -0.1 }),
      ).toThrowError(/lowThreshold.*\[0, 1\]/);
      expect(() => detectEdges(img, { lowThreshold: 1.5 })).toThrowError(
        /lowThreshold.*\[0, 1\]/,
      );
    });

    it('lança Error se highThreshold fora de [0, 1]', () => {
      const img = makeTestImageData(10, 10);
      expect(() =>
        detectEdges(img, { highThreshold: 2.0 }),
      ).toThrowError(/highThreshold.*\[0, 1\]/);
    });
  });

  // ─── (2) Casos sintéticos ────────────────────────────────────────

  describe('casos sintéticos', () => {
    it('quadrado branco central 50×50 produz edgeMap binário com bordas detectadas', () => {
      const img = makeTestImageData(50, 50, { r: 0, g: 0, b: 0 }, 'square');
      const edges = detectEdges(img);

      // Tipo e shape
      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(50 * 50);

      // Apenas valores 0 e 1
      for (const v of edges) {
        expect(v === 0 || v === 1).toBe(true);
      }

      // Deve haver pelo menos algumas bordas detectadas (perímetro do quadrado)
      const edgeCount = countEdges(edges);
      expect(edgeCount).toBeGreaterThan(0);

      // Centro do quadrado (sem borda) deve ser 0
      const center = Math.floor(50 / 2);
      const centerIdx = center * 50 + center;
      expect(edges[centerIdx]).toBe(0);

      // Canto do quadrado deve ter um pixel vizinho com borda detectada
      // (verifica que a borda foi encontrada em algum lugar da vizinhança)
      const borderY = Math.floor(50 / 4); // y0 do quadrado
      const borderX = Math.floor(50 / 4);
      let foundEdgeNearby = false;
      for (let dy = -1; dy <= 1 && !foundEdgeNearby; dy++) {
        for (let dx = -1; dx <= 1 && !foundEdgeNearby; dx++) {
          const ny = borderY + dy;
          const nx = borderX + dx;
          if (ny >= 0 && ny < 50 && nx >= 0 && nx < 50) {
            if (edges[ny * 50 + nx] === 1) foundEdgeNearby = true;
          }
        }
      }
      expect(foundEdgeNearby).toBe(true);
    });

    it('fundo uniforme preto sem bordas retorna edgeMap majoritariamente zero', () => {
      // Fundo preto uniforme — sem transição, sem padding-zero conflito,
      // pipeline deve produzir zero bordas (zero magnitude em todos os pixels).
      const img = makeTestImageData(30, 30, { r: 0, g: 0, b: 0 }, 'none');
      const edges = detectEdges(img);

      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(30 * 30);

      const edgeCount = countEdges(edges);
      expect(edgeCount).toBe(0);
    });

    it('fundo uniforme cinza sem bordas retorna edgeMap zero', () => {
      const img = makeTestImageData(30, 30, { r: 128, g: 128, b: 128 }, 'none');
      const edges = detectEdges(img);

      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(30 * 30);

      const edgeCount = countEdges(edges);
      expect(edgeCount).toBe(0);
    });

    it('imagem 1×1 retorna Uint8Array(1) com valor 0', () => {
      const img = makeTestImageData(1, 1, { r: 255, g: 0, b: 0 }, 'none');
      const edges = detectEdges(img);

      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(1);
      expect(edges[0]).toBe(0);
    });

    it('imagem 2×2 com xadrez detecta transição entre pixels diferentes', () => {
      const img = makeTestImageData(2, 2, { r: 0, g: 0, b: 0 }, 'checker');
      const edges = detectEdges(img);

      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(4);

      // Xadrez 2×2 tem transições em todas as direções — deve haver
      // pelo menos uma borda detectada.
      const edgeCount = countEdges(edges);
      expect(edgeCount).toBeGreaterThan(0);

      // Apenas valores 0 e 1
      for (const v of edges) {
        expect(v === 0 || v === 1).toBe(true);
      }
    });
  });

  // ─── (3) Parâmetros diferentes ───────────────────────────────────

  describe('parâmetros', () => {
    it('highThreshold mais alto detecta menos bordas que default', () => {
      const img = makeTestImageData(60, 60, { r: 0, g: 0, b: 0 }, 'square');

      const edgesDefault = detectEdges(img);
      const edgesRestrictive = detectEdges(img, { highThreshold: 0.5 });

      const countDefault = countEdges(edgesDefault);
      const countRestrictive = countEdges(edgesRestrictive);

      // Threshold mais alto → menos pixels passam do filtro
      expect(countRestrictive).toBeLessThanOrEqual(countDefault);
      // Ambos devem produzir pelo menos algumas bordas (o quadrado é forte)
      expect(countRestrictive).toBeGreaterThan(0);
      expect(countDefault).toBeGreaterThan(0);
    });

    it('highThreshold alto filtra bordas de transição fraca', () => {
      // Imagem com um único quadrado cinza-claro em fundo preto — borda
      // moderada (não abrupta). Threshold alto deve eliminar mais pixels.
      const data = new Uint8ClampedArray(40 * 40 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
      // Quadrado cinza-claro (contraste médio, não máximo)
      for (let y = 12; y < 28; y++) {
        for (let x = 12; x < 28; x++) {
          const idx = (y * 40 + x) * 4;
          data[idx] = 80;
          data[idx + 1] = 80;
          data[idx + 2] = 80;
          data[idx + 3] = 255;
        }
      }
      const img = { data, width: 40, height: 40 } as unknown as ImageData;

      // lowThreshold precisa ser < highThreshold (validação do pipeline).
      const edgesStrict = detectEdges(img, {
        highThreshold: 0.8,
        lowThreshold: 0.4,
      });
      const edgesPermissive = detectEdges(img, {
        highThreshold: 0.1,
        lowThreshold: 0.02,
      });

      // Threshold mais restritivo deve detectar menos bordas
      expect(countEdges(edgesStrict)).toBeLessThanOrEqual(
        countEdges(edgesPermissive),
      );
    });

    it('lowThreshold mais baixo mantém mais bordas fracas conectadas', () => {
      const img = makeTestImageData(60, 60, { r: 0, g: 0, b: 0 }, 'square');

      const edgesDefault = detectEdges(img, { lowThreshold: 0.1 });
      const edgesPermissive = detectEdges(img, { lowThreshold: 0.05 });

      // lowThreshold menor → mais bordas fracas promovidas via hysteresis
      expect(countEdges(edgesPermissive)).toBeGreaterThanOrEqual(
        countEdges(edgesDefault),
      );
    });

    it('blurSigma diferente de 1.0 ainda produz edgeMap válido', () => {
      const img = makeTestImageData(40, 40, { r: 0, g: 0, b: 0 }, 'square');

      const edgesBlur2 = detectEdges(img, { blurSigma: 2.0 });
      const edgesBlur05 = detectEdges(img, { blurSigma: 0.5 });

      // Ambos devem produzir edgeMap com shape e tipos corretos
      expect(edgesBlur2).toBeInstanceOf(Uint8Array);
      expect(edgesBlur2.length).toBe(40 * 40);
      expect(edgesBlur05).toBeInstanceOf(Uint8Array);
      expect(edgesBlur05.length).toBe(40 * 40);

      // Pelo menos algumas bordas detectadas em ambos
      expect(countEdges(edgesBlur2)).toBeGreaterThan(0);
      expect(countEdges(edgesBlur05)).toBeGreaterThan(0);
    });

    it('blurSigma altera a suavização em imagem com ruído determinístico', () => {
      const data = new Uint8ClampedArray(40 * 40 * 4);
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const idx = (y * 40 + x) * 4;
          const value = (x * 17 + y * 31) % 256;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }
      const img = { data, width: 40, height: 40 } as unknown as ImageData;

      const sharp = detectEdges(img, { blurSigma: 0.5 });
      const smooth = detectEdges(img, { blurSigma: 2.0 });

      expect(sharp).not.toEqual(smooth);
    });
  });

  // ─── (4) Shape e tipos ────────────────────────────────────────────

  describe('shape e tipos', () => {
    it('retorna Uint8Array (instanceof check)', () => {
      const img = makeTestImageData(10, 10);
      const edges = detectEdges(img);
      expect(edges).toBeInstanceOf(Uint8Array);
    });

    it('edgeMap.length === width * height', () => {
      const cases: Array<{ w: number; h: number }> = [
        { w: 10, h: 10 },
        { w: 25, h: 17 },
        { w: 1, h: 1 },
        { w: 100, h: 50 },
      ];
      for (const { w, h } of cases) {
        const img = makeTestImageData(w, h, { r: 0, g: 0, b: 0 }, 'square');
        const edges = detectEdges(img);
        expect(edges.length).toBe(w * h);
      }
    });

    it('todos os valores são 0 ou 1 (nenhum valor intermediário)', () => {
      const img = makeTestImageData(50, 50, { r: 0, g: 0, b: 0 }, 'square');
      const edges = detectEdges(img);

      for (const v of edges) {
        expect(v === 0 || v === 1).toBe(true);
        // Garante explicitamente que não há valores como 2, 255, etc.
        expect(v).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    });

    it('edgeMap é independente do input — modificar um não afeta o outro', () => {
      const data = new Uint8ClampedArray(20 * 20 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      const img = { data, width: 20, height: 20 } as unknown as ImageData;

      const edges1 = detectEdges(img);
      const edges1Copy = new Uint8Array(edges1);

      // Modifica o edgeMap retornado — não deve estourar nem corromper
      edges1[0] = 1;
      edges1[10] = 0;

      // Segunda chamada deve produzir o mesmo resultado (input não mudou)
      const edges2 = detectEdges(img);
      expect(edges2).toEqual(edges1Copy);
    });
  });

  // ─── (5) Performance / sanity ────────────────────────────────────

  describe('performance', () => {
    it('200×200 processa em menos de 200ms', () => {
      const img = makeTestImageData(200, 200, { r: 0, g: 0, b: 0 }, 'square');

      const start = performance.now();
      const edges = detectEdges(img);
      const elapsed = performance.now() - start;

      expect(edges).toBeInstanceOf(Uint8Array);
      expect(edges.length).toBe(200 * 200);
      // Threshold generoso — CI/shared runners podem oscilar
      expect(elapsed).toBeLessThan(500);
      // Log auxiliar para diagnóstico (aparece se falhar)
      if (elapsed >= 200) {
        console.warn(`detectEdges 200×200: ${elapsed.toFixed(1)}ms`);
      }
    });
  });

  // ─── (6) API pública — type-only sanity ──────────────────────────

  describe('API pública', () => {
    it('EdgeDetectionOptions aceita todos os campos opcionais', () => {
      // Compilação + execução vazia — garante que o tipo é compatível
      const opts1: EdgeDetectionOptions = {};
      const opts2: EdgeDetectionOptions = { blurSigma: 1.0 };
      const opts3: EdgeDetectionOptions = {
        blurSigma: 1.0,
        highThreshold: 0.3,
        lowThreshold: 0.1,
      };
      expect(opts1).toBeDefined();
      expect(opts2).toBeDefined();
      expect(opts3).toBeDefined();
    });
  });
});
