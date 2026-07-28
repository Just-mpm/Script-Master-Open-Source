# Auditoria de Estado Final — Drawers Mobile (pós keepMounted)

**Data:** 2026-07-27
**Arquivos auditados:**
- `src/components/app/MobileBottomNav.tsx` (566 linhas)
- `src/components/app/GuestMobileNav.tsx` (200 linhas)
- `src/components/public/PublicHeader.tsx` (413 linhas)

**Contexto:** Remoção de `ModalProps={{ keepMounted: true }}` dos 3 `<Drawer variant="temporary">` para corrigir 333px de scroll extra no `<body>` em produção. Validação: LINT_OK, TYPECHECK_OK, 48/48 testes.

---

## 1. Confirmação da Correção

**`keepMounted` eliminado do códigobase.** Zero instâncias encontradas via `supergrep_find` em toda a base. Os 3 Drawers agora usam o comportamento padrão do MUI v9: `variant="temporary"` sem `keepMounted` → Modal desmonta o Paper ao fechar → sem resíduo no DOM → sem scroll extra.

**Confirmação via Notebook MUI:** Documentação confirma que `keepMounted` padrão é `false` para Drawer temporary, e que o conteúdo desmonta completamente ao fechar. O comportamento esperado está correto.

---

## 2. Mapa: Sólido vs Frágil

| Aspecto | Estado | Observação |
|---------|--------|------------|
| Drawer abre/fecha | ✅ Sólido | `open`/`onClose` funcionais, backdrop desmonta ao fechar |
| Perda de estado interno | ✅ Sólido | Nenhum Drawer tem estado interno (useState/form) no conteúdo |
| i18n keys | ✅ Sólido | Todas as chaves existem nos 3 locais (pt-BR, en, es) |
| Acessibilidade básica | ⚠️ Frágil | aria-label/aria-current presentes, mas `aria-expanded` ausente em 2/3 drawers |
| Navegação externa fecha drawer | ⚠️ Frágil | Inconsistente entre componentes |
| Exclusão de conta mobile | 🔴 Quebrado | Botão existe mas não funciona em mobile |

---

## 3. Gaps Priorizados

### CRITICAL (0)
Nenhum.

### WARNING (2)

#### WARNING-01: Botão "Excluir conta" no MobileBottomNav não funciona em mobile

| Campo | Valor |
|-------|-------|
| **Severidade** | WARNING |
| **Tipo** | Fluxo incompleto |
| **Confidence** | 100 |
| **Descrição** | O botão "Excluir conta" no drawer do `MobileBottomNav` (linha 487-509) dispara `window.dispatchEvent(new CustomEvent('open-delete-account-dialog'))`, mas o listener está no `Sidebar` (linha 127-135), que **não é renderizado em mobile** (`App.tsx` linha 196: `{showAppLayout && !isMobile && <Sidebar />}`). O evento cai no vazio — o Dialog nunca abre. |
| **Evidência** | `App.tsx:196` condiciona `<Sidebar />` a `!isMobile`. `MobileBottomNav:490-492` dispara evento. `Sidebar:262` contém `<DeleteAccountDialog>`. `DeleteAccountDialog` só é importado no `Sidebar`. |
| **Mitigações verificadas** | Nenhuma. Settings page (`Configuracoes`) não tem DeleteAccountDialog. Nenhum outro componente escuta o evento. |
| **Impacto** | Usuário mobile não consegue excluir a conta pelo app. Solução: usar desktop ou contactar suporte. |
| **Classificação** | **WARNING** — funcionalidade secundária quebrada, não core (BYOK não depende de exclusão). |
| **Pergunta/Decisão** | Adicionar `DeleteAccountDialog` dentro do `MobileBottomNav` ou incluir na Settings page para mobile também. |

#### WARNING-02: Acessibilidade — `aria-expanded` ausente em 2 dos 3 botões de abertura do Drawer

| Campo | Valor |
|-------|-------|
| **Severidade** | WARNING |
| **Tipo** | Acessibilidade |
| **Confidence** | 95 |
| **Descrição** | O `MobileBottomNav` implementa `aria-expanded={drawerOpen}` no botão "Mais" (linha 311), mas o `PublicHeader` (linha 234-246) e o `GuestMobileNav` (linha 86-98) **não** têm `aria-expanded` no `<IconButton>` que abre o Drawer. Leitores de tela não conseguem determinar o estado do menu. |
| **Evidência** | `MobileBottomNav.tsx:311` — `aria-expanded={drawerOpen}` presente. `PublicHeader.tsx:236` — apenas `aria-label`, sem `aria-expanded`. `GuestMobileNav.tsx:89` — apenas `aria-label`, sem `aria-expanded`. |
| **Mitigações verificadas** | O Drawer tem `aria-label`/`aria-labelledby` (role complementar do Modal ajuda leitores). |
| **Impacto** | Usuários de leitores de tela em páginas públicas não recebem feedback de estado do menu. |
| **Classificação** | **WARNING** — acessibilidade, afeta visitantes. |
| **Pergunta/Decisão** | Adicionar `aria-expanded={drawerOpen}` ao IconButton do PublicHeader e GuestMobileNav. |

### SUGGESTION (3)

#### SUGGESTION-01: MobileBottomNav não fecha Drawer em navegação externa

| Campo | Valor |
|-------|-------|
| **Severidade** | SUGGESTION |
| **Tipo** | Comportamento inconsistente |
| **Confidence** | 90 |
| **Descrição** | `PublicHeader` usa `useEffect(() => setDrawerOpen(false), [location.pathname])` (linha 74-76) para fechar o drawer automaticamente em rota change. `MobileBottomNav` **não** tem esse efeito. Se o usuário abre o drawer e clica em uma tab da `BottomNavigation` (ex: /app/video), o drawer permanece aberto. |
| **Evidência** | `PublicHeader.tsx:74-76` tem o efeito. `MobileBottomNav.tsx` não importa `useEffect`. Drawer fecha apenas via `closeDrawer()` nos callbacks ou backdrop. |
| **Mitigação** | Backdrop click fecha o drawer. Botão "Mais" funciona como toggle. |
| **Impacto** | UX levemente degradada: drawer residual até próxima interação. |
| **Ação sugerida** | Adicionar `useEffect(() => setDrawerOpen(false), [location.pathname])` no MobileBottomNav para consistência com PublicHeader. |

#### SUGGESTION-02: GuestMobileNav cria array de navItems sem useMemo

| Campo | Valor |
|-------|-------|
| **Severidade** | SUGGESTION |
| **Tipo** | Performance |
| **Confidence** | 85 |
| **Descrição** | `GuestMobileNav` declara `navItems` no corpo do componente (linha 58-65) sem `useMemo`. `MobileBottomNav` e `PublicHeader` usam `useMemo` com `[t]` como dependência (reduz alocações em re-renders). Na prática, `GuestMobileNav` retorna `null` cedo em 99% dos casos (não-mobile ou logado). |
| **Evidência** | `GuestMobileNav.tsx:58-65` — array literal. `MobileBottomNav.tsx:95-100` — `useMemo`. `PublicHeader.tsx:62-69` — array literal (também sem useMemo). |
| **Impacto** | Micro-otimização. Alocações desnecessárias apenas quando componente renderiza. |
| **Ação sugerida** | Envolver `navItems` em `useMemo(() => [...], [t])` no GuestMobileNav. (PublicHeader também se beneficiaria.) |

#### SUGGESTION-03: Espaço extra no JSX do PublicHeader Drawer

| Campo | Valor |
|-------|-------|
| **Severidade** | SUGGESTION |
| **Tipo** | Cosmético |
| **Confidence** | 90 |
| **Descrição** | `PublicHeader.tsx` linha 296: `open={isMobile && drawerOpen }` tem espaço extra antes do fechamento. Sem impacto funcional. |
| **Evidência** | `open={isMobile && drawerOpen }` — espaço após `drawerOpen`. |
| **Impacto** | Nenhum. Cosmético. |
| **Ação sugerida** | Remover espaço: `open={isMobile && drawerOpen}`. |

---

## 4. Cenários de Borda sem Resposta

### 4.1. Resize desktop → mobile com Drawer aberto
Se o usuário está em desktop (Drawer invisível, `isMobile=false`) e redimensiona para mobile (isMobile → true), o `drawerOpen` permanece `false` inicialmente. Os hooks de `useMediaQuery` causam re-render com o novo valor. Comportamento seguro.

### 4.2. Resize mobile → desktop com Drawer aberto
Se `drawerOpen=true` e usuário redimensiona para desktop, o `MobileBottomNav` retorna `null` (linha 164). O Drawer desmonta junto — sem estado pendurado. Comportamento seguro.

### 4.3. Múltiplos toques rápidos no botão "Mais"
O toggle via `setDrawerOpen((prev) => !prev)` é atômico em relação ao estado anterior. Sem race condition.

### 4.4. Rápida alternância entre BottomNav tabs e abertura do Drawer
Drawer usa `onClose={closeDrawer}` que funciona mesmo se o Drawer não estiver aberto (setter idempotente). Sem erro.

---

## 5. Checklist de Sanidade

| Item | Resultado |
|------|-----------|
| `keepMounted` eliminado em toda a base | ✅ Confirmado (0 matches) |
| 3 Drawers usam `variant="temporary"` | ✅ MobileBottomNav, GuestMobileNav, PublicHeader |
| Nenhum Drawer retém estado interno que precise de keepMounted | ✅ Conteúdo usa props/slots do pai |
| LINT_OK | ✅ |
| TYPECHECK_OK | ✅ |
| 48/48 testes passam | ✅ |
| i18n keys existem nos 3 locais | ✅ Verificado (mobileBottomNav.4, nav.*, exportCrossRoute.2, analyticsConsent.1) |
| imports de dependências externas corretos | ✅ useFeedbackDialog, openAnalyticsConsentDialog, useLocale, useAuth |
| `aria-current="page"` nos 3 drawers | ✅ Consistente |
| z-index Drawer > BottomNavigation (MobileBottomNav) | ✅ 1300 > 1200 |
| Transições CSS consistentes | ✅ Drawer transition presente e customizada nos 3 |
| `safe-area-inset-bottom` na BottomNav | ✅ `pb: 'env(safe-area-inset-bottom, 0px)'` |
| Drawer fecha ao navegar (handleNavigate) | ✅ Via callback explícito |
| Relatórios de acessibilidade | ⚠️ WARNING-02: aria-expanded faltando em 2/3 |
| Exclusão de conta mobile | 🔴 WARNING-01: Quebrado |

---

## Resumo

- **CRITICAL:** 0
- **WARNING:** 2 (exclusão de conta quebrada em mobile, aria-expanded ausente)
- **SUGGESTION:** 3 (fechar drawer em navegação externa, useMemo, espaço extra)

**Nenhum gap está relacionado à remoção de `keepMounted`.** A correção do scroll extra está completa e correta. Os warnings e sugestões são pré-existentes e tangenciam a correção.
