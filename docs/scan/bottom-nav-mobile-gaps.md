# Scan: Bottom Navigation Mobile — Gaps Report

**Data:** 2026-05-29  
**Feature:** Bottom Navigation Mobile (MobileBottomNav)  
**Versão analisada:** 0.107.1  

---

## 1. Contexto assumido

Análise da implementação final da Bottom Navigation Mobile após refinamentos do ui-designer. Escopo: `MobileBottomNav.tsx`, `Header.tsx`, `App.tsx`, `ActionBar.tsx` e chaves i18n nos 3 locales.

**Arquivos lidos por completo:**
- `src/components/app/MobileBottomNav.tsx` (420 linhas)
- `src/components/Header.tsx` (567 linhas)
- `src/App.tsx` (247 linhas)
- `src/components/ActionBar.tsx` (582 linhas)
- `src/features/assistant/Assistant.tsx` (657 linhas)
- `src/features/assistant/components/AssistantComposer.tsx` (478 linhas)
- `src/features/assistant/components/assistantUi.ts` (trechos relevantes)
- `src/pages/AssistantPage.tsx` (25 linhas)
- `src/router/routes.tsx` (298 linhas)
- `src/components/toast/ToastProvider.tsx` (97 linhas)
- `src/theme/tokens.ts` (trechos relevantes)
- Locales: `pt-BR.ts`, `en.ts`, `es.ts` (chaves `mobileBottomNav.*` + `drawerLabel`)

---

## 2. Mapa rápido: sólido vs frágil

| Aspecto | Status | Notas |
|---------|--------|-------|
| 4 destinos principais na bottom nav | ✅ Sólido | Estúdio, Vídeo, Assistente, Biblioteca — rotas corretas |
| Itens secundários no drawer | ✅ Sólido | Imagens, Speed Paint, Configurações — cobre todas as rotas /app/* |
| i18n nos 3 idiomas | ✅ Sólido | 4 chaves `mobileBottomNav.*` + reutilização de `studio.header.nav.*` |
| Safe area inset (iPhone notch) | ✅ Sólido | `pb: 'env(safe-area-inset-bottom, 0px)'` no Paper |
| Pill indicator + hover states | ✅ Sólido | CSS correto via `.Mui-selected` |
| Drawer blur overlay | ✅ Sólido | `backdropFilter: 'blur(8px)'` com `backgroundColor: rgba(0,0,0,0.4)` |
| Integração exclusão de conta | ✅ Sólido | `CustomEvent('open-delete-account-dialog')` + listener no Header |
| z-index bottom nav (1200) | ✅ Sólido | Abaixo do drawer (1300) e ActionBar (1400) |
| ActionBar sobe no mobile | ⚠️ Frágil | `bottom: 24 + 56 = 80px` — mas Snackbar de exportação na mesma posição |
| **Padding bottom — rota Assistente** | 🔴 **Frágil** | **Sem padding para bottom nav — composer oculto** |
| Drawer vs ActionBar z-index | ⚠️ Frágil | ActionBar (1400) aparece acima do drawer overlay (1300) |

---

## 3. Gaps priorizados

### GAP-001 | ALTO | Layout | Confidence 95

**Assistente: composer oculto pela bottom nav no mobile**

A rota `/app/assistente` usa um container especial no `App.tsx` (linha 179-182):

```tsx
isAssistantRoute ? (
  <Box sx={{ height: `calc(100dvh - ${APP_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
    {routesElement}
  </Box>
)
```

**Problema:** Não há `padding-bottom` ou `margin-bottom` para compensar a bottom nav (56px + safe-area-inset). O `AssistantComposer` usa `position: sticky; bottom: 0` dentro do container que preenche 100% da altura. A bottom nav (fixed, z-index 1200) sobrepõe os últimos ~56-90px do composer.

**Impacto no usuário:** No mobile, a área de input do assistente (textarea, botão enviar, toggle de modelo, seletor de thinking level) fica parcial ou totalmente oculta atrás da bottom nav. O usuário **não consegue digitar mensagens** no assistente.

**Evidência:**
- `App.tsx:180` — container sem padding-bottom
- `AssistantPage.tsx:14` — `height: '100%'` sem compensação
- `Assistant.tsx:407` — `height: '100%'` sem compensação
- `assistantUi.ts:133` — composer `position: sticky; bottom: 0; zIndex: 2`
- `MobileBottomNav.tsx:130` — bottom nav `position: fixed; bottom: 0; zIndex: 1200`

**Mitigações verificadas:** Nenhuma. O composer não tem padding-bottom, e o container não tem espaço para a bottom nav.

**Mitigação sugerida:** Adicionar `pb: 'calc(56px + env(safe-area-inset-bottom, 0px))'` ao container do assistant no `App.tsx` (linha 180), ou ao `AssistantComposerContainerSx` em `assistantUi.ts`.

---

### GAP-002 | MÉDIO | Visual | Confidence 90

**ActionBar aparece acima do drawer overlay quando drawer está aberto**

Quando o usuário está em `/app/estudio` ou `/app/video` com áudio gerado e abre o drawer "Mais", o ActionBar (z-index 1400) renderiza acima do backdrop do drawer (z-index 1300).

**Impacto no usuário:** O ActionBar flutua sobre o overlay escuro do drawer, criando uma inconsistência visual. Os botões do ActionBar ficam clicáveis mesmo com o drawer aberto.

**Evidência:**
- `ActionBar.tsx:240` — `zIndex: 1400`
- `MobileBottomNav.tsx:268-269` — `'& .MuiModal-root': { zIndex: 1300 }`

**Mitigações verificadas:** Nenhuma. O ActionBar não é oculto quando o drawer está aberto.

**Mitigação sugerida:** No `ActionBar.tsx`, detectar se o drawer está aberto (via prop, context ou z-index consistente) e ocultar ou rebaixar o ActionBar. Alternativa mais simples: subir o drawer para z-index 1400 e ActionBar para 1500.

---

### GAP-003 | MÉDIO | Visual | Confidence 85

**Snackbar de exportação de vídeo sobrepõe ActionBar no mobile**

O `ToastManager` renderiza o Snackbar de progresso de exportação com `bottom: { xs: 80, md: 96 }` (linha 57). No mobile, o ActionBar ficou em `bottom: 80px` (24 + 56) após a adição da bottom nav. Ambos ficam na mesma posição vertical.

**Impacto no usuário:** Quando o usuário exporta um vídeo e navega para `/app/estudio` (onde o ActionBar está visível com áudio gerado), o Snackbar de exportação e o ActionBar se sobrepõem visualmente.

**Evidência:**
- `ToastProvider.tsx:57` — `sx={{ bottom: { xs: 80, md: 96 } }}`
- `ActionBar.tsx:238` — `bottom: isMobile ? APP_ACTION_BAR_BOTTOM + BOTTOM_NAV_HEIGHT : APP_ACTION_BAR_BOTTOM` = 80px

**Mitigações verificadas:** O Snackbar e o ActionBar raramente estão visíveis ao mesmo tempo (Snackbar só aparece fora da rota /video, ActionBar só nas rotas studio/video). Mas na rota studio, ambos podem coexistir.

**Mitigação sugerida:** Ajustar `bottom` do Snackbar para `{ xs: 96, md: 112 }` ou calcular dinamicamente considerando a altura do ActionBar.

---

### GAP-004 | BAIXO | Código morto | Confidence 95

**Hamburger button no Header é código morto para mobile autenticado**

Em `Header.tsx:266`, o botão hamburger tem a condição `{isMobile && !user && (...)}` dentro do bloco `user ? (...)`. Como `user` é truthy neste branch, `!user` é sempre `false`. O código nunca executa.

**Impacto no usuário:** Nenhum — é código morto. O drawer do Header para mobile nunca abre para usuários autenticados (comportamento correto, já que usam a bottom nav).

**Evidência:**
- `Header.tsx:263-266` — `user ? ( <> {isMobile && !user && (...)} )`
- Condição `!user` sempre falsa dentro do branch `user ?`

**Mitigações verificadas:** Não afeta funcionalidade. O drawer do Header para desktop funciona normalmente (abre via toggleDrawer no desktop, mas o botão hamburger também não renderiza no desktop por causa do `isMobile`).

**Nota:** O drawer do Header para mobile autenticado está efetivamente desabilitado (sem forma de abrir), o que é o comportamento correto após a implementação da bottom nav. O código morto pode ser removido em cleanup futuro.

---

## 4. Cenários de borda sem resposta

| Cenário | Status | Risco |
|---------|--------|-------|
| iPhone com notch grande (safe-area ~47px) — bottom nav com 56+47=103px cobre mais conteúdo? | Padding de 128px (pb: 16) nas rotas normais cobre. Assistant não cobre. | Baixo (exceto assistant) |
| Usuário com ActionBar + drawer aberto + bottom nav — 3 elementos fixed/overlay simultâneos? | Drawer sobrepõe bottom nav (z-index 1300 > 1200). ActionBar sobrepõe drawer (1400 > 1300). | MÉDIO — visual confuso |
| Landscape mode no mobile — bottom nav continua visível? | `useMediaQuery(theme.breakpoints.down('md'))` usa largura, não orientação. Em landscape estreito, bottom nav aparece. | Baixo |
| Tablet (768px-1024px) — bottom nav aparece? | `breakpoints.down('md')` = <900px. Tablets de 768px mostram bottom nav. | Baixo |

---

## 5. Checklist de sanidade

| Item | Status |
|------|--------|
| Todas as rotas /app/* estão cobertas (4 principais + 3 no drawer) | ✅ |
| Rota /app (redirect) não renderiza bottom nav desnecessariamente | ✅ (showAppLayout requer `/app/`) |
| Onboarding não mostra bottom nav | ✅ (`isOnboardingRoute` excluído de `showAppLayout`) |
| Visitantes não veem bottom nav | ✅ (`!user` → null) |
| Drawer do Header para visitantes funciona | ✅ (Header não é renderizado para visitantes — apenas PublicHeader) |
| Chaves i18n existem nos 3 locales | ✅ (`mobileBottomNav.ariaLabel`, `ariaDrawer`, `more`, `openMenu`) |
| Chaves reutilizadas (`studio.header.nav.*`, `studio.header.logout.drawerLabel`, `studio.header.deleteAccount.drawerLabel`) existem | ✅ |
| `BOTTOM_NAV_HEIGHT` é importado pelo ActionBar corretamente | ✅ |
| Evento `open-delete-account-dialog` é registrado e removido no cleanup | ✅ |
| `keepMounted: true` no drawer para performance | ✅ |
| Safe area inset no Paper da bottom nav | ✅ |
| Safe area inset no Paper do ActionBar | ✅ |

---

## Resumo

| Severidade | Quantidade |
|------------|-----------|
| CRÍTICO | 0 |
| ALTO | 1 (composer do assistente oculto no mobile) |
| MÉDIO | 2 (ActionBar acima do drawer; Snackbar sobre ActionBar) |
| BAIXO | 1 (código morto no Header) |
