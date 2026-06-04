/**
 * Tipos e referência para mock de tokens em testes.
 *
 * Estratégia recomendada (padrão canônico do Vitest): usar `vi.mock` com
 * factory async que recebe `importOriginal` e mescla com os tokens customizados.
 * O vitest injeta o `importOriginal` automaticamente — não precisa importar
 * helper algum.
 *
 * Exemplo:
 * ```typescript
 * vi.mock('../../src/theme/tokens', async (importOriginal) => {
 *   const actual = await importOriginal<typeof import('../../src/theme/tokens')>();
 *   return { ...actual, BRAND_GRADIENT: 'override' };
 * });
 * ```
 *
 * Por que não usar um helper como `createTokensMock`? Porque o `vi.mock` é
 * hoisted antes dos imports do arquivo, então qualquer função importada
 * externamente fica indisponível no momento da avaliação do `vi.mock`.
 * A factory inline async com `importOriginal` resolve isso sem ginástica.
 *
 * Este arquivo existe apenas para documentar o padrão e fornecer tipos.
 */

export type TokensModule = Record<string, unknown>;
