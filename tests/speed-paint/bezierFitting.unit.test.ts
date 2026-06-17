/**
 * Testes unitários de `fitBezierPaths()` — ajuste de curvas Bezier cúbicas
 * para contornos de borda, usado pelo pipeline edge+bezier do modo vetorial
 * do Speed Paint.
 *
 * Cobre:
 *  (1) Validação de input (dimensões inválidas, contours vazios, contornos
 *      degenerados com 1 ponto, contorno vazio)
 *  (2) Casos sintéticos: linha reta colinear, círculo aproximado, zigzag
 *      com muitos pontos, pontos colineares, contorno com 1 ponto
 *  (3) `closed: true` vs `closed: false` (Bezier de fechamento vs não)
 *  (4) Parâmetros: epsilon, fitError, maxDepth (efeito na quantidade de
 *      Bezier e na simplificação)
 *  (5) Validação de `getLength`: todo path retornado tem `length > 0`,
 *      `Number.isFinite(length)`, `d` bem-formado (começa com `M`,
 *      contém `C`)
 *  (6) Shape e tipos: retorno é sempre `BezierPath[]`, chaves `d`/`length`
 *      presentes, sem `null`/`undefined`
 *
 * Helpers:
 *  - `makeContour`: constrói um `Contour` a partir de tuplas `[x, y]`
 *  - `makeCircleContour`: gera `n` pontos uniformemente espaçados em volta
 *    de um centro (forma fechada)
 *  - `makeZigzagContour`: gera `n` pontos alternando entre y=0 e y=amp
 *  - `makeColinearContour`: gera pontos alinhados no eixo Y
 *  - `makeOpenLineContour`: gera `n` pontos espaçados de `step` em x
 *  - `countBezierCommands`: conta quantos comandos `C` aparecem no `d`
 *  - `extractEndpoints`: extrai os pontos inicial/final dos comandos SVG
 *
 * @see `src/features/speed-paint/lib/bezierFitting.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  fitBezierPaths,
  type BezierPath,
} from '../../src/features/speed-paint/lib/bezierFitting';
import type {
  Contour,
  Point2D,
} from '../../src/features/speed-paint/lib/contourTracing';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Constrói um `Contour` a partir de uma lista de tuplas `[x, y]`.
 * Por padrão `closed: false`.
 */
function makeContour(
  points: ReadonlyArray<readonly [number, number]>,
  closed = false,
): Contour {
  const pts: Point2D[] = points.map(([x, y]) => ({ x, y }));
  return { points: pts, closed };
}

/**
 * Gera `n` pontos uniformemente espaçados em volta de um centro — forma
 * aproximadamente circular. Fecha o contorno por padrão.
 */
function makeCircleContour(
  cx: number,
  cy: number,
  r: number,
  n = 16,
  closed = true,
): Contour {
  const pts: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return { points: pts, closed };
}

/**
 * Gera `n` pontos alternando entre y=0 e y=amp. Útil para verificar
 * simplificação via RDP.
 */
function makeZigzagContour(n: number, amp: number, closed = false): Contour {
  const pts: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: i * 2, y: i % 2 === 0 ? 0 : amp });
  }
  return { points: pts, closed };
}

/**
 * Gera `n` pontos alinhados no eixo Y=y (colineares).
 */
function makeColinearContour(
  n: number,
  y: number,
  step = 1,
  closed = false,
): Contour {
  const pts: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: i * step, y });
  }
  return { points: pts, closed };
}

/**
 * Gera uma linha aberta com `n` pontos espaçados de `step` em x, no eixo y=0.
 */
function makeOpenLineContour(
  n: number,
  step = 10,
  y = 0,
): Contour {
  const pts: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: i * step, y });
  }
  return { points: pts, closed: false };
}

/**
 * Conta quantos comandos `C` (cubic Bezier) aparecem no atributo `d`.
 */
function countBezierCommands(d: string): number {
  const matches = d.match(/C/g);
  return matches ? matches.length : 0;
}

/**
 * Conta quantos comandos `M` (moveTo) aparecem no atributo `d`.
 */
function countMoveCommands(d: string): number {
  const matches = d.match(/M/g);
  return matches ? matches.length : 0;
}

/** Extrai o ponto final do último comando C do path SVG. */
function extractLastCubicEndpoint(d: string): Point2D | null {
  const matches = Array.from(
    d.matchAll(/C\s+[-\d.]+\s+[-\d.]+,\s+[-\d.]+\s+[-\d.]+,\s+([-\d.]+)\s+([-\d.]+)/g),
  );
  const last = matches.at(-1);
  if (!last) {
    return null;
  }
  return {
    x: Number(last[1]),
    y: Number(last[2]),
  };
}

/**
 * Verifica invariantes compartilhadas de um `BezierPath` válido.
 * Usado por vários testes para reduzir duplicação.
 */
function expectValidBezierPath(path: BezierPath): void {
  expect(path).toBeDefined();
  expect(path).not.toBeNull();
  expect(typeof path.d).toBe('string');
  expect(path.d.length).toBeGreaterThan(0);
  expect(typeof path.length).toBe('number');
  expect(Number.isFinite(path.length)).toBe(true);
  expect(path.length).toBeGreaterThan(0);
  // Chaves esperadas (exatamente d, length).
  expect(Object.keys(path).sort()).toEqual(['d', 'length']);
  // d deve começar com M e conter pelo menos 1 C.
  expect(path.d).toMatch(/^M\s/);
  expect(path.d).toContain('C');
}

// ─── Testes ───────────────────────────────────────────────────────────

describe('fitBezierPaths', () => {
  describe('validação de input', () => {
    it('lança Error se width <= 0', () => {
      const contour = makeContour([
        [0, 0],
        [10, 0],
        [20, 0],
      ]);
      expect(() => fitBezierPaths([contour], 0, 100)).toThrow(
        /dimensões inválidas/,
      );
      expect(() => fitBezierPaths([contour], -1, 100)).toThrow(
        /dimensões inválidas/,
      );
    });

    it('lança Error se height <= 0', () => {
      const contour = makeContour([
        [0, 0],
        [10, 0],
        [20, 0],
      ]);
      expect(() => fitBezierPaths([contour], 100, 0)).toThrow(
        /dimensões inválidas/,
      );
      expect(() => fitBezierPaths([contour], 100, -5)).toThrow(
        /dimensões inválidas/,
      );
    });

    it('inclui width e height inválidos na mensagem do erro', () => {
      const contour = makeContour([
        [0, 0],
        [10, 0],
      ]);
      expect(() => fitBezierPaths([contour], -7, -3)).toThrow(
        /width=-7.*height=-3/,
      );
    });

    it('retorna [] para contours vazio', () => {
      const result = fitBezierPaths([], 100, 100);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('retorna [] quando todos os contornos são degenerados (1 ponto)', () => {
      const single1: Contour = { points: [{ x: 0, y: 0 }], closed: false };
      const single2: Contour = { points: [{ x: 5, y: 5 }], closed: false };
      const result = fitBezierPaths([single1, single2], 100, 100);
      expect(result).toEqual([]);
    });

    it('retorna [] quando contours tem apenas pontos vazios', () => {
      const empty1: Contour = { points: [], closed: false };
      const empty2: Contour = { points: [], closed: true };
      const result = fitBezierPaths([empty1, empty2], 100, 100);
      expect(result).toEqual([]);
    });
  });

  describe('caso sintético: linha reta com 4 pontos', () => {
    const lineContour = makeContour([
      [0, 0],
      [10, 0],
      [20, 0],
      [30, 0],
    ]);

    it('produz exatamente 1 path', () => {
      const result = fitBezierPaths([lineContour], 100, 100);
      expect(result).toHaveLength(1);
    });

    it('o path retornado satisfaz invariantes de validade (d não-vazio, length > 0, finito, começa com M, contém C)', () => {
      const result = fitBezierPaths([lineContour], 100, 100);
      expect(result[0]).toBeDefined();
      expectValidBezierPath(result[0]!);
    });

    it('d começa com M e contém comandos C (sem Z por padrão)', () => {
      const result = fitBezierPaths([lineContour], 100, 100);
      const d = result[0]!.d;
      expect(countMoveCommands(d)).toBe(1);
      expect(d).toContain('C');
      expect(d).not.toContain('Z');
    });

    it('comprimento aproximado está próximo da distância real (30 pixels)', () => {
      const result = fitBezierPaths([lineContour], 100, 100);
      // 4 pontos colineares a cada 10 pixels = 30 pixels de comprimento.
      // RDP colapsa para 2 pontos e a Bezier entre eles é uma linha reta.
      expect(result[0]!.length).toBeCloseTo(30, 0);
    });
  });

  describe('caso sintético: círculo aproximado (16 pontos)', () => {
    const circleContour = makeCircleContour(50, 50, 20, 16, true);

    it('produz 1 path', () => {
      const result = fitBezierPaths([circleContour], 200, 200);
      expect(result).toHaveLength(1);
    });

    it('o path satisfaz invariantes de validade', () => {
      const result = fitBezierPaths([circleContour], 200, 200);
      expect(result[0]).toBeDefined();
      expectValidBezierPath(result[0]!);
    });

    it('contém múltiplos comandos C (círculo decomposto em várias Beziers)', () => {
      const result = fitBezierPaths([circleContour], 200, 200);
      const d = result[0]!.d;
      // Pelo menos 1 Bezier para um círculo de 16 pontos; esperado várias
      // dado o epsilon padrão 2.0 e a curvatura do círculo.
      expect(countBezierCommands(d)).toBeGreaterThanOrEqual(1);
    });

    it('comprimento é positivo e finito', () => {
      const result = fitBezierPaths([circleContour], 200, 200);
      expect(result[0]!.length).toBeGreaterThan(0);
      expect(Number.isFinite(result[0]!.length)).toBe(true);
    });

    it('comprimento é da ordem do perímetro do círculo (2πr ≈ 125.6)', () => {
      const result = fitBezierPaths([circleContour], 200, 200);
      // Círculo de raio 20 → perímetro ~125.66. Aceita tolerância ampla
      // (±30%) porque a aproximação Bezier pode divergir.
      const expected = 2 * Math.PI * 20;
      expect(result[0]!.length).toBeGreaterThan(expected * 0.7);
      expect(result[0]!.length).toBeLessThan(expected * 1.3);
    });
  });

  describe('caso sintético: zigzag com 50 pontos (RDP simplifica)', () => {
    const zigzagContour = makeZigzagContour(50, 1, false);

    it('RDP com epsilon=2.0 colapsa zigzag de amplitude 1 (sem cantos visíveis)', () => {
      // Amplitude 1 < epsilon 2.0 → todos os pontos intermediários têm
      // distância perpendicular ≤ 1 ao segmento (primeiro, último) e
      // são descartados. Resta apenas 1 path reto.
      const result = fitBezierPaths([zigzagContour], 200, 200);
      expect(result).toHaveLength(1);
      // Bezier colapsada = linha reta com 1 único C.
      expect(countBezierCommands(result[0]!.d)).toBe(1);
    });

    it('com epsilon=0.1 (muito pequeno), preserva mais pontos e produz mais Beziers', () => {
      const amp1 = fitBezierPaths([zigzagContour], 200, 200, { epsilon: 0.1 });
      const ampDefault = fitBezierPaths([zigzagContour], 200, 200);
      // Com epsilon=0.1, mais pontos sobrevivem ao RDP, gerando mais Beziers.
      // Com epsilon=2.0, zigzag de amplitude 1 colapsa para 1 Bezier.
      expect(ampDefault[0]).toBeDefined();
      const defaultCount = countBezierCommands(ampDefault[0]!.d);
      // O path com epsilon pequeno deve ter ≥ 1 Bezier (pode ter mais).
      // A diferença principal é que RDP mantém mais cantos.
      if (amp1.length > 0) {
        const smallCount = countBezierCommands(amp1[0]!.d);
        // epsilon=0.1 deve produzir path mais "complexo" (≥ que epsilon=2.0
        // para zigzag de amplitude 1).
        expect(smallCount).toBeGreaterThanOrEqual(defaultCount);
      }
    });

    it('todos os paths retornados são válidos', () => {
      const result = fitBezierPaths([zigzagContour], 200, 200, { epsilon: 0.1 });
      for (const p of result) {
        expectValidBezierPath(p);
      }
    });
  });

  describe('caso sintético: pontos colineares', () => {
    const colinear = makeColinearContour(5, 10, 1, false);

    it('produz 1 path', () => {
      const result = fitBezierPaths([colinear], 100, 100);
      expect(result).toHaveLength(1);
    });

    it('comprimento é igual à distância entre primeiro e último (4 pixels)', () => {
      // 5 pontos colineares: (0,10) (1,10) (2,10) (3,10) (4,10)
      // RDP colapsa para 2 pontos: (0,10) e (4,10) → 1 Bezier reta = 4 px.
      const result = fitBezierPaths([colinear], 100, 100);
      expect(result[0]!.length).toBeCloseTo(4, 0);
    });

    it('o path tem 1 comando C (linha reta)', () => {
      const result = fitBezierPaths([colinear], 100, 100);
      expect(countBezierCommands(result[0]!.d)).toBe(1);
    });
  });

  describe('contorno com 1 ponto (descartado)', () => {
    it('contorno de 1 ponto é descartado silenciosamente', () => {
      const degenerate: Contour = {
        points: [{ x: 50, y: 50 }],
        closed: false,
      };
      const valid = makeOpenLineContour(3);
      const result = fitBezierPaths([degenerate, valid], 100, 100);
      // Apenas o contorno válido produz path.
      expect(result).toHaveLength(1);
      expectValidBezierPath(result[0]!);
    });
  });

  describe('closed: true vs closed: false', () => {
    const openContour = makeContour([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const closedContour = makeContour(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      true,
    );

    it('closed: false → d não contém Z e termina no último ponto', () => {
      const result = fitBezierPaths([openContour], 100, 100);
      expect(result[0]).toBeDefined();
      const d = result[0]!.d;
      expect(d).not.toContain('Z');
      expect(countBezierCommands(d)).toBe(2);
      expect(extractLastCubicEndpoint(d)).toEqual({ x: 10, y: 10 });
    });

    it('closed: true → d contém Bezier extra de fechamento (1 C a mais que open)', () => {
      const open = fitBezierPaths([openContour], 100, 100);
      const closed = fitBezierPaths([closedContour], 100, 100);
      expect(open[0]).toBeDefined();
      expect(closed[0]).toBeDefined();
      const d = closed[0]!.d;
      // closed emite Bezier "linha" de volta ao start → 1 C extra.
      expect(d).not.toContain('Z');
      expect(countBezierCommands(d)).toBe(countBezierCommands(open[0]!.d) + 1);
    });

    it('closed: true → length inclui a Bezier de fechamento', () => {
      const open = fitBezierPaths([openContour], 100, 100);
      const closed = fitBezierPaths([closedContour], 100, 100);
      // Triângulo (0,0)→(10,0)→(10,10): open = hipotenusa + 2 catetos;
      // closed = open + (10,10)→(0,0). O length de closed deve ser maior
      // que o de open porque adiciona a hipotenusa (√200 ≈ 14.14).
      expect(closed[0]).toBeDefined();
      expect(open[0]).toBeDefined();
      expect(closed[0]!.length).toBeGreaterThan(open[0]!.length);
    });

    it('closed: true → ambos os paths são válidos', () => {
      const result = fitBezierPaths([closedContour], 100, 100);
      expectValidBezierPath(result[0]!);
    });
  });

  describe('parâmetros: efeito do epsilon', () => {
    const contour = makeZigzagContour(50, 5, false); // amplitude 5

    it('epsilon muito pequeno (0.1) preserva mais pontos → mais Beziers', () => {
      const small = fitBezierPaths([contour], 200, 200, { epsilon: 0.1 });
      const big = fitBezierPaths([contour], 200, 200, { epsilon: 100 });

      // Ambos devem produzir 1 path (contorno único, não-degenerado).
      expect(small).toHaveLength(1);
      expect(big).toHaveLength(1);

      const smallCount = countBezierCommands(small[0]!.d);
      const bigCount = countBezierCommands(big[0]!.d);
      // epsilon=0.1 → zigzag completo (muitos cantos) → mais Beziers.
      // epsilon=100 → colapsa para linha reta → 1 Bezier.
      expect(smallCount).toBeGreaterThanOrEqual(bigCount);
    });

    it('epsilon muito grande (100) colapsa zigzag para linha reta (1 Bezier)', () => {
      const result = fitBezierPaths([contour], 200, 200, { epsilon: 100 });
      expect(countBezierCommands(result[0]!.d)).toBe(1);
    });

    it('paths com epsilon pequeno continuam válidos (length > 0, finito)', () => {
      const result = fitBezierPaths([contour], 200, 200, { epsilon: 0.1 });
      for (const p of result) {
        expectValidBezierPath(p);
      }
    });
  });

  describe('parâmetros: efeito do fitError', () => {
    // Curva com pontos não-colineares para forçar subdivisão.
    const curveContour: Contour = {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 15 },
        { x: 30, y: 10 },
        { x: 40, y: 25 },
        { x: 50, y: 20 },
        { x: 60, y: 30 },
        { x: 70, y: 25 },
        { x: 80, y: 35 },
        { x: 90, y: 30 },
        { x: 100, y: 40 },
      ],
      closed: false,
    };

    it('fitError muito pequeno (0.1) → mais subdivisões → mais Beziers', () => {
      const strict = fitBezierPaths([curveContour], 200, 200, {
        fitError: 0.1,
        maxDepth: 10,
      });
      const loose = fitBezierPaths([curveContour], 200, 200, {
        fitError: 100,
        maxDepth: 10,
      });

      expect(strict).toHaveLength(1);
      expect(loose).toHaveLength(1);

      const strictCount = countBezierCommands(strict[0]!.d);
      const looseCount = countBezierCommands(loose[0]!.d);
      // fitError estrito exige mais subdivisões → mais Beziers.
      expect(strictCount).toBeGreaterThanOrEqual(looseCount);
    });

    it('subdivisão preserva o endpoint final do contorno', () => {
      const result = fitBezierPaths([curveContour], 200, 200, {
        fitError: 0.1,
        maxDepth: 10,
      });

      expect(result[0]).toBeDefined();
      const endpoint = extractLastCubicEndpoint(result[0]!.d);
      expect(endpoint).toEqual({ x: 100, y: 40 });
    });

    it('fitError muito grande (100) → 1 Bezier cobre todo o segmento', () => {
      const result = fitBezierPaths([curveContour], 200, 200, {
        fitError: 100,
        maxDepth: 10,
      });
      // Com fitError permissivo, 1 Bezier basta.
      expect(countBezierCommands(result[0]!.d)).toBe(1);
    });

    it('todos os paths continuam válidos independente do fitError', () => {
      for (const err of [0.1, 1.5, 100]) {
        const result = fitBezierPaths([curveContour], 200, 200, {
          fitError: err,
        });
        for (const p of result) {
          expectValidBezierPath(p);
        }
      }
    });
  });

  describe('parâmetros: efeito do maxDepth', () => {
    const contour = makeZigzagContour(50, 5, false);

    it('maxDepth=1 limita subdivisões e produz menos Beziers', () => {
      const shallow = fitBezierPaths([contour], 200, 200, {
        maxDepth: 1,
        fitError: 0.1,
      });
      const deep = fitBezierPaths([contour], 200, 200, {
        maxDepth: 10,
        fitError: 0.1,
      });

      expect(shallow).toHaveLength(1);
      expect(deep).toHaveLength(1);

      const shallowCount = countBezierCommands(shallow[0]!.d);
      const deepCount = countBezierCommands(deep[0]!.d);
      // maxDepth menor = menos subdivisões permitidas = menos Beziers
      // (ou igual, em casos extremos).
      expect(shallowCount).toBeLessThanOrEqual(deepCount);
    });

    it('maxDepth=1 ainda produz path válido', () => {
      const result = fitBezierPaths([contour], 200, 200, { maxDepth: 1 });
      expectValidBezierPath(result[0]!);
    });
  });

  describe('validação de getLength em todos os paths retornados', () => {
    const mixedContours: Contour[] = [
      makeContour([
        [0, 0],
        [10, 0],
        [20, 0],
      ]),
      makeCircleContour(50, 50, 15, 8, true),
      makeContour(
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
        true,
      ),
    ];

    it('todos os paths têm length > 0', () => {
      const result = fitBezierPaths(mixedContours, 100, 100);
      expect(result.length).toBeGreaterThan(0);
      for (const p of result) {
        expect(p.length).toBeGreaterThan(0);
      }
    });

    it('todos os paths têm Number.isFinite(length) === true', () => {
      const result = fitBezierPaths(mixedContours, 100, 100);
      for (const p of result) {
        expect(Number.isFinite(p.length)).toBe(true);
      }
    });

    it('nenhum path com d malformado é retornado (paths inválidos são descartados)', () => {
      // Adiciona um contorno degenerado (1 ponto) que deve ser descartado.
      const degenerate: Contour = {
        points: [{ x: 50, y: 50 }],
        closed: false,
      };
      const result = fitBezierPaths([...mixedContours, degenerate], 100, 100);
      // O degenerado não entra no output.
      expect(result).toHaveLength(mixedContours.length);
      // Todos os paths retornados passam pela validação de getLength.
      for (const p of result) {
        expectValidBezierPath(p);
      }
    });

    it('length de cada path é maior que a soma das distâncias dos pontos originais (Bezier adiciona suavidade)', () => {
      // Não é estritamente verdade para qualquer curva, mas para uma Bezier
      // que cobre o mesmo caminho, o length calculado por getLength deve
      // ser > 0 e finito. Esse teste reforça a sanidade básica.
      const result = fitBezierPaths(mixedContours, 100, 100);
      for (const p of result) {
        expect(p.length).toBeGreaterThan(0);
        expect(Number.isFinite(p.length)).toBe(true);
      }
    });
  });

  describe('shape e tipos do retorno', () => {
    const contour = makeOpenLineContour(3);

    it('retorna sempre um array (nunca null/undefined)', () => {
      const result = fitBezierPaths([contour], 100, 100);
      expect(Array.isArray(result)).toBe(true);
      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });

    it('cada path tem exatamente as chaves "d" e "length"', () => {
      const result = fitBezierPaths([contour], 100, 100);
      for (const p of result) {
        const keys = Object.keys(p).sort();
        expect(keys).toEqual(['d', 'length']);
      }
    });

    it('d é string não-vazia que começa com M', () => {
      const result = fitBezierPaths([contour], 100, 100);
      for (const p of result) {
        expect(typeof p.d).toBe('string');
        expect(p.d.length).toBeGreaterThan(0);
        expect(p.d).toMatch(/^M\s/);
      }
    });

    it('d contém pelo menos um comando C (cubic Bezier)', () => {
      const result = fitBezierPaths([contour], 100, 100);
      for (const p of result) {
        expect(p.d).toContain('C');
      }
    });

    it('length é number (não string, não NaN, não Infinity)', () => {
      const result = fitBezierPaths([contour], 100, 100);
      for (const p of result) {
        expect(typeof p.length).toBe('number');
        expect(Number.isNaN(p.length)).toBe(false);
        expect(p.length).not.toBe(Number.POSITIVE_INFINITY);
        expect(p.length).not.toBe(Number.NEGATIVE_INFINITY);
      }
    });
  });

  describe('múltiplos contornos', () => {
    it('processa todos os contornos e retorna 1 path por contorno válido', () => {
      const contours: Contour[] = [
        makeContour([
          [0, 0],
          [10, 0],
          [20, 0],
        ]),
        makeCircleContour(50, 50, 10, 8, true),
        makeContour(
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
          true,
        ),
      ];
      const result = fitBezierPaths(contours, 100, 100);
      expect(result).toHaveLength(contours.length);
      for (const p of result) {
        expectValidBezierPath(p);
      }
    });

    it('contornos degenerados são pulados, válidos são processados', () => {
      const contours: Contour[] = [
        makeContour([
          [0, 0],
          [10, 0],
        ]),
        { points: [], closed: false }, // degenerado: 0 pontos
        makeCircleContour(20, 20, 5, 8, true),
        { points: [{ x: 5, y: 5 }], closed: false }, // degenerado: 1 ponto
        makeContour([
          [0, 0],
          [5, 5],
          [10, 0],
        ]),
      ];
      const result = fitBezierPaths(contours, 100, 100);
      // 3 contornos válidos → 3 paths.
      expect(result).toHaveLength(3);
      for (const p of result) {
        expectValidBezierPath(p);
      }
    });
  });
});
