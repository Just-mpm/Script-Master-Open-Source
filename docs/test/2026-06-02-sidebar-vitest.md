# Relatório de Testes — Sidebar de Navegação (passos 15-18)
**Data:** 2026-06-02
**Agent:** test
**Escopo:** Migração de `Header` para `Sidebar` — remoção dos testes do Header e criação dos testes da Sidebar e do store Zustand.

## Resumo

| Métrica | Valor |
|---|---|
| Testes criados | 49 (12 store + 19 component + 18 features) |
| Testes executados (focado) | 55 (49 novos + 6 pré-existentes sem ajuste) |
| Passou | 55 |
| Falhou | 0 |
| Falsos positivos corrigidos | 2 (ajustes durante criação) |
| Testes removidos | 2 arquivos (`Header.component.test.tsx`, `Header.features.test.tsx`) |
| Taxa de confiabilidade | 100% (suite focada) |

## Arquivos Removidos (passo 15)

| Arquivo | Motivo |
|---|---|
| `tests/components/Header.component.test.tsx` | Header foi removido (passo 13 do plano). Lógica migrou para `Sidebar`. |
| `tests/components/Header.features.test.tsx` | Mesmo motivo. |

## Testes Criados (passo 16)

| Arquivo | Tipo | # Testes | Status |
|---|---|---|---|
| `tests/features/sidebar/store.test.ts` | unit | 12 | passou |
| `tests/components/Sidebar.component.test.tsx` | component | 19 | passou |
| `tests/components/Sidebar.features.test.tsx` | component (features) | 18 | passou |

### `tests/features/sidebar/store.test.ts` — 12 testes
- **estado inicial (2)**: `collapsed: true` por padrão; expõe actions `toggle` e `setCollapsed`
- **toggle (3)**: true→false; false→true; alternar 2x retorna ao original
- **setCollapsed (3)**: false; true; toggle após setCollapsed(false)
- **persistência (4)**: grava em `s2a_sidebar_collapsed`; serializa `{state, version}`; toggle também persiste; `partialize` filtra apenas `collapsed`

### `tests/components/Sidebar.component.test.tsx` — 19 testes
- **largura do Drawer (2)**: 68px collapsed; 264px expanded
- **botão de toggle (5)**: aria-label "Expandir menu" / "Recolher"; clique alterna; clique duplo restaura; `aria-expanded`
- **itens de navegação (5)**: 7 itens em expandido; labels visíveis; aria-labels em colapsado; `aria-current="page"` na rota correta; muda com a rota
- **acessibilidade (2)**: aria-label "Menu principal" no Drawer; nav interna com mesmo aria-label
- **user null (3)**: sem avatar; sem logout; 7 itens continuam
- **delete account dialog (2)**: sem dialog inicialmente; abre via `open-delete-account-dialog`

### `tests/components/Sidebar.features.test.tsx` — 18 testes
- **links de navegação (7)**: cada item tem `href` correto para `/app/estudio|imagens|video|pintura-rapida|assistente|biblioteca|configuracoes`
- **active state (4)**: rota `/app/estudio` marca Estúdio; `/app/assistente` marca IA; `/app/biblioteca` marca Biblioteca; rota desconhecida sem active
- **persistência do toggle (3)**: clique persiste `collapsed: false`; duplo clique restaura; aria-label atualiza
- **DeleteAccountDialog via evento (3)**: abre com evento; botão desabilitado sem `EXCLUIR`; listener removido no unmount
- **avatar clica (1)**: navega para `/app/configuracoes`

## Arquivos Verificados (passos 17 e 18)

| Arquivo | Ajuste | Resultado |
|---|---|---|
| `tests/app/app-shell.test.tsx` | nenhum | passou (5/5) |
| `tests/app/routes-configuracoes.unit.test.tsx` | nenhum | passou (1/1) |

Ambos os arquivos são **smoke tests** que renderizam `<App />` e não fazem assertions sobre o Header. Não há imports nem referências ao `Header` em `tests/app/*` (`grep -r Header tests/app/` retorna vazio).

## Bugs Pré-Existentes (não relacionados)

### PRE-001: `FeedbackController.component.test.tsx` — 7 falhas isoladas
- **Arquivo:** `tests/components/feedback/FeedbackController.component.test.tsx`
- **Descrição:** O arquivo usa `vi.mock(import('firebase/functions'), ...)` (sintaxe `import()` dinâmica) que não é suportada pelo hoisting do `vi.mock`. O módulo falha em importar `src/lib/firebase.ts` por causa da chamada `vi.mock(import("firebase/functions"))`, quebrando o parse do `setup`.
- **Evidência:** Rodar `bun run test tests/components/feedback/FeedbackController.component.test.tsx` retorna `Failed to resolve import "vi.mock(import("firebase/functions"))"` apontando para `src/lib/firebase.ts:50:26`.
- **Status:** Bug pré-existente (arquivo não está em nenhum commit, é untracked). Não foi introduzido pelas mudanças deste plano.
- **Ação:** Reportar separadamente; fora do escopo dos passos 15-18.

## Falsos Positivos Corrigidos Durante Criação

### FP-001: `ReactNode` importado mas não usado
- **Testes:** `tests/components/Sidebar.component.test.tsx`, `tests/components/Sidebar.features.test.tsx`
- **Problema:** Lint `@typescript-eslint/no-unused-vars` reportou import não utilizado.
- **Correção:** Removido `import type { ReactNode } from 'react';` dos dois arquivos (não era necessário — `I18nProvider` e outros componentes não requerem tipagem explícita de `ReactNode` nos testes).

### FP-002: `aria-label` do Drawer aplicado em MuiDrawer-root, não no `.MuiDrawer-paper`
- **Teste:** `tests/components/Sidebar.component.test.tsx` — "Drawer tem aria-label..."
- **Problema:** A primeira versão testava `expect(paper).toHaveAttribute('aria-label', ...)` no `.MuiDrawer-paper`, mas o MUI aplica `aria-label` no `MuiDrawer-root`. `getByLabelText('Menu principal')` retornava múltiplos matches (Drawer + nav interna).
- **Correção:** Trocado para `document.querySelector('.MuiDrawer-root')` + `toHaveAttribute('aria-label', 'Menu principal')` — mais preciso e estável.

## Validação Técnica

| Etapa | Comando | Resultado |
|---|---|---|
| Vitest focado | `bun run test tests/components/Sidebar.*.test.tsx tests/features/sidebar/store.test.ts tests/app/app-shell.test.tsx tests/app/routes-configuracoes.unit.test.tsx` | **55/55 passaram** |
| ESLint completo | `bun run lint` | **0 erros, 0 warnings** |
| Typecheck | `bun run typecheck` | **0 erros** |

## Conclusão

Todos os passos 15-18 do plano `docs/plan/sidebar-navigation-plano-final.md` foram executados com sucesso:

- **Passo 15** — 2 testes do Header removidos (arquivos deletados do filesystem).
- **Passo 16** — 49 testes permanentes criados cobrindo store Zustand (12), render do componente (19) e features/fluxos (18).
- **Passo 17** — `tests/app/app-shell.test.tsx` verificado, sem necessidade de ajuste (5/5 passando).
- **Passo 18** — `tests/app/routes-configuracoes.unit.test.tsx` verificado, sem necessidade de ajuste (1/1 passando).

A suite focada passa 100% e o lint/typecheck do projeto inteiro está limpo.
