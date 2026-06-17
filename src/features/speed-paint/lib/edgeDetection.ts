/**
 * Edge Detection Canny simplificado para o pipeline edge+bezier do modo
 * vetorial do Speed Paint.
 *
 * ## Pipeline
 *
 * 1. **Grayscale** — converte RGBA em luminância NTSC (Y = 0.299R + 0.587G + 0.114B)
 * 2. **Gaussian Blur 5×5** (σ=1.0) — suaviza ruído preservando bordas principais
 * 3. **Sobel 3×3** — calcula gradientes Gx e Gy (magnitude + direção)
 * 4. **Non-Maximum Suppression** — afina bordas para 1px (interpolação bilinear)
 * 5. **Double Threshold + Hysteresis** — classifica em forte/fraca/não-borda
 *    e conecta fracas às fortes via BFS 8-vizinhança
 *
 * ## Saída
 *
 * `Uint8Array` de comprimento `width × height`, valores **0 ou 1** (1 = borda).
 * Escolhido `Uint8Array` (não `Uint8ClampedArray`) por performance bruta em
 * aritmética de pixel — o pipeline seguinte (`traceContours`) só lê/escreve
 * bytes, sem precisar de clamping.
 *
 * ## Performance
 *
 * Acesso linear a `Uint8Array` (cálculo de `idx = y * width + x` em variável
 * local). BFS de hysteresis usa fila inteira com `head++` (mesmo padrão de
 * `imageProcessing.ts`) para evitar `Array.shift()` O(n).
 *
 * ## Edge cases
 *
 * - **Imagem 1×1:** sem vizinhos válidos para Sobel/NMS — retorna `[0]`
 *   (conservador; o gradiente é zero, nada é classificado como borda).
 * - **Borda da imagem:** Gaussian Blur e Sobel replicam o pixel mais próximo
 *   para preservar fundos uniformes; NMS usa zero-padding nas magnitudes.
 * - **Validações:** `Error` lançado se dimensões inválidas, `lowThreshold >=
 *   highThreshold`, ou `imageData.data` não for `Uint8ClampedArray`.
 *
 * @see `src/features/speed-paint/lib/contourTracing.ts` — próximo estágio
 * @see `docs/plan/edge-detection-whiteboard-architecture.md` §3.1
 * @see `docs/plan/edge-detection-whiteboard-plano-final.md` §Leva 1.2
 */

import { createLogger } from '../../../lib/logger';

const log = createLogger('edge-detection');

// ---------------------------------------------------------------------------
// Constantes — kernels e defaults
// ---------------------------------------------------------------------------

/** Pesos NTSC para luminância (CCIR 601). Soma = 1.0. */
const NTSC_R = 0.299;
const NTSC_G = 0.587;
const NTSC_B = 0.114;

/**
 * Kernel Gaussiano 5×5 base (σ≈1.0). Soma = 159.
 *
 * ```
 *  2  4  5  4  2
 *  4  9 12  9  4
 *  5 12 15 12  5   / 159
 *  4  9 12  9  4
 *  2  4  5  4  2
 * ```
 *
 * Pré-calculado em formato flat 1D (length=25) para acesso linear em loop.
 */
const GAUSSIAN_KERNEL_5X5: readonly number[] = [
  2, 4, 5, 4, 2,
  4, 9, 12, 9, 4,
  5, 12, 15, 12, 5,
  4, 9, 12, 9, 4,
  2, 4, 5, 4, 2,
];

/** Soma do kernel Gaussiano 5×5 (usado como denominador). */
const GAUSSIAN_KERNEL_SUM = 159;

/** Metade do lado do kernel Gaussiano (5/2 = 2). Usado para offset de varredura. */
const GAUSSIAN_RADIUS = 2;

/** Kernel Sobel Gx (gradiente horizontal). */
const SOBEL_GX: readonly number[] = [
  -1, 0, 1,
  -2, 0, 2,
  -1, 0, 1,
];

/** Kernel Sobel Gy (gradiente vertical). */
const SOBEL_GY: readonly number[] = [
  -1, -2, -1,
  0, 0, 0,
  1, 2, 1,
];

/** Metade do lado do kernel Sobel (3/2 = 1). */
const SOBEL_RADIUS = 1;

/** Default do desvio padrão do Gaussian Blur. */
const DEFAULT_BLUR_SIGMA = 1.0;

/** Default do threshold alto (normalizado 0..1). */
const DEFAULT_HIGH_THRESHOLD = 0.3;

/** Default do threshold baixo (normalizado 0..1). */
const DEFAULT_LOW_THRESHOLD = 0.1;

/** Constante π/4 (45°). Usada para quantização de direção do gradiente em 4 buckets. */
const QUARTER_PI = Math.PI / 4;

/** Tipos de quantização da direção do gradiente (4 buckets, 45° cada). */
type GradientDirection = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Opções de configuração do detector de bordas.
 *
 * @example
 * ```ts
 * const edges = detectEdges(imageData, {
 *   blurSigma: 1.0,
 *   highThreshold: 0.3,
 *   lowThreshold: 0.1,
 * });
 * ```
 */
export interface EdgeDetectionOptions {
  /**
   * Desvio padrão do Gaussian Blur (σ). Default: 1.0.
   * Valores maiores suavizam mais — bom para fotos com ruído.
   * Para imagens flat/design, σ=1.0 é suficiente.
   */
  blurSigma?: number;
  /**
   * Threshold alto normalizado 0..1. Default: 0.3.
   * Pixels com magnitude >= highThreshold são classificados como borda forte.
   */
  highThreshold?: number;
  /**
   * Threshold baixo normalizado 0..1. Default: 0.1. Deve ser < highThreshold.
   * Pixels com magnitude >= lowThreshold (mas < highThreshold) são bordas fracas;
   * só são mantidos se conectados a uma borda forte via hysteresis.
   */
  lowThreshold?: number;
}

// ---------------------------------------------------------------------------
// Helpers SRP (cada um faz uma coisa só)
// ---------------------------------------------------------------------------

/**
 * Valida `imageData` e as opções do pipeline. Lança `Error` com mensagem
 * clara se alguma invariante for violada.
 */
function validateInputs(
  imageData: ImageData,
  blurSigma: number,
  lowThreshold: number,
  highThreshold: number,
): void {
  if (imageData.width <= 0 || imageData.height <= 0) {
    throw new Error(
      `detectEdges: dimensões inválidas (width=${imageData.width}, height=${imageData.height})`,
    );
  }
  if (!(imageData.data instanceof Uint8ClampedArray)) {
    throw new Error(
      'detectEdges: imageData.data deve ser Uint8ClampedArray (canvas ImageData)',
    );
  }
  if (blurSigma <= 0) {
    throw new Error(`detectEdges: blurSigma deve ser > 0 (recebido ${blurSigma})`);
  }
  if (lowThreshold < 0 || lowThreshold > 1) {
    throw new Error(
      `detectEdges: lowThreshold deve estar em [0, 1] (recebido ${lowThreshold})`,
    );
  }
  if (highThreshold < 0 || highThreshold > 1) {
    throw new Error(
      `detectEdges: highThreshold deve estar em [0, 1] (recebido ${highThreshold})`,
    );
  }
  if (lowThreshold >= highThreshold) {
    throw new Error(
      `detectEdges: lowThreshold (${lowThreshold}) deve ser < highThreshold (${highThreshold})`,
    );
  }
}

/**
 * Lê um pixel do array grayscale replicando o pixel mais próximo nas bordas.
 * Usado no Gaussian Blur para não criar gradiente artificial em fundos uniformes.
 */
function readReplicatedPixel(
  gray: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  return gray[clampedY * width + clampedX] ?? 0;
}

/** Gera kernel Gaussiano 5×5 normalizado para o sigma informado. */
function createGaussianKernel5x5(sigma: number): Float32Array {
  if (sigma === DEFAULT_BLUR_SIGMA) {
    return Float32Array.from(
      GAUSSIAN_KERNEL_5X5,
      (weight) => weight / GAUSSIAN_KERNEL_SUM,
    );
  }

  const kernel = new Float32Array(25);
  const sigma2 = 2 * sigma * sigma;
  let sum = 0;
  for (let ky = -GAUSSIAN_RADIUS; ky <= GAUSSIAN_RADIUS; ky++) {
    for (let kx = -GAUSSIAN_RADIUS; kx <= GAUSSIAN_RADIUS; kx++) {
      const idx = (ky + GAUSSIAN_RADIUS) * 5 + (kx + GAUSSIAN_RADIUS);
      const weight = Math.exp(-(kx * kx + ky * ky) / sigma2);
      kernel[idx] = weight;
      sum += weight;
    }
  }
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum;
  }
  return kernel;
}

/**
 * Converte RGBA em grayscale usando pesos de luminância NTSC.
 * Loop linear, varre 1×1 pixel por iteração.
 */
function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const size = width * height;
  const gray = new Uint8Array(size);
  for (let i = 0, p = 0; p < size; i += 4, p++) {
    gray[p] = data[i] * NTSC_R + data[i + 1] * NTSC_G + data[i + 2] * NTSC_B;
  }
  return gray;
}

/**
 * Aplica Gaussian Blur 5×5 com padding replicado nas bordas.
 * Acesso linear ao kernel pré-calculado em flat array.
 */
function gaussianBlur5x5(
  src: Uint8Array,
  width: number,
  height: number,
  sigma: number,
): Uint8Array {
  const size = width * height;
  const dst = new Uint8Array(size);
  const kernel = createGaussianKernel5x5(sigma);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let ky = 0; ky < 5; ky++) {
        const sy = y + ky - GAUSSIAN_RADIUS;
        for (let kx = 0; kx < 5; kx++) {
          const sx = x + kx - GAUSSIAN_RADIUS;
          acc += readReplicatedPixel(src, sx, sy, width, height) * kernel[ky * 5 + kx]!;
        }
      }
      dst[y * width + x] = acc;
    }
  }
  return dst;
}

/**
 * Aplica Sobel 3×3, retorna arrays paralelos com magnitude (normalizada 0..1)
 * e direção quantizada (4 buckets de 45°).
 *
 * Magnitude: `sqrt(Gx² + Gy²) / (4 * sqrt(2))` — normalizada para que um pixel
 * de transição completa (vizinho preto + vizinho branco) atinja magnitude 1.0.
 */
function sobelGradients(
  src: Uint8Array,
  width: number,
  height: number,
): { magnitude: Float32Array; direction: Uint8Array } {
  const size = width * height;
  const magnitude = new Float32Array(size);
  const direction = new Uint8Array(size);
  // 4 * sqrt(2) ≈ 5.656854 — normalização da magnitude Sobel.
  const NORM = 4 * Math.SQRT2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = 0; ky < 3; ky++) {
        const sy = y + ky - SOBEL_RADIUS;
        for (let kx = 0; kx < 3; kx++) {
          const sx = x + kx - SOBEL_RADIUS;
          const pixel = readReplicatedPixel(src, sx, sy, width, height);
          gx += pixel * SOBEL_GX[ky * 3 + kx]!;
          gy += pixel * SOBEL_GY[ky * 3 + kx]!;
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy) / NORM;
      magnitude[y * width + x] = mag;
      // Quantiza ângulo em 4 buckets (0°, 45°, 90°, 135°) sem Math.atan2 8x.
      // atan2 ∈ (-π, π]; somar π traz para (0, 2π]; bucket = floor(angle / (π/4)) mod 4.
      const angle = Math.atan2(gy, gx) + Math.PI;
      direction[y * width + x] = (Math.floor(angle / QUARTER_PI)) & 3;
    }
  }
  return { magnitude, direction };
}

/**
 * Amostra magnitude na direção do gradiente com interpolação bilinear.
 * Retorna o valor do vizinho "antes" (sentido oposto ao gradiente) e
 * "depois" (sentido do gradiente) ao longo do eixo dominante.
 */
function sampleAlongDirection(
  magnitude: Float32Array,
  x: number,
  y: number,
  dir: GradientDirection,
  width: number,
  height: number,
): { before: number; after: number } {
  // Vetor unitário por bucket (90° de offset entre buckets consecutivos).
  // dir=0 → 0° (horizontal), dir=1 → 45°, dir=2 → 90° (vertical), dir=3 → 135°.
  const offsets: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];
  const [dx, dy] = offsets[dir]!;

  // Vizinhos na direção do gradiente (passo 1) e na direção oposta (passo -1).
  // Para buckets diagonais, os 2 vizinhos "antes/depois" exatos são diagonais
  // (não há ambiguidade); para buckets 0/2 (horizontal/vertical), usar os
  // 2 vizinhos colineares garante o teste de máximo local do Canny.
  const before = sampleBilinear(magnitude, x - dx, y - dy, width, height);
  const after = sampleBilinear(magnitude, x + dx, y + dy, width, height);
  return { before, after };
}

/**
 * Amostra magnitude com interpolação bilinear. Coordenadas em ponto flutuante.
 * Retorna 0 para pontos fora dos limites.
 */
function sampleBilinear(
  src: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  if (x0 < 0 || x0 >= width - 1 || y0 < 0 || y0 >= height - 1) {
    // Borda ou fora: usa leitura direta (zero-padding).
    return readFloatClamped(src, x0, y0, width, height);
  }

  const v00 = readFloatClamped(src, x0, y0, width, height);
  const v10 = readFloatClamped(src, x0 + 1, y0, width, height);
  const v01 = readFloatClamped(src, x0, y0 + 1, width, height);
  const v11 = readFloatClamped(src, x0 + 1, y0 + 1, width, height);
  const top = v00 * (1 - fx) + v10 * fx;
  const bottom = v01 * (1 - fx) + v11 * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Lê Float32Array com zero-padding nas bordas. */
function readFloatClamped(
  src: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return 0;
  }
  return src[y * width + x] ?? 0;
}

/**
 * Aplica Non-Maximum Suppression: para cada pixel, mantém a magnitude apenas
 * se for maior ou igual aos vizinhos na direção do gradiente. Caso contrário,
 * zera.
 */
function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Uint8Array,
  width: number,
  height: number,
): Float32Array {
  const size = width * height;
  const out = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx] ?? 0;
      if (mag === 0) {
        continue;
      }
      const dir = direction[idx] ?? 0;
      const { before, after } = sampleAlongDirection(
        magnitude,
        x,
        y,
        dir as GradientDirection,
        width,
        height,
      );
      if (mag >= before && mag >= after) {
        out[idx] = mag;
      }
    }
  }
  return out;
}

/**
 * Aplica double threshold + edge tracking by hysteresis.
 *
 * - `magnitude >= highThreshold` → borda forte (1)
 * - `magnitude >= lowThreshold` → borda fraca (1 SÓ se conectada a forte via BFS 8-vizinhança)
 * - resto → não-borda (0)
 *
 * Retorna `Uint8Array` binário.
 */
function hysteresis(
  nms: Float32Array,
  width: number,
  height: number,
  lowThreshold: number,
  highThreshold: number,
): Uint8Array {
  const size = width * height;
  const result = new Uint8Array(size);

  // Primeira passada: classifica forte (1) e fraca (2), descarta resto (0).
  // Usa 2 bits por estado para evitar segundo array:
  //   0 = não-borda, 1 = forte, 2 = fraca
  const state = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const m = nms[i] ?? 0;
    if (m >= highThreshold) {
      state[i] = 1;
    } else if (m >= lowThreshold) {
      state[i] = 2;
    }
  }

  // Segunda passada: BFS a partir de cada pixel forte, marcando fracas
  // conectadas como forte (=1). Fila inteira com head++ (O(1) por pop).
  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startIdx = startY * width + startX;
      if (state[startIdx] !== 1) {
        continue;
      }
      // Já visitamos este pixel? result[idx] === 1 indica sim.
      if (result[startIdx] === 1) {
        continue;
      }
      const queue: number[] = [startIdx];
      result[startIdx] = 1;
      let head = 0;
      while (head < queue.length) {
        const currIdx = queue[head++]!;
        const cx = currIdx % width;
        const cy = (currIdx - cx) / width;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;
            const nIdx = ny * width + nx;
            if (state[nIdx] === 2 && result[nIdx] === 0) {
              result[nIdx] = 1;
              state[nIdx] = 1; // promove fraca → forte para propagar
              queue.push(nIdx);
            }
          }
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// API pública — orquestrador
// ---------------------------------------------------------------------------

/**
 * Aplica edge detection Canny simplificado em `imageData`.
 *
 * Pipeline: Grayscale → Gaussian Blur → Sobel → NMS → Double Threshold + Hysteresis.
 *
 * @param imageData - Pixels RGBA da imagem (canvas `ImageData`).
 * @param options - Configurações opcionais (sigma, thresholds).
 * @returns Mapa binário de bordas (`Uint8Array` de comprimento `width × height`):
 *          1 = borda, 0 = não-borda.
 * @throws Error se `imageData` for inválido, dimensões <= 0, ou thresholds inválidos.
 *
 * @example
 * ```ts
 * const ctx = canvas.getContext('2d');
 * if (!ctx) throw new Error('Canvas 2D não disponível');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const edges = detectEdges(imageData);
 * // edges[i] === 1 → pixel é borda
 * ```
 */
export function detectEdges(
  imageData: ImageData,
  options?: EdgeDetectionOptions,
): Uint8Array {
  const blurSigma = options?.blurSigma ?? DEFAULT_BLUR_SIGMA;
  const highThreshold = options?.highThreshold ?? DEFAULT_HIGH_THRESHOLD;
  const lowThreshold = options?.lowThreshold ?? DEFAULT_LOW_THRESHOLD;

  validateInputs(imageData, blurSigma, lowThreshold, highThreshold);

  const { width, height } = imageData;
  const size = width * height;

  log.debug('Iniciando edge detection', { width, height, blurSigma, highThreshold, lowThreshold });

  // Edge case: imagem 1×1 — sem vizinhos para Sobel/NMS, retorna [0].
  if (size <= 1) {
    log.debug('Imagem 1×1 detectada — retornando [0] (sem vizinhos para gradiente)');
    return new Uint8Array(1);
  }

  // 1. RGBA → grayscale (luminância NTSC)
  const grayscale = toGrayscale(imageData.data, width, height);

  // 2. Gaussian Blur 5×5 (σ=blurSigma). Quando blurSigma=1.0, usa o kernel
  //    hard-coded sem redimensionamento (corresponde exatamente ao peso
  //    σ=1.0 da fórmula). Para outros σ, o kernel 5×5 hard-coded é uma
  //    aproximação razoável — projeto atual só consome σ=1.0.
  const blurred = gaussianBlur5x5(grayscale, width, height, blurSigma);

  // 3. Sobel (magnitude + direção quantizada em 4 buckets)
  const { magnitude, direction } = sobelGradients(blurred, width, height);

  // 4. Non-Maximum Suppression (afina bordas para 1px)
  const nms = nonMaxSuppression(magnitude, direction, width, height);

  // 5. Double threshold + hysteresis (BFS 8-vizinhança)
  const edges = hysteresis(nms, width, height, lowThreshold, highThreshold);

  log.debug('Edge detection concluído', { edgeCount: countOnes(edges), total: size });
  return edges;
}

/** Conta pixels de borda (valor === 1) no edgeMap. Usado para log/debug. */
function countOnes(arr: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 1) count++;
  }
  return count;
}
