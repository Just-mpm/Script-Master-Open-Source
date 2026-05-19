// ---------------------------------------------------------------------------
// Utilitário de chunking — divisão programática de texto
// ---------------------------------------------------------------------------
//
// Fallback usado por audio.ts e chunking.ts quando o Gemini falha
// na divisão inteligente de scripts longos.
// ---------------------------------------------------------------------------

/**
 * Divide um texto em pedaços de no máximo `limit` caracteres,
 * respeitando quebras de frase (. ! ? \n) quando possível.
 * Fallback programático quando o Gemini falha ou o script é curto.
 */
export function splitTextProgrammatically(text: string, limit: number): string[] {
  const result: string[] = [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      if (current) { result.push(current.trim()); current = ''; }
      let remaining = sentence;
      while (remaining.length > 0) {
        result.push(remaining.slice(0, limit).trim());
        remaining = remaining.slice(limit);
      }
    } else if (current.length + sentence.length > limit) {
      if (current) result.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence.trim();
    }
  }

  if (current) result.push(current.trim());
  return result;
}
