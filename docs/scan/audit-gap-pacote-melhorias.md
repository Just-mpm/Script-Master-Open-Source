# Auditoria de Gap — Pacote de Melhorias (4 Itens + Extra)

**Data:** 2026-07-28
**Auditor:** Gap Detetive
**Validações:** `lint` (0) | `typecheck` (0) | `test` 2613/2613

---

## 1. Contexto Assumido

- **N=4** itens solicitados explicitamente no recapitulativo do escopo
- O entregue inclui **trabalho extra** (3 Ondas de refatoração) não listado no escopo
- Arquivos lidos por completo: `animations.ts`, `surfaces.ts`, `vitest.config.ts`, `MobileBottomNav.tsx`, `SidebarNavItem.tsx`, `Sidebar.tsx`, `DeleteAccountDialog.tsx`, `PublicHeader.tsx`
- Notebook React 19 consultado via `nlm_query` para validar a decisão do Item 2

---

## 2. Mapa Rápido: Sólido vs Frágil

### ✅ Sólido
| Item | Status | Evidência |
|------|--------|-----------|
| Item 1 — `animations.ts` | ✅ Completo | `src/theme/animations.ts` com `as const satisfies SxProps<Theme>`. `SidebarNavItem.tsx:19` e `MobileBottomNav.tsx:57` importam e usam `...exportDotPulseKeyframes` |
| Item 2 — `useCallback` → arrow | ✅ Completo | `handleNavigate` (linhas 153-161) agora é arrow function simples. Notebook React 19 confirmou: `useEvent` não existe, `useEffectEvent` só funciona dentro de Effects |
| Item 3 — `vitest.config.ts` | ✅ Completo | `pool: 'forks'` + `testTimeout: 15000` + `hookTimeout: 20000` + `maxWorkers: '50%'`. 2613/2613 passando |
| Item 4 — `PublicHeader` | ✅ Auditado | `grep` confirmou: NENHUM `& .MuiModal-root` existe no `PublicHeader.tsx`. O único seletor MUI é `'& .MuiDrawer-paper'` (linha 295) que é correto para o drawer |

### ⚠️ Frágil / Fora do Escopo
| Aspecto | Observação |
|---------|------------|
| **Scope creep** | 9 arquivos novos + 49 modificados. Apenas 4 arquivos (`animations.ts`, `MobileBottomNav.tsx`, `SidebarNavItem.tsx`, `vitest.config.ts`) eram necessários para os 4 itens |
| **37 mocks idênticos** | `appDrawerPaperSx: {}` em 37 arquivos de teste. Funcional mas frágil: qualquer mudança no mock exige editar 37 arquivos |

---

## 3. Gaps Priorizados

### GAP-01 — WARNING | Scope Creep Significativo
| Campo | Valor |
|-------|-------|
| **Severidade** | WARNING |
| **Tipo** | Escopo extrapolado |
| **Confidence** | 100/100 |
| **Descrição** | O pacote entregou **muito mais** que os 4 itens solicitados: extração de `appDrawerPaperSx` para `surfaces.ts`, refatoração do `DeleteAccountDialog` (de evento global para estado local no `MobileBottomNav`), remoção do listener `open-delete-account-dialog` da `Sidebar`, correções de a11y no `GuestMobileNav`, 2 novos arquivos de teste, e 4 documentos de auditoria. Isso é **5x o escopo original**. |
| **Evidência** | Diff: 49 arquivos modificados + 9 novos (vs. ~4 esperados). Os 4 itens originais tocavam apenas 4-5 arquivos. |
| **Mitigações verificadas** | O trabalho extra é bem executado e documentado. `lint`/`typecheck`/`test` passam. Mas qualquer regressão nos drawers ou mocks afeta 37+ arquivos. |
| **Pergunta/Decisão** | O escopo extra foi autorizado em paralelo ou foi decisão autônoma do executor? Se foi autônoma, viola o princípio de *fazer apenas o que foi pedido*. |

### GAP-02 — SUGGESTION | Manutenibilidade dos Mocks
| Campo | Valor |
|-------|-------|
| **Severidade** | SUGGESTION |
| **Tipo** | Duplicação de código |
| **Confidence** | 95/100 |
| **Descrição** | 37 arquivos de teste contêm `appDrawerPaperSx: {}` literalmente idêntico. Qualquer mudança na estrutura do mock (ex: adicionar um campo) exigirá editar 37 arquivos. Poderia ser um mock factory compartilhado (ex: `tests/__mocks__/surfaces.ts`). |
| **Evidência** | `grep` confirmou 37 ocorrências exatas de `appDrawerPaperSx: {}` em `tests/`. |
| **Mitigações verificadas** | Nenhum dos 37 mocks difere — todos são `{}`. Uma busca `sed` resolveria uma eventual migração. |
| **Pergunta/Decisão** | Extrair para `tests/__mocks__/surfaces.ts` com `vi.mock('../../theme/surfaces', () => ({ appDrawerPaperSx: {} }))`? |

### GAP-03 — SUGGESTION | `useCallback` Remanescentes sem Propósito Claro
| Campo | Valor |
|-------|-------|
| **Severidade** | SUGGESTION |
| **Tipo** | Ruído de código |
| **Confidence** | 85/100 |
| **Descrição** | `MobileBottomNav.tsx` manteve 7 `useCallback` (handleMoreClick, closeDrawer, handleOpenLogoutDialog, handleCloseLogoutDialog, handleConfirmLogout, handleOpenDeleteAccountDialog, handleCloseDeleteAccountDialog). Eles são passados como `onClick`/`onClose` para componentes MUI que **não** são `React.memo`, então o `useCallback` não traz benefício real. Não é um bug — só código ruidoso. |
| **Evidência** | Supergrep confirmou 8 `useCallback` em `MobileBottomNav.tsx` — 1 foi convertido (handleNavigate), 7 permanecem. |
| **Mitigações verificadas** | Nenhum desses handlers causa re-renderização extra (componentes MUI não são memo por padrão). |
| **Pergunta/Decisão** | Aplicar o mesmo padrão do `handleNavigate` nos 7 handlers restantes em onda futura? |

---

## 4. Decisão Técnica — Item 2 (useCallback → arrow)

**Veredito: ✅ CORRETA E DEFENSÁVEL**

Confirmação via Notebook React 19 (`nlm_query`):

| Fato | Fonte |
|------|-------|
| **`useEvent`** não existe no React 19 | Notebook React 19, citação 1 |
| **`useEffectEvent`** existe mas **só pode ser chamado dentro de Effects** (`useEffect`, `useLayoutEffect`, `useInsertionEffect`) | Notebook React 19, citações 4, 8 |
| **`useEffectEvent` NÃO pode ser usado em `onClick`** — o linter gera erro: *"can only be called from Effects"* | Notebook React 19, citação 8 |
| **A alternativa recomendada** para event handlers é "regular function ou `useCallback`" | Notebook React 19, citação 8 |

**Análise de impacto:** O `handleNavigate` original tinha `location.pathname` na dep array do `useCallback`, então **já era recriado a cada navegação**. Remover o `useCallback` não muda o comportamento — a função sempre teve identidade instável. O código fica mais simples, sem overhead mental. ✅

---

## 5. Risco de Regressão

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `exportDotPulseKeyframes` não funcionar | **Muito baixa** | Baixo (cosmético) | Padrão consagrado do Emotion: `@keyframes` dentro de `sx` + spread. Validado por lint/typecheck. |
| `handleNavigate` sem `useCallback` causa re-render | **Zero** | Nulo | Chamado via `() => handleNavigate()` — inline arrow já quebra estabilidade |
| `DeleteAccountDialog` não abre no mobile | **Zero** | Alto | Testes do MobileBottomNav (140 linhas) validam o fluxo. Sidebar não tem mais o listener morto. |
| Mock `appDrawerPaperSx: {}` quebra em build | **Muito baixa** | Alto | 37 mocks idênticos, teste passou 2613/2613 |

**Nenhum risco CRÍTICO ou ALTO.** O pacote é seguro para merge.

---

## 6. Aderência ao Escopo

| Item | Solicitado | Entregue | Gap |
|------|-----------|----------|-----|
| 1 — Extrair `@keyframes exportDotPulse` | ✅ | ✅ | Zero |
| 2 — `useEvent`/`useEffectEvent` no `handleNavigate` | ✅ | ✅ (com nuance: removeu `useCallback` em vez de usar hooks inexistentes/inadequados) | Zero — decisão correta |
| 3 — `pool: 'forks'` no `vitest.config.ts` | ✅ | ✅ | Zero |
| 4 — Corrigir seletor `& .MuiModal-root` no `PublicHeader` | ✅ | ✅ (confirmou que não há o que corrigir) | Zero |

**Extra não solicitado:** Refatoração de drawers (surfaces.ts, DeleteAccountDialog, GuestMobileNav a11y, Sidebar cleanup), 2 novos testes, 4 docs de auditoria, 37 mocks.

---

## 7. Classificação Final

| Tipo | Quantidade |
|------|-----------|
| **CRITICAL** | 0 |
| **WARNING** | 1 (GAP-01: scope creep) |
| **SUGGESTION** | 2 (GAP-02: mocks factory, GAP-03: useCallback remanescentes) |
| **Bloqueia encerramento?** | **Não** — GAP-01 é WARNING mas o trabalho extra é bem executado. Decisão fica com o solicitante. |

---

## 8. Checklist de Sanidade

- [✅] Li os 4 arquivos centrais do gap por completo
- [✅] Usei `supergrep_find` e `grep` para confirmar presença/ausência de símbolos
- [✅] Consultei Notebook React 19 para validar a decisão técnica do Item 2
- [✅] Verifiquei que `lint` (0), `typecheck` (0), `test` (2613/2613) passam
- [✅] Verifiquei que não há listeners órfãos ou eventos mortos no Sidebar
- [✅] Confirmei que `MuiModal-root` não existe no PublicHeader
- [✅] Verifiquei que o import de `useCallback` foi corretamente mantido (ainda usado em 7 handlers)
