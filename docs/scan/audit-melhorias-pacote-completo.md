# Auditoria Final — Pacote Completo de Melhorias (3 Ondas)

**Data:** 2026-07-28
**Arquivos auditados:** 10 arquivos alterados + 37 mocks de surfaces + i18n
**Contexto:** Correção de scroll extra (333px), a11y, DRY, bug do seletor MuiModal-root, fluxo de exclusão de conta no mobile, eliminação de dead code, correções pré-existentes em testes.

---

## 1. Mapa Rápido: Sólido vs Frágil

### Sólido ✅
- **Sidebar.tsx** — remoção completa do listener `open-delete-account-dialog`, do `useState`/`useEffect` e do `DeleteAccountDialog`. Zero referências ao evento legado. JSDoc atualizado com a nova responsabilidade.
- **MobileBottomNav.tsx** — `DeleteAccountDialog` integrado com estado local, `useCallback` consistente, `zIndex: 1300` substituindo o seletor `& .MuiModal-root` morto.
- **PublicHeader.tsx** / **GuestMobileNav.tsx** — a11y attributes (`aria-expanded`, `aria-controls`, `id`) corretos e consistentes. `appDrawerPaperSx` aplicado corretamente.
- **38 mocks de `surfaces`** — todas usam `appDrawerPaperSx: {}`, idênticas e consistentes.
- **5 testes do Sidebar** — 35 testes no total, todos com assertions úteis e significativas.
- **i18n** — todas as chaves novas (`mobileBottomNav.*`, `studio.header.deleteAccount.*`, `exportCrossRoute.mobileDot*`) existem nos 3 locales.

### Frágil ⚠️
- **`DeleteAccountDialog.tsx` (JSDoc desatualizado)** — o comentário diz que o componente é reutilizado pelo Sidebar via evento, o que não é mais verdade.
- **`Sidebar.features.test.tsx` (describe block desatualizado)** — o comentário do describe diz que o evento abre o dialog, o oposto do que os testes verificam.

---

## 2. Gaps Priorizados

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações Verificadas | Pergunta/Decisão |
|---|---|---|---|---|---|---|---|
| GAP-01 | **BAIXO** | Documentação desatualizada | 95 | `DeleteAccountDialog.tsx` linhas 29-31 diz "Reutilizado pelo `Sidebar` e pelo `MobileBottomNav` (via evento `open-delete-account-dialog`)" — o Sidebar não usa mais este componente e o evento foi removido. | [Linhas 28-32 do arquivo](src/components/app/DeleteAccountDialog.tsx) — contém `open-delete-account-dialog` e referência ao Sidebar. `supergrep_find` mostra 0 matches de `open-delete-account-dialog` no `src/` (exceto comentários). | Sidebar não importa nem usa DeleteAccountDialog (confirmado por grep). O fluxo real funciona corretamente via MobileBottomNav. | Atualizar JSDoc para refletir o novo ownership: "Controlado localmente pelo MobileBottomNav. A Sidebar desktop não participa do fluxo de exclusão." |
| GAP-02 | **BAIXO** | Documentação desatualizada | 95 | `Sidebar.features.test.tsx` linha 16-17: "Evento `open-delete-account-dialog` abre o `DeleteAccountDialog`" — descreve o comportamento ANTIGO. Os testes atuais verificam exatamente o oposto (que o evento NÃO abre o dialog). | [Linhas 9-17 do arquivo](tests/components/Sidebar.features.test.tsx) — JSDoc do describe com descrição invertida vs os testes reais (linhas 237-275). | Nenhum — a documentação está factualmente incorreta. Futuros mantenedores podem se confundir. | Atualizar o JSDoc para: "A Sidebar **não** responde mais ao evento legado — o dialog vive no `MobileBottomNav`." |

**Nenhum GAP CRÍTICO ou ALTO encontrado.** O pacote está sólido e as duas documentações desatualizadas são de baixa severidade.

---

## 3. Cenários de Borda Sem Resposta

### 3.1 Redimensionamento de janela com drawer aberto (PublicHeader)
O Drawer do PublicHeader usa `open={isMobile && drawerOpen}`. Se o usuário abre o drawer no mobile e redimensiona para desktop (`isMobile` → `false`), o drawer fecha abruptamente. **Comportamento aceitável** — mesmo padrão usado em GuestMobileNav (que retorna `null` se `!isMobile`). Não é um bug, apenas um edge case sem tratamento especial.

### 3.2 `useMediaQuery` mockado permanentemente como `true`
O teste do MobileBottomNav mocka `useMediaQuery` para sempre retornar `true` (mobile). Isso significa que o branch `if (!isMobile || !user) return null` nunca é testado no caminho falso (desktop). A cobertura não é completa, mas o mock é explícito e documentado no comentário (linhas 38-42 do teste). Baixo risco.

### 3.3 Concorrência entre `closeDrawer` e `setDeleteDialogOpen`
O `handleOpenDeleteAccountDialog` chama `closeDrawer()` (que faz `setDrawerOpen(false)`) e depois `setDeleteDialogOpen(true)`. React 19 batching garante que ambos os setStates sejam processados no mesmo ciclo de render — não há race condition. Confirmado pela ausência de `act()` warnings nos testes.

---

## 4. Checklist de Sanidade

| Item | Status |
|---|---|
| Sidebar não tem mais listener de evento nem DeleteAccountDialog | ✅ Confirmado — 0 referências |
| `open-delete-account-dialog` não existe mais em runtime | ✅ 0 matches em `src/` (fora de comentários) |
| 3 Drawers sem `keepMounted` | ✅ Confirmado — 0 matches em `src/` |
| 3 Drawers com `aria-controls` + `id` | ✅ MobileBottomNav, GuestMobileNav, PublicHeader |
| MobileBottomNav com `zIndex: 1300` (vs `& .MuiModal-root`) | ✅ Aplicado diretamente no `sx` do Drawer |
| MobileBottomNav com `DeleteAccountDialog` controlado localmente | ✅ Importado, estado `deleteDialogOpen`, handlers com `useCallback` |
| 5 testes do Sidebar (35 assertions) úteis | ✅ Todos com verificações reais de DOM/estado |
| AnalyticsConsentPrompt com `MemoryRouter` | ✅ Wrapper com MemoryRouter, testes passam |
| Timeout do i18n test aumentado para 15s | ✅ Linha 87: `{ timeout: 15_000 }` |
| 37 mocks de `appDrawerPaperSx` consistentes | ✅ Todos `appDrawerPaperSx: {}` |
| i18n keys usadas existem nos 3 dicionários | ✅ Verificadas: `mobileBottomNav.*`, `studio.header.deleteAccount.*`, `studio.header.logout.drawerLabel`, `exportCrossRoute.mobileDot*` |
| `handleLogout` wrapper removido do MobileBottomNav | ✅ handlers separados `handleOpenLogoutDialog`, `handleCloseLogoutDialog`, `handleConfirmLogout` |
| `surfaces.ts` exporta `appDrawerPaperSx` | ✅ Constante tipada `SxProps<Theme>` |

---

## 5. Resumo Final

**0 CRÍTICOS | 0 ALTOS | 0 MÉDIOS | 2 BAIXOS** (documentação desatualizada)

O pacote está **coeso e sem regressões**. As duas lacunas são exclusivamente documentação desatualizada que não afeta runtime, testes ou usuários. Recomendo aprovação com correção opcional dos JSDocs em GAP-01 e GAP-02.
