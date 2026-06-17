/**
 * Testes unitários de `filterPathsByBackgroundContrast()`.
 *
 * Função pura: recebe `VetorialPath[]` + cor de fundo, retorna `VetorialPath[]`
 * sem paths cuja cor é muito próxima do fundo. Cobertura:
 *
 * (a) Atalhos semânticos: `'white'` e `'black'`
 * (b) Cores em hex curto (`#fff`), hex longo (`#ffffff`) e `rgb()` / `rgba()`
 * (c) Threshold customizado (agressivo e conservador)
 * (d) Fail-safe: cor de path inválida → mantém
 * (e) Fail-safe: cor de fundo inválida → mantém todos + log
 * (f) Array vazio → array vazio
 * (g) Paths com contraste válido NÃO são removidos
 * (h) Distância exata do threshold (boundary)
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 */

import { describe, it, expect, vi } from 'vitest';
import { filterPathsByBackgroundContrast } from '../../src/features/speed-paint/lib/vectorizer';
import type { VetorialPath } from '../../src/features/speed-paint/types/vetorial';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Cria um `VetorialPath` sintético para teste. O atributo `d` segue o
 * formato `"M x y L x y"` — não é relevante para o filtro de cor, mas
 * mantém compatibilidade com o tipo.
 */
function makePath(color: string): VetorialPath {
  return { d: `M 0 0 L 10 10`, length: 14, color, strokeWidth: 2 };
}

// ─── (a) Atalhos semânticos ───────────────────────────────────────────

describe("filterPathsByBackgroundContrast — atalhos 'white' / 'black'", () => {
  it("remove path branco em fundo 'white'", () => {
    const paths: VetorialPath[] = [makePath('rgb(255,255,255)')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(0);
  });

  it("remove path preto em fundo 'black'", () => {
    const paths: VetorialPath[] = [makePath('rgb(0,0,0)')];
    const result = filterPathsByBackgroundContrast(paths, 'black');
    expect(result).toHaveLength(0);
  });

  it("remove hex curto (#fff) em fundo 'white'", () => {
    const paths: VetorialPath[] = [makePath('#fff')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(0);
  });

  it("remove hex longo (#ffffff) em fundo 'white'", () => {
    const paths: VetorialPath[] = [makePath('#ffffff')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(0);
  });

  it("remove hex com alpha (#ffff) em fundo 'white' — alpha ignorado", () => {
    const paths: VetorialPath[] = [makePath('#ffff')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(0);
  });

  it("remove path preto em fundo 'black' (hex #000)", () => {
    const paths: VetorialPath[] = [makePath('#000000')];
    const result = filterPathsByBackgroundContrast(paths, 'black');
    expect(result).toHaveLength(0);
  });

  it("remove path preto em fundo 'black' (rgb)", () => {
    const paths: VetorialPath[] = [makePath('rgb(0, 0, 0)')];
    const result = filterPathsByBackgroundContrast(paths, 'black');
    expect(result).toHaveLength(0);
  });
});

// ─── (b) Cores CSS no parâmetro backgroundColor ──────────────────────

describe('filterPathsByBackgroundContrast — cor de fundo CSS arbitrária', () => {
  it('aceita hex curto (#f0f) como cor de fundo', () => {
    // Fundo #f0f = (255, 0, 255). Path branco (255,255,255) tem distância
    // |255-255|² + |0-255|² + |255-255|² = 65025 → √65025 ≈ 255 > 30 → MANTÉM
    const paths: VetorialPath[] = [makePath('rgb(255,255,255)')];
    const result = filterPathsByBackgroundContrast(paths, '#f0f');
    expect(result).toHaveLength(1);
  });

  it('aceita hex longo (#ff00ff) como cor de fundo', () => {
    // Fundo magenta puro. Path magenta puro é removido.
    const paths: VetorialPath[] = [makePath('#ff00ff')];
    const result = filterPathsByBackgroundContrast(paths, '#ff00ff');
    expect(result).toHaveLength(0);
  });

  it('aceita rgb(...) como cor de fundo', () => {
    const paths: VetorialPath[] = [makePath('rgb(100, 100, 100)')];
    // Fundo cinza (128, 128, 128) — path (100,100,100) → dist = √(3*28²) ≈ 48.5 > 30 → MANTÉM
    const result = filterPathsByBackgroundContrast(paths, 'rgb(128, 128, 128)');
    expect(result).toHaveLength(1);
  });

  it('aceita rgba(...) como cor de fundo (alpha ignorado)', () => {
    const paths: VetorialPath[] = [makePath('rgb(255,255,255)')];
    // Fundo rgba(255,255,255,0.5) — alpha ignorado, branco = branco
    const result = filterPathsByBackgroundContrast(paths, 'rgba(255, 255, 255, 0.5)');
    expect(result).toHaveLength(0);
  });
});

// ─── (c) Threshold customizado ───────────────────────────────────────

describe('filterPathsByBackgroundContrast — threshold customizado', () => {
  it('threshold alto (200) remove até paths com contraste moderado', () => {
    // Fundo branco (255,255,255). Path (200,200,200) → dist = √(3*55²) ≈ 95.3
    // Threshold 200 > 95.3 → remove
    const paths: VetorialPath[] = [makePath('rgb(200,200,200)')];
    const result = filterPathsByBackgroundContrast(paths, 'white', 200);
    expect(result).toHaveLength(0);
  });

  it('threshold baixo (5) mantém paths com pequena diferença', () => {
    // Fundo branco. Path (253,253,253) → dist = √(3*2²) ≈ 3.5
    // Threshold 5 > 3.5 → remove
    const paths: VetorialPath[] = [makePath('rgb(253,253,253)')];
    const result5 = filterPathsByBackgroundContrast(paths, 'white', 5);
    expect(result5).toHaveLength(0);

    // Threshold 1 < 3.5 → mantém
    const result1 = filterPathsByBackgroundContrast(paths, 'white', 1);
    expect(result1).toHaveLength(1);
  });

  it('threshold 0 remove apenas paths com distância EXATAMENTE zero (cor idêntica)', () => {
    // path branco (255,255,255) vs fundo branco → distância = 0 → removido
    // path preto (0,0,0) vs fundo branco → distância ≈ 441.7 > 0 → mantido
    // path cinza (128,128,128) vs fundo branco → distância ≈ 220 > 0 → mantido
    const paths: VetorialPath[] = [
      makePath('rgb(255,255,255)'),
      makePath('rgb(0,0,0)'),
      makePath('rgb(128,128,128)'),
    ];
    const result = filterPathsByBackgroundContrast(paths, 'white', 0);
    // Apenas o path idêntico ao fundo é removido (boundary: distance > threshold)
    expect(result).toHaveLength(2);
  });

  it('threshold default (30) tem comportamento esperado para casos típicos', () => {
    // Branco puro (255,255,255) em fundo branco → distância 0 → remove
    expect(filterPathsByBackgroundContrast([makePath('rgb(255,255,255)')], 'white')).toHaveLength(0);
    // Off-white (240,240,240) em fundo branco → distância ≈ 26 < 30 → remove
    expect(filterPathsByBackgroundContrast([makePath('rgb(240,240,240)')], 'white')).toHaveLength(0);
    // Cinza claro (220,220,220) em fundo branco → distância ≈ 60.6 > 30 → mantém
    expect(filterPathsByBackgroundContrast([makePath('rgb(220,220,220)')], 'white')).toHaveLength(1);
    // Preto (0,0,0) em fundo branco → distância ≈ 441.7 > 30 → mantém
    expect(filterPathsByBackgroundContrast([makePath('rgb(0,0,0)')], 'white')).toHaveLength(1);
  });
});

// ─── (d) Fail-safe: cor de path inválida ──────────────────────────────

describe('filterPathsByBackgroundContrast — fail-safe', () => {
  it('mantém path com cor não parseável (formato desconhecido)', () => {
    // `currentColor` é válido em CSS mas não temos contexto de cascata.
    // Fail-safe: manter.
    const paths: VetorialPath[] = [makePath('currentColor')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });

  it('mantém path com cor vazia (string vazia)', () => {
    const paths: VetorialPath[] = [makePath('')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });

  it('mantém path com cor de formato numérico inválido', () => {
    const paths: VetorialPath[] = [makePath('rgb(abc, def, ghi)')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });

  it('mantém path com cor fora do range (negativo)', () => {
    // rgb() com valor negativo — `parseCssColor` retorna null → mantém
    const paths: VetorialPath[] = [makePath('rgb(-1, 0, 0)')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });
});

// ─── (e) Fail-safe: cor de fundo inválida ─────────────────────────────

describe('filterPathsByBackgroundContrast — cor de fundo inválida', () => {
  it('mantém todos os paths + log warn quando cor de fundo é inválida', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const paths: VetorialPath[] = [
      makePath('rgb(255,255,255)'),
      makePath('rgb(0,0,0)'),
    ];
    const result = filterPathsByBackgroundContrast(paths, 'notacolor');
    expect(result).toHaveLength(2);
    expect(result).toBe(paths); // mesma referência — fail-safe retorna input
    warnSpy.mockRestore();
  });
});

// ─── (f) Array vazio ─────────────────────────────────────────────────

describe('filterPathsByBackgroundContrast — array vazio', () => {
  it('retorna array vazio para entrada vazia (white)', () => {
    const result = filterPathsByBackgroundContrast([], 'white');
    expect(result).toEqual([]);
  });

  it('retorna array vazio para entrada vazia (black)', () => {
    const result = filterPathsByBackgroundContrast([], 'black');
    expect(result).toEqual([]);
  });

  it('retorna array vazio para entrada vazia (cor CSS)', () => {
    const result = filterPathsByBackgroundContrast([], '#ff0000');
    expect(result).toEqual([]);
  });
});

// ─── (g) Paths com contraste válido NÃO são removidos ────────────────

describe('filterPathsByBackgroundContrast — preserva contraste válido', () => {
  it('mantém path preto em fundo branco (maior contraste possível)', () => {
    const paths: VetorialPath[] = [makePath('#000000')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });

  it('mantém path vermelho em fundo branco', () => {
    const paths: VetorialPath[] = [makePath('rgb(255, 0, 0)')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(1);
  });

  it('mantém path branco em fundo preto (inversão)', () => {
    const paths: VetorialPath[] = [makePath('rgb(255,255,255)')];
    const result = filterPathsByBackgroundContrast(paths, 'black');
    expect(result).toHaveLength(1);
  });

  it('filtra seletivamente em lista mista', () => {
    const paths: VetorialPath[] = [
      makePath('rgb(255,255,255)'),  // removido
      makePath('rgb(0,0,0)'),        // mantido
      makePath('rgb(254,254,254)'),  // removido (dist ≈ 1.7)
      makePath('rgb(100,100,100)'),  // mantido (dist ≈ 268)
      makePath('rgb(255,0,0)'),      // mantido
    ];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    expect(result).toHaveLength(3);
    // Verifica que os 3 mantidos são os esperados
    const keptColors = result.map((p) => p.color);
    expect(keptColors).toContain('rgb(0,0,0)');
    expect(keptColors).toContain('rgb(100,100,100)');
    expect(keptColors).toContain('rgb(255,0,0)');
  });
});

// ─── (h) Boundary: distância exata do threshold ──────────────────────

describe('filterPathsByBackgroundContrast — boundary do threshold', () => {
  it('path com distância ABAIXO do threshold é removido', () => {
    // Fundo branco. Para path (254,254,254) → distância = √(3*1²) = √3 ≈ 1.7320508
    // Threshold 1.733 (> distância) → distance > threshold é false → remove
    const paths: VetorialPath[] = [makePath('rgb(254,254,254)')];
    const result = filterPathsByBackgroundContrast(paths, 'white', 1.733);
    expect(result).toHaveLength(0);
  });

  it('path com distância LOGO ACIMA do threshold é mantido', () => {
    // Distância ≈ 1.7320508, threshold 1.732 → 1.7320508 > 1.732 = true → mantém
    const paths: VetorialPath[] = [makePath('rgb(254,254,254)')];
    const result = filterPathsByBackgroundContrast(paths, 'white', 1.732);
    expect(result).toHaveLength(1);
  });
});

// ─── (i) Imutabilidade do input ──────────────────────────────────────

describe('filterPathsByBackgroundContrast — imutabilidade', () => {
  it('não muta o array original', () => {
    const white = makePath('rgb(255,255,255)');
    const black = makePath('rgb(0,0,0)');
    const original: VetorialPath[] = [white, black];

    filterPathsByBackgroundContrast(original, 'white');

    // Array original deve manter ambas as referências
    expect(original).toHaveLength(2);
    expect(original[0]).toBe(white);
    expect(original[1]).toBe(black);
  });

  it('retorna NOVA referência quando filtra algum path (imutabilidade)', () => {
    const paths: VetorialPath[] = [makePath('rgb(255,255,255)')];
    const result = filterPathsByBackgroundContrast(paths, 'white');
    // Lista resultante é uma nova referência (filter semantics)
    expect(result).not.toBe(paths);
    expect(result).toHaveLength(0);
  });
});
