# Auditoria Estática — InterviewPanel, PlanWidget e componentes relacionados

**Data:** 2026-05-28
**Escopo:** `InterviewPanel.tsx` (NOVO), `PlanWidget.tsx` (MODIFICADO), `Assistant.tsx` (MODIFICADO), `useAssistant.ts` (MODIFICADO), `types.ts` (MODIFICADO), locales pt-BR/en/es (MODIFICADOS)
**Focos:** Acessibilidade, Performance, UX, Tipagem

---

## Veredito: Ajustes recomendados

A implementação é funcional e bem estruturada, mas apresenta problemas reais de acessibilidade no InterviewPanel (radiogroup semântico fraco) e no PlanWidget (botão toggle sem ARIA), além de uma animação CSS que não funciona como declarado.

---

## Achados priorizados

### [WARNING] InterviewPanel: opções sem `role="radio"` e `aria-checked`

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:226-268`
- **Confidence:** 95/100
- **Categoria:** A11y
- **Problema:** As opções de entrevista são `<Box onClick>` sem atributos ARIA de rádio. O `<Radio>` interno tem `slotProps.input` correto, mas o elemento pai clicável (que é o alvo real da interação) não tem `role="radio"` nem `aria-checked`. Leitores de tela não conseguem identificar o estado selecionado no container interativo.
- **Evidência:**
  ```tsx
  <Box
    key={option.label}
    onClick={() => handleOptionClick(index)}
    sx={{ /* estilos de seleção visual */ }}
  >
    <Radio
      checked={isSelected}
      size="small"
      slotProps={{ input: { 'aria-label': option.label } }}
    />
  ```
- **Impacto:** Usuários de leitores de tela não sabem qual opção está selecionada nem podem interagir corretamente com as opções.
- **Sugestão:** Adicionar `role="radio"` e `aria-checked={isSelected}` ao `<Box>` de cada opção. Ou, preferencialmente, usar `<FormControlLabel control={<Radio />} label={...} />` dentro de um `<RadioGroup>` (ver próximo achado).

**Notebook consultado:** MUI V9/V7 Docs — confirma que `<Radio>` standalone precisa de `aria-label` via `slotProps.input`, mas o padrão recomendado é `<FormControlLabel>` + `<RadioGroup>` para navegação semântica completa.

---

### [WARNING] InterviewPanel: navegação por teclado reimplanta RadioGroup nativo

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:69-107, 221`
- **Confidence:** 90/100
- **Categoria:** A11y
- **Problema:** O componente recria a navegação ↑↓/Enter manualmente em um `<Box role="radiogroup">` com `tabIndex={0}`, em vez de usar `<RadioGroup>` do MUI que fornece "roving tabindex" WAI-ARIA nativo. A reimplementação manual é frágil e pode divergir do comportamento esperado por tecnologias assistivas.
- **Evidência:**
  ```tsx
  <Stack spacing={0.5} role="radiogroup" aria-label={interview.question}>
    {interview.options!.map((option, index) => {
      const isSelected = index === selectedIndex;
      return (
        <Box key={option.label} onClick={() => handleOptionClick(index)}>
          <Radio checked={isSelected} ... />
  ```
- **Impacto:** Padrão de acessibilidade inconsistente com o esperado. O `aria-label` no `Stack` é válido, mas o grupo não tem `aria-labelledby` vinculado à pergunta visível.
- **Sugestão:** Refatorar para usar `<RadioGroup>` + `<FormControlLabel>` que resolvem automaticamente roving tabindex, `aria-checked`, e navegação por setas. Manter a opção "Outra resposta" como último item com lógica custom.

**Notebook consultado:** MUI V9/V7 Docs — "RadioGroup is a helpful wrapper used to group Radio components that provides an easier API, and proper keyboard accessibility to the group."

---

### [WARNING] PlanWidget: ButtonBase de toggle sem `aria-expanded` e `aria-label`

- **Arquivo:** `src/features/assistant/components/PlanWidget.tsx:227-273`
- **Confidence:** 90/100
- **Categoria:** A11y
- **Problema:** O `<ButtonBase>` que expande/colapsa o plano não tem `aria-expanded` para indicar o estado visual, nem `aria-label` descritivo. Leitores de tela não conseguem anunciar se o plano está expandido ou colapsado.
- **Evidência:**
  ```tsx
  <ButtonBase
    onClick={handleToggle}
    sx={{
      width: '100%',
      justifyContent: 'space-between',
      borderRadius: RADIUS_XS,
      textAlign: 'left',
    }}
  >
  ```
- **Impacto:** Usuários de leitores de tela perdem contexto sobre o estado do widget de plano.
- **Sugestão:** Adicionar `aria-expanded={expanded}` e `aria-label={t('assistant.plan.title')}` ao `<ButtonBase>`.

---

### [WARNING] PlanWidget: transição CSS em `text-decoration` não é animável

- **Arquivo:** `src/features/assistant/components/PlanWidget.tsx:152`
- **Confidence:** 95/100
- **Categoria:** UI
- **Problema:** A propriedade `text-decoration` não é animável via CSS transitions. A declaração `transition: '... text-decoration 220ms ease'` não produz efeito visual — o strikethrough aparece/desaparece instantaneamente.
- **Evidência:**
  ```tsx
  transition: 'color 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), text-decoration 220ms ease',
  ```
- **Impacto:** A animação de strikethrough não funciona como projetado. O efeito visual é um corte seco, não uma transição suave.
- **Sugestão:** Remover `text-decoration` da transition (as transições de `color` e `opacity` já produzem o efeito visual desejado). Se quiser animação de linha sobre o texto, usar um `<Box>` absoluto com `scaleX` animado via Motion (conforme padrão do notebook Motion Docs).

**Notebook consultado:** Motion Docs — sugere usar `<motion.div>` com `scaleX` de 0→1 e `originX: 0` para animação de strikethrough, já que `text-decoration` não é animável.

---

### [SUGGESTION] InterviewPanel: `autoFocus` pode conflitar com callback ref focus

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:188-193, 207`
- **Confidence:** 80/100
- **Categoria:** UX
- **Problema:** O `<TextField>` tem `autoFocus` (linha 207) E um `inputRef` callback que chama `requestAnimationFrame(() => el.focus())` (linha 192). O `autoFocus` nativo já foca o elemento; o callback ref pode causar um segundo foco redundante ou competir com o autoFocus em alguns browsers.
- **Evidência:**
  ```tsx
  <TextField
    inputRef={(el) => {
      customInputRef.current = el;
      if (isCustomMode && el) {
        requestAnimationFrame(() => el.focus());
      }
    }}
    // ...
    autoFocus
  />
  ```
- **Impacto:** Em navegadores rápidos, o `requestAnimationFrame` pode executar antes do `autoFocus` nativo, causando flicker de foco. Em geral funciona, mas é redundante.
- **Sugestão:** Usar apenas o callback ref para foco (React 19 best practice com cleanup function) e remover `autoFocus`, ou usar apenas `autoFocus` e remover o callback ref focus. O callback ref é mais confiável para modo custom.

**Notebook consultado:** React Docs — "ref callbacks can now return a cleanup function" e "Don't read or write ref.current during rendering." O padrão de callback ref é recomendado sobre `autoFocus` para controle preciso.

---

### [SUGGESTION] useAssistant: `interviewRef` declarado após uso (ordem de declaração)

- **Arquivo:** `src/hooks/useAssistant.ts:194, 207`
- **Confidence:** 80/100
- **Categoria:** Architecture
- **Problema:** `interviewRef` é usado no `useEffect` da linha 194 mas declarado na linha 207. Embora `const` seja içado (temporal dead zone), o useEffect roda após o render quando a ref já existe. Funciona, mas a ordem é confusa para leitura humana.
- **Evidência:**
  ```tsx
  // Linha 194:
  useEffect(() => { interviewRef.current = interview; }, [interview]);
  // Linha 207:
  const interviewRef = useRef<InterviewDatum | null>(null);
  ```
- **Impacto:** Nenhum bug em runtime (useEffect executa após inicialização), mas dificulta manutenção.
- **Sugestão:** Mover a declaração de `interviewRef` para antes do useEffect (ao lado de `planRef` na linha 206).

---

### [SUGGESTION] InterviewPanel: opções "Outra resposta" Box também sem `role="radio"`

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:272-304`
- **Confidence:** 95/100
- **Categoria:** A11y
- **Problema:** Mesmo problema do achado principal: o `<Box>` da opção "Outra resposta" não tem `role="radio"` nem `aria-checked`, apesar de ser interativo.
- **Evidência:**
  ```tsx
  <Box
    onClick={() => handleOptionClick(customOptionIndex)}
    sx={{ /* ... */ }}
  >
    <Radio
      checked={customOptionIndex === selectedIndex}
      size="small"
      slotProps={{ input: { 'aria-label': t('assistant.interview.otherAnswer') } }}
    />
  ```
- **Impacto:** Leitores de tela não anunciam "Outra resposta" como opção de rádio selecionável.
- **Sugestão:** Mesma correção do achado principal — adicionar `role="radio"` e `aria-checked`.

---

## O que parece saudável

- **Locale keys:** As 5 chaves `assistant.interview.*` estão presentes e consistentes nos 3 idiomas (pt-BR, en, es).
- **Tipagem:** `InterviewDatum`, `InterviewOption`, `InterviewResumeData` são bem definidos em `types.ts`. `ChatSession` usa `import()` inline para `activePlan` e `pendingInterview` — funcional e evita circular imports.
- **Persistência:** `useAssistant` salva `planRef` e `interviewRef` no `ChatSession` e restaura em `loadSession` — boa resiliência a reload.
- **Ref sync:** O padrão `useEffect(() => { interviewRef.current = interview; }, [interview])` é correto para evitar stale closures no auto-save.
- **Streaming:** O buffer por `requestAnimationFrame` com flush no final é bem implementado.
- **PlanWidget:** `StatusIcon` e `SubtaskStatusIcon` são componentes puros com props estáveis. `useMemo` no `progress` evita recálculo desnecessário.
- **Animação pulsante:** O `keyframes` de pulso no PlanWidget usa `transform` e `opacity` (propriedades compositing-friendly) — performático.
- **Cores hardcoded:** Os valores `#2196f3` e `#4caf50` no PlanWidget (linhas 263, 288, 293) são usados para estados semânticos (info/success) e alinham com `theme.palette.info.main` e `theme.palette.success.main` do MUI. Aceitável, mas poderiam usar `theme.palette` via sx function para consistência.

---

## Limites da revisão

- Não foi possível verificar se o `RadioGroup` do MUI v9 mantém o mesmo comportamento de roving tabindex descrito no notebook (não li o source do MUI).
- O componente `AssistantComposer` não foi auditado (fora do escopo declarado).
- Não verifiquei se os tipos `AssistantPlan`, `AssistantTaskStatus`, `AssistantTaskPriority` estão corretos no backend Genkit (apenas frontend).
- A transição de `text-decoration` pode ter comportamento diferente em browsers específicos, mas a especificação CSS é clara que não é animável.
