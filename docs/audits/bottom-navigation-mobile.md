# Auditoria Estática — Bottom Navigation Mobile

**Data:** 2026-05-29
**Versão:** 0.107.1
**Auditor:** Code Validator (mimo-v2.5-pro)

---

## Escopo da revisão

| Arquivo | Status | Linhas |
|---------|--------|--------|
| `src/components/app/MobileBottomNav.tsx` | NOVO | 375 |
| `src/components/Header.tsx` | Alterado | 567 |
| `src/App.tsx` | Alterado | 247 |
| `src/components/ActionBar.tsx` | Alterado | 582 |
| `src/features/i18n/locales/pt-BR.ts` | Alterado | 2012 |
| `src/features/i18n/locales/en.ts` | Alterado | 1992 |
| `src/features/i18n/locales/es.ts` | Alterado | 1992 |

**Focos cobertos:** imports não utilizados, tipagem, acessibilidade (ARIA), performance, anti-patterns do projeto, consistência i18n/tokens, segurança, arquitetura.

---

## Veredito

**Ajustes recomendados** — Nenhum bloqueador de merge, mas existem imports mortos e um acoplamento arquitetural que merecem atenção antes de merge.

---

## Achados priorizados

### [WARNING] 4 imports não utilizados em MobileBottomNav.tsx

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:7,23,44,66`
- **Confidence:** 98/100
- **Categoria:** Dead Code
- **Problema:** Quatro símbolos são importados mas nunca utilizados no componente.
- **Evidência:**
  ```tsx
  // Linha 7 — importado mas nunca usado no JSX ou lógica
  import IconButton from '@mui/material/IconButton';

  // Linha 23 — importado mas nunca usado no JSX ou lógica
  import MenuIcon from '@mui/icons-material/Menu';

  // Linha 44 — importado mas nunca referenciado após o import
  import logos from '../../assets/logos';

  // Linha 66 — desestruturado mas nunca chamado (delete é via CustomEvent)
  const { user, logout, deleteAccount } = useAuth();
  ```
- **Impacto:** Bundle levemente maior (tree-shaking do Vite mitiga parcialmente), poluição visual no arquivo, confunde revisores sobre intenção do código.
- **Sugestão:** Remover `IconButton`, `MenuIcon`, `logos` dos imports. Remover `deleteAccount` da desestruturação de `useAuth()`.

---

### [WARNING] Acoplamento via CustomEvent entre MobileBottomNav e Header

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:353` ↔ `src/components/Header.tsx:89-96`
- **Confidence:** 92/100
- **Categoria:** Architecture
- **Problema:** O MobileBottomNav dispara `window.dispatchEvent(new CustomEvent('open-delete-account-dialog'))` para que o Header abra o dialog de exclusão de conta. Isso cria acoplamento implícito entre dois componentes irmãos via API global (window), fugindo do padrão React de props/callbacks.
- **Evidência:**
  ```tsx
  // MobileBottomNav.tsx:352-353
  window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));

  // Header.tsx:89-96
  useEffect(() => {
    const handleOpenDeleteDialog = () => { ... };
    window.addEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
    return () => window.removeEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
  }, []);
  ```
- **Impacto:** Dificulta rastreamento de fluxo, impossibilita type-safety do evento, cria dependência oculta. Se alguém remover o listener do Header sem notificar, o botão de exclusão no drawer para de funcionar silenciosamente.
- **Sugestão:** Opções (em ordem de preferência):
  1. **Mover o dialog para MobileBottomNav** — já tem `useAuth()` e `deleteAccount`, pode renderizar o `<Dialog>` diretamente.
  2. **Lift state up** — elevar `deleteDialogOpen` para App.tsx e passar como prop para ambos.
  3. **Se manter CustomEvent** — documentar o contrato com JSDoc e tipar o nome do evento como constante compartilhada.

---

### [WARNING] Rotas /app/assistente e /app/video sem padding inferior para BottomNav

- **Arquivo:** `src/App.tsx:179-195`
- **Confidence:** 88/100
- **Categoria:** UX
- **Problema:** O Container principal (linhas 184-195) aplica `pb: { xs: 16, md: 18 }` para evitar sobreposição com a BottomNav. Porém, as rotas `/app/assistente` (linha 180) e `/app/video` (rota genérica sem Container explícito) não recebem esse padding.
- **Evidência:**
  ```tsx
  // Linha 180 — assistant: sem pb extra
  <Box sx={{ height: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
    {routesElement}
  </Box>

  // Linhas 184-195 — container principal: COM pb
  <Container sx={{ pb: { xs: 16, md: 18 } }}>
    {routesElement}
  </Container>
  ```
- **Impacto:** Em mobile, a BottomNav (56px + safe-area) pode sobrepor conteúdo na parte inferior das rotas de assistente e vídeo. No assistente, o composer/floating input pode ficar parcialmente oculto.
- **Sugestão:** Adicionar `pb: 'calc(56px + env(safe-area-inset-bottom, 0px))'` ao Box do assistente. Verificar se a rota de vídeo precisa do mesmo ajuste (depende do layout da VideoPage).

---

### [SUGGESTION] `role="button"` redundante no BottomNavigationAction "Mais"

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:195`
- **Confidence:** 90/100
- **Categoria:** A11y
- **Problema:** O `BottomNavigationAction` do botão "Mais" tem `role="button"` explícito. Conforme documentação MUI (NotebookLM consultado), o `ButtonBase` já adiciona `role="button"` automaticamente quando não há `href`/`to`/`component="a"`. Para os outros 4 itens que usam `component={Link}`, o MUI muda automaticamente para `role="link"`. O `role="button"` no "Mais" não causa dano, mas é redundante.
- **Evidência:**
  ```tsx
  <BottomNavigationAction
    label={t('mobileBottomNav.more')}
    value={MORE_VALUE}
    icon={<MoreHoriz sx={{ fontSize: ICON_SIZE_MD }} />}
    onClick={handleMoreClick}
    aria-label={t('mobileBottomNav.openMenu')}
    aria-expanded={drawerOpen}
    role="button"  // ← redundante, ButtonBase já provê
  />
  ```
- **Impacto:** Nenhum impacto funcional. Código redundante que pode confundir.
- **Sugestão:** Remover `role="button"`. Manter `aria-label` e `aria-expanded` (estes são necessários e bem aplicados).

---

## O que parece saudável

- **Tokens e surfaces:** Uso consistente de `APP_SURFACE`, `APP_BORDER`, `WHITE_05`, `WHITE_015`, `BRAND_GRADIENT`, `glassSurfaceSx` — padrão idêntico ao Header.
- **i18n completo:** Chaves `mobileBottomNav.ariaLabel`, `.ariaDrawer`, `.more`, `.openMenu` presentes nos 3 locales (pt-BR, en, es) com traduções adequadas.
- **Safe area:** `pb: 'env(safe-area-inset-bottom, 0px)'` na BottomNav — correto para devices com notch/home indicator.
- **Z-index layering:** BottomNav (1200) < Drawer (1300) < ActionBar (1400) — hierarquia intencional e documentada no código.
- **Memoização:** `navItems`, `drawerItems`, `activeValue` e todos os handlers estão com `useMemo`/`useCallback` corretos. Deps de `activeValue` incluem `navItems` (que depende de `[t]`) — correto.
- **Acessibilidade do drawer:** `aria-label` no Drawer, `aria-current="page"` nos itens do drawer, `aria-hidden="true"` nos ícones decorativos, `keepMounted: true` para performance.
- **BottomNavigation:** `showLabels` garante que labels são sempre visíveis (não apenas no item selecionado) — correto para nav com 5 itens.
- **Integração ActionBar:** `BOTTOM_NAV_HEIGHT` exportado e consumido pelo ActionBar para offset correto — boa separação de responsabilidades.
- **Proteção de renderização:** `if (!isMobile || !user) return null` — early return eficiente, evita render desnecessário em desktop.
- **DeleteForever com opacidade reduzida:** `opacity: 0.7` com hover para `1` — padrão visual adequado para ação destrutiva secundária.

---

## Limites da revisão

- **Não foi possível verificar** se a VideoPage tem padding inferior próprio (layout interno não lido).
- **Não foi possível verificar** se o assistant composer tem offset para bottom nav (layout interno não lido).
- **Testes automatizados** não foram executados (fora do escopo do auditor estático).
- **dangerouslySetInnerHTML em Header.tsx:539** — pré-existente, não introduzido por esta feature. Risco baixo (string de tradução controlada), mas inconsistente com Inspector.tsx que usa `escapeHtml()`.
- **Bundle size** não foi medido — imports mortos são parcialmente mitigados pelo tree-shaking do Vite.

---

## Gate de Saída Final

- [x] Li o contexto mínimo real ou reuni evidência suficiente?
- [x] Cada achado passou pela validação anti-falso-positivo?
- [x] Cada achado passou pelo confidence gate numérico?
- [x] Achados com confidence < 80 foram descartados?
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`?
- [ ] Existe motivo real para escalar? **Não** — nenhum CRITICAL, apenas WARNINGs e SUGGESTION.
