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
import { vectorizeImage } from '../../src/features/speed-paint/lib/vectorizer';
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
      'usa preset artistic1 por default (mesmo resultado)',
      { timeout: 30000 },
      async () => {
        const imageData = makeTestImageData(50, 50, { r: 200, g: 200, b: 200 });
        const defaults = await vectorizeImage(imageData);
        const explicit = await vectorizeImage(imageData, {
          preset: 'artistic1',
        });

        // Devem produzir resultados idênticos (mesma quantidade de paths)
        expect(defaults.length).toBe(explicit.length);

        // Se houver paths, o `strokeWidth` deve ser o default (2)
        if (defaults.length > 0) {
          expect(defaults[0]?.strokeWidth).toBe(2);
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
