/**
 * Filtros de mensagens de erro a IGNORAR.
 *
 * Padrões de mensagens irrelevantes ou esperadas que não devem ser
 * registradas no sistema de error logging — evita ruído no Firestore.
 */

// ---------------------------------------------------------------------------
// Padrões por categoria
// ---------------------------------------------------------------------------

/** Erros internos do Firebase/Firestore (conexão, offline, WebChannel). */
const FIRESTORE_PATTERNS: readonly string[] = [
  'Could not reach Cloud Firestore backend',
  'Connection to Firestore lost',
  'The client has already been terminated',
  'Failed to get document because the client is offline',
  'WebChannel',
] as const;

/** Erros de autenticação Firebase (popup, rede, credenciais). */
const AUTH_PATTERNS: readonly string[] = [
  'auth/network-request-failed',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/invalid-credential',
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/user-token-expired',
  'auth/invalid-verification-code',
  'auth/invalid-verification-id',
  'auth/too-many-requests',
  'auth/web-storage-unsupported',
] as const;

/** Erros de upload/download do Firebase Storage. */
const STORAGE_PATTERNS: readonly string[] = [
  'storage/canceled',
  'storage/quota-exceeded',
  'Upload cancelled',
] as const;

/** Erros do navegador/DOM (ResizeObserver, Script error, etc.). */
const BROWSER_PATTERNS: readonly string[] = [
  'Script error.',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Non-Error exception captured',
] as const;

/** Erros de Web Storage (quota, indisponibilidade). */
const WEB_STORAGE_PATTERNS: readonly string[] = [
  'QuotaExceededError',
  'localStorage is not available',
] as const;

/** Erros de IndexedDB (indisponibilidade, conexão perdida). */
const INDEXEDDB_PATTERNS: readonly string[] = [
  'IndexedDB is not available',
  'Connection to IndexedDB lost',
] as const;

/** Erros de Service Worker e PWA. */
const SW_PATTERNS: readonly string[] = [
  'Failed to update a ServiceWorker',
] as const;

/** Erros de rede e conectividade. */
const NETWORK_PATTERNS: readonly string[] = [
  'Network Error',
  'Failed to fetch',
  'AbortError',
  'ERR_NETWORK',
  'ERR_CONNECTION_REFUSED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NAME_NOT_RESOLVED',
] as const;

/** Erros de Content Security Policy. */
const CSP_PATTERNS: readonly string[] = [
  'Content Security Policy',
] as const;

/** Erros causados por extensões do navegador. */
const EXTENSION_PATTERNS: readonly string[] = [
  'chrome-extension',
  'moz-extension',
  'AdBlock',
  'uBlock',
  'Ghostery',
] as const;

/** Erros internos do React (state transitions, warnings). */
const REACT_PATTERNS: readonly string[] = [
  'Cannot update during an existing state transition',
  'Warning: ',
] as const;

/** Erros internos do MUI. */
const MUI_PATTERNS: readonly string[] = [
  'MUI: ',
] as const;

/** Erros específicos do Script Master (Remotion, WASM, Web Audio, Stripe). */
const SCRIPT_MASTER_PATTERNS: readonly string[] = [
  'Remotion',
  'WebCodecs',
  'Codec not supported',
  'WASM compilation failed',
  'SharedArrayBuffer',
  'COEP',
  'AudioContext was not allowed to start',
  'Stripe.js not loaded',
] as const;

/** Padrões genéricos que devem ser ignorados em qualquer contexto. */
const GENERIC_PATTERNS: readonly string[] = [
  'cancelled',
  'canceled',
  'Abort',
  'Permission denied',
  'NotAllowedError',
  'NotSupportedError',
] as const;

// ---------------------------------------------------------------------------
// Lista consolidada
// ---------------------------------------------------------------------------

/**
 * Lista completa de padrões a ignorar.
 * A ordem não importa — qualquer match resulta em descarte.
 */
const ALL_IGNORE_PATTERNS: readonly string[] = [
  ...FIRESTORE_PATTERNS,
  ...AUTH_PATTERNS,
  ...STORAGE_PATTERNS,
  ...BROWSER_PATTERNS,
  ...WEB_STORAGE_PATTERNS,
  ...INDEXEDDB_PATTERNS,
  ...SW_PATTERNS,
  ...NETWORK_PATTERNS,
  ...CSP_PATTERNS,
  ...EXTENSION_PATTERNS,
  ...REACT_PATTERNS,
  ...MUI_PATTERNS,
  ...SCRIPT_MASTER_PATTERNS,
  ...GENERIC_PATTERNS,
] as const;

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Verifica se uma mensagem de erro deve ser IGNORADA pelo sistema de logging.
 *
 * Usa matching case-insensitive — "Network error" e "NETWORK ERROR"
 * são tratados igualmente.
 *
 * @returns `true` se a mensagem deve ser descartada.
 */
export function shouldIgnoreError(message: string): boolean {
  if (!message) return false;
  const lowerMessage = message.toLowerCase();
  return ALL_IGNORE_PATTERNS.some((pattern) =>
    lowerMessage.includes(pattern.toLowerCase()),
  );
}

/**
 * Verifica se um objeto Error deve ser ignorado, conferindo
 * tanto a mensagem quanto o stack trace.
 *
 * @returns `true` se o erro deve ser descartado.
 */
export function shouldIgnoreErrorObject(error: Error): boolean {
  // Verifica mensagem principal
  if (shouldIgnoreError(error.message)) return true;

  // Verifica stack trace (erros de extensões frequentemente aparecem no stack)
  if (error.stack && shouldIgnoreError(error.stack)) return true;

  return false;
}
