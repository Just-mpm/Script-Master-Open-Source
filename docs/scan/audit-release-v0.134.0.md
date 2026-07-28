# Auditoria de Estado Final — Release v0.134.0

**Data:** 2026-07-28
**Agente:** Gap Finder (auditoria pós-entrega)
**Escopo:** 3 itens solicitados (surfacesMock factory, useCallback removidos, bump de versão)
**Validação externa:** lint → 0 | typecheck → 0 | test → 2613/2613 ✅

---

## 1. Contexto assumido

A release v0.134.0 ("Pacote de melhorias de qualidade") foi entregue com 3 itens de escopo explícito:

1. **Factory de mocks de `surfaces`** — extrair mocks idênticos de `src/theme/surfaces` para `tests/__mocks__/surfacesMock.ts` (sugestão do gap-finder)
2. **Remoção de 7 `useCallback` redundantes** do `MobileBottomNav.tsx` (sugestão do code-validator)
3. **Bump de versão** via skill `fast` — `package.json`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`

Itens extras entregues (escopo expandido em iterações anteriores autorizadas):
- `exportDotPulseKeyframes` extraído para `src/theme/animations.ts`
- `appDrawerPaperSx` adicionado a `src/theme/surfaces.ts`
- `vitest.config.ts`: `pool: 'forks'`, `testTimeout: 15000`, `hookTimeout: 20000`, `maxWorkers: '50%'`
- Migração de 3 Drawers para `appDrawerPaperSx`
- Migração para array syntax MUI v9 em `SidebarNavItem`/`MobileBottomNav`

---

## 2. Mapa rápido: sólido vs frágil

| Componente | Estado | Confiança |
|---|---|---|
| `surfacesMock.ts` (factory) | Sólido — 5 stubs, 1 ponto único, JSDoc completo com justificativa técnica | 100 |
| 33 testes migrados para factory | Sólido — padrão `async import` consistente, sem exceções não documentadas | 100 |
| 5 escape hatches documentados | Sólido — todos justificam o mock customizado (valores específicos) | 95 |
| `MobileBottomNav.tsx` (useCallback) | Sólido — 0 `useCallback` no arquivo, comentário explícito da decisão (linhas 122-125) | 100 |
| `vitest.config.ts` | Sólido — parâmetros corretos, comentários explicativos | 100 |
| `package.json` version | Sólido — `0.134.0` | 100 |
| `CHANGELOG.md` | Sólido — entrada detalhada cobrindo todos os itens | 100 |
| `AGENTS.md` version + table | **Frágil** — versão correta, mas tabela de "Últimas mudanças" tem 7 entradas (limite é 5) | 80 |
| `CLAUDE.md` sync | **Frágil** — mesmo problema da tabela em AGENTS.md (7 entradas) | 80 |
| `animations.ts` + `appDrawerPaperSx` | Sólido — exportações corretas, consumidores usando array syntax | 100 |

---

## 3. Gaps priorizados

### GAP-01 | WARNING | Inconsistência de versionamento

| Campo | Valor |
|---|---|
| **Severidade** | WARNING (não bloqueia encerramento) |
| **Tipo** | Inconsistência de versionamento |
| **Confidence** | 95 |
| **Descrição** | A tabela "Últimas mudanças" em `AGENTS.md` e `CLAUDE.md` contém **7 entradas** quando a regra documentada (linha 225 de ambos os arquivos) determina: "manter apenas as 5 versões mais recentes. Ao adicionar uma nova, remover a mais antiga." As entradas `0.130.2` e `0.130.1` deveriam ter sido removidas quando `0.134.0` foi adicionada. |
| **Evidência** | `AGENTS.md` linhas 229-235: entradas `0.134.0`, `0.133.0`, `0.132.0`, `0.131.0`, `0.130.3`, `0.130.2`, `0.130.1` = 7. As 5 mais recentes deveriam ser `0.134.0` a `0.130.3`. `CLAUDE.md` tem o mesmo conteúdo (cópia síncrona de `AGENTS.md`). |
| **Mitigações verificadas** | A versão `0.134.0` está correta em todos os 4 arquivos. A tabela mostra as informações corretas, apenas viola a regra de quantidade. |
| **Decisão/Pergunta** | Manter como está ou remover as 2 entradas mais antigas para cumprir a regra? Se a regra mudou, atualizar o comentário. |

---

## 4. Cenários de borda sem resposta

| Cenário | Estado |
|---|---|
| **Escape hatches quebrando se `surfaces.ts` ganhar novo export** | 5 testes inline não propagam novos exports automaticamente — risco documentado e aceito (todos os 5 usam subsets específicos e quebrariam ruidosamente em vez de silenciosamente) |
| **`searchFieldSx` mockado como `{}` — consumidores podem precisar de função** | `searchFieldSx` no source é `SxProps<Theme>` (objeto), não função — mock `{}` é comportamento correto. ⚠️ Porém, se no futuro `searchFieldSx` for refatorado para função, o mock quebrará silenciosamente (mesmo risco de `appDrawerPaperSx` que compartilha o mesmo padrão de `SxProps` → objeto literal). Risco aceito e documentado no README implícito do mock. |
| **`assistantUi.unit.test.ts` falta `glassPanelSx` e `glassSurfaceSx` no mock** | O teste mocka apenas `insetPanelSx` e `appDrawerPaperSx` — os outros 3 exports não são usados pelo módulo testado (`assistantUi`), então o mock parcial é válido. Se `assistantUi.ts` passar a importar um dos 3, o teste quebra com `undefined is not a function`. Risco baixo (imports estáveis). |

---

## 5. Checklist de sanidade

- [x] **Item 1 — surfacesMock factory:** `tests/__mocks__/surfacesMock.ts` criado com 5 exports (35 linhas, JSDoc completo). 33 testes migrados para `async () => { const { surfacesMock } = await import(...) }`. 5 escape hatches mantidos inline e documentados.
- [x] **Item 2 — useCallback removidos:** `MobileBottomNav.tsx` sem `useCallback` import, 7 handlers convertidos para funções simples, comentário explicativo (linhas 122-125).
- [x] **Item 3 — Bump de versão:** `package.json` → `0.134.0`. `CHANGELOG.md` → entry `## [0.134.0] - 2026-07-28`. `AGENTS.md` → `Current: 0.134.0`, `Last release: 2026-07-28`. `CLAUDE.md` → sincronizado com `AGENTS.md`.
- [x] **Validação externa:** `bun run lint` → exit 0. `bun run typecheck` → exit 0. `bun run test` → 2613/2613 passando (163 test files, 280s).
- [x] **`vitest.config.ts` atualizado:** `pool: 'forks'`, `testTimeout: 15000`, `hookTimeout: 20000`, `maxWorkers: '50%'`.
- [x] **`exportDotPulseKeyframes` extraído:** `src/theme/animations.ts` (30 linhas). Consumido via array syntax MUI v9 em `SidebarNavItem` (linha 172) e `MobileBottomNav` (linha 284).
- [x] **`appDrawerPaperSx` adicionado:** `src/theme/surfaces.ts` (linhas 53-57). Consumido por 3 Drawers: `MobileBottomNav` (extendido com `width: 280`), `GuestMobileNav`, `PublicHeader` (uso direto).

---

## Resumo

| Categoria | Total |
|---|---|
| Gaps CRITICAL | 0 |
| Gaps WARNING | 1 (GAP-01: tabela de versões com 7 entradas em vez de 5) |
| Gaps SUGGESTION | 0 |
| Itens entregues conforme escopo | 3/3 |

**Veredito:** Release v0.134.0 pode ser encerrada. Todos os 3 itens de escopo foram entregues e validados. O único achado (GAP-01) é um WARNING de versionamento que não bloqueia o encerramento — a tabela de "Últimas mudanças" em `AGENTS.md` e `CLAUDE.md` tem 7 entradas quando a regra documentada limita a 5. Decisão de correção fica a critério do usuário.
