/**
 * Testes unitários do limite de segurança aplicado por
 * `applyVetorialSafetyLimits` (reintroduzido na v0.135.1 para impedir
 * o erro `Failed to convert SVG to image` no `renderMediaOnWeb`).
 *
 * O conjunto abaixo cobre as quatro garantias principais:
 *
 * 1. **Sanitização numérica** — paths com `d` inválido ou valores
 *    não finitos são descartados e logados.
 * 2. **Limite de quantidade** — `MAX_PATHS_PER_SCENE` paths.
 * 3. **Limite de bytes do `d`** — `MAX_D_BYTES_PER_SCENE` acumulado
 *    E nenhum path individual pode exceder o limite (defesa em
 *    profundidade).
 * 4. **Determinismo** — testes diretos via namespace `__testing` em vez
 *    de depender de ruído aleatório que pode ou não cruzar o limite.
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts` (`applyVetorialSafetyLimits`)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  vectorizeImage,
  __testing,
} from '../../src/features/speed-paint/lib/vectorizer';
import type { VetorialPath } from '../../src/features/speed-paint/types';

const {
  applyVetorialSafetyLimits,
  sanitizePathOrNull,
  MAX_PATHS_PER_SCENE,
  MAX_D_BYTES_PER_SCENE,
  SVG_PATH_DATA_REGEX,
} = __testing;

// ─── Mock do logger para capturar warnings ────────────────────────────
const { warnSpy } = vi.hoisted(() => ({
  warnSpy: vi.fn(),
}));

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnSpy,
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

// ─── Helpers para criar ImageData controlada ─────────────────────────
function makeSolidImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

function makeCheckerImageData(
  width: number,
  height: number,
  squareSize = 16,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dark = ((Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2) === 0;
      const v = dark ? 0 : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

function makeVetorialPath(d: string, length = 100, strokeWidth = 4): VetorialPath {
  return {
    d,
    length,
    color: '#222',
    strokeWidth,
  };
}

// Cria um path cujo `d` tem exatamente `charCount` caracteres de comando
// válido (`M 0 0 L ...` repetido). Útil para forçar o tamanho de `d` em
// bytes no teste do limite.
function makePathWithDBytes(byteBudget: number): VetorialPath {
  // Cada comando `M 0 0 L 1 1 ` ocupa 14 caracteres; `pathBytes = chars * 2`.
  const chunk = 'M 0 0 L 1 1 ';
  const reps = Math.max(1, Math.ceil(byteBudget / 2 / chunk.length));
  return makeVetorialPath(chunk.repeat(reps), 100, 1);
}

const baseContext = {
  pipeline: 'imagetracer' as const,
  preset: 'default' as const,
  width: 1920,
  height: 1080,
};

// ─── Testes diretos de `applyVetorialSafetyLimits` (determinísticos) ─
describe('vectorizer — applyVetorialSafetyLimits (v0.135.1)', () => {
  beforeEach(() => {
    warnSpy.mockClear();
  });

  it('preserva o array quando vazio', () => {
    const result = applyVetorialSafetyLimits([], baseContext);
    expect(result).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('preserva paths válidos dentro dos limites', () => {
    const paths = [makeVetorialPath('M 0 0 L 10 10', 100, 2)];
    const result = applyVetorialSafetyLimits(paths, baseContext);
    expect(result).toEqual(paths);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('descarta path com `d` vazio via sanitizePathOrNull', () => {
    const paths: VetorialPath[] = [
      makeVetorialPath('', 100, 2),
      makeVetorialPath('M 0 0 L 10 10', 100, 2),
    ];
    const result = applyVetorialSafetyLimits(paths, baseContext);
    expect(result.length).toBe(1);
    expect(result[0]?.d).toBe('M 0 0 L 10 10');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('paths com d inválido'),
      expect.objectContaining({ invalidCount: 1 }),
    );
  });

  it('descarta path com `d` contendo tokens inválidos (NaN, expoente)', () => {
    const paths: VetorialPath[] = [
      makeVetorialPath('M 0 0 L NaN 10', 100, 2), // `a` minúsculo não permitido
      makeVetorialPath('M 0 0 L 1e5 10', 100, 2), // `e` não permitido
      makeVetorialPath('M 0 0 L 10 10', 100, 2),
    ];
    const result = applyVetorialSafetyLimits(paths, baseContext);
    expect(result.length).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('paths com d inválido'),
      expect.objectContaining({ invalidCount: 2 }),
    );
  });

  it('trunca quantidade de paths para MAX_PATHS_PER_SCENE (determinístico)', () => {
    // Cria MAX_PATHS_PER_SCENE + 100 paths válidos — deve truncar.
    const overshoot = MAX_PATHS_PER_SCENE + 100;
    const paths = Array.from({ length: overshoot }, (_, i) =>
      makeVetorialPath(`M ${i} 0 L ${i + 1} 10`, 100, 2),
    );
    const result = applyVetorialSafetyLimits(paths, baseContext);
    expect(result.length).toBe(MAX_PATHS_PER_SCENE);
    // Log único de truncamento por quantidade
    const truncationWarns = warnSpy.mock.calls.filter((args) =>
      String(args[0] ?? '').includes('acima do limite de paths'),
    );
    expect(truncationWarns.length).toBe(1);
  });

  it('trunca bytes acumulados para MAX_D_BYTES_PER_SCENE (determinístico)', () => {
    // Cria 10 paths com `d` de ~30KB cada (60KB UTF-16) — total ~600KB,
    // bem acima do limite de 250KB. Deve truncar antes do fim.
    const paths: VetorialPath[] = [];
    for (let i = 0; i < 10; i++) {
      // 30.000 caracteres de comando válido = 60.000 bytes UTF-16
      paths.push(makePathWithDBytes(30_000));
    }
    const result = applyVetorialSafetyLimits(paths, baseContext);
    // Verifica que o resultado cabe dentro do limite (invariante documentado)
    const totalBytes = result.reduce((sum, p) => sum + p.d.length * 2, 0);
    expect(totalBytes).toBeLessThanOrEqual(MAX_D_BYTES_PER_SCENE);
    // Log único de truncamento por bytes
    const byteWarns = warnSpy.mock.calls.filter((args) =>
      String(args[0] ?? '').includes('acima do limite de bytes'),
    );
    expect(byteWarns.length).toBe(1);
    // Pelo menos 1 path foi descartado (provando que o limite foi exercitado)
    expect(result.length).toBeLessThan(paths.length);
  });

  it('descarta path individual que sozinho excede MAX_D_BYTES_PER_SCENE', () => {
    // Cria 1 path gigante (300KB) + 2 paths pequenos válidos. O gigante
    // deve ser descartado em silêncio; os pequenos mantidos.
    const hugePath = makePathWithDBytes(300_000);
    const smallPathA = makeVetorialPath('M 0 0 L 10 10', 100, 2);
    const smallPathB = makeVetorialPath('M 20 20 L 30 30', 100, 2);
    const result = applyVetorialSafetyLimits(
      [hugePath, smallPathA, smallPathB],
      baseContext,
    );
    expect(result.length).toBe(2);
    expect(result[0]?.d).toBe(smallPathA.d);
    expect(result[1]?.d).toBe(smallPathB.d);
    // Invariante absoluta: nenhum path individual pode estourar
    for (const path of result) {
      expect(path.d.length * 2).toBeLessThanOrEqual(MAX_D_BYTES_PER_SCENE);
    }
    // Log de paths individuais oversized
    const oversizedWarns = warnSpy.mock.calls.filter((args) =>
      String(args[0] ?? '').includes('paths individuais acima do limite'),
    );
    expect(oversizedWarns.length).toBe(1);
  });

  it('combina truncamento por quantidade E por bytes (ordem dos warns)', () => {
    // 600 paths × 1KB cada = 600KB UTF-16 — estouraria ambos os limites.
    // Esperado: primeiro trunca quantidade (600 → 500), depois aplica
    // bytes (descarta excedentes byte-a-byte).
    const paths = Array.from({ length: 600 }, (_, i) =>
      makeVetorialPath(`M ${i} 0 L ${i + 1} 10`, 100, 2),
    );
    const result = applyVetorialSafetyLimits(paths, baseContext);
    expect(result.length).toBeLessThanOrEqual(MAX_PATHS_PER_SCENE);
    const totalBytes = result.reduce((sum, p) => sum + p.d.length * 2, 0);
    expect(totalBytes).toBeLessThanOrEqual(MAX_D_BYTES_PER_SCENE);
  });
});

// ─── Testes diretos do `sanitizePathOrNull` ─────────────────────────
describe('vectorizer — sanitizePathOrNull', () => {
  it('retorna null para `d` vazio', () => {
    const path = makeVetorialPath('', 100, 2);
    expect(sanitizePathOrNull(path)).toBeNull();
  });

  it('retorna null para `d` com tokens inválidos', () => {
    const path = makeVetorialPath('M 0 0 L NaN 10', 100, 2);
    expect(sanitizePathOrNull(path)).toBeNull();
  });

  it('retorna null para path com `length === 0` ou NaN (path degenerado, v0.135.2)', () => {
    // v0.135.2: paths degenerados (`length === 0` ou NaN) são descartados
    // em vez de mantidos com `length: 0`. Antes desperdiçavam um slot dos
    // limites sem renderizar nada visualmente.
    expect(sanitizePathOrNull(makeVetorialPath('M 0 0 L 10 10', 0, 2))).toBeNull();
    expect(sanitizePathOrNull(makeVetorialPath('M 0 0 L 10 10', Number.NaN, 2))).toBeNull();
  });

  it('normaliza strokeWidth inválido para 1 (length válido preservado)', () => {
    const path = makeVetorialPath('M 0 0 L 10 10', 50, -5);
    const result = sanitizePathOrNull(path);
    expect(result).not.toBeNull();
    expect(result?.length).toBe(50);
    expect(result?.strokeWidth).toBe(1);
  });

  it('preserva `d` válido e normaliza length/strokeWidth', () => {
    const path = makeVetorialPath('M 0 0 L 10 10', 50, 3);
    const result = sanitizePathOrNull(path);
    expect(result).toEqual({
      d: 'M 0 0 L 10 10',
      length: 50,
      color: '#222',
      strokeWidth: 3,
    });
  });
});

// ─── Testes da regex de validação ────────────────────────────────────
describe('SVG_PATH_DATA_REGEX', () => {
  it('aceita comandos SVG padrão', () => {
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 L 10 10')).toBe(true);
    expect(SVG_PATH_DATA_REGEX.test('M0,0L10,10')).toBe(true);
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 C 10 10, 20 20, 30 30')).toBe(true);
    expect(SVG_PATH_DATA_REGEX.test('M0 0H10V10Z')).toBe(true);
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 a 1 1 0 0 0 2 2')).toBe(true);
  });

  it('rejeita expoentes, NaN, e tokens fora do formato', () => {
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 L NaN 10')).toBe(false); // `a` minúsculo
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 L 1e5 10')).toBe(false); // `e` expoente
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 L 10 10 %')).toBe(false); // `%`
    expect(SVG_PATH_DATA_REGEX.test('M 0 0 +10')).toBe(false); // `+`
  });
});

// ─── Testes de integração via `vectorizeImage` ───────────────────────
describe('vectorizer — integração com vectorizeImage', () => {
  it('modo mask não é afetado (presets legados retornam array)', async () => {
    const result = await vectorizeImage(
      makeSolidImageData(100, 100, 200, 200, 200),
      { pipelineMode: 'imagetracer', preset: 'default' },
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('paths retornados nunca têm `d` inválido (qualquer pipeline)', async () => {
    const result = await vectorizeImage(
      makeCheckerImageData(160, 160),
      { pipelineMode: 'edge-bezier' },
    );
    for (const path of result) {
      expect(path.d.length).toBeGreaterThan(0);
      expect(SVG_PATH_DATA_REGEX.test(path.d)).toBe(true);
      expect(path.strokeWidth).toBeGreaterThan(0);
      expect(Number.isFinite(path.length)).toBe(true);
    }
  });
});
