# Plano Final: Sidebar de Navegação Colapsável

> Substituição do `Header` (AppBar sticky) por uma `Sidebar` lateral esquerda colapsável em todas as rotas autenticadas (`/app/*`).

---

## Contexto

O Script Master é uma SPA React 19 + Vite 8 + MUI v9 que transforma roteiros em áudio com IA. Atualmente, as rotas autenticadas (`/app/*`) usam um `Header` (AppBar sticky de 60px) no topo, com navegação horizontal, avatar, indicador de créditos, seletor de locale, cookie consent e logout. O `MobileBottomNav` (56px) cobre a navegação em mobile.

**Objetivo:** Substituir o `Header` por uma `Sidebar` lateral esquerda colapsável, liberando o topo da página e usando o espaço lateral (hoje subutilizado) para a navegação principal.

**Resultado esperado:** Conteúdo das páginas internas começa mais ao topo (sem header) e a sidebar fica fixa na esquerda com 7 itens de navegação, com toggle para colapsar/expandir.

---

## Escopo

### O que entra
- Criar componente `Sidebar` colapsável (68px collapsed / 264px expanded)
- Substituir `Header` por `Sidebar` em todas as rotas `/app/*` (desktop)
- Mover lógica de navegação, avatar, créditos, locale, cookies, logout, delete account para a sidebar
- Preservar `MobileBottomNav` (mobile, abaixo de `md`)
- Extrair lógica do drawer mobile de visitantes para componente `GuestMobileNav`
- Persistir estado collapsed/expanded em `localStorage`
- Adicionar tokens de largura e transição
- Criar store Zustand `useSidebarStore`
- Atualizar testes (remover testes do Header, criar testes da Sidebar)

### O que NÃO entra
- Alterar `PublicHeader.tsx` (header de páginas públicas)
- Alterar `MobileBottomNav.tsx` (já funciona bem em mobile)
- Unificar drawers mobile (Header drawer + BottomNav drawer) — fora de escopo
- Sync cross-device do estado collapsed (apenas localStorage)
- Substituir componente `Logo` ou mudar identidade visual
- Adicionar submenus ou nesting
- Migrar para `Drawer variant="mini"` do MUI (vamos usar `permanent` customizado)
- Animações spring/bounce/slide
- Novo tema visual ou rebranding

---

## Decisões (MDE)

### Decisões Tomadas

| Decisão | Problema | Opções | Escolha | Justificativa | Fonte |
|---------|----------|--------|---------|---------------|-------|
| Largura collapsed | 64 vs 68 | 64 (architecture) / 68 (UI) | **68px** | UI: 44px IconButton + 12px padding × 2 + folga para active indicator. Acabamento superior. | `sidebar-navigation-ui.md §1`, `sidebar-navigation-gaps.md C1` |
| Largura expanded | 260 vs 264 | 260 (architecture) / 264 (UI) | **264px** | UI: 16px a menos que drawer mobile (280px) cria diferenciação visual entre drawer temporário e sidebar permanente. | `sidebar-navigation-gaps.md C2` |
| Duração transição | 300 vs 250 | 300 (architecture) / 250 (UI) | **250ms** | Material Design 3, mais responsivo para navegação. | `sidebar-navigation-gaps.md C3` |
| Chave persistência | `s2a_sidebar_collapsed` vs `s2a_sidebar_expanded` | Duas convenções | **`s2a_sidebar_collapsed`** | Combina com semântica "recolhido por padrão" em mobile/tablet, prefixo `s2a_` consistente. | `sidebar-navigation-gaps.md C4` |
| Componente Sidebar | Refatorar Header vs criar novo | Refatorar / Novo | **Novo** | Header muito específico para AppBar horizontal, reescrever fica mais limpo. | `sidebar-navigation-architecture.md §16` |
| Layout strategy | Drawer permanent + flex vs Box manual | Drawer / Box | **Drawer `variant="permanent"`** | Padrão MUI para sidebar fixa, sem overlay, com transições nativas. | `sidebar-navigation-architecture.md §5.1` |
| State management | Zustand store vs useState local | Store / Local | **Zustand + persist** | Independência do estúdio, persistência localStorage sem overhead. | `sidebar-navigation-architecture.md §6.1` |
| Mobile | Sidebar visível vs oculta | Visível / Oculta | **Oculta + BottomNav** | Decisão do usuário — BottomNav já funciona. | `sidebar-navigation-architecture.md §2` |
| NetworkStatusIndicator | Topo sidebar / Rodapé / Sobreposto | Topo / Rodapé / Sobreposto | **Sobreposto (Snackbar-like)** | Não ocupa espaço fixo, visível só quando relevante. | Resposta do usuário |
| Avatar no rodapé | Link / Dropdown / Visual | Link / Dropdown / Visual | **Link para /app/configuracoes** | Simples, sem menu extra. | Resposta do usuário |
| Drawer visitantes | Preservar no Header / Extrair | Preservar / Extrair | **Extrair para `GuestMobileNav`** | Header será removido, visitantes mobile precisam de navegação. | Resposta do usuário |
| Default estado | Collapsed vs Expanded | Collapsed / Expanded | **Collapsed (md/lg), Expanded (xl)** | Maximiza espaço para conteúdo em telas menores. | `sidebar-navigation-ui.md §1` |
| z-index sidebar | 1200 vs 1300 vs 1400 | Três opções | **1200** | Entre conteúdo (auto) e modals (1300). | `sidebar-navigation-architecture.md §10` |
| CreditIndicator collapsed | Chip / Apenas ícone | Chip / Ícone | **Apenas ícone + dot** | Não cabe em 68px sem label. | `sidebar-navigation-gaps.md G5` |
| LocaleSelector collapsed | Bandeira completa / Sigla | Bandeira / Sigla | **Bandeira (emoji)** | Identifica idioma visualmente sem ocupar espaço. | `sidebar-navigation-gaps.md G5` |

### Decisões Pendentes

Nenhuma. Todas as decisões foram tomadas com o usuário ou por recomendação técnica justificada.

---

## Reutilização e Padrões

### O que REUTILIZAR (NÃO criar do zero)
- **`glassSurfaceSx`** de `src/theme/surfaces.ts` — base do glass surface
- **Tokens existentes** em `src/theme/tokens.ts` — cores, gaps, ícones, shadows
- **`useAuth`** hook — user, logout, deleteAccount
- **`useLocale`** hook — locale, t, setLocale, LOCALE_CONFIGS
- **`useOnlineStatus`** hook — já usado pelo NetworkStatusIndicator
- **Componentes** do Header atual: `CreditIndicator`, `LogoutConfirmDialog`, `AnalyticsConsentPrompt` (`openAnalyticsConsentDialog`)
- **Padrão de Drawer** do `MobileBottomNav` (largura 280px, styling glass, dividers)
- **Padrão de ListItemButton** ativo do Header atual (borderRadius, hover, selected)
- **Sistema de animação Motion** (`motion/react` + `AnimatePresence`)
- **Skip-to-content** link já existe em `App.tsx:122-144`

### O que EVITAR criar
- Não criar `BrandLogo` novo — usar `logos.mark.transparent` e `logos.logo` existentes
- Não criar sistema de glass próprio — usar `glassSurfaceSx`
- Não criar tokens novos além dos 3 da sidebar
- Não criar hooks novos — reutilizar `useAuth`, `useLocale`, `useOnlineStatus`
- Não duplicar dialogs — `LogoutConfirmDialog` e dialog de exclusão de conta são reutilizados

### Padrão de referência: `MobileBottomNav`
- Estrutura de grupos com Dividers
- Drawer de "Mais" com lista de ações secundárias
- Glass surface com `APP_SURFACE` + gradiente sutil
- `position: fixed` com z-index 1200

---

## Arquivos e Áreas Prováveis

| Padrão | Área Provável |
|--------|---------------|
| `src/components/app/Sidebar*` | App Shell & Navegação |
| `src/components/app/GuestMobileNav.tsx` | App Shell & Navegação |
| `src/features/sidebar/store.ts` | App Shell & Navegação (novo) |
| `src/theme/tokens.ts` | Design System & Tema (adição) |
| `src/App.tsx` | App Shell & Navegação (refactor) |
| `src/pages/StudioPage.tsx` | Estúdio de Produção (ajuste sticky) |
| `src/components/Header.tsx` | REMOVIDO |

### Paths específicos a alterar

- **`src/App.tsx`** — Refactor layout: flex container, sidebar condicional, ajustar altura do assistente (`flex: 1` em vez de `calc(100dvh - APP_HEADER_HEIGHT...)`)
  - Fonte: `sidebar-navigation-architecture.md §8.1`
- **`src/components/Header.tsx`** — REMOVIDO
  - Fonte: `sidebar-navigation-architecture.md §8.2`
- **`src/theme/tokens.ts`** — Adicionar `SIDEBAR_WIDTH_COLLAPSED=68`, `SIDEBAR_WIDTH_EXPANDED=264`, `SIDEBAR_TRANSITION_DURATION=250`
  - Fonte: `sidebar-navigation-architecture.md §8.3`
- **`src/components/app/Sidebar.tsx`** — NOVO: componente principal da sidebar
- **`src/components/app/SidebarHeader.tsx`** — NOVO: logo + toggle
- **`src/components/app/SidebarNavItem.tsx`** — NOVO: item de navegação com suporte collapsed
- **`src/components/app/SidebarFooter.tsx`** — NOVO: avatar, créditos, locale, cookies, logout
- **`src/components/app/DeleteAccountDialog.tsx`** — NOVO: extraído do Header
- **`src/components/app/GuestMobileNav.tsx`** — NOVO: drawer mobile para visitantes
- **`src/components/app/SidebarNetworkBanner.tsx`** — NOVO: NetworkStatusIndicator sobreposto
- **`src/features/sidebar/store.ts`** — NOVO: Zustand store
- **`src/pages/StudioPage.tsx`** — Ajustar `top: 68 → 8` e `top: { lg: 84 } → 16`
  - Fonte: `sidebar-navigation-architecture.md §8.5`
- **`src/features/i18n/locales/{pt-BR,en,es}.ts`** — Adicionar namespace `sidebar` com 4-6 chaves
  - Fonte: `sidebar-navigation-gaps.md G10`

---

## Estratégia Técnica

### Arquitetura

```
src/
  components/app/
    Sidebar.tsx                  ← Orquestrador (SidebarHeader + nav items + SidebarFooter)
    SidebarHeader.tsx            ← Logo + toggle button
    SidebarNavItem.tsx           ← Item de nav com tooltip em collapsed
    SidebarFooter.tsx            ← Avatar (link) + CreditIndicator + LocaleSelector + Cookies + Logout
    DeleteAccountDialog.tsx      ← Extraído do Header (compartilhado por Sidebar e MobileBottomNav)
    GuestMobileNav.tsx           ← Drawer mobile para visitantes (extraído do Header)
    SidebarNetworkBanner.tsx     ← NetworkStatusIndicator sobreposto (Snackbar-like no topo)
  features/sidebar/
    store.ts                     ← useSidebarStore (Zustand + persist)
  theme/
    tokens.ts                    ← +3 tokens de sidebar
```

### Layout

**Root flex container:**
```tsx
<Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
  {/* Sidebar — desktop only */}
  {showAppLayout && !isMobile && <Sidebar />}

  {/* Main content — flex: 1, scroll interno */}
  <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
    {rotas}
  </Box>

  {/* Overlays — fora do fluxo flex */}
  <ActionBar /> {/* fixed, z-index 1200 */}
  <MobileBottomNav /> {/* fixed, z-index 1200, mobile only */}
  <SidebarNetworkBanner /> {/* fixed top, z-index 1500 */}
</Box>
```

**Sidebar (Drawer permanent):**
```tsx
<Drawer
  variant="permanent"
  open
  sx={{
    width: collapsed ? 68 : 264,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: collapsed ? 68 : 264,
      transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      backgroundColor: APP_SURFACE,
      backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
      borderRight: `1px solid ${APP_BORDER}`,
      backdropFilter: 'blur(22px)',
      overflowX: 'hidden',
    },
  }}
>
  <SidebarHeader />
  <Divider />
  <SidebarNavList /> {/* flex: 1, scroll interno */}
  <Divider />
  <SidebarFooter />
</Drawer>
```

### State Management

**Zustand store:**
```ts
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: true, // Collapsed por padrão
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: 's2a_sidebar_collapsed', partialize: (s) => ({ collapsed: s.collapsed }) },
  ),
);
```

### Transições

- **Width da sidebar:** CSS `transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1)` no `Drawer-paper`
- **Labels (AnimatePresence):** fade-in de 150ms com delay de 60% (começam a aparecer a 150ms = 60% de 250ms)
- **Toggle icon:** rotação opcional de 180° via `motion.div`
- **Reduced motion:** respeitar `useReducedMotion()` do Motion

### z-index Strategy

| Elemento | z-index |
|----------|---------|
| Sidebar | 1200 |
| MobileBottomNav | 1200 |
| ActionBar | 1400 (já definido) |
| Dialogs/Modals | 1300 (padrão MUI) |
| SidebarNetworkBanner | 1500 (Snackbar) |
| Skip-to-content | tooltip+1 (já definido) |

---

## Passos de Implementação

### Fase 1: Preparação (Tokens + Store + i18n)

1. **Adicionar tokens de sidebar em `src/theme/tokens.ts`**
   - `SIDEBAR_WIDTH_COLLAPSED = 68`
   - `SIDEBAR_WIDTH_EXPANDED = 264`
   - `SIDEBAR_TRANSITION_DURATION = 250`
   - Marcar `APP_HEADER_HEIGHT` como `@deprecated`
   - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §8.3` | Sem notebook necessário

2. **Criar `src/features/sidebar/store.ts`**
   - `useSidebarStore` com Zustand + persist (chave `s2a_sidebar_collapsed`)
   - Estado inicial: `collapsed: true`
   - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §6.1` | Sem notebook necessário

3. **Adicionar chaves i18n em `src/features/i18n/locales/{pt-BR,en,es}.ts`**
   - Namespace `sidebar` com 5 chaves: `toggle.expand`, `toggle.collapse`, `ariaLabel`, `user.tooltip`, `ariaDrawer`
   - Agent: `worker` | Evidência: `sidebar-navigation-gaps.md G10` | Sem notebook necessário

### Fase 2: Componentes Extraídos (preparação)

4. **Extrair `DeleteAccountDialog` para `src/components/app/DeleteAccountDialog.tsx`**
   - Mover lógica do Header.tsx:568-611
   - Props: `open`, `onClose`
   - Agent: `worker` | Evidência: `sidebar-navigation-gaps.md G1` | Sem notebook necessário

5. **Criar `src/components/app/SidebarNetworkBanner.tsx`**
   - Wrapper do `NetworkStatusIndicator` com posicionamento fixed top
   - Agent: `worker` | Evidência: resposta do usuário | Sem notebook necessário

6. **Criar `src/components/app/GuestMobileNav.tsx`**
   - Extrair drawer mobile do Header.tsx:387-558
   - Renderiza apenas quando `!user && isMobile` (visitantes)
   - Agent: `worker` | Evidência: `sidebar-navigation-gaps.md G3` | Sem notebook necessário

### Fase 3: Componentes da Sidebar

7. **Criar `src/components/app/SidebarNavItem.tsx`**
   - Props: `item: NavItem`, `collapsed: boolean`, `isActive: boolean`
   - Em collapsed: `IconButton` com `Tooltip`
   - Em expanded: `ListItemButton` com `ListItemIcon` + `ListItemText` + `AnimatePresence` para o label
   - Active state: `ACTION_SELECTED` bg + borda esquerda 3px `BRAND_PRIMARY` + glow
   - Agent: `worker` | Evidência: `sidebar-navigation-ui.md §5` | Notebook: `{2ee9920b-613b-4ace-8208-9f69c202fa71}` (MUI v9)

8. **Criar `src/components/app/SidebarHeader.tsx`**
   - Logo (32x32 ou 36x36) + nome (visível só em expanded)
   - Toggle button com ChevronRight/Left animado
   - Agent: `worker` | Evidência: `sidebar-navigation-ui.md §6` | Notebook: `{697b773a-32b4-43a3-8048-eb85b473176d}` (Motion)

9. **Criar `src/components/app/SidebarFooter.tsx`**
   - Avatar com `onClick` que navega para `/app/configuracoes` (link)
   - CreditIndicator (apenas ícone em collapsed, com label em expanded)
   - LocaleSelector (apenas bandeira em collapsed, com nome em expanded)
   - Cookie consent button
   - Logout button + `LogoutConfirmDialog`
   - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §3.1` | Notebook: `{2ee9920b-613b-4ace-8208-9f69c202fa71}` (MUI v9)

10. **Criar `src/components/app/Sidebar.tsx`** (orquestrador)
    - Drawer permanent com width dinâmico
    - SidebarHeader + Divider + lista de nav items + Divider + SidebarFooter
    - Conectar com `useSidebarStore` para estado collapsed
    - Incluir `<DeleteAccountDialog>` + listener de evento `open-delete-account-dialog`
    - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §5.2` | Notebook: `{2ee9920b-613b-4ace-8208-9f69c202fa71}` (MUI v9 Drawer)

### Fase 4: Integração no Layout

11. **Refatorar `src/App.tsx`**
    - Root: `Box` com `display: flex, height: 100dvh, overflow: hidden`
    - Substituir `{showAppLayout && <Header />}` por `{showAppLayout && !isMobile && <Sidebar />}`
    - Adicionar `<GuestMobileNav>` quando `!isAppRoute && isMobile`
    - Adicionar `<SidebarNetworkBanner />` (sempre visível quando offline)
    - Ajustar `main`: `flex: 1, minWidth: 0, overflow: auto`
    - Ajustar altura do assistente: `flex: 1` em vez de `calc(100dvh - APP_HEADER_HEIGHT...)`
    - Remover imports não usados (`Header`, `APP_HEADER_HEIGHT` se aplicável)
    - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §8.1` | Sem notebook necessário

12. **Ajustar `src/pages/StudioPage.tsx`**
    - Linha ~92: `top: 68` → `top: 8`
    - Linha ~185: `top: { lg: 84 }` → `top: { lg: 16 }`
    - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §8.5` | Sem notebook necessário

### Fase 5: Remoção e Limpeza

13. **Remover `src/components/Header.tsx`**
    - Agent: `worker` | Evidência: `sidebar-navigation-architecture.md §8.2` | Sem notebook necessário

14. **Atualizar `src/components/app/MobileBottomNav.tsx`**
    - Trocar `window.dispatchEvent(new CustomEvent('open-delete-account-dialog'))` por callback direto para `DeleteAccountDialog`
    - Agent: `fixer` | Evidência: `sidebar-navigation-gaps.md G1` | Sem notebook necessário

### Fase 6: Testes

15. **Remover testes do Header**
    - `tests/components/Header.component.test.tsx` (deletar)
    - `tests/components/Header.features.test.tsx` (deletar)
    - Agent: `worker` | Evidência: `sidebar-navigation-gaps.md G14` | Sem notebook necessário

16. **Criar testes da Sidebar**
    - `tests/components/Sidebar.component.test.tsx` — render, collapsed toggle
    - `tests/components/Sidebar.features.test.tsx` — navegação, active state, delete dialog
    - `tests/features/sidebar/store.test.ts` — useSidebarStore
    - Agent: `test` | Evidência: `sidebar-navigation-architecture.md §6` | Notebook: `{6f3a1b12-a3df-4f31-9ea1-083ba644399a}` (Vitest)

### Fase 7: Validação

17. **Verificar `tests/app/app-shell.test.tsx`**
    - Pode precisar de atualização (selector de Header → Sidebar)
    - Agent: `test` | Evidência: `sidebar-navigation-architecture.md §15` | Sem notebook necessário

18. **Verificar `tests/app/routes-configuracoes.unit.test.tsx`**
    - Pode importar Header
    - Agent: `test` | Sem notebook necessário

19. **Lint + typecheck**
    - `bun run lint` — 0 erros, 0 warnings
    - `bun run typecheck` — 0 erros
    - Agent: `worker` | Evidência: gate de qualidade | Sem notebook necessário

20. **Teste manual de QA no navegador**
    - Navegação por todas as rotas /app/*
    - Toggle collapsed/expanded
    - Mobile (resize ou DevTools)
    - Persistência de estado após refresh
    - Delete account flow (sidebar + mobile)
    - Logout flow
    - Locale selector
    - Agent: `browser-qa` | Sem notebook necessário

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação | Fonte |
|-------|---------|-----------|-------|
| Drawer mobile para visitantes fica órfão | Visitantes mobile sem navegação | Extrair para `GuestMobileNav` (Fase 2, passo 6) | `sidebar-navigation-gaps.md G3` |
| DeleteAccountDialog perde listener | Usuários não conseguem excluir conta | Mover Dialog + listener para Sidebar (Fase 2, passo 4 + Fase 3, passo 10) | `sidebar-navigation-gaps.md G1` |
| Testes existentes quebram | CI falha | Remover testes do Header, criar testes da Sidebar (Fase 6) | `sidebar-navigation-gaps.md G14` |
| CreditIndicator/LocaleSelector não cabem em 68px | UI poluída em collapsed | Versão collapsed só com ícone (Fase 3, passo 9) | `sidebar-navigation-gaps.md G5` |
| ActionBar atrás da sidebar | Visual estranho | ActionBar z-index 1400, sidebar 1200 — sidebar fica atrás, ActionBar flutua acima | `sidebar-navigation-gaps.md G7` |
| `PublicHeader.tsx` usa `MuiAppBar` override | Manter compatibilidade | Manter overrides globais no `appTheme.ts`, não remover | `sidebar-navigation-architecture.md §8.4` |
| `height: 100dvh` no root causa scroll duplo | UX ruim | `overflow: hidden` no root, `overflow: auto` no content | `sidebar-navigation-architecture.md §15` |
| Skip-to-content pulando sidebar | Acessibilidade quebrada | Verificar que `#main-content` está no flex item principal, skip link pula direto | `sidebar-navigation-architecture.md §12.3` |
| `useKeyboardShortcuts` conflito com sidebar | Atalhos quebram | Verificar que atalhos globais (Ctrl+Enter, Space) não são capturados por itens da sidebar | `sidebar-navigation-gaps.md G8` |
| Persistência localStorage não carrega | Estado perdido | Zustand `persist` middleware hidrata automaticamente no mount | `sidebar-navigation-architecture.md §6.1` |

---

## Verificação

### Validação Funcional
- [ ] Sidebar visível em todas as rotas /app/* (desktop)
- [ ] Sidebar oculta em mobile (< md), BottomNav visível
- [ ] Toggle collapsed/expanded funciona
- [ ] Estado persistido após refresh
- [ ] Navegação funciona em collapsed e expanded
- [ ] Active state visualmente claro
- [ ] Avatar clica → /app/configuracoes
- [ ] Logout funciona (dialog de confirmação)
- [ ] Delete account funciona (dialog com "EXCLUIR")
- [ ] Locale selector funciona
- [ ] CreditIndicator funciona
- [ ] Cookie consent funciona
- [ ] NetworkStatusIndicator aparece quando offline (sobreposto, não na sidebar)
- [ ] Visitantes mobile têm navegação (GuestMobileNav)
- [ ] Assistente mantém layout fullscreen (flex: 1)

### Validação Técnica
- [ ] `bun run lint` — 0 erros, 0 warnings
- [ ] `bun run typecheck` — 0 erros
- [ ] `bun run test` — todos passam
- [ ] `bun run build` — sucesso
- [ ] COEP (SharedArrayBuffer) funcionando
- [ ] PWA (service worker) funcionando
- [ ] Sem warnings de "deprecated" para APP_HEADER_HEIGHT (ou aceitável)
- [ ] Sem imports quebrados
- [ ] Transições suaves (60fps)

### Regressão Principal
- [ ] Todas as rotas /app/* renderizam corretamente
- [ ] ActionBar aparece em /app/estudio e /app/video
- [ ] MobileBottomNav aparece em todas as rotas /app/* (mobile)
- [ ] Rotas públicas (landing, pricing, etc.) não foram afetadas
- [ ] PublicHeader nas páginas públicas não foi alterado
- [ ] Autenticação (login, logout, signup, delete) funciona
- [ ] i18n (pt-BR, en, es) funciona em todos os textos novos
- [ ] PWA install/update prompt funciona
- [ ] Atalhos de teclado (Ctrl+Enter, Space) funcionam

---

## Instruções de Execução

### Investigação
Antes de modificar, use `suggest_reads`, `impact_analysis` e `file_context` nos arquivos listados. Consulte os Notebooks Relevantes para confirmar padrões.

### Divisão do Trabalho
- **Budget por agent:** ~50K tokens (use `calculator_token_count` para medir)
- **Agrupar por afinidade:** nunca dois agents modificando o mesmo arquivo no mesmo lote
- **Ordem dos passos:** respeitar dependências (Fase 1 → 2 → 3 → 4 → 5 → 6 → 7)

### Execução Paralela Sugerida

**Lote 1 (paralelo, 2 agents):**
- Agent A (worker): passos 1, 2, 3 (tokens + store + i18n)
- Agent B (worker): passos 4, 5, 6 (DeleteAccountDialog, NetworkBanner, GuestMobileNav)

**Lote 2 (paralelo, 2 agents):**
- Agent C (worker): passos 7, 8 (SidebarNavItem, SidebarHeader)
- Agent D (worker): passo 9 (SidebarFooter)

**Lote 3 (sequencial):**
- Agent E (worker): passo 10 (Sidebar orquestrador) — depende dos lotes 1 e 2

**Lote 4 (paralelo, 2 agents):**
- Agent F (worker): passo 11 (App.tsx refactor)
- Agent G (worker): passo 12 (StudioPage)

**Lote 5 (paralelo, 2 agents):**
- Agent H (fixer): passos 13, 14 (remoção Header, ajuste MobileBottomNav)
- Agent I (test): passos 15, 16, 17, 18 (testes)

**Lote 6 (sequencial):**
- Agent J (worker): passo 19 (lint + typecheck)
- Agent K (browser-qa): passo 20 (QA manual)

### Regras
- Passos sem dependência → paralelo (max 2 agents por tool calls)
- Passos dependentes → sequencial
- Após cada lote: lint + type-check (0 erros, 0 warnings)
- Proibido `@ts-ignore`, `@ts-expect-error` ou `eslint-disable` — corrija a causa raiz

---

## Notebooks Relevantes

| Notebook | ID | Quando consultar |
|----------|----|------------------|
| MUI v9 Docs | `2ee9920b-613b-4ace-8208-9f69c202fa71` | Drawer, ListItemButton, IconButton, Tooltip, AppBar, Divider |
| Motion Guide | `697b773a-32b4-43a3-8048-eb85b473176d` | AnimatePresence, transições de collapse/expand |
| Zustand Docs | `19a52191-6795-484b-b527-7fbccba00ef2` | useSidebarStore com persist middleware |
| React Docs | `8765c786-5be2-4b46-a20c-4ef666804801` | Hooks (useState, useEffect, useMemo), refs |
| Vitest Guide | `6f3a1b12-a3df-4f31-9ea1-083ba644399a` | Testes da Sidebar e do store |
| React Router | `b31107d2-53ed-4d5a-a3b8-2aa99e1be88d` | Link, useLocation, useNavigate |

---

## Cross-Validation Resumida

### Validações Realizadas
1. **Architecture revisa Requirements:** Não usamos `requirement` agent (escopo visual). Architecture cobriu todas as restrições e funcionalidades do Header atual.
2. **UI revisa Architecture:** UI agent identificou larguras 68/264 com melhor rationale, transição 250ms. Gap-finder reconciliou.
3. **Gap-finder revisa Architecture + UI:** Identificou 14 gaps (3 críticos, 7 médios, 4 baixos). Todos os críticos foram resolvidos com decisões do usuário.

### Gaps Resolvidos com Usuário
- **G2 (NetworkStatusIndicator):** Usuário não lembrava do componente — mostrado onde fica, decidiu por "sobreposto" (Snackbar-like)
- **G6 (Avatar):** Decidido como "link simples para /app/configuracoes"
- **G3 (Drawer visitantes):** Decidido extrair para `GuestMobileNav`

### Contradições Harmonizadas
- **Larguras:** 68/264 (UI prevalece)
- **Transição:** 250ms (UI prevalece)
- **Chave persistência:** `s2a_sidebar_collapsed` (architecture prevalece)

---

## Modo de Execução

- **Modo:** `padrão` (não usamos `--fast` ou `--full`)
- **Estimativa total:** 20 passos de implementação, ~50K tokens por agent
- **Arquivo do plano:** `docs/plan/sidebar-navigation-plano-final.md`
- **Documentos intermediários:**
  - `docs/plan/sidebar-navigation-base.md`
  - `docs/plan/sidebar-navigation-architecture.md`
  - `docs/plan/sidebar-navigation-ui.md`
  - `docs/plan/sidebar-navigation-gaps.md`
  - `docs/plan/sidebar-navigation-plano-final.md` (este)

---

## Próximo Passo

O plano está pronto. Para executá-lo, envie em outro chat:

```
Execute o plano em docs/plan/sidebar-navigation-plano-final.md
```
