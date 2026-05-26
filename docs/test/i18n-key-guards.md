# Testes

## Escopo

Guardas de i18n para detectar chaves faltantes antes de abrir as páginas no navegador.

## Áreas testadas

| Área | Arquivos | Agent | Notebook | Resultado |
|------|----------|-------|----------|-----------|
| i18n | 2 testes novos + locales | test | Vitest Guide | sem findings após correções |

## Cobertura criada/ajustada

- `tests/i18n/i18n-locale-parity.unit.test.ts`: compara todas as chaves folha entre `pt-BR`, `en` e `es`.
- `tests/i18n/i18n-used-keys.unit.test.ts`: varre `src/**/*.ts(x)` via AST TypeScript e valida chamadas literais `t('...')` contra o locale base.
- `package.json`: adiciona `bun run i18n` para rodar apenas os dois guardas.
- Locales: adicionadas chaves faltantes encontradas pelo novo teste.

## Comandos executados

- `bun run i18n`
- `bun run test tests/i18n`
- `bun run typecheck`
- `bun run lint`
- `git diff --check`

## Gaps restantes

Chaves dinâmicas como `t(\`studio.emotion.options.${emotion}\`)` não são inferidas automaticamente pelo guarda de uso. Elas continuam cobertas pela paridade dos locales e por testes específicos quando necessário.

## Próximos passos

Usar `bun run i18n` antes de concluir mudanças que adicionem texto novo na UI.
