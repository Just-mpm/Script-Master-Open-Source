// ---------------------------------------------------------------------------
// Helpers utilitários compartilhados entre flows
// ---------------------------------------------------------------------------

/** Converte valor desconhecido para string de forma segura */
export function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}
