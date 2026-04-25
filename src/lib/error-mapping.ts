/**
 * Mapeamento genérico de erros técnicos para mensagens amigáveis em pt-BR.
 *
 * Cada domínio (áudio, imagem, assistente) configura suas próprias regras
 * de pattern matching sem duplicar a lógica de dispatch.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Regra individual de mapeamento: predicado + mensagem amigável */
export interface ErrorMappingRule {
  /** Retorna true quando a mensagem (lowercase) corresponde ao erro */
  readonly match: (msg: string) => boolean;
  /** Mensagem exibida ao usuário quando a regra bate */
  readonly message: string;
}

/** Configuração do mapper por domínio */
export interface ErrorMapperConfig {
  /** Mensagem quando o valor lançado não é uma instância de Error */
  readonly nonErrorMessage: string;
  /** Mensagem de fallback quando nenhuma regra bate */
  readonly defaultMessage: string;
  /** Regras avaliadas na ordem — primeira que bate vence */
  readonly rules: readonly ErrorMappingRule[];
}

/** Função que mapeia um erro desconhecido para string amigável */
export type ErrorMapper = (error: unknown) => string;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Cria um mapper de erros tipado para um domínio específico.
 *
 * @example
 * ```ts
 * const mapError = createErrorMapper({
 *   nonErrorMessage: 'Erro inesperado.',
 *   defaultMessage: 'Tente novamente.',
 *   rules: [
 *     { match: (m) => m.includes('quota'), message: 'Limite atingido.' },
 *   ],
 * });
 * ```
 */
export function createErrorMapper(config: ErrorMapperConfig): ErrorMapper {
  const { nonErrorMessage, defaultMessage, rules } = config;

  return function mapError(error: unknown): string {
    if (!(error instanceof Error)) {
      return nonErrorMessage;
    }

    const msg = error.message.toLowerCase();

    for (const rule of rules) {
      if (rule.match(msg)) {
        return rule.message;
      }
    }

    return defaultMessage;
  };
}

// ---------------------------------------------------------------------------
// Regras compartilhadas entre domínios (áudio, imagem, assistente)
// ---------------------------------------------------------------------------

/**
 * Regras de mapeamento de erro comuns a todos os domínios da aplicação.
 *
 * As regras de timeout, safety e abort/cancelled ficam inline em cada hook
 * porque o padrão de match ou a mensagem amigável variam por domínio.
 */
export const sharedErrorRules: readonly ErrorMappingRule[] = [
  {
    match: (m) => m.includes('quota') || m.includes('resource_exhausted') || m.includes('429'),
    message: 'Limite de uso atingido. Aguarde alguns minutos e tente novamente.',
  },
  {
    match: (m) => m.includes('api key') || m.includes('key not valid') || m.includes('permission_denied'),
    message: 'Erro de autenticação. Verifique sua chave de API nas configurações.',
  },
  {
    match: (m) => m.includes('unavailable') || m.includes('503'),
    message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  },
] as const;
