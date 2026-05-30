/**
 * Utilitários de validação de imagem.
 *
 * Centraliza helpers que verificam se uma imagem (data URL, blob URL ou URL remota)
 * é decodificável pelo navegador antes de usá-la em composições Remotion ou canvas.
 */

/** Timeout máximo para decodificação de imagem (15s) */
const IMAGE_DECODE_TIMEOUT_MS = 15_000;

/**
 * Tenta decodificar uma imagem e retorna `true` se for válida.
 *
 * Usa `Image.decode()` para verificação definitiva de decodificação sem renderizar.
 * Inclui timeout de 15s para evitar Promise pendente indefinidamente.
 * Seguro para usar com data URLs, blob URLs e URLs remotas.
 *
 * @param src - URL da imagem (data URL, blob URL ou URL remota)
 * @returns `true` se a imagem decodifica corretamente, `false` caso contrário
 */
export function validateImageIsDecodable(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, IMAGE_DECODE_TIMEOUT_MS);

    const done = (result: boolean) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      img.decode().then(() => done(true)).catch(() => done(false));
    };
    img.onerror = () => done(false);
    img.src = src;
  });
}
