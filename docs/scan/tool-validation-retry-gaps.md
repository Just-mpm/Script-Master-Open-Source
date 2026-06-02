# Scan de Lacunas — Retry Robusto para Tool Validation Errors

**Escopo:** Implementação de `safeTool()` em `functions/src/flows/assistant.ts` + `.describe()` em `functions/src/genkit/schemas/common.ts`.
**Stack:** Genkit 1.34.0 + Google GenAI plugin, `dynamicTool`, `defineInterrupt`, `generateMiddleware` com `tool()`.
**Data:** 2026-06-02
**Modo:** Investigação orientada a gaps reais (não melhorias cosméticas).

---

## 1. Contexto assumido

A camada 1 (prevenção via `.describe()` nos campos Zod) e a camada 2 (resiliência via `safeTool()` wrapper) foram aplicadas **apenas nas 6 dynamicTools do `assistant.ts`**. O `interviewInterrupt` (defineInterrupt) e o `use_skill` (tool dentro do middleware de skills) **não foram protegidos** e usam o pattern nativo do Genkit — inputSchema real que o Gemini envia e o Genkit valida antes do handler. Se o modelo errar input nessas duas tools, o mesmo bug original reaparece: `ValidationError` aborta o stream.

**Premissas confirmadas via NotebookLM (Genkit Docs):**

- `parseSchema` é chamado **antes** do handler de qualquer tool/interrupt e lança `ValidationError` em input inválido (fonte: `bb826a5d-83b6-4844-af3c-b0a12eb6866c`).
- `z.unknown()` é convertido para JSON Schema vazio `{}` (fonte: `bb826a5d-83b6-4844-af3c-b0a12eb6866c` — `zodToJsonSchema`).
- O Gemini **pode rejeitar silenciosamente** tools com `parameters` ausentes ou vazios em alguns casos, ou enviar `{}` mesmo quando a description sugere campos (edge case conhecido).
- `maxTurns` padrão é 5; o PR subiu para 20. Quando excedido, Genkit lança `GenerationResponseError` com `ABORTED` (fonte: `67feef42-ce0b-418d-92bf-49baf7598058`).
- `defineInterrupt` é internamente uma tool; passa pelo mesmo `parseSchema` (fonte: `67feef42-ce0b-418d-92bf-49baf7598058`).

---

## 2. Mapa rápido: sólido vs frágil

### ✅ Sólido

| Camada | Componente | Status |
|---|---|---|
| 6 dynamicTools do assistant | `updatePlan`, `getStudioState`, `getUserMemories`, `updateStudio`, `respond`, `webSearch` | ✅ Coberto por `safeTool` |
| Erros de validação (input) | `validateToolInput` com `safeParse` | ✅ Retorna erro estruturado |
| Erros de runtime | `try/catch` no handler | ✅ Retorna erro estruturado |
| Frontend | `ToolEventCard.isError` + `ToolErrorCard` | ✅ Renderiza erro inline |
| `maxTurns: 20` | Limite de segurança do Genkit | ✅ Previne loop infinito catastrófico |
| Outros flows (audio, images, chunking, scenePrompts, inline-assistant) | Usam `ai.generate` SEM tools | ✅ Sem o mesmo gap (zero `dynamicTool`/`defineInterrupt` em outros arquivos — confirmado por `supergrep_find`) |

### ⚠️ Frágil / Sem proteção

| Componente | Risco | Detalhes |
|---|---|---|
| `interviewInterrupt` (`defineInterrupt`) | **CRÍTICO** | Usa `InterviewInputSchema` direto. Se Gemini enviar sem `question`, `ValidationError` aborta stream |
| `use_skill` (tool em `skills.ts` middleware) | **CRÍTICO** | Usa `tool()` de `genkit/beta` com `inputSchema: z.object({ skillName: ... })`. Se Gemini enviar `{}`, `ValidationError` aborta o loop do assistant (mesma chamada `ai.generateStream`) |
| `InterviewInputSchema` campos | **ALTO** | `question` (obrigatório) SEM `.describe()` |
| `InterviewQuestionSchema` campos | **ALTO** | Todos SEM `.describe()` |
| `GetStudioStateInputSchema.fields` | MÉDIO | SEM `.describe()` |
| `RespondSuggestedActionSchema` / `RespondMediaSchema` | MÉDIO | Todos os campos SEM `.describe()` |
| `use_skill` no assistant loop | **CRÍTICO** | Bug idêntico ao original em outro arquivo |
| Circuit breaker para retries consecutivos | **ALTO** | Ausente — `maxTurns: 20` é o único limite |
| Testes de `safeTool` | **ALTO** | Zero cobertura |

---

## 3. Gaps priorizados

### GAP-01 — `interviewInterrupt` não foi protegido pelo `safeTool()`

| Campo | Valor |
|---|---|
| **Severidade** | CRÍTICO |
| **Tipo** | Fluxo incompleto (mesmo bug original) |
| **Confidence** | 95 |
| **Descrição** | O `ai.defineInterrupt` em `assistant.ts:101-112` usa `InterviewInputSchema` direto no `inputSchema`. Se o Gemini enviar input inválido (ex: omitir o campo obrigatório `question`), o `parseSchema` do Genkit lança `ValidationError` antes do handler ser executado, abortando o `ai.generateStream` no `for await (const chunk of stream)`. Resultado: o stream quebra exatamente como no bug original. |
| **Evidência** | `assistant.ts:101-112` define `interviewInterrupt` SEM `safeTool`. O `InterviewInputSchema` (`common.ts:151-159`) tem `question: z.string()` (obrigatório) sem `.describe()`. Confirmado pelo NotebookLM: defineInterrupt é uma tool (`67feef42-ce0b-418d-92bf-49baf7598058`) e passa pelo mesmo `parseSchema` (`bb826a5d-83b6-4844-af3c-b0a12eb6866c`). |
| **Mitigações verificadas** | Nenhuma encontrada. O `safeTool` foi aplicado só em 6 dynamicTools (linhas 628, 639, 660, 687, 699, 710). O `interviewInterrupt` continua sendo passado direto em `tools: [...]` (linha 745). |
| **Pergunta/decisão** | O `defineInterrupt` aceita o mesmo pattern? Verificar se a API expõe `ai.dynamicInterrupt()` ou se é necessário criar um wrapper análogo. Se não existir, alternativa é validar input manualmente via `safeParse` no middleware que intercepta o envelope, ou converter o `interviewInterrupt` em uma `dynamicTool` com `interrupt()` interno. |

---

### GAP-02 — `use_skill` no middleware de skills tem o mesmo gap

| Campo | Valor |
|---|---|
| **Severidade** | CRÍTICO |
| **Tipo** | Fluxo incompleto (mesmo bug original, em outro arquivo) |
| **Confidence** | 90 |
| **Descrição** | O `use_skill` em `functions/src/genkit/middlewares/skills.ts:181-223` é registrado como tool via `tool()` de `genkit/beta` com `inputSchema: z.object({ skillName: z.string().describe(...) })` real. Como o middleware injeta essa tool no MESMO loop do `ai.generateStream` do assistant, qualquer input inválido do Gemini para `use_skill` aborta o stream do assistant inteiro. |
| **Evidência** | `skills.ts:181-197` define o tool com inputSchema nativo. `skills.ts:237` injeta via `tools: [useSkillTool]`. O `use` no `assistant.ts:748` (`use: [skillsMiddleware()]`) faz a tool ser passada para o `ai.generateStream` do assistant. NotebookLM confirmou: `tool()` também usa `parseSchema` antes do handler. |
| **Mitigações verificadas** | O handler já tem `try/catch` (linha 198-222) que retorna `{ error: true, tool: 'use_skill', message }` em caso de skill inexistente ou erro de leitura. Mas isso NÃO protege contra `ValidationError` em input inválido (skillName ausente), que acontece ANTES do handler. |
| **Pergunta/decisão** | Refatorar `use_skill` para usar `safeTool` também? Isso exigirá mover o handler para fora do factory `createSkillsMiddleware` (já está dentro, mas o schema está exposto). Alternativa: trocar `inputSchema` para `z.unknown()` e validar manualmente (mesmo padrão do `safeTool`). |

---

### GAP-03 — Schemas sem `.describe()` em campos críticos

| Campo | Valor |
|---|---|
| **Severidade** | ALTO (rebaixado de CRÍTICO porque o `safeTool` agora blinda a falha) |
| **Tipo** | Decisão pendente — cobertura incompleta da camada 1 |
| **Confidence** | 95 |
| **Descrição** | A camada 1 (prevenção) foi aplicada em apenas 6 dos 9 schemas de tools/interrupts. Campos sem `.describe()` recebem menos guidance do Gemini sobre o que enviar, **aumentando a probabilidade de erro de validação** (e portanto o custo computacional de auto-correção). |
| **Evidência** | `grep` em `functions/src/genkit/schemas/common.ts` mostra 22 `.describe()` aplicados. Faltam: `InterviewInputSchema.question` (obrigatório!), `InterviewInputSchema.options/multiple/questions`; `InterviewQuestionSchema.*` (todos); `GetStudioStateInputSchema.fields`; `GetMemoriesInputSchema.limit`; `RespondSuggestedActionSchema.{label,action,params}`; `RespondMediaSchema.{type,url,title}`; `InterviewResumeDataSchema.*`. |
| **Mitigações verificadas** | Nenhuma. O `safeTool` cobre a falha, mas não evita o custo extra de cada turno de auto-correção. |
| **Pergunta/decisão** | Padronizar TODOS os campos de input de tools com `.describe()` explícito e enfático, incluindo exemplos de valores aceitáveis. Custo: ~15 linhas. Benefício: menos iterações de tool loop. |

---

### GAP-04 — Ausência de testes para `safeTool` e `validateToolInput`

| Campo | Valor |
|---|---|
| **Severidade** | ALTO |
| **Tipo** | Cobertura de teste ausente |
| **Confidence** | 100 |
| **Descrição** | Toda a lógica crítica de retry (que é a razão de existir deste PR) está sem cobertura. `safeTool`, `validateToolInput`, `ToolValidationResult` são funções puras em `assistant.ts:564-622` — fáceis de testar mas zero testes foram escritos. |
| **Evidência** | `grep -r safeTool tests/` → 0 matches. `grep -r validateToolInput tests/` → 0 matches. Os únicos testes em `tests/functions/` são de `assistant-context`, `assistant-compaction`, `credit-service`, `ai-requests`. |
| **Mitigações verificadas** | Nenhuma encontrada. |
| **Pergunta/decisão** | Criar `tests/functions/assistant-safeTool.unit.test.ts` com casos: (a) input válido → handler chamado, (b) input inválido → erro estruturado retornado, (c) handler lança → erro capturado, (d) `outputSchema` ausente não rejeita o retorno. Pré-requisito: extrair `safeTool` e `validateToolInput` para um módulo separado (hoje são funções declaradas dentro do flow, em escopo fechado). |

---

### GAP-05 — Sem circuit breaker para retries consecutivos

| Campo | Valor |
|---|---|
| **Severidade** | ALTO |
| **Tipo** | Risco de custo / loop de baixa qualidade |
| **Confidence** | 85 |
| **Descrição** | Se o Gemini errar input repetidamente (modelo preso em um padrão, schema realmente ambíguo, ou bug sistemático), o loop vai até `maxTurns: 20` consumindo créditos em cada turno. Cada turno incorreto custa ~1000 tokens de input + tokens de output + tool call. Não há detecção precoce de "modelo está preso". |
| **Evidência** | `assistant.ts:749` define `maxTurns: 20` mas não há contador de falhas consecutivas nem curto-circuito. O Genkit aborta com `GenerationResponseError` em `maxTurns` (confirmado pelo NotebookLM), mas só DEPOIS de 20 turnos. |
| **Mitigações verificadas** | `maxTurns: 20` é o único limite (linha 749). Sem fallback para sair mais cedo quando o mesmo tool falha N vezes. |
| **Pergunta/decisão** | Adicionar tracker de falhas consecutivas: se a mesma tool retornar erro de validação 3 vezes seguidas, abortar o loop manualmente e enviar uma mensagem amigável "Estou com dificuldade em processar isso. Pode reformular a pergunta?" O log deve capturar o estado para diagnóstico. |

---

### GAP-06 — `z.unknown()` vira JSON Schema `{}` vazio — comportamento ambíguo no Gemini

| Campo | Valor |
|---|---|
| **Severidade** | ALTO |
| **Tipo** | Risco técnico — schema do tool vazio pode confundir o modelo |
| **Confidence** | 80 |
| **Descrição** | O `safeTool` usa `inputSchema: z.unknown()` (linha 605), que o Genkit converte para JSON Schema `{}` (sem `type`, sem `properties`). O NotebookLM indica: (a) o Gemini pode não entender quais campos enviar; (b) em alguns casos o Gemini envia `{}` mesmo quando a description sugere parâmetros, e em outros ele envia propriedades que a validação local do Genkit pode ou não aceitar dependendo de `removeAdditionalStrategy`. |
| **Evidência** | `assistant.ts:605` define `inputSchema: z.unknown()`. NotebookLM citou: "Tool input schemas must use object types, not bare primitives... Use Pydantic models for tool inputs" (fonte: `234ed152-645c-4888-80cb-88cf5f91cb3f`); "If the `inputSchema` result in an empty or undefined schema, providers like Gemini may reject the tool definition" (fonte: `605ed279-33fb-45d2-b32a-43de52-a6679`). |
| **Mitigações verificadas** | O `zodToJsonSchema` é chamado com `removeAdditionalStrategy: 'strict'` (`bb826a5d-83b6-4844-af3c-b0a12eb6866c`), o que pode ou não permitir propriedades extras. A `description` da tool é a única referência que o Gemini tem. |
| **Pergunta/decisão** | Substituir `z.unknown()` por `z.object({}).passthrough()` (ou `.catchall(z.unknown())`) para enviar ao Gemini um `type: object` explícito sem restrições? Risco: ainda assim, o Gemini pode enviar input que não bate com a validação manual. Testar com Gemini 3.1 flash se ele aceita o pattern. Se rejeitar, considerar manter `z.unknown()` mas reforçar a `description` com exemplos explícitos dos campos esperados. |

---

### GAP-07 — `getUserMemoriesTool` retorna `output` que pode ser objeto de erro, quebrando o `extractResult` da UI

| Campo | Valor |
|---|---|
| **Severidade** | MÉDIO |
| **Tipo** | Estado ausente — UX confusa |
| **Confidence** | 90 |
| **Descrição** | Quando o handler do `getUserMemoriesTool` falha, o `output` é `{ error: true, tool: 'getUserMemories', message }`. O `extractResult` em `ToolEventCard.tsx:77-86` tenta acessar `output.memories` e retorna `null` (mostra "falhou"). Comportamento correto, mas o usuário vê "X memórias" → "falhou" sem entender a causa raiz. |
| **Evidência** | `assistant.ts:660-685` retorna `{ memories: memoryItems, mode }` em sucesso ou `{ error: true, tool, message }` em falha (via `safeTool` catch na linha 619). `ToolEventCard.tsx:77-86` acessa `output.memories`. `ToolEventCard.tsx:369-374` renderiza `ToolErrorCard` com a `message` do output. |
| **Mitigações verificadas** | O `ToolErrorCard` (linhas 185-258) já mostra a mensagem de erro expandida. Funciona, mas o usuário precisa expandir o card para ver. |
| **Pergunta/decisão** | Adicionar feedback inline mais visível? Ex: ícone de warning antes do tool_call quando o tool_result for erro, ou badge "Erro: skill não encontrada" no label. Custo: 5-10 linhas no `ToolEventCard`. |

---

### GAP-08 — Sub-schemas `RespondSuggestedActionSchema` e `RespondMediaSchema` sem `.describe()`

| Campo | Valor |
|---|---|
| **Severidade** | MÉDIO |
| **Tipo** | Decisão pendente |
| **Confidence** | 90 |
| **Descrição** | `RespondInputSchema` (linha 181-185) ganhou `.describe()` em `text`, `suggestedActions` e `media`, mas os sub-schemas `RespondSuggestedActionSchema` (linha 169-173) e `RespondMediaSchema` (linha 175-179) não ganharam. Como o Gemini precisa entender a estrutura interna de cada item, a falta de `.describe()` reduz a qualidade do output. |
| **Evidência** | `grep` em `common.ts:169-179` confirma ausência de `.describe()` em todos os campos. |
| **Mitigações verificadas** | Nenhuma. |
| **Pergunta/decisão** | Adicionar `.describe()` em `label`, `action`, `params`, `type`, `url`, `title`. Custo: 6 linhas. |

---

### GAP-09 — `interviewInterrupt.requestMetadata` pode falhar se input for `undefined`

| Campo | Valor |
|---|---|
| **Severidade** | MÉDIO |
| **Tipo** | Edge case sem teste |
| **Confidence** | 70 |
| **Descrição** | O `requestMetadata: (input) => ({ interview: input })` em `assistant.ts:109-111` assume que `input` é um objeto válido. Se o Genkit por algum motivo passar `undefined` (cenário hipotético), o objeto resultante terá `interview: undefined`, que pode quebrar serialização. |
| **Evidência** | `assistant.ts:109-111` define a função sem null-check. Não há testes que cubram esse edge case. |
| **Mitigações verificadas** | O Genkit só chama `requestMetadata` DEPOIS de validar o inputSchema, então o input é garantidamente válido se a validação passou. Mas se a validação FALHAR (cenário do GAP-01), o requestMetadata não é chamado — o erro aborta antes. |
| **Pergunta/decisão** | Adicionar null-check defensivo: `requestMetadata: (input) => ({ interview: input ?? null })`. Baixo custo, mas só vale a pena se GAP-01 for resolvido de forma que requestMetadata ainda seja alcançável. Caso contrário, é dead code. |

---

### GAP-10 — `updatePlanTool` confia no `safeParse` mas não na estrutura interna

| Campo | Valor |
|---|---|
| **Severidade** | MÉDIO |
| **Tipo** | Validação rasa em estrutura complexa |
| **Confidence** | 70 |
| **Descrição** | O `UpdatePlanInputSchema` valida que `plan` é um array de objetos com `id`, `title`, `status`, `subtasks` etc. Mas após validação, o handler faz `currentPlan = toolInput.plan` e envia via `sendMetaChunk('plan_update', { plan: currentPlan })` sem verificar invariantes (ex: IDs únicos, status válidos do enum, sub-tarefas com IDs consistentes). |
| **Evidência** | `assistant.ts:628-637` define o tool. `AssistantTaskStatusSchema` é um enum (linha 95), mas o `AssistantTaskSchema` usa `status: z.string()` (linha 108) em vez de `z.enum(AssistantTaskStatusSchema)`. Inconsistência que permite status inválido. |
| **Mitigações verificadas** | O frontend provavelmente valida de novo. Mas o backend é a fonte de verdade. |
| **Pergunta/decisão** | Trocar `status: z.string()` por `z.enum(AssistantTaskStatusSchema.options)` em `AssistantTaskSchema` e `AssistantSubtaskSchema`. Custo: 2 linhas. Adicionar validação de IDs únicos no handler. |

---

### GAP-11 — Payload máximo do assistant (20MB) excede limite do Firebase callable (10MB)

| Campo | Valor |
|---|---|
| **Severidade** | BAIXO |
| **Tipo** | Risco técnico (não relacionado a safeTool) |
| **Confidence** | 90 |
| **Descrição** | `MAX_ASSISTANT_PAYLOAD_CHARS = 20_000_000` em `assistant.ts:81` permite payload de 20MB no input. Mas o Firebase Callable Functions tem limite de payload de 10MB para request/response. Em algum momento o cliente pode enviar payload que o servidor aceita mas que o `httpsCallable` não consegue serializar corretamente no round-trip. |
| **Evidência** | `assistant.ts:81` define a constante. `MAX_ASSISTANT_PAYLOAD_CHARS` é 2x o limite do Firebase. |
| **Mitigações verificadas** | O Genkit deve serializar compactamente, mas a constante é genérica (chars, não bytes). |
| **Pergunta/decisão** | Reduzir para 8MB (limite seguro do Firebase) ou converter para bytes. Não relacionado a este PR, mas adjacente. |

---

### GAP-12 — `safeTool` cria tool nova a cada chamada do flow

| Campo | Valor |
|---|---|
| **Severidade** | BAIXO |
| **Tipo** | Performance (não impacto funcional) |
| **Confidence** | 80 |
| **Descrição** | O `safeTool` é invocado dentro do handler do flow `assistant`, então cada chamada HTTP recria as 6 tools e o wrapper. Como o Genkit usa um Registry global, isso pode causar overhead mínimo de registro repetido. |
| **Evidência** | `assistant.ts:564-622` define o wrapper. `assistant.ts:628-732` invoca 6 vezes. Tudo dentro do escopo da função do flow. |
| **Mitigações verificadas** | O Genkit deduplica tools por nome no registry, então o overhead é só de criar o objeto wrapper. Negligenciável. |
| **Pergunta/decisão** | Pode ser ignorado, mas se virar gargalo, mover `safeTool` e as 6 tools para escopo de módulo (criadas uma vez no startup). Custo: refactor médio. Benefício: marginal. |

---

### GAP-13 — Sem distinção de tipo entre retorno de sucesso e erro no `safeTool`

| Campo | Valor |
|---|---|
| **Severidade** | BAIXO |
| **Tipo** | Decisão de tipagem |
| **Confidence** | 80 |
| **Descrição** | O `safeTool` retorna `Promise<unknown>` (linha 599). O Genkit serializa o retorno como `toolResponse` sem discriminated union. O frontend recebe `{ error: true, tool, message }` ou o objeto de sucesso sem distinção no tipo — precisa fazer narrowing via `'error' in output`. |
| **Evidência** | `assistant.ts:593-622` retorna union implícito. `ToolEventCard.tsx:298-302` faz narrowing via `'error' in (event.output as Record<string, unknown>) && (event.output as { error: boolean }).error === true`. |
| **Mitigações verificadas** | O narrowing funciona, mas é manual e propenso a erro se o shape mudar. |
| **Pergunta/decisão** | Criar tipo discriminado no shared types: `type ToolResult<T> = { ok: true; data: T } \| { error: true; tool: string; message: string }`. Custo: 1 arquivo de types compartilhado. Benefício: type safety no frontend. |

---

## 4. Cenários de borda sem resposta

### S1. O que acontece se o `interviewInterrupt` receber input inválido (mesmo cenário do bug original)?

**Resposta atual:** O stream quebra como no bug original. Sem mitigação além de reescrever manualmente a pergunta.

### S2. O Gemini realmente entende uma tool com `inputSchema: z.unknown()` e descrição detalhada?

**Resposta atual:** Incerto. O NotebookLM indica que **pode** funcionar (Gemini usa a description) **mas pode** falhar em alguns casos. Teste empírico com `gemini-3.1-flash` é necessário.

### S3. Se o Gemini enviar um tool_call com campos extras não presentes no schema, o Genkit aceita?

**Resposta atual:** Depende de `removeAdditionalStrategy: 'strict'` no `zodToJsonSchema`. Se for strict, propriedades extras são rejeitadas. Mas o `safeParse` com `z.unknown()` no nível externo pode aceitar tudo.

### S4. O `use_skill` pode falhar de forma diferente do `interviewInterrupt`?

**Resposta atual:** Sim. O `use_skill` é registrado como tool de `genkit/beta` (não `dynamicTool`), mas passa pelo mesmo `parseSchema`. O fix provavelmente é similar (mover para `safeTool` ou equivalente).

### S5. Como o Gemini reage a `requestMetadata` retornando `undefined`?

**Resposta atual:** Incerto. Provavelmente é serializado como `null` ou removido. Edge case sem teste.

### S6. Se o handler lança erro mas o Genkit já enviou o chunk de `tool_call` ao cliente, o cliente vê "pendente" para sempre?

**Resposta atual:** O `safeTool` captura o erro e retorna o objeto, então o Genkit gera um `toolResponse` chunk. Mas se o erro for no nível do `parseSchema` (GAP-01), o Genkit aborta o stream inteiro, e o cliente vê erro genérico.

### S7. O `maxTurns: 20` é contado por turno do tool loop ou por request HTTP?

**Resposta atual:** Por turno do tool loop, segundo o NotebookLM. Um turno = 1 ciclo modelo→tool→modelo.

---

## 5. Checklist de sanidade

- [x] **Mapeei o escopo** com `analyze_aitool_project_map`, `analyze_aitool_list_functions` e `analyze_aitool_area_detail`
- [x] **Li os arquivos completos** de `assistant.ts` (1012 linhas), `common.ts` (477 linhas), `skills.ts` (306 linhas), `inline-assistant.ts` (253 linhas), `images.ts` (257 linhas), `audio.ts` (trechos relevantes), `chunking.ts` (222 linhas), `scene-prompts.ts` (283 linhas)
- [x] **Validei com `supergrep_find`** que só `assistant.ts` tem `dynamicTool` e `defineInterrupt`
- [x] **Validei com `supergrep_find`** que `safeTool` e `safeParse` só aparecem em `assistant.ts`
- [x] **Validei com `analyze_aitool_find`** que não há outras tools com o mesmo padrão
- [x] **Consultei NotebookLM (Genkit Docs)** sobre comportamento de `z.unknown()`, `defineInterrupt`, `parseSchema`, `maxTurns` e conversões para JSON Schema
- [x] **Verifiquei o frontend** (`useAssistant.ts`, `ToolEventCard.tsx`) para entender o impacto visual dos erros
- [x] **Verifiquei testes** existentes em `tests/` — confirmei zero cobertura para `safeTool`
- [x] **Verifiquei `analyze_aitool_changes`** que confirma as mudanças não commitadas (+128 -104)
- [x] **Distigui bugs reais de melhorias cosméticas** — GAP-11, 12, 13 são BAIXO
- [x] **Apliquei a regra estrutural** — NotebookLM Genkit foi consultado ativamente para GAP-01, 02, 05, 06 (todos com confidence 80-95)
- [x] **Validei o parent** — o `try/catch` interno do flow (linha 959-986) E o `try/catch` externo (linha 987-1009) revertem créditos em qualquer exceção. Isso MITIGA impacto financeiro mas NÃO resolve o problema de UX (usuário vê erro genérico)

---

## 6. Resumo executivo

| Severidade | Quantidade | Gaps |
|---|---|---|
| **CRÍTICO** | 2 | GAP-01, GAP-02 |
| **ALTO** | 4 | GAP-03, GAP-04, GAP-05, GAP-06 |
| **MÉDIO** | 4 | GAP-07, GAP-08, GAP-09, GAP-10 |
| **BAIXO** | 3 | GAP-11, GAP-12, GAP-13 |

**Veredito:** A camada 2 (resiliência) está **70% completa**. O `interviewInterrupt` e o `use_skill` ficaram de fora e podem reproduzir o bug original. A camada 1 (prevenção via `.describe()`) está **70% completa** — vários schemas críticos ficaram sem cobertura. **Antes de fechar o PR, fechar GAP-01 e GAP-02 (ambos CRÍTICOS) é mandatório.** GAP-04 (testes) deve ser resolvido em paralelo para evitar regressão silenciosa.

**Recomendação de ordem de resolução:**

1. **GAP-01** (mesmo turno): proteger `interviewInterrupt` — provavelmente precisa de helper `safeInterrupt()` análogo ao `safeTool()`
2. **GAP-02** (mesmo turno): refatorar `use_skill` em `skills.ts` para usar o mesmo pattern
3. **GAP-03** (mesmo PR): adicionar `.describe()` em todos os campos restantes
4. **GAP-04** (mesmo PR): extrair `safeTool` para módulo testável + criar testes unitários
5. **GAP-05** (PR seguinte): adicionar circuit breaker de 3 falhas consecutivas
6. **GAP-06** (PR seguinte): testar empiricamente com Gemini se `z.unknown()` funciona como esperado
7. Demais gaps podem ir para backlog
