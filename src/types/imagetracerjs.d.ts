/**
 * Declarações de tipo mínimas para `imagetracerjs` (v1.2.6).
 *
 * A biblioteca é JS puro sem tipos oficiais. Exportamos apenas a API
 * mínima que usamos em `src/features/speed-paint/lib/vectorizer.ts`.
 *
 * @see https://github.com/jankovicsandras/imagetracerjs
 */
declare module 'imagetracerjs' {
  /**
   * Subset dos campos de `ImageData` que o `imagetracerjs` consome.
   * Tipado manualmente para evitar `any`.
   */
  interface ImageTracerImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }

  /**
   * Subset das opções de vetorização do `imagetracerjs` que usamos.
   * `preset` cobre todos os 16 presets oficiais; opções adicionais
   * (pathomit, numberofcolors) podem ser estendidas sob demanda.
   *
   * @see https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md
   */
  interface ImageTracerOptions {
    /**
     * Nome do preset — shorthand para um bundle de opções.
     * Use `'default'` para controle fino via outras chaves.
     */
    preset?:
      | 'default'
      | 'posterized1'
      | 'posterized2'
      | 'posterized3'
      | 'curvy'
      | 'sharp'
      | 'detailed'
      | 'smoothed'
      | 'grayscale'
      | 'fixedpalette'
      | 'randomsampling1'
      | 'randomsampling2'
      | 'artistic1'
      | 'artistic2'
      | 'artistic3'
      | 'artistic4';

    /** Remove paths menores que este número de pixels. Default: 8. */
    pathomit?: number;

    /** Número de cores na paleta (1-256). Default: 16. */
    numberofcolors?: number;

    /** Espessura mínima de linha (0-10). Default: 1. */
    ltres?: number;

    /** Tolerância de erro de curva (0-10). Default: 1. */
    qtres?: number;

    /** Suavização de caminho habilitada. */
    pathscan?: boolean;
  }

  /**
   * API singleton — instanciada na linha 1214 do `imagetracer_v1.2.6.js`:
   *   `self.ImageTracer = new ImageTracer();`
   */
  interface ImageTracerStatic {
    /**
     * Converte `ImageData` em uma string SVG.
     * Síncrono, browser + Node.js — perfeito para Web Worker inline.
     *
     * @returns SVG completo como string: `'<svg><path d="M..." fill="#222"/></svg>'`
     */
    imagedataToSVG(imgd: ImageTracerImageData, options?: ImageTracerOptions): string;
  }

  /** Singleton exposto como `ImageTracer` (maiúsculo) no escopo global. */
  const ImageTracer: ImageTracerStatic;
  export default ImageTracer;
}
