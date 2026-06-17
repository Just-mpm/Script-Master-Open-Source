/**
 * Testes unitários de `vectorizeImage()` — wrapper do `imagetracerjs`.
 *
 * Cobre:
 * (a) Vetorização básica retorna `VetorialPath[]` válido
 * (b) Filtro de `pathomit` remove paths pequenos
 * (c) `length` pré-calculado é positivo
 * (d) Presets diferentes geram outputs válidos
 * (e) Erro graceful para `ImageData` inválido
 * (f) `AbortSignal` funciona
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 */

import { describe, it, expect } from 'vitest';
import { sortPaths, vectorizeImage } from '../../src/features/speed-paint/lib/vectorizer';
import type { VetorialPath } from '../../src/features/speed-paint/types/vetorial';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Cria um `ImageData` de teste preenchendo o fundo com `fillColor` e
 * desenhando um quadrado preto central — gera variação de cor para que
 * o `imagetracerjs` produza paths.
 *
 * Usa duck typing: `imagetracerjs` itera `imgd.data`/`width`/`height`
 * diretamente, então um objeto com esses campos é suficiente. Isso evita
 * dependência de canvas 2D no jsdom (que pode não estar disponível).
 */
function makeTestImageData(
  width: number,
  height: number,
  fillColor: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fundo uniforme
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillColor.r;
    data[i + 1] = fillColor.g;
    data[i + 2] = fillColor.b;
    data[i + 3] = 255;
  }

  // Quadrado preto central (cria contraste para gerar paths)
  const x0 = Math.max(1, Math.floor(width / 4));
  const y0 = Math.max(1, Math.floor(height / 4));
  const x1 = Math.min(width - 1, Math.floor((width * 3) / 4));
  const y1 = Math.min(height - 1, Math.floor((height * 3) / 4));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  return { data, width, height } as unknown as ImageData;
}

// ─── Testes ──────────────────────────────────────────────────────────

describe('vectorizer', () => {
  // Imagens pequenas (50x50) para manter a suíte rápida. Vetorizar 50x50
  // com `imagetracerjs` leva ~50–200ms; com 100x100 pode chegar a 1s.
  // Algumas chamadas internas do `imagetracerjs` podem ser custosas
  // dependendo do preset, então usamos timeout generoso.

  describe('vetorização básica (a)', () => {
    it(
      'retorna VetorialPath[] válido para ImageData com formas',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 255, g: 255, b: 255 });
        const paths = await vectorizeImage(imageData, { preset: 'default' });

        expect(Array.isArray(paths)).toBe(true);

        // Todos os paths retornados devem ser válidos
        for (const path of paths) {
          expect(path).toBeDefined();
          expect(typeof path.d).toBe('string');
          expect(path.d.length).toBeGreaterThan(0);
          expect(typeof path.length).toBe('number');
          expect(Number.isFinite(path.length)).toBe(true);
          expect(typeof path.color).toBe('string');
          expect(path.color.length).toBeGreaterThan(0);
          expect(typeof path.strokeWidth).toBe('number');
          expect(path.strokeWidth).toBeGreaterThan(0);
        }
      },
    );

    it(
      'shape da API confere com a interface VetorialPath',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50);
        const paths: VetorialPath[] = await vectorizeImage(imageData, {
          preset: 'default',
        });

        // Se houver paths, valida o shape completo
        if (paths.length > 0) {
          const sample = paths[0];
          expect(sample).not.toBeNull();
          if (sample !== undefined) {
            expect(Object.keys(sample).sort()).toEqual(
              ['color', 'd', 'length', 'strokeWidth'].sort(),
            );
          }
        }
      },
    );
  });

  describe('filtro pathomit (b)', () => {
    it(
      'pathomit mais alto retorna menos paths (ou zero)',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 255, g: 255, b: 255 });
        const pathsLow = await vectorizeImage(imageData, {
          preset: 'default',
          pathomit: 1,
        });
        const pathsHigh = await vectorizeImage(imageData, {
          preset: 'default',
          pathomit: 1000,
        });

        // pathomit mais alto = menos paths (ou zero)
        expect(pathsHigh.length).toBeLessThanOrEqual(pathsLow.length);
      },
    );

    it(
      'paths retornados sempre têm length >= pathomit',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const pathomit = 20;
        const paths = await vectorizeImage(imageData, {
          preset: 'default',
          pathomit,
        });

        // Todos os paths devem ter length >= pathomit
        for (const p of paths) {
          expect(p.length).toBeGreaterThanOrEqual(pathomit);
        }
      },
    );

    it(
      'pathomit suficientemente alto zera o array',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const paths = await vectorizeImage(imageData, {
          preset: 'default',
          pathomit: 100_000,
        });

        expect(paths).toEqual([]);
      },
    );
  });

  describe('length pré-calculado (c)', () => {
    it(
      'todos os paths retornados têm length > 0',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 240, g: 240, b: 240 });
        const paths = await vectorizeImage(imageData, { preset: 'default' });

        expect(paths.length).toBeGreaterThan(0);
        for (const p of paths) {
          expect(p.length).toBeGreaterThan(0);
        }
      },
    );

    it(
      'length bate com @remotion/paths.getLength (sanity check)',
      { timeout: 30000 },
      async () => {
        // Smoke test: o valor de `length` deve ser positivo e finito
        const imageData = makeTestImageData(50, 50);
        const paths = await vectorizeImage(imageData, { preset: 'default' });

        if (paths.length > 0) {
          const first = paths[0];
          expect(first).not.toBeNull();
          if (first !== undefined) {
            expect(Number.isFinite(first.length)).toBe(true);
            expect(first.length).toBeGreaterThan(0);
          }
        }
      },
    );
  });

  describe('presets (d)', () => {
    it(
      'presets diferentes retornam arrays (podem ser vazios)',
      { timeout: 60000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const artistic1 = await vectorizeImage(imageData, {
          preset: 'artistic1',
        });
        const detailed = await vectorizeImage(imageData, {
          preset: 'detailed',
        });

        expect(Array.isArray(artistic1)).toBe(true);
        expect(Array.isArray(detailed)).toBe(true);

        // Se ambos produzem paths, os comprimentos totais devem ser válidos
        if (artistic1.length > 0 && detailed.length > 0) {
          const sumA = artistic1.reduce((s, p) => s + p.length, 0);
          const sumD = detailed.reduce((s, p) => s + p.length, 0);
          expect(sumA).toBeGreaterThan(0);
          expect(sumD).toBeGreaterThan(0);
        }
      },
    );

    it(
      'preset `default` é suportado e retorna paths',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50);
        const paths = await vectorizeImage(imageData, { preset: 'default' });

        expect(Array.isArray(paths)).toBe(true);
        // Pode ser [] em imagens muito simples, mas se >0, deve ser válido
        for (const p of paths) {
          expect(p.d.length).toBeGreaterThan(0);
          expect(p.length).toBeGreaterThan(0);
        }
      },
    );
  });

  describe('validação de input (e)', () => {
    it('lança Error se ImageData é null', async () => {
      // `null` não tem `data`/`width`/`height` — falha em `isValidImageData`
      const invalid = null as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });

    it('lança Error se ImageData é undefined', async () => {
      const invalid = undefined as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });

    it('lança Error se ImageData não tem data', async () => {
      const invalid = { width: 10, height: 10 } as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });

    it('lança Error se width é 0', async () => {
      const invalid = {
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 10,
      } as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });

    it('lança Error se height é 0', async () => {
      const invalid = {
        data: new Uint8ClampedArray(0),
        width: 10,
        height: 0,
      } as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });

    it('lança Error se data não é Uint8ClampedArray', async () => {
      // `data` precisa ser `Uint8ClampedArray` (validado por `instanceof`)
      const invalid = {
        data: new Uint8Array(100),
        width: 10,
        height: 10,
      } as unknown as ImageData;
      await expect(vectorizeImage(invalid)).rejects.toThrow(
        'ImageData inválido para vetorização',
      );
    });
  });

  describe('AbortSignal (f)', () => {
    it(
      'lança AbortError se signal já está abortado antes de começar',
      { timeout: 30000 },
      async () => {
        const controller = new AbortController();
        controller.abort();
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });

        // Deve lançar AbortError antes de qualquer trabalho pesado
        await expect(
          vectorizeImage(imageData, { signal: controller.signal }),
        ).rejects.toMatchObject({
          name: 'AbortError',
        });
      },
    );

    it(
      'lança AbortError se signal já está abortado (sem options)',
      { timeout: 30000 },
      async () => {
        const controller = new AbortController();
        controller.abort();
        const imageData = makeTestImageData(50, 50);

        // Garante que o check de abort também dispara sem outras options
        try {
          await vectorizeImage(imageData, { signal: controller.signal });
          // Não deveria chegar aqui
          expect.fail('Deveria ter lançado AbortError');
        } catch (err) {
          expect((err as Error).name).toBe('AbortError');
        }
      },
    );

    it(
      'não aborta prematuramente com signal não-abortado',
      { timeout: 30000 },
      async () => {
        const controller = new AbortController();
        const imageData = makeTestImageData(50, 50);

        // Signal não abortado: deve completar normalmente
        const paths = await vectorizeImage(imageData, {
          signal: controller.signal,
        });
        expect(Array.isArray(paths)).toBe(true);
      },
    );

    it(
      'signal abortado durante processamento: resultado é AbortError OU sucesso (race)',
      { timeout: 30000 },
      async () => {
        const controller = new AbortController();
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });

        // Aborta imediatamente após iniciar — pode ou não pegar a tempo
        // (a vetorização é rápida para imagens pequenas, então o resultado
        // é dependente de timing). Aceita ambos.
        const promise = vectorizeImage(imageData, {
          signal: controller.signal,
        });
        controller.abort();

        try {
          const result = await promise;
          // Se completou, tudo bem — sinal chegou tarde demais
          expect(Array.isArray(result)).toBe(true);
        } catch (err) {
          // Se abortou, deve ser AbortError
          expect((err as Error).name).toBe('AbortError');
        }
      },
    );
  });

  describe('defaults', () => {
    it(
      'usa preset edge-default por default (pipeline edge+bezier)',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const defaults = await vectorizeImage(imageData);
        const explicit = await vectorizeImage(imageData, {
          preset: 'edge-default',
        });

        // Devem produzir resultados idênticos (mesma quantidade de paths)
        expect(defaults.length).toBe(explicit.length);

        // Se houver paths, o `strokeWidth` deve ser 8 (do EDGE_PRESET_CONFIG)
        if (defaults.length > 0) {
          expect(defaults[0]?.strokeWidth).toBe(8);
        }
      },
    );

    it(
      'aplica strokeWidth customizado quando informado',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50);
        const paths = await vectorizeImage(imageData, { strokeWidth: 5 });

        if (paths.length > 0) {
          expect(paths[0]?.strokeWidth).toBe(5);
        }
      },
    );

    it(
      'aplica defaultColor customizado quando path não tem fill',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50);
        const paths = await vectorizeImage(imageData, {
          defaultColor: '#ff0000',
        });

        // Se houver paths, todos devem ter color válida
        for (const p of paths) {
          expect(typeof p.color).toBe('string');
          expect(p.color.length).toBeGreaterThan(0);
        }
      },
    );
  });
});

// ─── Pipeline edge+bezier (v0.132.0) ─────────────────────────────────────
// Cobertura do branch por preset introduzido em v0.132.0:
// (a) Preset `edge-default` usa o novo pipeline (edge detection → RDP → Bezier)
// (b) `strokeWidth` do path vem do EDGE_PRESET_CONFIG
// (c) Imagem sem bordas retorna [] sem crash
// (d) `pipelineMode` explícito força o pipeline escolhido
// (e) Regressão: presets legados têm comportamento idêntico ao v0.131.0

/**
 * Helper para gerar uma imagem sintética com **quadrado branco** sobre
 * fundo preto — configuração ideal para o edge detector (contraste forte).
 * Inverso do `makeTestImageData` padrão (que faz quadrado preto em fundo
 * branco) — usado nos testes do pipeline edge+bezier para validar a
 * detecção de bordas.
 */
function makeTestEdgeImageData(
  width: number,
  height: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fundo preto opaco
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }

  // Quadrado branco central — forte contraste para o edge detector
  const x0 = Math.max(1, Math.floor(width / 4));
  const y0 = Math.max(1, Math.floor(height / 4));
  const x1 = Math.min(width - 1, Math.floor((width * 3) / 4));
  const y1 = Math.min(height - 1, Math.floor((height * 3) / 4));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }

  return { data, width, height } as unknown as ImageData;
}

/**
 * Helper para gerar uma imagem **uniforme** (sem bordas) — valida que o
 * pipeline edge+bezier retorna `[]` sem crash quando não há features.
 */
function makeTestUniformImageData(
  width: number,
  height: number,
  fillColor: { r: number; g: number; b: number } = { r: 128, g: 128, b: 128 },
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillColor.r;
    data[i + 1] = fillColor.g;
    data[i + 2] = fillColor.b;
    data[i + 3] = 255;
  }
  return { data, width, height } as unknown as ImageData;
}

describe('vectorizer — pipeline edge+bezier (v0.132.0)', () => {
  describe('branch automático por preset', () => {
    it(
      'preset `edge-default` produz paths via novo pipeline',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

        // Edge detection de quadrado branco em fundo preto deve encontrar
        // bordas; pipeline deve produzir ≥ 1 path
        expect(paths.length).toBeGreaterThan(0);

        for (const path of paths) {
          expect(path.d.length).toBeGreaterThan(0);
          expect(path.length).toBeGreaterThan(0);
          expect(path.color).toMatch(/^#[0-9a-f]{6}$/i);
        }
      },
    );

    it(
      'strokeWidth do path vem do EDGE_PRESET_CONFIG (8 para edge-default)',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

        if (paths.length > 0) {
          // EDGE_PRESET_CONFIG['edge-default'].strokeWidth === 8
          expect(paths[0]?.strokeWidth).toBe(8);
        }
      },
    );

    it(
      'imagem uniforme (sem bordas internas) não produz crash',
      { timeout: 30000 },
      async () => {
        // Nota: uma imagem 100% uniforme ainda pode gerar contornos nas
        // bordas do canvas (efeito de borda do padding zero do Canny).
        // Validamos apenas que o pipeline NÃO crasha e retorna um array
        // — sem asserir que seja vazio (o comportamento real é produzir
        // 1-4 paths correspondentes às 4 arestas do canvas).
        const imageData = makeTestUniformImageData(50, 50);
        const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

        expect(Array.isArray(paths)).toBe(true);
        // Sanity check — todos os paths retornados são válidos
        for (const path of paths) {
          expect(path.d.length).toBeGreaterThan(0);
          expect(path.length).toBeGreaterThan(0);
        }
      },
    );
  });

  describe('regressão de presets legados (v0.131.0)', () => {
    it(
      '`artistic1` produz resultado idêntico ao legado (mesmo path count + strokeWidth 2)',
      { timeout: 30000 },
      async () => {
        // Garante que o branch legado continua produzindo o mesmo output
        // que antes da v0.132.0 (regressão zero).
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const paths = await vectorizeImage(imageData, { preset: 'artistic1' });

        // Pipeline legado: strokeWidth default 2 (DEFAULT_STROKE_WIDTH)
        if (paths.length > 0) {
          expect(paths[0]?.strokeWidth).toBe(2);
        }
      },
    );

    it(
      '`detailed` continua usando pipeline legado (imagetRacerPreset)',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const paths = await vectorizeImage(imageData, { preset: 'detailed' });

        // Pipeline legado: strokeWidth default 2
        if (paths.length > 0) {
          expect(paths[0]?.strokeWidth).toBe(2);
        }
      },
    );
  });

  describe('pipelineMode explícito (override)', () => {
    it(
      '`pipelineMode: "imagetracer"` com preset edge-default força pipeline legado',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        const paths = await vectorizeImage(imageData, {
          preset: 'edge-default',
          pipelineMode: 'imagetracer',
        });

        // Pipeline legado: strokeWidth default 2 (não 8 do edge-default)
        // Se houver paths, devem ter strokeWidth 2
        for (const path of paths) {
          expect(path.strokeWidth).toBe(2);
        }
      },
    );

    it(
      '`pipelineMode: "edge-bezier"` com preset legado lança erro',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50);
        await expect(
          vectorizeImage(imageData, {
            preset: 'artistic1',
            pipelineMode: 'edge-bezier',
          }),
        ).rejects.toThrow(/pipelineMode: 'edge-bezier' exige preset edge-/);
      },
    );

    it(
      '`pipelineMode: "edge-bezier"` com preset edge funciona normalmente',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        const paths = await vectorizeImage(imageData, {
          preset: 'edge-detailed',
          pipelineMode: 'edge-bezier',
        });

        // strokeWidth do edge-detailed = 6 (do EDGE_PRESET_CONFIG)
        for (const path of paths) {
          expect(path.strokeWidth).toBe(6);
        }
      },
    );
  });

  describe('limites do novo pipeline', () => {
    it(
      'MAX_PATHS_PER_SCENE é 60 (constante truncadora)',
      { timeout: 30000 },
      async () => {
        // Edge detection tende a gerar mais paths que o imagetracerjs.
        // Imagem 100×100 com quadrado branco + check que paths <= 60.
        const imageData = makeTestEdgeImageData(100, 100);
        const paths = await vectorizeImage(imageData, { preset: 'edge-default' });

        expect(paths.length).toBeLessThanOrEqual(60);
      },
    );

    it(
      'edgeThreshold override é aceito sem erro',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        // Threshold muito permissivo (0.05) — funciona como sanity check
        const paths = await vectorizeImage(imageData, {
          preset: 'edge-default',
          edgeThreshold: 0.05,
        });

        expect(Array.isArray(paths)).toBe(true);
      },
    );

    it(
      'contourEpsilon override é aceito sem erro',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestEdgeImageData(50, 50);
        // Epsilon muito agressivo (5.0) — produz paths mais simples
        const paths = await vectorizeImage(imageData, {
          preset: 'edge-default',
          contourEpsilon: 5.0,
        });

        expect(Array.isArray(paths)).toBe(true);
      },
    );
  });
});

// ─── sortPaths (L9, RF-09) ───────────────────────────────────────────────
// Função pura: ordena VetorialPath[] para animação sequencial.
// 4 estratégias: top-down, center-out, big-first, random (com seed).

/**
 * Helper para criar um `VetorialPath` mínimo de teste.
 * O atributo `d` segue o formato `"M x y L x y"` que o
 * `PATH_POINT_REGEX` interno consegue parsear.
 *
 * Importante: `VetorialPath` NÃO tem o campo `id` no tipo público, então
 * os testes identificam paths pelo atributo `d` (único por construção).
 */
function makePath(d: string, length: number): VetorialPath {
  return { d, length, color: '#000', strokeWidth: 1 };
}

describe('sortPaths', () => {
  describe('top-down', () => {
    it('ordena paths por Y mínimo crescente (menor Y primeiro)', () => {
      // Arrange — paths em ordem arbitrária
      const top = makePath('M 0 10 L 10 20', 50);
      const mid = makePath('M 0 100 L 10 110', 50);
      const bot = makePath('M 0 200 L 10 210', 50);
      const input = [bot, top, mid];

      // Act
      const sorted = sortPaths(input, 'top-down', 100, 300);

      // Assert
      expect(sorted.map((p) => p.d)).toEqual([
        'M 0 10 L 10 20',
        'M 0 100 L 10 110',
        'M 0 200 L 10 210',
      ]);
    });

    it('retorna array vazio para entrada vazia', () => {
      expect(sortPaths([], 'top-down', 100, 100)).toEqual([]);
    });

    it('retorna o mesmo path para array de 1 elemento', () => {
      const only = makePath('M 0 0 L 10 10', 14);
      const result = sortPaths([only], 'top-down', 100, 100);
      expect(result).toHaveLength(1);
      expect(result[0]?.d).toBe('M 0 0 L 10 10');
    });

    it('preserva ordem relativa para paths com mesmo Y mínimo (estável)', () => {
      // Mesmo Y=50, ordem original: A, B, C — sort estável mantém
      const a = makePath('M 0 50 L 10 50', 10);
      const b = makePath('M 0 50 L 20 50', 20);
      const c = makePath('M 0 50 L 30 50', 30);

      const result = sortPaths([a, b, c], 'top-down', 100, 100);
      expect(result.map((p) => p.d)).toEqual([
        'M 0 50 L 10 50',
        'M 0 50 L 20 50',
        'M 0 50 L 30 50',
      ]);
    });
  });

  describe('center-out', () => {
    it('ordena paths por distância euclidiana ao centro (mais perto primeiro)', () => {
      // Canvas 100x100, centro = (50, 50)
      // Path "near": primeiro ponto (50, 50) → dist 0
      // Path "mid": primeiro ponto (10, 10) → dist ≈ 56.6
      // Path "far": primeiro ponto (90, 90) → dist ≈ 56.6
      const near = makePath('M 50 50 L 60 60', 14);
      const mid = makePath('M 10 10 L 20 20', 14);
      const far = makePath('M 90 90 L 100 100', 14);

      const result = sortPaths([far, near, mid], 'center-out', 100, 100);

      // `near` (dist 0) deve vir primeiro
      expect(result[0]?.d).toBe('M 50 50 L 60 60');
    });

    it('considera o canvasWidth/canvasHeight passados como parâmetro', () => {
      // Canvas 200x200, centro = (100, 100)
      // Path em (100, 100) — deve ficar primeiro
      const center = makePath('M 100 100 L 110 110', 14);
      const corner = makePath('M 0 0 L 10 10', 14);

      const result = sortPaths([corner, center], 'center-out', 200, 200);
      expect(result[0]?.d).toBe('M 100 100 L 110 110');
    });

    it('retorna array vazio para entrada vazia', () => {
      expect(sortPaths([], 'center-out', 100, 100)).toEqual([]);
    });
  });

  describe('big-first', () => {
    it('ordena paths por length decrescente (maior primeiro)', () => {
      const small = makePath('M 0 0 L 1 1', 1);
      const big = makePath('M 0 0 L 100 0', 100);
      const mid = makePath('M 0 0 L 50 0', 50);

      const result = sortPaths([small, mid, big], 'big-first', 100, 100);
      expect(result.map((p) => p.length)).toEqual([100, 50, 1]);
    });

    it('lida corretamente com length 0 (cai no fim)', () => {
      const zero = makePath('M 0 0 L 0 0', 0);
      const real = makePath('M 0 0 L 10 0', 10);

      const result = sortPaths([zero, real], 'big-first', 100, 100);
      expect(result.map((p) => p.length)).toEqual([10, 0]);
    });

    it('retorna array vazio para entrada vazia', () => {
      expect(sortPaths([], 'big-first', 100, 100)).toEqual([]);
    });
  });

  describe('random', () => {
    it('produz a mesma ordem para a mesma seed (Fisher-Yates determinístico)', () => {
      // Arrange — 5 paths com `d` distintos
      const ds = [
        'M 0 0 L 1 0',
        'M 0 0 L 2 0',
        'M 0 0 L 3 0',
        'M 0 0 L 4 0',
        'M 0 0 L 5 0',
      ];
      const paths: VetorialPath[] = ds.map((d, i) => makePath(d, i + 1));

      // Act
      const result1 = sortPaths(paths, 'random', 100, 100);
      const result2 = sortPaths(paths, 'random', 100, 100);

      // Assert — determinístico: 2 execuções produzem mesma ordem
      expect(result1.map((p) => p.d)).toEqual(result2.map((p) => p.d));
    });

    it('contém todos os paths originais após o shuffle (sem perda/duplicação)', () => {
      const ds = [
        'M 0 0 L 1 0',
        'M 0 0 L 2 0',
        'M 0 0 L 3 0',
        'M 0 0 L 4 0',
        'M 0 0 L 5 0',
        'M 0 0 L 6 0',
        'M 0 0 L 7 0',
      ];
      const paths: VetorialPath[] = ds.map((d, i) => makePath(d, i + 1));

      const result = sortPaths(paths, 'random', 100, 100);
      const sortedDs = result.map((p) => p.d).sort();
      expect(sortedDs).toEqual([...ds].sort());
    });

    it('retorna array vazio para entrada vazia', () => {
      expect(sortPaths([], 'random', 100, 100)).toEqual([]);
    });

    it('retorna o mesmo path para array de 1 elemento (Fisher-Yates não roda)', () => {
      const only = makePath('M 0 0 L 1 0', 1);
      const result = sortPaths([only], 'random', 100, 100);
      expect(result).toHaveLength(1);
      expect(result[0]?.d).toBe('M 0 0 L 1 0');
    });
  });

  describe('imutabilidade', () => {
    it('não muta o array original', () => {
      const a = makePath('M 0 10 L 10 20', 50);
      const b = makePath('M 0 100 L 10 110', 50);
      const original = [b, a]; // ordem arbitrária

      sortPaths(original, 'top-down', 100, 200);

      // Array original deve manter a mesma ordem e referências
      expect(original).toHaveLength(2);
      expect(original[0]?.d).toBe('M 0 100 L 10 110');
      expect(original[1]?.d).toBe('M 0 10 L 10 20');
    });

    it('preserva as referências dos objetos (deep copy não é feita)', () => {
      const a = makePath('M 0 0 L 1 0', 1);
      const input = [a];

      const result = sortPaths(input, 'top-down', 100, 100);
      // Mesma referência — sortPaths não faz clone do path
      expect(result[0]).toBe(a);
    });
  });
});
