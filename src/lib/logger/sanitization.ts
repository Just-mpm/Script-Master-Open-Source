/**
 * Sanitização de dados sensíveis antes do envio para o Firestore.
 *
 * Redacta senhas, tokens, emails, API keys e URLs com credenciais
 * para garantir conformidade com LGPD e boas práticas de segurança.
 */

// ---------------------------------------------------------------------------
// Padrões de redação
// ---------------------------------------------------------------------------

/** Palavras-chave cujos valores devem ser redactados. */
const SENSITIVE_KEYS = [
  'password', 'pwd', 'secret', 'token', 'accesstoken',
  'refreshtoken', 'idtoken', 'apikey', 'appkey', 'privatekey',
  'authorization', 'cookie', 'sessionid', 'csrftoken',
  'firebaseinstallationsid', 'stripe_token', 'paymentmethod',
] as const;

/** Regex para detecção de dados sensíveis em strings. */
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  // JWTs (eyJ...)
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  // Emails
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // URLs com credenciais (user:pass@host)
  /:\/\/[^@\s]+:[^@\s]+@/g,
  // Query params sensíveis
  /[?&](token|key|secret|password|pwd|api[_-]?key|access[_-]?token)=([^&\s]+)/gi,
] as const;

/** Substituição padrão para dados redactados. */
const REDACTED = '[REDACTED]';

/** Profundidade máxima de recursão na sanitização de objetos. */
const MAX_DEPTH = 5;

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Sanitiza uma mensagem de texto, redactando dados sensíveis.
 *
 * Remove JWTs, emails, URLs com credenciais e query params sensíveis.
 */
export function sanitizeMessage(message: string): string {
  let result = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    // Reinicia o lastIndex de regex com flag global
    pattern.lastIndex = 0;
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/**
 * Sanitiza um stack trace, removendo caminhos locais completos.
 *
 * Converte `D:\Pictures\ProgML\Script-Master\src\lib\foo.ts` em `foo.ts`,
 * mantendo apenas o nome do arquivo para reduzir exposição de estrutura.
 */
export function sanitizeStackTrace(stack: string): string {
  // Remove caminhos absolutos Windows (C:\, D:\, etc.) mantendo só o nome do arquivo
  let result = stack.replace(
    /[A-Za-z]:\\[^\s:)]+[\\/]([^\\/]+\.ts[x]?)/g,
    '$1',
  );
  // Remove caminhos absolutos Unix (/home/user/...) mantendo só o nome do arquivo
  result = result.replace(
    /\/[^\s:)]+\/([^/]+\.ts[x]?)/g,
    '$1',
  );
  // Sanitiza dados sensíveis restantes
  result = sanitizeMessage(result);
  return result;
}

/**
 * Sanitiza recursivamente um objeto, redactando valores de chaves sensíveis.
 *
 * @param metadata - Objeto a sanitizar.
 * @param depth    - Profundidade atual da recursão (interno).
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
  depth: number = 0,
): Record<string, unknown> {
  if (depth >= MAX_DEPTH) {
    return { _truncated: '[MAX_DEPTH_EXCEEDED]' };
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();

    // Verifica se a chave é sensível
    const isSensitive = SENSITIVE_KEYS.some(
      (sensitive) => lowerKey === sensitive || lowerKey.includes(sensitive),
    );

    if (isSensitive) {
      sanitized[key] = REDACTED;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeMessage(value);
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeMetadata(
        value as Record<string, unknown>,
        depth + 1,
      );
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeMetadata(item as Record<string, unknown>, depth + 1)
          : typeof item === 'string'
            ? sanitizeMessage(item)
            : item,
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitiza uma URL, removendo query params sensíveis.
 *
 * Mantém a estrutura da URL mas redacta parâmetros como token, key, etc.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = [
      'token', 'key', 'secret', 'password', 'pwd',
      'api_key', 'apikey', 'access_token', 'accesstoken',
      'session_id', 'sessionid', 'csrf',
    ];

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, REDACTED);
      }
    }

    // Remove credenciais embutidas na URL (user:pass@host)
    if (parsed.username || parsed.password) {
      parsed.username = REDACTED;
      parsed.password = '';
    }

    return parsed.toString();
  } catch {
    // URL inválida — sanitiza como string genérica
    return sanitizeMessage(url);
  }
}

/**
 * Wrapper de conveniência que sanitiza o payload de um log.
 *
 * Equivalente a `sanitizeMetadata(payload)`.
 */
export function sanitizePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeMetadata(payload);
}
