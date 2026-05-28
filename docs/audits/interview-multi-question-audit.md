# Auditoria Estática — Interview Multi-Question + Multi-Select

**Data:** 2026-05-28  
**Escopo:** InterviewPanel (rewrite), schemas backend, types frontend, handleAnswerInterview, i18n  
**Notebooks consultados:** Loop Agêntico Genkit-Opencode Dev, MUI V9/V7 Docs, React Docs

---

## Veredito

**Bloqueadores de merge** — 2 bugs críticos que quebram o fluxo multi-question em produção.

---

## Achados Priorizados

### [CRITICAL] Multi-question: seleção em qualquer aba dispara envio imediato de TODAS as respostas

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:454-467`
- **Confidence:** 98/100
- **Categoria:** Bug
- **Problema:** `handleSingleQuestionAnswer` é chamado para TODAS as perguntas (single e multi-question). A condição `!question.multiple && !isMultiQuestion` permite envio imediato apenas quando `isMultiQuestion === false`, mas o bug é que a função é usada como callback para **todas** as abas no modo multi-question (linha 611). Quando o usuário seleciona uma opção em qualquer aba, `handleSingleQuestionAnswer` atualiza o estado e, como `isMultiQuestion` é `true`, NÃO envia imediatamente — correto. **Porém**, se a primeira pergunta individual tiver `multiple: false` e o `interview.questions` tiver apenas 1 item (mas `interview.question` também existe), o `isMultiQuestion` pode ser `false` e o envio imediato dispara antes do fluxo de confirmação.
- **Evidência:**
  ```tsx
  // Linha 454-467
  const handleSingleQuestionAnswer = useCallback((index: number, state: QuestionState) => {
    const question = questions[index];
    if (!question) return;
    updateQuestionState(index, state);
    // Se não for multiple e não for multi-question, envia imediatamente
    if (!question.multiple && !isMultiQuestion) {
      const answer = buildAnswerForQuestion(question, state);
      if (answer) {
        onAnswer(answer);  // ← ENVIA SEM PASSAR POR CONFIRMAÇÃO
      }
    }
  }, [questions, isMultiQuestion, updateQuestionState, onAnswer]);
  ```
- **Impacto:** Em modo multi-question com uma única pergunta de single-select, a resposta é enviada imediatamente sem passar pela aba de confirmação. O `answers[]` nunca é populado corretamente porque `onAnswer` é chamado sem o segundo argumento.
- **Sugestão:** Separar o callback: `handleSingleQuestionAnswer` para multi-question (nunca envia), e um callback dedicado para single-question com envio imediato. Ou adicionar checagem explícita: `if (!question.multiple && !isMultiQuestion && questions.length === 1)`.

---

### [CRITICAL] Backend ignora `resume.answers` — dados de multi-question são perdidos

- **Arquivo:** `functions/src/flows/assistant.ts:334-342`
- **Confidence:** 97/100
- **Categoria:** Bug / Architecture
- **Problema:** Quando o usuário responde a um interview multi-question, o frontend envia `resumeData.answers` com todas as respostas. O backend **ignora completamente** o campo `answers` e injeta no histórico apenas `resume.question` + `resume.answer` (a resposta primária). O modelo perde o contexto das respostas das outras perguntas.
- **Evidência:**
  ```typescript
  // Linha 334-342 — backend usa APENAS question + answer
  if (input.resume) {
    historyMessages.push({
      role: 'model' as const,
      content: [{ text: input.resume.question }],  // ← APENAS a primeira pergunta
    });
    historyMessages.push({
      role: 'user' as const,
      content: [{ text: input.resume.answer }],    // ← APENAS a resposta primária
    });
    // input.resume.answers é COMPLETAMENTE IGNORADO
  }
  ```
- **Impacto:** Em entrevistas multi-pergunta, o modelo recebe apenas 1 Q&A no histórico. As respostas das outras perguntas são perdidas. O modelo pode refazer perguntas já respondidas ou tomar decisões incorretas por falta de contexto.
- **Sugestão:** Iterar sobre `resume.answers` (ou construir um texto combinado) para injetar todos os pares Q&A no histórico:
  ```typescript
  if (input.resume) {
    const answers = input.resume.answers ?? [input.resume.answer];
    // Injeta cada Q&A no histórico
    // (ou combina em uma única mensagem estruturada)
  }
  ```

---

### [WARNING] "Outra resposta" renderiza Radio em vez de Checkbox no modo multi-select

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:332-363`
- **Confidence:** 95/100
- **Categoria:** UI / A11y
- **Problema:** Quando `isMultiple === true`, todas as opções regulares renderizam `<Checkbox>`, mas a opção "Outra resposta" sempre renderiza `<Radio>` (linha 354). Isso cria inconsistência visual e confunde o padrão de interação.
- **Evidência:**
  ```tsx
  // Linha 332-358 — "Outra resposta" SEMPRE renderiza Radio
  <Box
    role={isMultiple ? 'checkbox' : 'radio'}  // ← role correto
    aria-checked={state.isCustomMode}
    onClick={handleCustomClick}
  >
    <Radio                          // ← MAS renderiza Radio visual (incorreto para multi)
      checked={false}
      size="small"
      slotProps={{ input: { 'aria-label': t('assistant.interview.otherAnswer') } }}
    />
  ```
- **Impacto:** Usuário vê um Radio entre Checkboxes. A role ARIA está correta (`checkbox`), mas o componente visual é inconsistente. Pode causar confusão sobre se a seleção é exclusiva ou não.
- **Sugestão:** Condicionar o componente visual:
  ```tsx
  {isMultiple ? (
    <Checkbox checked={state.isCustomMode} ... />
  ) : (
    <Radio checked={state.isCustomMode} ... />
  )}
  ```

---

### [WARNING] keyboardHintMultiple diz "Enter enviar" mas Enter apenas togglea

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:370-373` + `src/features/i18n/locales/pt-BR.ts:1131`
- **Confidence:** 90/100
- **Categoria:** UX
- **Problema:** A dica de teclado para multi-select diz `↑↓ navegar · Espaço marcar · Enter enviar`, sugerindo que Enter envia a resposta. Na realidade, Enter chama `handleOptionToggle` (linha 147-152), exatamente como Espaço — ele apenas togglea a opção focada. O envio real requer clicar no botão "Enviar".
- **Evidência:**
  ```tsx
  // Linha 137-161 — Enter e Espaço fazem a MESMA coisa
  case 'Enter':
    event.preventDefault();
    if (focusedIndex === customOptionIndex) {
      updateState({ isCustomMode: true });
    } else if (hasOptions) {
      handleOptionToggle(focusedIndex);  // ← MESMO que Espaço
    }
    break;
  case ' ':
    if (focusedIndex < options.length) {
      event.preventDefault();
      handleOptionToggle(focusedIndex);  // ← MESMO que Enter
    }
    break;
  ```
- **Impacto:** Usuário pressiona Enter esperando enviar, mas a opção apenas togglea. Pode causar frustração e múltiplos cliques desnecessários.
- **Sugestão:** Alterar a dica para `↑↓ navegar · Enter/Espaço marcar` ou implementar Enter como envio quando pelo menos uma opção está selecionada.

---

### [WARNING] Formato de `answers` diverge do padrão recomendado (string[] vs string[][])

- **Arquivo:** `functions/src/genkit/schemas/common.ts:115-120` + `src/features/assistant/components/InterviewPanel.tsx:69-83`
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** O notebook do Loop Agêntico recomenda `answers: string[][]` (array 2D: outer = índice da pergunta, inner = labels selecionados). O schema atual usa `answers: z.array(z.string())` (1D). O frontend serializa multi-select como string separada por vírgula (`"Opção A, Opção B"`), o que é ambíguo se labels contiverem vírgulas.
- **Evidência:**
  ```typescript
  // common.ts:119 — schema usa string[] (1D)
  answers: z.array(z.string()).nullable().optional(),

  // InterviewPanel.tsx:82 — serialização ambígua
  return selected.join(', ');  // "Opção A, Opção B" — ambíguo se label tiver vírgula
  ```
- **Impacto:** Se um label de opção contiver vírgula (ex: "São Paulo, SP"), a serialização fica ambígua. Além disso, o backend não consegue distinguir entre uma resposta multi-select e uma resposta com vírgula no texto.
- **Sugestão:** Alinhar com o padrão do notebook: usar `answers: string[][]` no schema e no frontend. Ou, no mínimo, usar um separador que não aparece em labels (ex: `\n` ou serialização JSON).

---

### [SUGGESTION] "Outra resposta" Radio mostra `checked={false}` mesmo em modo custom

- **Arquivo:** `src/features/assistant/components/InterviewPanel.tsx:354-356`
- **Confidence:** 90/100
- **Categoria:** A11y
- **Problema:** O componente Radio da opção "Outra resposta" tem `checked={false}` hardcoded. Quando `state.isCustomMode === true`, o Box pai tem `aria-checked={true}`, mas o Radio visual não reflete isso. Screen readers que leem o input diretamente (não o Box) não informam que a opção está selecionada.
- **Evidência:**
  ```tsx
  <Radio
    checked={false}              // ← SEMPRE false, mesmo em custom mode
    size="small"
    slotProps={{ input: { 'aria-label': t('assistant.interview.otherAnswer') } }}
  />
  ```
- **Impacto:** Leitores de tela não anunciam "Outra resposta" como selecionada quando o campo de texto custom está ativo.
- **Sugestão:** `checked={state.isCustomMode}`.

---

### [SUGGESTION] Schema InterviewInput tem campos redundantes no nível raiz

- **Arquivo:** `functions/src/genkit/schemas/common.ts:104-112`
- **Confidence:** 80/100
- **Categoria:** Architecture
- **Problema:** `InterviewInputSchema` tem `question`, `options`, `multiple` no nível raiz E um array `questions` onde cada item também tem esses campos. O frontend faz fallback (linha 56-66 de InterviewPanel.tsx), mas a redundância gera confusão sobre qual é a fonte primária de dados.
- **Evidência:**
  ```typescript
  export const InterviewInputSchema = z.object({
    question: z.string(),                    // ← duplicado
    options: z.array(...).nullable().optional(),  // ← duplicado
    multiple: z.boolean().nullable().optional(),   // ← duplicado
    questions: z.array(InterviewQuestionSchema).nullable().optional(),  // ← cada item tem question, options, multiple
  });
  ```
- **Impacto:** Menor — a camada de fallback no frontend funciona. Mas dificulta manutenção e pode levar a bugs se os campos divergirem.
- **Sugestão:** Documentar que os campos raiz são backward-compat e que `questions` é a fonte primária. Ou migrar para usar apenas `questions` no backend e remover os campos raiz quando o modelo for atualizado.

---

## O que parece saudável

- **Set<number> para selectedIndices:** Padrão correto — novo Set a cada toggle respeita imutabilidade do React
- **useCallback com dependências corretas:** As dependências de `handleKeyDown`, `handleOptionToggle`, `handleSubmit` estão completas
- **Navegação por teclado ↑↓:** Implementação correta com wrap-around (`% totalItems`)
- **Tabs MUI com variant="scrollable":** Funciona bem para muitas perguntas
- **Reset de estado ao trocar interview:** `useEffect` com `[interview.question, questions.length]` é adequado
- **i18n completa nos 3 idiomas:** pt-BR, en, es com todas as 16 chaves do namespace `interview`
- **buildAnswerForQuestion com custom mode:** Prioriza texto custom sobre seleções (correto)
- **useMemo para questions e allAnswered:** Evita recálculos desnecessários

---

## Limites da revisão

- Não foi possível verificar se o backend consome `resume.answers` em algum outro ponto além de `assistant.ts:334-342` (grep retornou apenas aquele trecho)
- Não foi testado se o Gemini interpreta corretamente o campo `questions` no schema `InterviewInputSchema` (comportamento do modelo)
- Não foi verificado se há testes automatizados que cobrem o fluxo multi-question
- O notebook do Loop Agêntico referencia uma implementação SolidJS — a adaptação para React/MUI pode ter nuances não cobertas
