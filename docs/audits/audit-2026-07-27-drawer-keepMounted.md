# Auditoria: Remoção de `keepMounted` nos Drawers

**Data:** 2026-07-27  
**Auditor:** code-validator  
**Versão do projeto:** 0.133.0  
**Arquivos auditados:**
- `src/components/app/MobileBottomNav.tsx` (566 linhas)
- `src/components/app/GuestMobileNav.tsx` (200 linhas)
- `src/components/public/PublicHeader.tsx` (413 linhas)

---

## 1. Escopo da Revisão

Foram lidos na íntegra os 3 arquivos listados, com verificação colateral do tema MUI (`src/theme/appTheme.ts`, `src/theme/tokens.ts`) e do hook `useFeedbackDialog` para validação de estabilidade de referências. Consulta ao NotebookLM da MUI v9 para confirmar a estrutura DOM real do Drawer temporário e o comportamento de `keepMounted`.

**Focos cobertos:**
- Existência de estado interno em children dos Drawers que seria perdido sem `keepMounted`
- Race conditions no mount/unmount
- Memory leaks (listeners, subscriptions, timers)
- Acessibilidade (aria, focus management)
- Qualidade de código MUI e i18n
- CSS e tema
- Tipos TypeScript

---

## 2. Veredito

`Ajustes recomendados` — 2 achados de severidade **WARNING** e 2 **SUGGESTION**. Nenhum bloqueador de merge.

A remoção de `keepMounted: true` **não causa perda de estado funcional** em nenhum dos 3 Drawers. Todos os componentes filhos são puramente presentacionais — não há inputs controlados, scroll positions, refs, formulários, players de mídia ou qualquer estado interno React que precise persistir entre aberturas. Todo estado de controle (`drawerOpen`, `logoutDialogOpen`, `localeAnchorEl`) vive no componente pai ou em stores externas (AuthContext, Zustand, i18n).

A mudança é segura e, conforme confirmado pelo NotebookLM da MUI, o comportamento padrão (`keepMounted=false`) é o recomendado para menus e navegação — melhora acessibilidade (DOM limpo quando fechado) e reduz pegada de memória.

---

## 3. Achados Priorizados

---

### [WARNING] Seletor CSS `'& .MuiModal-root'` é no-op no Drawer do MobileBottomNav

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:350-352`
- **Confidence:** 94/100
- **Categoria:** UI / CSS
- **Problema:** O seletor de descendência `'& .MuiModal-root'` dentro do `sx` do `<Drawer>` nunca corresponde a nenhum elemento DOM. A classe `MuiModal-root` está no **mesmo elemento raiz** que `MuiDrawer-root` — não em um filho. O seletor com espaço (descendente) exige um elemento **dentro** do root, mas não existe. Como resultado, o `zIndex: 1300` nunca é aplicado.
- **Evidência:**

```tsx
// MobileBottomNav.tsx:323-353 (Drawer)
<Drawer
  variant="temporary"
  anchor="left"
  open={drawerOpen}
  onClose={closeDrawer}
  // ...
  sx={{
    '& .MuiDrawer-paper': { transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
    '& .MuiBackdrop-root': {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      backgroundColor: BLACK_40,
    },
    '& .MuiModal-root': {    // ← NUNCA MATCHA
      zIndex: 1300,          // ← NUNCA APLICADO
    },
  }}
>
```

- **Impacto:** O Drawer usa o z-index padrão de `theme.zIndex.drawer` (1200 no MUI default, não customizado no tema do projeto — verificado em `src/theme/appTheme.ts`), NÃO os 1300 pretendidos. Como o Bottom Nav (`Paper` com `position: fixed`, linha 178) também usa `zIndex: 1200`, tecnicamente há conflito de camadas. Em condições normais o Drawer renderiza via portal e aparece acima, mas se houver sobreposição de stacking contexts (ex: `transform`, `isolation`) o Bottom Nav poderia sobressair.
- **NotebookLM consultado:** Sim — confirmou que `MuiDrawer-root` e `MuiModal-root` estão no mesmo nó DOM, e que o seletor com espaço `& .MuiModal-root` não seleciona nada.
- **Correção:** Substituir `'& .MuiModal-root': { zIndex: 1300 }` por `zIndex: 1300` direto no `sx` do `<Drawer>`, que aplica no root (que é o próprio Modal). Opcionalmente, verificar se 1300 é realmente necessário sobre 1200 — sem conflito visível em produção, pode ser apenas redundância planejada.

---

### [WARNING] Possível inconsistência no `z-index` do Backdrop entre os Drawers

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:344-348` e `src/components/public/PublicHeader.tsx`, `src/components/app/GuestMobileNav.tsx`
- **Confidence:** 85/100
- **Categoria:** UI / Consistência
- **Problema:** O Drawer do `MobileBottomNav` estiliza o backdrop com `backdropFilter: blur(8px)` e `backgroundColor: BLACK_40` via `'& .MuiBackdrop-root'`. Os Drawers de `GuestMobileNav` e `PublicHeader` **não** estilizam o backdrop — usam o backdrop default do Modal (sem blur, sem cor customizada). Isso cria inconsistência visual entre as duas navegações mobile.
- **Evidência:**

```tsx
// MobileBottomNav.tsx — backdrop customizado com blur
'& .MuiBackdrop-root': {
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  backgroundColor: BLACK_40,
},

// GuestMobileNav.tsx — sem backdrop customization (linhas 108-112)
sx={{
  '& .MuiDrawer-paper': { transition: '...' },
}}

// PublicHeader.tsx — sem backdrop customization (linhas 300-304)
sx={{
  '& .MuiDrawer-paper': { transition: '...' },
}}
```

- **Impacto:** Usuários que navegam entre páginas públicas (visitante) e páginas autenticadas (mobile) experimentam dois comportamentos visuais de backdrop diferentes para o mesmo padrão de Drawer. Não é um bug funcional, mas fragmenta a identidade visual.
- **Correção:** Extrair o backdropSx para uma constante compartilhada ou adicionar `'& .MuiBackdrop-root'` nos outros dois Drawers, consistente com o MobileBottomNav.

---

### [SUGGESTION] Abstração desnecessária `handleLogout` no MobileBottomNav

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:151-153`
- **Confidence:** 90/100
- **Categoria:** Architecture / Clean Code
- **Problema:** `handleLogout` é um wrapper de 3 linhas que apenas delega para `handleOpenLogoutDialog`. A função `handleOpenLogoutDialog` já é estável (`useCallback` com dep `[closeDrawer]`) e poderia ser usada diretamente no `onClick`.
- **Evidência:**

```tsx
const handleOpenLogoutDialog = useCallback(() => {
  closeDrawer();
  setLogoutDialogOpen(true);
}, [closeDrawer]);

const handleLogout = useCallback(() => {   // ← Wrapper desnecessário
  handleOpenLogoutDialog();                 // ← Única chamada
}, [handleOpenLogoutDialog]);

// JSX
<ListItemButton
  onClick={handleLogout}                    // ← Poderia ser handleOpenLogoutDialog
```

- **Impacto:** Nenhum funcional. Apenas complexidade cognitiva desnecessária (4 linhas extra, 1 `useCallback` extra, 1 dependência rastreada). Remove a indireção e melhora legibilidade.
- **Correção:** Substituir `onClick={handleLogout}` por `onClick={handleOpenLogoutDialog}` e remover a definição de `handleLogout`.

---

### [SUGGESTION] Duplicação estrutural de `drawerPaperSx` entre componentes

- **Arquivo:** `src/components/app/GuestMobileNav.tsx:77-81` e `src/components/public/PublicHeader.tsx:91-95`
- **Confidence:** 88/100
- **Categoria:** Architecture / DRY
- **Problema:** Ambos os componentes definem um objeto de estilo `drawerPaperSx` estruturalmente idêntico para o Paper do Drawer. O `MobileBottomNav` inlineia os mesmos valores diretamente em `slotProps.paper.sx`. Três definições do mesmo token duplicam a manutenção.
- **Evidência:**

```tsx
// GuestMobileNav.tsx:77-81
const drawerPaperSx = {
  backgroundColor: APP_SURFACE,
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  borderRight: `1px solid ${APP_BORDER}`,
};

// PublicHeader.tsx:91-95 — idêntico
const drawerPaperSx = {
  backgroundColor: APP_SURFACE,
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  borderRight: `1px solid ${APP_BORDER}`,
};

// MobileBottomNav.tsx:329-336 — mesmos tokens inline
slotProps={{
  paper: {
    sx: {
      backgroundColor: APP_SURFACE,
      backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
      borderRight: `1px solid ${APP_BORDER}`,
      width: 280,
    },
  },
}}
```

- **Impacto:** Baixo. Se o token visual dos Drawers precisar ser alterado (ex: nova cor de superfície), 3 locais precisam ser atualizados. Uma refatoração possível seria centralizar `DRAWER_PAPER_SX` em `theme/tokens.ts` ou criar um componente `AppDrawer` compartilhado que encapsule o Paper, backdrop e transições.
- **Correção:** Extrair para um token em `src/theme/tokens.ts` (ex: `DRAWER_PAPER_SX`) ou, mais ambiciosamente, criar um componente `PublicDrawer` / `AppDrawer` que unifique a estrutura.

---

## 4. Análise Detalhada por Foco

### 4.1 Estado interno e `keepMounted`

Cada Drawer foi inspecionado em busca de children com estado React que seria perdido ao desmontar:

| Drawer | Children | Estado interno? |
|--------|----------|----------------|
| **MobileBottomNav** | Brand header, user card (AuthContext), navegação secundária, botões de ação (analytics, locale, logout, delete) | ❌ Nenhum. Tudo lê de contexto/store. `localeAnchorEl` e `logoutDialogOpen` vivem no pai. |
| **GuestMobileNav** | Brand header, navegação pública, CTA auth | ❌ Nenhum. Apenás `t()` e `location.pathname` (external). |
| **PublicHeader** | Brand header, navegação pública, GitHub link, logout condicional | ❌ Nenhum. Só dados de contexto + i18n. |

**Conclusão:** A remoção de `keepMounted` é funcionalmente segura para os 3 componentes.

### 4.2 Race conditions

- Nenhum Drawer depende de temporizadores, animações encadeadas manualmente ou callbacks assíncronos que possam causar race conditions entre `open`/`close`.
- O `useEffect` no PublicHeader (`setDrawerOpen(false)` em `location.pathname`) executa sempre depois do commit do React, então não há condição de corrida com o `onClose` do Drawer.

### 4.3 Memory leaks

- Nenhum Drawer registra event listeners, timers, subscriptions ou refs que precisam de cleanup.
- O `PublicHeader` tem um `useEffect` sem cleanup — mas ele só executa `setDrawerOpen(false)`, que é idempotente e não acumula.

### 4.4 Acessibilidade

- A remoção de `keepMounted` **melhora** acessibilidade: o Modal gerencia foco corretamente no open/close, e o conteúdo do Drawer não está presente no DOM quando fechado, eliminando risco de leitores de tela encontrarem conteúdo oculto.
- Todos os Drawers têm `aria-label` ou `aria-labelledby` corretos.
- `MobileBottomNav` usa `aria-current="page"` nos itens ativos (linha 415) — ✅
- `GuestMobileNav` e `PublicHeader` também usam `aria-current="page"` — ✅

### 4.5 i18n

- Todos os labels de navegação usam `t()` corretamente.
- Namespaces usados: `mobileBottomNav.*`, `studio.header.nav.*`, `studio.header.*`, `feedback.*`, `analyticsConsent.*`, `exportCrossRoute.*`, `nav.*` em `MobileBottomNav`; `nav.*` em `GuestMobileNav` e `PublicHeader`.
- Nenhum texto hardcoded encontrado.

### 4.6 Tema MUI

- Uso consistente de `slotProps.paper.sx` (padrão MUI v9) em vez de `PaperProps` legado — ✅
- Todas as cores usam tokens do tema, sem valores hardcoded — ✅
- Transições CSS customizadas para o Drawer paper — consistente entre os 3 componentes

---

## 5. O que Parece Saudável

- **Separação clara de responsabilidades:** `MobileBottomNav` (usuário logado), `GuestMobileNav` (visitante mobile), `PublicHeader` (público geral). Sem sobreposição de responsabilidades.
- **Nenhum import não utilizado** nos 3 arquivos.
- **`useCallback` com dependências corretas** em todos os handlers — sem stale closures identificados.
- **`closeDrawer()` chamado antes de `setLogoutDialogOpen(true)`** no MobileBottomNav (linha 128) — evita race de renderização.
- **CustomEvent `open-delete-account-dialog`** (linha 492) como alternativa limpa a prop drilling.
- **Uso de variáveis CSS (env) nativas** para `safe-area-inset-bottom` no MobileBottomNav (linha 183).
- **`openFeedback`** de `useFeedbackDialog()` é estável (`useCallback([])`) — sem risco de recriação desnecessária.
- **Todas as transições de Drawer** usam `cubic-bezier(0.4, 0, 0.2, 1)` — consistente com Material Design.

---

## 6. Limites da Revisão

- Não foi possível inspecionar o comportamento runtime dos 3 Drawers para confirmar se o backdrop blur/fundo aparece visualmente correto na transição close→open sem `keepMounted` (teoricamente o Modal gerencia corretamente, mas o `Slide` do Drawer pode ter leve flash no remount). A MUI v9 usa `react-transition-group` internamente que garante a transição de entrada antes de mostrar o Paper.
- A inspeção do `zIndex: 1300` não foi testada via DevTools para confirmar o stacking real — a análise baseia-se na confirmação do NotebookLM sobre a estrutura DOM compartilhada.
- O possível conflito de camadas entre Bottom Nav (1200) e Drawer (1200 teórico) não foi verificado em produção — depende do stacking context da página, que pode variar por rota.

---

## 7. Gate de Saída Final

- [x] Li o contexto mínimo real de cada arquivo por completo (3/3 arquivos lidos na íntegra)
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico (todos ≥ 85)
- [x] Achados com confidence < 80 foram descartados
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Não há motivo para escalar — 0 bloqueadores de merge
