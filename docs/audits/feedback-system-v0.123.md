# Auditoria — Sistema de Feedback Global (v0.123)

**Data:** 2026-06-02
**Branch:** main (mudanças untracked/modified)
**Escopo:** Sistema de feedback implementado (8 arquivos novos + 5 integrações + i18n + testes)
**Foco:** TypeScript estrito, SOLID, Clean Code, padrões do projeto, A11y, performance, memory leaks, edge cases, segurança

---

## Veredito

**Bloqueadores de merge** — 2 problemas afetam produção real.

1. O item "Feedback (+250)" do drawer mobile está 100% quebrado (clique leva ao NotFoundPage).
2. A `ContactPage` mantém um `FeedbackForm` local de ~160 linhas, duplicando `FeedbackFormFields` e não atualizando o saldo de créditos após envio.

---

## Achados priorizados

### 🔴 CRÍTICO

#### [CRITICAL] Item "Feedback (+250)" do drawer mobile não funciona

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:378`
- **Confidence:** 99/100
- **Categoria:** Bug
- **Problema:** O `onClick` do `ListItemButton` não passa `item.action` para `handleNavigate`, então o item "Feedback (+250)" (que tem `action: 'feedback'`) executa `navigate('__feedback__')` em vez de abrir o dialog. A rota `__feedback__` não existe → usuário vai para `NotFoundPage`.
- **Evidência:**
  ```tsx
  // linha 371-378
  {drawerItems.map((item) => {
    ...
    return (
      <ListItemButton
        key={item.to}
        onClick={() => handleNavigate(item.to)}   // ← NÃO passa item.action
        ...
  ```
  ```tsx
  // linha 139-147
  const handleNavigate = useCallback((to: string, action?: 'feedback') => {
    if (action === 'feedback') {
      openFeedback(location.pathname);
      closeDrawer();
      return;
    }
    navigate(to);   // ← cai aqui para o item de feedback
    closeDrawer();
  }, [navigate, closeDrawer, openFeedback, location.pathname]);
  ```
- **Impacto:** TODOS os usuários mobile que tentarem abrir feedback pelo drawer "Mais" vão parar na página 404. Quebra um dos 3 pontos de entrada de feedback da spec.
- **Sugestão:** Trocar `onClick={() => handleNavigate(item.to)}` por `onClick={() => handleNavigate(item.to, item.action)}` na linha 378.

---

#### [CRITICAL] ContactPage mantém `FeedbackForm` local duplicado (a refatoração não aconteceu)

- **Arquivo:** `src/pages/public/ContactPage.tsx:260-419`
- **Confidence:** 99/100
- **Categoria:** Architecture + Bug
- **Problema:** A spec dizia "Refatorado para usar `FeedbackFormFields` (de 162 linhas para 11)". A realidade é que o `ContactPage.tsx` continua com 705 linhas e mantém um componente `FeedbackForm()` local (linhas 260-419, ~160 linhas) que é praticamente uma duplicata do `FeedbackFormFields.tsx`. As duplicatas divergem em pontos críticos:
  - **NÃO chama `refreshCredits(false)`** → após enviar feedback via `/contato`, o `CreditIndicator` do Header não atualiza o saldo.
  - **NÃO consulta `feedbackBonusGranted`/`unlimitedCredits`** → após receber o bônus, o usuário pode reenviar e o componente mostra `successWithBonus` mesmo quando o backend retornou `bonusGranted: false`.
  - **Não aceita `defaultScreenContext` prop** (sempre começa vazio).
  - Usa chaves i18n `contact.feedback.*` (duplicadas em `feedback.dialog.*`).
  - Tipos `FeedbackCallableInput`/`Output` redeclarados inline (DRY quebrado).
- **Evidência:**
  ```tsx
  // ContactPage.tsx:260-327
  function FeedbackForm() {
    const { t } = useLocale();
    const log = createLogger('FeedbackForm');
    const [category, setCategory] = useState('');
    const [text, setText] = useState('');
    const [screenContext, setScreenContext] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);
    ...
    const result = await feedbackCall(removeUndefinedFields({ ... }));
    const data = result.data;
    setFeedbackSent(true);
    trackAnalyticsEvent('generate_lead', { source: 'feedback' });
    if (data.bonusGranted) {
      setBonusMessage(t('contact.feedback.successWithBonus'));
    }
    // ⚠️ NUNCA chama refreshCredits
    // ⚠️ NUNCA consulta feedbackBonusGranted do useCreditsStore
  ```
  ```tsx
  // ContactPage.tsx:659 — renderiza o local em vez do compartilhado
  <FeedbackForm />
  ```
  ```tsx
  // FeedbackFormFields.tsx:128-129 — versão correta, com refresh
  void refreshCredits(false);
  ```
- **Impacto:** Inconsistência grave entre dois caminhos de envio. O usuário pode receber a string "você ganhou 250 créditos" na página `/contato` mesmo quando o backend negou o bônus (segundo envio). E o `CreditIndicator` não reflete o novo saldo quando o feedback é enviado pela página pública.
- **Sugestão:**
  1. Apagar `FeedbackForm()` (linhas 260-419) e os tipos inline.
  2. Substituir `<FeedbackForm />` (linha 659) por `<FeedbackFormFields showSuccessInline defaultScreenContext="/contato" />`.
  3. Mover as strings de `contact.feedback.*` (pt-BR/en/es linhas 568-588) para `feedback.dialog.*` (já existem) e remover duplicação.
  4. Ajustar o teste `tests/pages/public/ContactPage.component.test.tsx` se necessário.

---

### 🟠 ALTO

#### [WARNING] Memory leak — `setTimeout` em `FeedbackDialog.handleSubmitted` sem cleanup

- **Arquivo:** `src/components/feedback/FeedbackDialog.tsx:46-53`
- **Confidence:** 90/100
- **Categoria:** Memory Leak + Race Condition
- **Problema:** O callback `setSubmitted` agenda um `setTimeout(2500ms)` que chama `setSubmitted(null)` e `onClose()`. Se o usuário fechar o dialog manualmente (X/ESC) antes dos 2.5s, ou se o componente for desmontado, o timer ainda dispara. Em React 19 StrictMode (dev) o ciclo `setup → cleanup → setup` evidencia o problema. Validado contra NotebookLM (React Docs): "Sempre limpe timers no retorno do useEffect para evitar que códigos órfãos rodem em background."
- **Evidência:**
  ```tsx
  const handleSubmitted = useCallback((result: FeedbackSubmitResult) => {
    setSubmitted(result);
    // Fecha automaticamente após 2.5s para dar tempo do usuário ler
    window.setTimeout(() => {
      setSubmitted(null);
      onClose();
    }, 2500);
  }, [onClose]);
  ```
- **Impacto:** Estado atualizado após desmount (silenciado em React 19 mas ainda é leak). `onClose` pode ser chamado duas vezes (auto-close 2.5s + click manual).
- **Sugestão:** Guardar o ID em `useRef` e adicionar `useEffect` de cleanup:
  ```tsx
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);
  ```

---

#### [WARNING] Memory leak — `setTimeout` em `FeedbackController.handleClose` sem cleanup

- **Arquivo:** `src/components/feedback/FeedbackController.tsx:46-50`
- **Confidence:** 88/100
- **Categoria:** Memory Leak
- **Problema:** Mesma lógica. `setTimeout(300ms)` chama `setScreenContext(undefined)` após o dialog fechar, mas se o `FeedbackController` desmontar nesse intervalo, ainda dispara `setState` em unmounted. Validado contra NotebookLM.
- **Evidência:**
  ```tsx
  const handleClose = useCallback(() => {
    setOpen(false);
    // Limpa o screenContext após fechar para não vazar entre aberturas
    window.setTimeout(() => setScreenContext(undefined), 300);
  }, []);
  ```
- **Impacto:** Vazamento de setState. Comportamento correto em produção na maior parte do tempo (Strict Mode dev evidencia).
- **Sugestão:** Mesmo padrão com `useRef` + `useEffect` cleanup. Alternativa: usar `useEffect` reagindo a `open` para limpar o context:
  ```tsx
  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => setScreenContext(undefined), 300);
      return () => window.clearTimeout(id);
    }
  }, [open]);
  ```

---

### 🟡 MÉDIO

#### [SUGESTION] Dead code — `<Zoom>` no `FeedbackFab` não tem efeito

- **Arquivo:** `src/components/feedback/FeedbackFab.tsx:72-138`
- **Confidence:** 95/100
- **Categoria:** Dead Code
- **Problema:** O componente retorna `null` na linha 72 quando `!shouldShow`. O `<Zoom in={shouldShow}>` (linha 75) está depois do early return, então sempre renderiza com `in={true}` quando chega nele — nunca há transição de entrada.
- **Evidência:**
  ```tsx
  if (!shouldShow) return null;   // linha 72

  return (
    <Zoom in={shouldShow} timeout={300}>   // ← sempre true aqui
  ```
- **Impacto:** Wrapper desnecessário, código morto, transição de animação que o autor acreditava existir não acontece.
- **Sugestão:** Remover o `<Zoom>` wrapper, ou renderizar o Zoom condicionalmente fora do `if (!shouldShow) return null` (mais complexo). Manter o FAB aparece/desaparece instantaneamente é aceitável aqui.

---

#### [SUGGESTION] Tipos `FeedbackCallableInput`/`Output` redeclarados no frontend

- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:39-51`
- **Confidence:** 92/100
- **Categoria:** Architecture + TypeScript
- **Problema:** O backend já exporta `FeedbackInput`/`FeedbackOutput` (`functions/src/genkit/schemas/common.ts:476-477`). O frontend redeclara manualmente em `FeedbackFormFields` e também inline no `ContactPage.FeedbackForm`. Mudanças no schema quebram silenciosamente em runtime.
- **Evidência:**
  ```tsx
  // FeedbackFormFields.tsx:39-51
  interface FeedbackCallableInput {
    category: string;
    text: string;
    screenContext?: string;
    requestId: string;
  }
  interface FeedbackCallableOutput {
    success: boolean;
    bonusGranted: boolean;
    availableCredits?: number;
  }
  ```
- **Impacto:** Acoplamento manual. Mudança no Zod schema do backend (ex: adicionar `rating: number`) não causa erro de compilação no frontend.
- **Sugestão:** Consumir tipos compartilhados via `firebase-functions` SDK ou gerar types. Curto prazo: pelo menos centralizar em `src/types/feedback.ts` e importar de lá (evita a duplicação do ContactForm do achado crítico #2).

---

#### [SUGGESTION] Cast inseguro `e.target.value as FeedbackCategory`

- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:173`
- **Confidence:** 85/100
- **Categoria:** TypeScript
- **Problema:** Cast forçado que ignora validação em runtime. Se o DOM for manipulado (DevTools, XSS via outra rota), o valor inválido passa.
- **Evidência:**
  ```tsx
  onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value as FeedbackCategory)}
  ```
- **Impacto:** Tipo mente para o TypeScript. Como o backend valida com `z.string()`, não há impacto funcional, mas é padrão ruim.
- **Sugestão:** Validar contra `FEEDBACK_CATEGORIES`:
  ```tsx
  const isValidCategory = (v: string): v is FeedbackCategory =>
    FEEDBACK_CATEGORIES.some((c) => c.value === v);
  onChange={(e) => {
    const value = e.target.value;
    if (isValidCategory(value) || value === '') setCategory(value);
  }}
  ```

---

#### [SUGGESTION] Inconsistência `useCredits` vs `useCreditsStore` direto

- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:90`
- **Confidence:** 80/100
- **Categoria:** Architecture
- **Problema:** Usa `useCreditsStore((s) => s.refreshCredits)` direto. O resto do projeto usa `useCredits()` (com `useShallow`).
- **Evidência:**
  ```tsx
  const refreshCredits = useCreditsStore((s) => s.refreshCredits);
  ```
- **Impacto:** Funciona (selector retorna função estável), mas é inconsistente com o padrão do projeto.
- **Sugestão:** Usar o hook composto:
  ```tsx
  const { refreshCredits } = useCredits();
  ```
  Cuidado: precisa do `useShallow` no seletor para evitar re-render desnecessário.

---

#### [SUGGESTION] `t()` com `defaultValue` é ignorado pelo i18n

- **Arquivo:** `src/components/feedback/FeedbackFab.tsx:132`
- **Confidence:** 88/100
- **Categoria:** Bug Latente
- **Problema:** O `t()` em `src/features/i18n/context.tsx:49-68` **NÃO suporta `defaultValue`**. O segundo parâmetro é só `params?: Record<string, string | number>` passado para `interpolate()`. O `interpolate()` (`utils.ts:30-40`) substitui `{variavel}` no template; se a chave não tem placeholder, o `defaultValue` é silenciosamente IGNORADO.
- **Evidência:**
  ```tsx
  // FeedbackFab.tsx:132
  {t('feedback.fab.badgeLabel', { defaultValue: `+${FEEDBACK_BONUS_DISPLAY}` })}
  ```
  ```ts
  // context.tsx:49-68
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(dictionaries[locale], key);
      if (value === undefined && locale !== DEFAULT_LOCALE) { ... }
      if (value === undefined) { value = key; }  // ← fallback é a própria chave
      return interpolate(value, params);         // ← params não tem 'defaultValue' especial
    }
  ```
- **Impacto:** Como a chave `feedback.fab.badgeLabel = '+250'` existe nos 3 locales, hoje funciona. Mas se a chave for removida/renomeada, o badge vai mostrar a própria string `'feedback.fab.badgeLabel'` como texto visível — feio e confuso para QA.
- **Sugestão:** Remover o `defaultValue` e usar a constante direto:
  ```tsx
  {`+${FEEDBACK_BONUS_DISPLAY}`}
  ```
  ou implementar `defaultValue` no `t()` (mudança maior no i18n).

---

### ⚪ BAIXO

#### [SUGGESTION] `useFeedbackDialog` com `useCallback` é overkill

- **Arquivo:** `src/components/feedback/useFeedbackDialog.ts:29-34`
- **Confidence:** 75/100
- **Categoria:** Architecture
- **Problema:** O hook retorna `useCallback` com deps `[]` envolvendo só `window.dispatchEvent`. A função é estável, mas o `useCallback` adiciona overhead sem benefício.
- **Evidência:**
  ```tsx
  return useCallback((screenContext?: string) => {
    const event = new CustomEvent(OPEN_FEEDBACK_DIALOG_EVENT, { detail: { screenContext } });
    window.dispatchEvent(event);
  }, []);
  ```
- **Impacto:** Cosmético. Sem problema real.
- **Sugestão:** Retornar função direta:
  ```tsx
  return (screenContext?: string) => { ... };
  ```

---

#### [SUGGESTION] Sentinela hardcoded `'__feedback__'`

- **Arquivo:** `src/components/app/MobileBottomNav.tsx:107`
- **Confidence:** 70/100
- **Categoria:** Type Safety
- **Problema:** `'__feedback__'` é valor sentinela hardcoded. Funciona só porque a rota não existe.
- **Evidência:**
  ```tsx
  items.push({
    to: '__feedback__',   // ← sentinela (bug se alguém criar essa rota)
    label: t('feedback.navItem.drawerLabel'),
    icon: RateReviewIcon,
    action: 'feedback',
  });
  ```
- **Impacto:** Cosmético. O sentinela é o sintoma do bug crítico #1 — quando o fix chegar, o `to` deixa de ser necessário.
- **Sugestão:** Quando corrigir o bug crítico, mudar para discriminated union:
  ```tsx
  type DrawerItem = { to: string; label: string; icon: ElementType } | { label: string; icon: ElementType; action: 'feedback' };
  ```

---

#### [SUGGESTION] `category: string` no `FeedbackCallableInput` (em vez de `FeedbackCategory`)

- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:40`
- **Confidence:** 75/100
- **Categoria:** TypeScript
- **Problema:** O tipo aceita qualquer `string`, não o union `FeedbackCategory`. Backend valida, mas o tipo mente.
- **Sugestão:** `category: FeedbackCategory`.

---

#### [SUGGESTION] `removeUndefinedFields` aplicado desnecessariamente ao payload pequeno

- **Arquivo:** `src/components/feedback/FeedbackFormFields.tsx:112-117`
- **Confidence:** 65/100
- **Categoria:** Performance
- **Problema:** O payload é de 4 campos. `removeUndefinedFields` é recursivo (`Object.fromEntries`). Para esse caso, um simples `|| null` resolve.
- **Evidência:**
  ```tsx
  const result = await feedbackCall(removeUndefinedFields({
    category,
    text: text.trim(),
    screenContext: screenContext.trim() || undefined,
    requestId: crypto.randomUUID(),
  }));
  ```
- **Impacto:** Imperceptível. < 1µs.
- **Sugestão:** Manter se for o padrão do projeto para `httpsCallable` (consistência); caso contrário, simplificar.

---

#### [SUGGESTION] `aria-label` repetindo `tooltip` no FeedbackFab

- **Arquivo:** `src/components/feedback/FeedbackFab.tsx:87, 92`
- **Confidence:** 65/100
- **Categoria:** A11y
- **Problema:** `tooltip` e `aria-label` recebem o mesmo texto "Enviar feedback (+250 créditos)". Screen readers anunciam texto longo.
- **Evidência:**
  ```tsx
  <Tooltip title={t('feedback.fab.tooltip')} placement="left" arrow>
    <Fab
      ...
      aria-label={t('feedback.fab.tooltip')}  // ← mesmo texto
  ```
- **Impacto:** Cosmético. UX levemente pior para usuários de leitor de tela.
- **Sugestão:** Separar:
  ```tsx
  aria-label={t('feedback.fab.ariaLabel')}  // "Enviar feedback"
  ```

---

## O que parece saudável

- **`FeedbackController`**: Type guard `isFeedbackOpenEventDetail` para validação do `event.detail` é correto. Cleanup do `addEventListener` está implementado (`useEffect` return).
- **`useFeedbackDialog`**: Hook imperativo simples, sem prop drilling. Bom padrão.
- **`FeedbackFab`**: Lógica de visibilidade baseada em `useMemo` está limpa. Uso correto de `useLocation` para `screenContext`.
- **`FeedbackBanner`**: Componente focado (SRP), early return limpo para condicionais de exibição.
- **i18n**: 3 locales cobertos, chaves bem organizadas em `feedback.{dialog,fab,banner,emptyState,navItem}`. `Interpolate` é testado.
- **Tokens de tema**: Uso consistente de `BRAND_SECONDARY`, `BRAND_SECONDARY_GLOW_SOFT`, `alpha()` — segue o padrão glass do projeto.
- **Logger**: `createLogger('FeedbackFormFields')` corretamente aplicado.
- **Analytics**: `trackAnalyticsEvent('generate_lead', { source: 'feedback' })` em ambos os pontos de envio.
- **App Check / Auth**: Backend já valida com `isSignedIn` + `enforceAppCheck: true` (não é problema do frontend).
- **i18n com namespaces bem isolados**: nenhuma string hardcoded no JSX.
- **Testes existentes** (FeedbackController: 9 testes, FeedbackFab: 11 testes): cobrem fluxos principais e edge cases (event.detail inválido, cleanup no unmount, rotas ocultas).

---

## Limites da revisão

- **Não executei lint/typecheck/build/testes** — auditoria é estática.
- **Não li `FeedbackBanner` e `useFeedbackDialog` no detalhe de padrões visuais** — parecem saudáveis em primeira leitura.
- **Não verifiquei se o `FeedbackForm` do ContactPage é testado** — não encontrei testes específicos para o componente, apenas o `ContactPage.component.test.tsx` (que provavelmente testa o componente inteiro).
- **Não validei a tipagem de `useShallow` no `useCredits`** — assumi que está consistente com o resto do projeto.
- **NotebookLM consultado**: React Docs (validação de memory leak com setTimeout). Não consultei MUI/Zod/Firebase — não foram necessários para os achados priorizados.
- **Não rodei `bun run build`** — auditoria é proporcional ao escopo, conforme instrução.

---

## Gate de Saída Final

- [x] Li o contexto mínimo real e reuni evidência suficiente (8 arquivos novos + 5 integrações + 3 locales + 2 testes)
- [x] Cada achado passou pela validação anti-falso-positivo (verifiquei tipos, mitigações, comportamentos)
- [x] Cada achado passou pelo confidence gate numérico (mínimo 80 para reportar)
- [x] Achados < 80 foram descartados ou rebaixados
- [x] Relatório consolidado, priorizado e salvo em `docs/audits/`
- [x] Existe motivo real para escalar: 2 bloqueadores de merge (bug crítico no drawer + DRY quebrado no ContactPage)

**Recomendação:** Não mergear até corrigir os 2 achados CRÍTICOS. Os 2 WARNINGs (memory leaks) podem ir em follow-up se aceitarem o trade-off.
