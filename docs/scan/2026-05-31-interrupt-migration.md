# Scan de Lacunas — Migração interviewTool → defineInterrupt

**Escopo:** Migração do tool manual `interviewTool` (ai.dynamicTool) para `interviewInterrupt` (ai.defineInterrupt) no Genkit beta.
**Data:** 2026-05-31
**Arquivos analisados:**
- `functions/src/flows/assistant.ts` (backend — flow do assistente)
- `functions/src/genkit/schemas/common.ts` (schemas Zod de input/output)
- `src/hooks/useAssistant.ts` (hook frontend — gerencia estado e comunicação)
- `src/features/assistant/Assistant.tsx` (componente principal do assistente)
- `src/features/assistant/components/InterviewPanel.tsx` (UI da entrevista)
- `src/lib/db/types.ts` (tipos de persistência — ChatSession)
- `src/lib/callable-utils.ts` (utilitário removeUndefinedFields)

---

## O que parece sólido

1. **Definição do interrupt no backend** — `interviewInterrupt = ai.defineInterrupt(...)` (assistant.ts:637-648) está correto: nome `'interview'`, `inputSchema`, `outputSchema`, `requestMetadata`.
2. **Construção do resume** — `interviewInterrupt.respond()` (assistant.ts:389-392) recebe o `interruptToolRequest` e o `outputData` corretamente.
3. **Uso no generateStream** — `interviewInterrupt` está na lista de tools (assistant.ts:709) e `resume: genkitResume` é passado (assistant.ts:713).
4. **Detecção de interrupts** — `response.interrupts` é verificado (assistant.ts:816), o input é extraído e o `interruptToolRequest` é construído com `name`, `ref`, `input` (assistant.ts:825-829).
5. **Output schema** — `interruptToolRequest` está no `AssistantOutputSchema` (common.ts:201) usando `AssistantHistoryToolRequestSchema`.
6. **Frontend recebe o output** — `AssistantFlowOutput` tem `interruptToolRequest` (useAssistant.ts:109) e o armazena no ref (useAssistant.ts:704).
7. **Frontend envia no input** — `interruptToolRequest` é enviado quando há `resume` (useAssistant.ts:575).
8. **clearInterview limpa o ref** — (useAssistant.ts:502-505).
9. **Sem referências residuais** — `interviewTool` e `interviewTriggered` não existem em nenhum arquivo.
10. **UI da entrevista** — `InterviewPanel` renderiza corretamente e `handleAnswerInterview` constrói o `InterviewResumeData` (Assistant.tsx:359-375).

---

## Lacunas priorizadas

| ID | Severidade | Tipo | Confidence | Descrição | Evidência | Mitigações verificadas | Pergunta/decisão |
|----|------------|------|------------|-----------|-----------|------------------------|------------------|
| G1 | **CRÍTICO** | Campo ausente no schema | 95 | `interruptToolRequest` não está no `AssistantInputSchema` e o schema não tem `.passthrough()`. O Zod stripa campos extras por padrão, então `input.interruptToolRequest` será `undefined` no backend. O `genkitResume` nunca é construído — **o resume de interrupts não funciona.** | `AssistantInputSchema` (common.ts:171-187) não tem `interruptToolRequest`. Frontend envia em useAssistant.ts:575. Backend tenta ler em assistant.ts:374. | Nenhuma — o campo é lido mas nunca chega. | Adicionar `interruptToolRequest: AssistantHistoryToolRequestSchema.nullable().optional()` ao `AssistantInputSchema`? |
| G2 | **ALTO** | Ref limpa antes do uso | 95 | `interruptToolRequestRef.current` é limpo na linha 724 de useAssistant.ts, **dentro do mesmo bloco** que o define na linha 704. Quando o usuário responde à entrevista e chama `sendMessage`, o ref já é `null`. | useAssistant.ts:704 define, useAssistant.ts:724 limpa — ambos no mesmo `try` do `finalData`. | Nenhuma — a limpeza é incondicional. | Mover a limpeza para `startNewChat` e `clearInterview` apenas? |
| G3 | **ALTO** | Persistência ausente | 90 | `interruptToolRequest` não está no tipo `ChatSession` nem é persistido no auto-save. Se o usuário recarregar a página durante um interrupt pendente, o resume é impossível. | `ChatSession` (db/types.ts:174-192) não tem `interruptToolRequest`. Auto-save em useAssistant.ts:346-360 não o inclui. | `pendingInterview` é persistido, mas sem o `interruptToolRequest` o resume não funciona. | Adicionar `interruptToolRequest?: { name: string; ref?: string; input?: unknown }` ao `ChatSession`? |
| G4 | **ALTO** | Restauração ausente | 90 | `loadSession` não restaura `interruptToolRequestRef` a partir da sessão. Sessões salvas com interrupt pendente não podem ser retomadas. | `loadSession` (useAssistant.ts:467-496) restaura `pendingInterview`, `fullHistory`, `plan` — mas não `interruptToolRequest`. | Nenhuma. | Adicionar `interruptToolRequestRef.current = session.interruptToolRequest ?? null` no `loadSession`? |
| G5 | **BAIXO** | Limpeza incompleta | 80 | `startNewChat` não limpa explicitamente `interruptToolRequestRef.current`. Na prática o `setInterview(null)` impede novos resumes, mas o ref fica com estado residual. | `startNewChat` (useAssistant.ts:442-465) limpa `planRef`, `fullHistoryRef`, etc. — mas não `interruptToolRequestRef`. | `clearInterview` limpa o ref (useAssistant.ts:504), mas `startNewChat` não chama `clearInterview`. | Adicionar `interruptToolRequestRef.current = null` ao `startNewChat`? |
| G6 | **BAIXO** | Histórico desatualizado | 85 | Quando o cliente desconecta durante streaming (sendFailed), o `fullHistory` retornado é `historyBase` (input), não `response.messages` (Genkit). O histórico fica desatualizado. | assistant.ts:805 retorna `fullHistory: historyBase` no caminho de desconexão. | O texto parcial já foi gerado e créditos confirmados. | Aceitar como edge case raro ou tentar preservar `response.messages` parciais? |

---

## Cenários de borda sem resposta

1. **Multiplos interrupts encadeados** — Se o modelo chamar `interview` duas vezes na mesma sessão (ex: pergunta 1 → resposta → pergunta 2), o segundo interrupt sobrescreve o primeiro no `interruptToolRequestRef`. Isso é comportamento esperado ou precisa de fila?

2. **Interrupt + compaction** — Se a compactação disparar durante um interrupt pendente, o `fullHistory` é substituído. O `interruptToolRequest` contém um `ref` que aponta para uma mensagem que pode ter sido compactada. O Genkit consegue resolver isso?

3. **Interrupt sem resposta (timeout)** — Não há mecanismo de timeout para interrupts pendentes. Se o usuário nunca responder, o interrupt fica na sessão para sempre. Isso é intencional?

---

## Checklist de sanidade

- [x] Li os arquivos completos (assistant.ts, useAssistant.ts, common.ts, types.ts)
- [x] Verifiquei que `AssistantInputSchema` NÃO tem `.passthrough()`
- [x] Verifiquei que `interruptToolRequest` NÃO está no schema de input
- [x] Confirmei que o frontend envia o campo (useAssistant.ts:575)
- [x] Confirmei que o backend tenta ler (assistant.ts:374)
- [x] Verifiquei que `startNewChat` não limpa o ref
- [x] Verifiquei que `loadSession` não restaura o ref
- [x] Verifiquei que `ChatSession` não persiste o campo
- [x] Busquei referências residuais ao antigo `interviewTool` — nenhuma encontrada
- [x] Busquei referências residuais ao `interviewTriggered` — nenhuma encontrada

---

## Próximos passos

1. **G1 (CRÍTICO):** Adicionar `interruptToolRequest` ao `AssistantInputSchema` — **bloqueia todo o fluxo de resume**.
2. **G2 (ALTO):** Remover a limpeza prematura do ref na linha 724 de useAssistant.ts.
3. **G3+G4 (ALTO):** Persistir e restaurar `interruptToolRequest` no `ChatSession`.
4. **G5 (BAIXO):** Adicionar limpeza do ref em `startNewChat`.
5. **G6 (BAIXO):** Decidir se preserva `response.messages` no caminho de desconexão.

**Recomendação:** Executar `/run` para corrigir G1–G4 (as 4 lacunas que impedem o funcionamento do resume).
