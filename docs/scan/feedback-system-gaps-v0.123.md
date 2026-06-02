# Gap-finding — Sistema de Feedback v0.123

**Data:** 2026-06-02
**Escopo:** sistema de feedback global (8 arquivos novos + 6 integrações + i18n + 19 testes)
**Branch:** main (untracked + modified)
**Contexto:** o sistema de feedback (250 créditos bônus) estava escondido em `/contato`. Foi implementado N1 (banner/drawer/header/chip) e N2 (Dialog reutilizável + FAB + screenContext).

---

## Contexto assumido

A especificação do usuário declarava que o botão "Feedback (+250)" deveria aparecer em 4 pontos de entrada (N1) e ser extraído para um `FeedbackDialog` reutilizável com FAB + pré-preenchimento de rota (N2). Após uma primeira passagem, o code-validator encontrou 2 bugs críticos (drawer quebrado, ContactPage com form duplicado) que foram corrigidos, junto com 4 memory leaks e 2 dead codes.

A auditoria lê o estado atual (branch main) e compara contra:
- o pedido literal do usuário (N1 item #3 = "no Header");
- boas práticas de i18n (DRY, sem namespace paralelo);
- integridade do código morto vs. código vivo;
- cobertura de testes.

---

## Mapa rápido: sólido vs frágil

| Camada | Estado | Comentário |
|---|---|---|
| Backend (`functions/src/flows/feedback.ts`) | ✅ sólido | Valida entrada, App Check, concede bônus idempotente, retorna `bonusGranted` + saldo. |
| `FeedbackFormFields` | ✅ sólido | Compartilhado por Dialog/ContactPage, chama `refreshCredits(false)`, analytics `generate_lead`. |
| `FeedbackDialog` | ✅ sólido | Memory leak do `setTimeout` corrigido com `useRef` + cleanup. Foco trap, ESC, click-outside do MUI nativos. |
| `FeedbackController` | ✅ sólido | `useEffect` agora registra `addEventListener` (bug prévio corrigido), cleanup robusto. |
| `FeedbackFab` | ✅ sólido | Z-index 1250 (entre MobileBottomNav 1200 e ActionBar 1400), rotas ocultas corretas, keyframe animation substituiu `<Zoom>`. |
| `FeedbackBanner` | ✅ sólido | Aparece condicionalmente, some quando `feedbackBonusGranted === true`. |
| `useFeedbackDialog` | ✅ sólido | Hook imperativo com `useCallback`, dispatch via `CustomEvent`. |
| Integração Assistant | ✅ sólido | Banner montado em `Assistant.tsx`; chip no `EmptyChatState` do `AssistantMessages.tsx`. |
| Integração MobileBottomNav | ✅ sólido (corrigido) | `onClick` agora passa `item.action`; `handleNavigate` trata `action === 'feedback'`. |
| Integração **Header** | 🔴 **QUEBRADO** | `Header.tsx` foi **removido do `App.tsx`** (substituído por `Sidebar`), mas o arquivo continua existindo com 670 linhas e botão de feedback. **Ninguém importa `Header`**. O botão é código morto. |
| i18n 3 locales | 🟠 parcial | `feedback.{dialog,fab,banner,emptyState,navItem}` completo. `contact.feedback.*` legado com 18 chaves por locale, sendo 4 ainda usadas e 14 dead code. |
| Testes | 🟠 parcial | 19 testes diretos (FeedbackController 9 + FeedbackFab 10). Sem testes para `FeedbackDialog`, `FeedbackFormFields`, `FeedbackBanner`, `useFeedbackDialog`, e sem teste do fluxo "CreditIndicator atualiza após enviar". |

---

## Gaps priorizados

### 🔴 [G-FB-01] CRÍTICO — Botão "Feedback" do Header é código morto

- **Severidade:** CRÍTICO
- **Tipo:** Funcional (UX)
- **Confidence:** 99/100
- **Arquivo:** `src/components/Header.tsx:80-388` (botão linhas 346-388) + `src/App.tsx` (não importa `Header`)
- **Descrição:** A spec N1 item #3 ("Pílula/botão 'Feedback' no Header") foi implementada no arquivo `src/components/Header.tsx` (export nomeado `function Header()`). Porém, no mesmo PR, o `App.tsx` foi migrado de `Header` para `Sidebar` — `[-] ./components/Header` aparece em `analyze_aitool_changes` como **REMOVIDO** dos imports do `App.tsx`. `grep` em `src/**/*.tsx` por `from '.*Header'` retorna apenas `PublicHeader`, `SidebarHeader`, `AssistantHeader` — **nenhum importador de `Header`**. Resultado: o botão de feedback prometido no spec **nunca é renderizado** na app de produção. O usuário desktop em `/app/*` perde um dos 4 pontos de entrada prometidos.
- **Evidência:**
  ```ts
  // src/components/Header.tsx
  export function Header() {                       // ← ninguém importa
    ...
    {showFeedbackButton ? (                        // ← nunca monta
      <Tooltip title={t('feedback.fab.tooltip')} arrow>
        <IconButton onClick={handleFeedbackClick} ...>
          <RateReviewIcon ... />
          {/* Badge "+250" */}
        </IconButton>
      </Tooltip>
    ) : null}
  ```
  ```ts
  // src/App.tsx (após mudanças)
  // [-] ./components/Header  ← REMOVIDO
  {showAppLayout && !isMobile && <Sidebar />}      // ← substituto
  ```
  ```bash
  $ grep -rn "from '.*Header'" src/  # 6 matches, todos PublicHeader/SidebarHeader/AssistantHeader
  ```
- **Impacto:** Em desktop (rotas `/app/*`), o usuário tem apenas o **FAB canto inferior direito** como ponto de entrada. O botão prometido na barra superior está ausente. Quebra um dos 4 requisitos N1 do usuário.
- **Sugestão de fix (concreta):** Adicionar o botão de feedback no `SidebarFooter.tsx` (já mostra o `CreditIndicator` e botões de cookies/logout). Posicionar entre `CreditIndicator` e `LocaleSelector` quando expandido, e como `IconButton` com badge no modo colapsado:
  ```tsx
  // SidebarFooter.tsx — após CreditIndicator, antes de LocaleSelector
  const showFeedbackButton = !feedbackBonusGranted && !unlimitedCredits;
  ...
  {showFeedbackButton && (
    collapsed ? (
      <Tooltip title={t('feedback.fab.tooltip')} placement="right" arrow>
        <IconButton aria-label={t('feedback.navItem.headerLabel')} onClick={() => openFeedback(location.pathname)}>
          <Badge badgeContent={`+${FEEDBACK_BONUS_DISPLAY}`} color="secondary"><RateReviewIcon /></Badge>
        </IconButton>
      </Tooltip>
    ) : (
      <ListItemButton onClick={() => openFeedback(location.pathname)}>
        <ListItemIcon><RateReviewIcon /></ListItemIcon>
        <ListItemText primary={t('feedback.navItem.headerLabel')} />
      </ListItemButton>
    )
  )}
  ```
  Em seguida, **deletar** `src/components/Header.tsx` inteiro (670 linhas) e os 2 testes removidos já cobrem isso. Atualizar `tests/components/Header.component.test.tsx` (já deletado conforme `analyze_aitool_changes`) e `tests/components/Header.features.test.tsx` (já deletado) — está OK.
- **Pergunta/decisão:** Confirmar com o usuário se a `Sidebar` é a substituta do `Header` (já está no código) e se o botão deve ir no `SidebarFooter` ou no topo da `Sidebar` (perto do logo).

---

### 🟠 [G-FB-02] ALTO — `contact.feedback.*` legado ainda em uso no ContactPage

- **Severidade:** ALTO
- **Tipo:** Manutenção (i18n)
- **Confidence:** 95/100
- **Arquivos:**
  - `src/pages/public/ContactPage.tsx:266, 504, 507, 528`
  - `src/features/i18n/locales/{pt-BR,en,es}.ts:568-588` (por locale)
- **Descrição:** Mesmo após a refatoração (ContactPage agora usa `FeedbackFormFields`), 4 chaves de `contact.feedback.*` continuam sendo referenciadas:
  - linha 266: `buttonLabel={t('contact.feedback.button')}`
  - linha 504: `{t('contact.feedback.title')}`
  - linha 507: `{t('contact.feedback.description')}`
  - linha 528: `{t('contact.feedback.loginPrompt')}`
  E as outras **14 chaves** (`categoryLabel`, `categoryGeneral`, ..., `tooShort`) em cada locale são **dead code** (não são usadas em nenhum lugar do codebase, verificado). Total: **18 chaves duplicadas × 3 locales = 54 chaves órfãs** que precisam de manutenção e confundem o tradutor.
- **Evidência:**
  ```bash
  $ grep -rn "contact\.feedback" src/  # apenas 4 matches, todos em ContactPage.tsx
  $ grep -rn "contact\.feedback" tests/  # 0 matches
  ```
  ```ts
  // pt-BR.ts:568-588 (mesma estrutura em en.ts:558-578, es.ts:558-578)
  feedback: {
    title: 'Envie feedback e ganhe 250 créditos',
    description: 'Faça login para compartilhar...',
    loginPrompt: 'Faça login para enviar feedback...',
    categoryLabel: 'Categoria',
    categoryGeneral: 'Geral',
    ...
    successNoBonus: 'Feedback enviado! Obrigado.',
    tooShort: 'Mínimo de 10 caracteres.',
  },
  ```
- **Impacto:** Risco de divergência i18n (pt-BR/en/es podem dessincronizar). Tradutor recebe 18 chaves que não usa. Carga cognitiva para manter dois namespaces paralelos.
- **Sugestão de fix:**
  1. Substituir `t('contact.feedback.button')` por `t('feedback.dialog.button')` (já existe nos 3 locales).
  2. Substituir `t('contact.feedback.title')` por `t('feedback.banner.title')` (semântica mais correta para "CTA de feedback na página pública").
  3. Substituir `t('contact.feedback.description')` por `t('feedback.banner.description')`.
  4. Substituir `t('contact.feedback.loginPrompt')` por uma chave nova em `feedback.contactPage.loginPrompt` (ou reusar `feedback.emptyState.chipLabel`).
  5. **Deletar** os blocos `contact.feedback.*` (linhas 568-588) dos 3 locales inteiros.
- **Pergunta/decisão:** Manter `contact.feedback.title`/`description` com texto ligeiramente diferente do `feedback.banner.title` (página pública tem outro tom)? Se sim, mover para `feedback.contactPage.*` em vez de deletar.

---

### 🟡 [G-FB-03] MÉDIO — Sentinela `__feedback__` no MobileBottomNav

- **Severidade:** MÉDIO
- **Tipo:** Type Safety
- **Confidence:** 80/100
- **Arquivo:** `src/components/app/MobileBottomNav.tsx:107, 378`
- **Descrição:** O item de feedback é inserido com `to: '__feedback__'` (sentinela que nunca casa com rota real). Funciona porque o `onClick` agora passa o `action` (correção do bug crítico anterior), mas o `to` continua sendo valor mágico hardcoded. Se alguém criar a rota `__feedback__` no futuro, o item vai parar de abrir o dialog silenciosamente.
- **Evidência:**
  ```tsx
  // MobileBottomNav.tsx:107-112
  if (showFeedbackInDrawer) {
    items.push({
      to: '__feedback__',  // ← sentinela
      label: t('feedback.navItem.drawerLabel'),
      icon: RateReviewIcon,
      action: 'feedback',
    });
  }
  ```
- **Impacto:** Frágil. Cosmético, mas facilita bug futuro.
- **Sugestão de fix:** Discriminated union para `drawerItems`:
  ```ts
  type DrawerItem =
    | { kind: 'route'; to: string; label: string; icon: ElementType }
    | { kind: 'action'; action: 'feedback'; label: string; icon: ElementType };
  ```
  Elimina o sentinela e torna impossível bypassar a action pelo `to`.

---

### 🟡 [G-FB-04] MÉDIO — Cobertura de testes incompleta

- **Severidade:** MÉDIO
- **Tipo:** Qualidade / Risco de regressão
- **Confidence:** 90/100
- **Arquivos:** `tests/components/feedback/*` (apenas 2 arquivos)
- **Descrição:** 19 testes diretos cobrem **FeedbackController** (9) e **FeedbackFab** (10). Faltam testes para:
  - `FeedbackDialog` (sucesso → Alert de success → close após 2.5s)
  - `FeedbackFormFields` (envio chama `refreshCredits`, dispara `trackAnalyticsEvent('generate_lead', { source: 'feedback' })`, validação de 10 chars)
  - `FeedbackBanner` (some quando `feedbackBonusGranted === true`, autenticado)
  - `useFeedbackDialog` (dispatch correto do `CustomEvent`)
  - Fluxo end-to-end: `FeedbackFab` → `FeedbackController` → `FeedbackDialog` → `FeedbackFormFields` → mock `httpsCallable` → `useCreditsStore.refreshCredits`
  - Mobile: `MobileBottomNav` item Feedback → dialog abre com `screenContext` correto
- **Impacto:** Regressões silenciosas. Ex: se alguém remover o `void refreshCredits(false)` em `FeedbackFormFields.tsx:129`, o `CreditIndicator` para de atualizar e ninguém pega.
- **Sugestão de fix:** Criar `tests/components/feedback/FeedbackDialog.component.test.tsx` (~8 testes) e `tests/components/feedback/FeedbackFormFields.component.test.tsx` (~6 testes). O último deve mockar `httpsCallable` + `useCreditsStore` e validar que `refreshCredits(false)` é chamado após submit bem-sucedido.

---

### ⚪ [G-FB-05] BAIXO — `useCreditsStore` direto em vez de `useCredits()`

- **Severidade:** BAIXO
- **Tipo:** Padrão de código
- **Confidence:** 85/100
- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:90`
- **Descrição:** O componente usa `const refreshCredits = useCreditsStore((s) => s.refreshCredits);` direto do store. O resto do projeto consome via `useCredits()` (hook público com `useShallow`). Funciona, mas é inconsistente.
- **Sugestão de fix:** Adicionar `refreshCredits` ao retorno de `useCredits()` e consumir via hook. Se isso aumentar a superfície do `useShallow` seletor, manter o store direto mas adicionar comentário explicando.

---

### ⚪ [G-FB-06] BAIXO — Tipos `FeedbackCallableInput`/`Output` redeclarados no frontend

- **Severidade:** BAIXO
- **Tipo:** Acoplamento manual
- **Confidence:** 80/100
- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:39-51`
- **Descrição:** O backend exporta `FeedbackInput`/`FeedbackOutput` em `functions/src/genkit/schemas/common.ts`. O frontend redeclara manualmente. Mudança no Zod schema não quebra TypeScript do frontend.
- **Sugestão de fix:** Curto prazo: mover para `src/types/feedback.ts` e importar de lá. Longo prazo: gerar types via `firebase-functions` SDK ou `tsup` build.

---

### ⚪ [G-FB-07] BAIXO — `aria-label` repetindo `tooltip` no FeedbackFab

- **Severidade:** BAIXO
- **Tipo:** Acessibilidade
- **Confidence:** 65/100
- **Arquivo:** `src/components/feedback/FeedbackFab.tsx:93-98`
- **Descrição:** `<Fab>` recebe o mesmo `t('feedback.fab.tooltip')` em `Tooltip title` e `aria-label`. Screen reader anuncia o texto longo duas vezes.
- **Sugestão de fix:** Adicionar chave i18n curta `feedback.fab.ariaLabel` = "Enviar feedback" e usar essa no `aria-label`. Manter a chave longa no `Tooltip`.

---

## Cenários de borda sem resposta

1. **Bônus já concedido mas usuário envia novo feedback** — `FeedbackFormFields` mostra `successNoBonus` corretamente (verificado linhas 144-146), mas o `feedbackBonusGranted` no store é atualizado pelo `onSnapshot` do Firestore. Como o backend retorna `bonusGranted: false` no 2º envio, a UI exibe "Obrigado" sem o "+250". Comportamento correto. **OK.**

2. **Race condition: usuário clica 2x rápido no botão "Enviar"** — `canSubmit` desabilita o botão enquanto `isSending === true` (linha 100), e o `Button` recebe `disabled={!canSubmit || disabled}`. **OK.**

3. **Clicar no FAB de `/app/video` (que está oculto)** — `HIDDEN_ROUTES.some(...)` em `FeedbackFab.tsx:69` previne. Mas o `useCredits` já reage ao bônus, então o FAB some globalmente. **OK.**

4. **Feedback enviado → usuário navega para `/contato` antes do `refreshCredits` resolver** — `void refreshCredits(false)` é fire-and-forget. O `CreditIndicator` pode mostrar valor antigo por ~1s. **Aceitável.**

5. **Dialog aberto + usuário clica no FAB novamente** — `FeedbackController` apenas seta `open = true` e `screenContext` (não duplica dialog). **OK.**

6. **Reabrir o dialog após envio bem-sucedido** — `FeedbackDialog` mantém `submitted` no estado interno. Reabrir mostra o Alert de success, NÃO o form. **Possível bug latente**: usuário pode ficar confuso se fechar e reabrir logo após enviar.
   - **Investigação necessária**: validar se o `useEffect` de `open` em `FeedbackDialog` reseta `submitted`. Hoje NÃO reseta — `submitted` só é limpo após o `setTimeout(2500)`. Edge: usuário fecha o dialog (X) **antes** dos 2.5s → `handleClose` chama `setSubmitted(null)`. OK. Mas se `setTimeout` for cancelado pelo `handleClose`, o próximo open mostra o form. Verificado: `handleClose` zera `submitted` e cancela o timeout. **OK.**

---

## Checklist de sanidade

- [x] Mapeei o escopo completo: 8 arquivos novos + 6 integrações (App, ContactPage, MobileBottomNav, Header, Assistant, AssistantMessages) + 3 locales + 19 testes diretos.
- [x] Verifiquei que `Header.tsx` não é importado por nenhum arquivo do `src/` (grep retornou 0 matches).
- [x] Verifiquei que `contact.feedback.*` é usado em apenas 4 lugares (todos ContactPage) e que as outras 14 chaves são dead code (grep confirmou 0 usos).
- [x] Validei que o z-index do FAB (1250) está entre MobileBottomNav (1200) e ActionBar (1400) sem conflito.
- [x] Validei que o `FeedbackController` registra `addEventListener` no setup e remove no cleanup (linhas 62-71).
- [x] Validei que o `FeedbackDialog` usa `useRef` para o `setTimeout` e limpa no unmount (linhas 47-57).
- [x] Confirmei que `defaultValue` foi removido do `t()` em `FeedbackFab` (linha 138 usa `+${FEEDBACK_BONUS_DISPLAY}` direto).
- [x] Confirmei que `<Zoom>` foi removido (não aparece em supergrep).
- [x] Confirmei que `MobileBottomNav.tsx:378` passa `item.action` no onClick.
- [x] Cada achado passou pela validação anti-falso-positivo: li os arquivos por inteiro, verifiquei mitigações (cleanup timers, type guards no Controller).
- [x] Gate numérico: todos os achados acima de 80, exceto G-FB-07 (65 — relatado como baixa, opcional).
- [x] Existe motivo real para escalar: G-FB-01 é bloqueador (botão prometido não aparece na UI).

---

## Recomendação

**Bloqueador de merge:** corrigir G-FB-01 (botão de feedback na Sidebar) antes de release. As outras lacunas são melhorias de qualidade que podem ir em follow-up.

**Esforço estimado para corrigir bloqueador:**
- Adicionar botão de feedback no `SidebarFooter.tsx` (~30 linhas) — incluindo `useFeedbackDialog`, `useCredits` para checar bônus, layout colapsado/expandido.
- Deletar `src/components/Header.tsx` (670 linhas de código morto).
- Adicionar 2 testes do botão na `Sidebar` (`Sidebar.features.test.tsx`).

Total: ~1 hora.
