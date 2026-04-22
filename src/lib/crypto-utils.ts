/**
 * Gera hash SHA-256 de uma string usando a Web Crypto API.
 * Retorna string hex de 64 caracteres.
 *
 * Usado para detecção de staleness: comparar o roteiro atual
 * com o roteiro que gerou as legendas salvas.
 */
export async function hashScript(script: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(script);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
