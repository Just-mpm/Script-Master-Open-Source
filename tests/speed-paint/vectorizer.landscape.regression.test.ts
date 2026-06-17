/**
 * Teste de regressão para a Teoria 1 do bug "landscape sem traços".
 *
 * Sintoma reportado pelo usuário:
 * - Modo "Desenho" (vetorial) do Speed Paint
 * - Imagem LANDSCAPE (horizontal, ex: 800×600) → lápis se move, mas nenhum
 *   traço aparece na tela
 * - Imagem PORTRAIT (vertical, ex: 600×800) → funciona normalmente
 *
 * Teoria 1 (confirmada — ver histórico do commit):
 *   O `imagetracerjs` quantiza a paleta da imagem. Para imagens com grandes
 *   áreas claras (céu, nuvens, fundo claro de fotos landscape), a paleta
 *   inclui `rgb(255,255,255)` ou similar. Os paths gerados recebem essa cor
 *   no atributo `fill` (e subsequentemente no `stroke` via `enrichPaths`).
 *   Como o `canvasColor` padrão do app é `'white'` (fundo branco), esses
 *   paths ficam INVISÍVEIS (branco sobre branco).
 *
 *   O pencil ainda se move porque sua posição é calculada via
 *   `getPointAtLength(path.d, visibleLength)` — ele lê coordenadas dos
 *   paths mesmo quando eles são invisíveis. Isso explica "lápis se move
 *   mas nenhum traço aparece".
 *
 * Correção (v0.131.1):
 *   `filterPathsByBackgroundContrast(paths, 'white')` é aplicado no
 *   `imageProcessing.ts` logo após `vectorizeImage`, removendo paths cuja
 *   cor está a ≤ 30 unidades RGB de distância do fundo. Filtro transparente
 *   para imagens com bom contraste.
 *
 * @see `src/features/speed-paint/lib/vectorizer.ts`
 * @see `src/features/speed-paint/lib/imageProcessing.ts`
 * @see `src/features/speed-paint/types/vetorial.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  filterPathsByBackgroundContrast,
  vectorizeImage,
} from '../../src/features/speed-paint/lib/vectorizer';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Cria um `ImageData` sintético LANDSCAPE com fundo branco e um quadrado
 * preto central — simulando "foto com céu claro + objeto escuro".
 *
 * O `imagetracerjs` quantiza a paleta, então:
 * - Fundo branco puro (255,255,255) → palette inclui branco
 * - Quadrado preto (0,0,0) → palette inclui preto
 * - Borda entre os dois → gera path com cor de transição
 */
function makeLandscapeImageData(
  width: number,
  height: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fundo branco
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  // Quadrado preto central (cria contraste para gerar paths visíveis)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const halfW = Math.floor(width / 8);
  const halfH = Math.floor(height / 4);
  for (let y = cy - halfH; y < cy + halfH; y++) {
    for (let x = cx - halfW; x < cx + halfW; x++) {
      const idx = (y * width + x) * 4;
      if (idx >= 0 && idx + 3 < data.length) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
  }

  return { data, width, height } as unknown as ImageData;
}

/**
 * Cria um `ImageData` sintético PORTRAIT (controle) — mesmo padrão mas
 * invertido: dimensions 600x800 (vertical).
 */
function makePortraitImageData(
  width: number,
  height: number,
): ImageData {
  return makeLandscapeImageData(width, height);
}

/**
 * Extrai componentes RGB de uma string de cor CSS.
 * Suporta: `#RRGGBB`, `#RGB`, `rgb(r,g,b)`, `rgba(r,g,b,a)`.
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();

  // #RRGGBB
  if (trimmed.startsWith('#') && trimmed.length === 7) {
    const rgb = parseInt(trimmed.slice(1), 16);
    return {
      r: (rgb >> 16) & 0xff,
      g: (rgb >> 8) & 0xff,
      b: rgb & 0xff,
    };
  }

  // #RGB → #RRGGBB
  if (trimmed.startsWith('#') && trimmed.length === 4) {
    const r = parseInt(trimmed[1] + trimmed[1], 16);
    const g = parseInt(trimmed[2] + trimmed[2], 16);
    const b = parseInt(trimmed[3] + trimmed[3], 16);
    return { r, g, b };
  }

  // rgb(r, g, b) ou rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calcula luminância aproximada de uma cor RGB (0..255).
 * Usado para classificar se um path é "claro" (próximo de branco) ou "escuro".
 */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ─── Teste de regressão ──────────────────────────────────────────────

describe('vectorizeImage — regression: landscape (Teoria 1: paths brancos)', () => {
  it(
    'DEMONSTRAÇÃO: vectorizeImage PURO retorna paths com cor próxima de branco (bug confirmado)',
    { timeout: 30000 },
    async () => {
      // Imagem sintética landscape 800×600 (fundo branco + quadrado preto)
      const imageData = makeLandscapeImageData(800, 600);

      // Rodar SOMENTE `vectorizeImage` (sem filtro) — documenta o bug
      const paths = await vectorizeImage(imageData, { preset: 'default' });

      // Coletar paths com cor próxima de branco (luminância > 230)
      const nearWhitePaths = paths.filter((path) => {
        const rgb = parseColor(path.color);
        if (!rgb) return false;
        return luminance(rgb.r, rgb.g, rgb.b) > 230;
      });

      console.log(
        `[REGRESSION-BUG] vectorizeImage bruto: total=${paths.length}, near-white=${nearWhitePaths.length}`,
      );
      if (nearWhitePaths.length > 0) {
        console.log(
          '[REGRESSION-BUG] Sample near-white colors:',
          nearWhitePaths.slice(0, 5).map((p) => p.color),
        );
      }

      // Documenta que o bug existe: o vetorizador retorna paths invisíveis.
      // Este assert é o "espelho" do assert de FIX abaixo — se a lib
      // mudar para já filtrar internamente, este teste pode passar e o
      // próximo fica redundante (sem falha).
      expect(nearWhitePaths.length, 'Teoria 1 documentada: vetorizador inclui cor de fundo').toBeGreaterThan(0);
    },
  );

  it(
    'FIX: filterPathsByBackgroundContrast remove paths brancos e mantém paths com contraste válido',
    { timeout: 30000 },
    async () => {
      // 1. Imagem sintética landscape 800×600 (fundo branco + quadrado preto)
      const imageData = makeLandscapeImageData(800, 600);

      // 2. Pipeline real (vetorizar + filtrar)
      const rawPaths = await vectorizeImage(imageData, { preset: 'default' });
      const visiblePaths = filterPathsByBackgroundContrast(rawPaths, 'white');

      // 3. Após o filtro, nenhum path deve ter cor próxima de branco
      const nearWhiteAfter = visiblePaths.filter((path) => {
        const rgb = parseColor(path.color);
        if (!rgb) return false;
        return luminance(rgb.r, rgb.g, rgb.b) > 230;
      });

      // 4. Após o filtro, paths com cor escura (contraste válido) DEVEM ser mantidos
      const darkKept = visiblePaths.filter((path) => {
        const rgb = parseColor(path.color);
        if (!rgb) return false;
        return luminance(rgb.r, rgb.g, rgb.b) < 100;
      });

      console.log(
        `[REGRESSION-FIX] total=${rawPaths.length}, visíveis=${visiblePaths.length}, near-white-restantes=${nearWhiteAfter.length}, dark-mantidos=${darkKept.length}`,
      );

      // 5. Asserts — bug corrigido:
      expect(
        nearWhiteAfter,
        `Após filtro, ${nearWhiteAfter.length}/${visiblePaths.length} paths ainda têm cor próxima de branco. ` +
          `Cores: ${nearWhiteAfter.slice(0, 3).map((p) => p.color).join(', ')}...`,
      ).toHaveLength(0);

      //    Garante que o filtro não é excessivamente agressivo (não remove tudo)
      expect(darkKept.length, 'Filtro removeu paths com contraste válido (preto)').toBeGreaterThan(0);

      //    Garante que o filtro removeu pelo menos 1 path (caso contrário não está fazendo nada)
      expect(visiblePaths.length, 'Filtro deveria ter removido pelo menos 1 path invisível').toBeLessThan(rawPaths.length);
    },
  );

  it(
    'CONTROLE: portrait 600×800 com filtro aplicado gera paths majoritariamente escuros',
    { timeout: 30000 },
    async () => {
      // Controle: mesma imagem sintética mas em formato portrait
      const imageData = makePortraitImageData(600, 800);

      const rawPaths = await vectorizeImage(imageData, { preset: 'default' });
      const visiblePaths = filterPathsByBackgroundContrast(rawPaths, 'white');

      console.log(
        `[REGRESSION-CONTROL portrait] total=${rawPaths.length}, visíveis=${visiblePaths.length}`,
      );

      // Após o filtro, paths visíveis não devem ter cor próxima de branco
      const nearWhite = visiblePaths.filter((path) => {
        const rgb = parseColor(path.color);
        if (!rgb) return false;
        return luminance(rgb.r, rgb.g, rgb.b) > 230;
      });
      expect(nearWhite).toHaveLength(0);
    },
  );
});
