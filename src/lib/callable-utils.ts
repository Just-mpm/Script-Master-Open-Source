// ---------------------------------------------------------------------------
// Utilitários para payloads de Cloud Functions (httpsCallable)
// ---------------------------------------------------------------------------
//
// O Firebase httpsCallable serializa os argumentos como JSON. Quando um campo
// tem valor `undefined`, o JSON.stringify o converte para `null` — mas o Zod
// no backend diferencia `undefined` (campo ausente) de `null` (valor nulo).
//
// Use removeUndefinedFields nos payloads antes de enviar para evitar
// que campos opcionais sejam rejeitados pelos schemas.
// ---------------------------------------------------------------------------

/**
 * Remove recursivamente campos com valor `undefined` de um objeto.
 *
 * Similar ao `removeUndefinedFields` em `src/lib/db/shared.ts`, mas sem
 * dependências do Firestore — próprio para payloads de httpsCallable.
 */
export function removeUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedFields(item)) as T;
  }

  if (
    value !== null
    && typeof value === 'object'
    && !(value instanceof Blob)
    && !(value instanceof Date)
  ) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, removeUndefinedFields(entryValue)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}
