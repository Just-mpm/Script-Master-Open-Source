/**
 * Mock compartilhado do módulo `src/theme/surfaces` para testes.
 *
 * Por que este arquivo existe: 38 testes mockavam `surfaces` com stubs
 * idênticos (`() => ({})` para funções, `{}` para objetos) usando o mesmo
 * padrão repetido. Centralizar aqui significa:
 *   - 1 ponto único para adicionar/remover/ajustar exports de `surfaces.ts`
 *   - testes não precisam conhecer a forma exata do mock
 *   - comportamento idêntico ao mock inline anterior (stubs vazios)
 *
 * Por que não uma função factory (`createSurfacesMock()`):
 *   O `vi.mock` é hoisted pelo Vitest antes dos `import` estáticos serem
 *   avaliados. Isso torna QUALQUER função importada estaticamente
 *   `undefined` no momento da execução do factory. O Vitest 4 permite
 *   contornar isso com **import dinâmico dentro do factory**, conforme
 *   documentado pelo notebook oficial e padronizado em `tokensMock.ts`.
 *
 * Como usar em um teste:
 * ```typescript
 * vi.mock('../../src/theme/surfaces', async () => {
 *   const { surfacesMock } = await import('../../__mocks__/surfacesMock');
 *   return surfacesMock;
 * });
 * ```
 *
 * Se `surfaces.ts` ganhar um novo export, adicione o stub aqui e ele será
 * propagado para todos os 38 testes automaticamente.
 */
export const surfacesMock = {
  glassPanelSx: (): Record<string, unknown> => ({}),
  insetPanelSx: (): Record<string, unknown> => ({}),
  glassSurfaceSx: (): Record<string, unknown> => ({}),
  appDrawerPaperSx: {} as Record<string, unknown>,
  appDrawerBackdropSx: {} as Record<string, unknown>,
  searchFieldSx: {} as Record<string, unknown>,
};
