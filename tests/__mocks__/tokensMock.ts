/**
 * Mock centralizado de tokens do tema para testes.
 *
 * Inclui tokens do StackedHeader para que componentes que importam
 * StackedHeader (mesmo indiretamente) não falhem no vi.mock.
 *
 * Auto-contido: NÃO importa de `../../src/theme/tokens` para evitar ciclo
 * quando este factory é usado dentro de um `vi.mock('../../src/theme/tokens')`
 * factory. Os valores são string literals idênticos aos tokens reais.
 *
 * Uso:
 * ```typescript
 * vi.mock('../../src/theme/tokens', async () => {
 *   const { createTokensMock } = await import('../__mocks__/tokensMock');
 *   return createTokensMock({
 *     extras: { APP_ACTION_BAR_BOTTOM: 16, BRAND_GRADIENT: '...' },
 *   });
 * });
 * ```
 */

// StackedHeader tokens (valores reais)
const APP_BORDER = 'rgba(255, 255, 255, 0.08)';
const GLASS_BG = 'rgba(16, 23, 42, 0.78)';
const SUCCESS_BG_SUBTLE = 'rgba(16, 185, 129, 0.08)';
const SUCCESS_BORDER = 'rgba(16, 185, 129, 0.18)';
const SUCCESS_GLOW = 'rgba(16, 185, 129, 0.2)';
const ERROR_BG_SUBTLE = 'rgba(239, 68, 68, 0.08)';
const ERROR_BORDER = 'rgba(239, 68, 68, 0.14)';
const ERROR_GLOW = 'rgba(239, 68, 68, 0.15)';
const WARNING_BG_SUBTLE = 'rgba(245, 158, 11, 0.08)';
const WARNING_BORDER = 'rgba(245, 158, 11, 0.14)';
const WARNING_GLOW = 'rgba(245, 158, 11, 0.15)';
const ICON_SIZE_MD = 20;
const BRAND_SECONDARY_GLOW_SOFT = 'rgba(247, 148, 30, 0.12)';
const GAP_COMPACT = 0.75;
const GAP_DEFAULT = 1;

interface CreateTokensMockOptions {
  /** Tokens extras a mesclar no mock (ex: tokens específicos do consumidor). */
  extras?: Record<string, unknown>;
}

export function createTokensMock(options: CreateTokensMockOptions = {}) {
  return {
    APP_BORDER,
    GLASS_BG,
    SUCCESS_BG_SUBTLE,
    SUCCESS_BORDER,
    SUCCESS_GLOW,
    ERROR_BG_SUBTLE,
    ERROR_BORDER,
    ERROR_GLOW,
    WARNING_BG_SUBTLE,
    WARNING_BORDER,
    WARNING_GLOW,
    ICON_SIZE_MD,
    BRAND_SECONDARY_GLOW_SOFT,
    GAP_COMPACT,
    GAP_DEFAULT,
    ...(options.extras ?? {}),
  };
}

// Default export para uso mais simples
export const defaultTokensMock = createTokensMock();
