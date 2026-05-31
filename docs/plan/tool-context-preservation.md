# Plano: Preservação de Contexto de Tool Calls no Chat do Assistente

## Contexto

Quando o assistente IA usa ferramentas (tools) como `webSearch`, `getStudioState`, `getUserMemories`, `updatePlan`, etc., os resultados dessas chamadas são **descartados entre mensagens**. Isso acontece porque:

1. O frontend armazena mensagens no formato `ChatMessage { role, text, attachments }` — sem dados de tools
2. O backend reconstrói o histórico a partir desse formato simplificado
3. O backend nunca acessa `response.messages` do Genkit (que contém o histórico completo com tool calls/responses)

**Consequência:** O modelo precisa re-chamar ferramentas para recuperar informações que já obteve em turnos anteriores. Com modelos Gemini 3+, a ausência de `thought_signature` no histórico pode causar degradação do raciocínio ou erros 400.

**Domínio:** Assistente IA — `functions/src/flows/assistant.ts` + `src/hooks/useAssistant.ts` + `src/features/assistant/`

---

## Escopo

### O que entra
- Captura de `response.messages` no backend (Genkit)
- Transporte do histórico completo via `httpsCallable`
- Reutilização do histórico completo no frontend
- Persistência no `ChatSession` (Firestore + IndexedDB)

### O que não entra
- Migração para `ai.chat()` (Genkit Session API) — API em beta, complexidade desnecessária agora
- Migração para Gemini Interactions API — Genkit não suporta nativamente
- Otimização de tamanho de payload (compressão, truncamento) — segunda iteração
- Mudanças no schema de mensagens da UI (tool events continuam via streaming)

---

## Decisões (MDE)

### Decisão 1: Formato de transporte do histórico completo
- **Problema:** Como transportar o `MessageData[]` do Genkit (que inclui `toolRequest`, `toolResponse`, `reasoning`) do backend para o frontend?
- **Opções:**
  1. **Campo `fullHistory: MessageData[]` no output** — array serializado direto
  2. **Campo `fullHistoryJson: string`** — string JSON do array (evita problemas de serialização)
  3. **Campo aninhado em cada mensagem** — enriquecer `ChatMessage` com parts
- **Escolha:** Opção 1 (`fullHistory: MessageData[]`)
- **Justificativa:** O `httpsCallable` do Firebase já serializa JSON nativamente. `MessageData` é documentado como "safely serializable to JSON". A Opção 2 adiciona overhead de parse/stringify desnecessário. A Opção 3 exigiria mudanças profundas no tipo `ChatMessage` e na UI.
- **Fonte:** Investigação direta da tipagem `@genkit-ai/ai/lib/generate/response.d.ts:103-108` + `model-types.d.ts:536`

### Decisão 2: Onde armazenar o `fullHistory` no frontend
- **Problema:** Onde manter o histórico completo entre mensagens?
- **Opções:**
  1. **No estado do hook `useAssistant`** (ref + estado) — junto com `messages`
  2. **No `ChatSession`** (persistência) — junto com `activePlan` e `pendingInterview`
  3. **Ambos** — ref para sessão ativa + persistência para reload
- **Escolha:** Opção 3 (ambos)
- **Justificativa:** O `fullHistory` precisa estar disponível durante a sessão ativa (ref) E precisa ser restaurado quando o usuário carrega um chat salvo (persistência). O `ChatSession` já tem campos opcionais (`activePlan`, `pendingInterview`) — seguir o mesmo padrão.
- **Fonte:** `src/lib/db/types.ts:124-134` + `src/hooks/useAssistant.ts:286-314`

### Decisão 3: Como o backend usa o `fullHistory` recebido
- **Problema:** Quando o frontend envia `fullHistory`, o backend deve usá-lo como `messages` direto ou reconstruir?
- **Opções:**
  1. **Usar `fullHistory` diretamente como `messages`** — passar para `ai.generateStream({ messages: fullHistory })`
  2. **Fazer merge** — `fullHistory` + mensagem atual do usuário
  3. **Substituir o `history`** — usar `fullHistory` em vez do `history` simplificado
- **Escolha:** Opção 2 (merge)
- **Justificativa:** O `fullHistory` do turno anterior já contém todas as mensagens (user + model + tools). Precisamos adicionar a nova mensagem do usuário no final. O Genkit espera que `messages` contenha todo o histórico + mensagem atual.
- **Fonte:** Genkit `ai.generateStream()` — `messages` é o histórico completo, a mensagem atual é o último item

---

## Arquivos e Áreas Prováveis

| Arquivo | Mudança | Fonte |
|---------|---------|-------|
| `functions/src/flows/assistant.ts` | Capturar `response.messages` e retornar no output | Investigação §2 |
| `functions/src/genkit/schemas/common.ts` | Adicionar campo `fullHistory` ao `AssistantOutputSchema` | Investigação §2 |
| `src/hooks/useAssistant.ts` | Armazenar `fullHistory`, reenviar como parte do input | Investigação §2 |
| `src/lib/db/types.ts` | Adicionar `fullHistory?: MessageData[]` ao `ChatSession` | Investigação §2 |
| `src/features/assistant/types.ts` | Adicionar tipo `FullHistoryMessage` (ou reutilizar do backend) | Investigação §2 |

---

## Estratégia Técnica

### Fluxo Atual (com problema)
```
Frontend → { message, history: [{role, text, attachments}] } → Backend
Backend → ai.generateStream({ messages: [{role, content: [{text}]}], tools })
Backend → { text, jsonSettings, plan } → Frontend
(FullMessageData com tool calls/responses é DESCARTADO)
```

### Fluxo Corrigido
```
Frontend → { message, fullHistory?: MessageData[] } → Backend
Backend → ai.generateStream({ messages: [...fullHistory, currentMessage], tools })
Backend → response.messages (inclui tool calls/responses do turno atual)
Backend → { text, jsonSettings, plan, fullHistory: response.messages } → Frontend
Frontend → armazena fullHistory para próxima mensagem
```

### Detalhamento do `fullHistory`

O array `response.messages` do Genkit retorna `MessageData[]` onde cada item tem:
```typescript
{
  role: 'user' | 'model' | 'tool',
  content: [
    { text: "..." },                              // texto
    { toolRequest: { name, ref, input } },        // chamada de tool
    { toolResponse: { name, ref, output } },      // resultado de tool
    { reasoning: "..." },                         // thinking (Gemini 3)
  ],
  metadata?: Record<string, unknown>
}
```

Este array é **JSON-serializable** (documentado pelo Genkit) e pode ser transportado via `httpsCallable` sem problemas.

### Constraints de Serialização

- **httpsCallable:** Limite de ~10MB por request. `MessageData` com tool responses de `webSearch` pode ter ~50-100KB por turno. Para uma conversa de 20 turnos com tools: ~1-2MB. Dentro do limite.
- **Firestore:** Limite de ~1MB por documento. `ChatSession` já tem lógica de fallback para IndexedDB quando excede 900KB (`chats.ts:48`). O `fullHistory` adiciona ~50-200KB por sessão. Dentro do limite para a maioria dos casos.
- **IndexedDB:** Sem limite prático.

---

## Passos de Implementação

### Passo 1: Backend — Capturar `response.messages`
**Arquivo:** `functions/src/flows/assistant.ts`
**Agent:** `worker`

1. Após `const response = await streamResponse;` (linha 736), capturar `response.messages`
2. Serializar para formato plain object (garantir que é JSON-safe)
3. Incluir no retorno do flow: `fullHistory: response.messages`

**Nota:** O `response.messages` já retorna `MessageData[]` serializável. Não precisa de transformação extra.

**Evidência:** `@genkit-ai/ai/lib/generate/response.d.ts:103-108` — "The result of this method can be safely serialized to JSON for persistence in a database."

### Passo 2: Schema — Adicionar campo `fullHistory` ao output
**Arquivo:** `functions/src/genkit/schemas/common.ts`
**Agent:** `worker`

1. Importar `MessageData` do Genkit (ou definir schema Zod equivalente)
2. Adicionar ao `AssistantOutputSchema`: `fullHistory: z.array(z.any()).nullable().optional()`
3. O `z.any()` é necessário porque `MessageData` tem union complexo (text | media | toolRequest | toolResponse | reasoning | data | custom | resource)

**Nota:** Usar `z.any()` em vez de tentar replicar o schema completo do Genkit. O schema é para validação de borda, não para type-safety interna (o backend já garante a estrutura via Genkit).

**Evidência:** `functions/src/genkit/schemas/common.ts:149-156` — `AssistantOutputSchema` atual

### Passo 3: Backend — Usar `fullHistory` recebido como base do histórico
**Arquivo:** `functions/src/flows/assistant.ts`
**Agent:** `worker`

1. No input, adicionar campo opcional `fullHistory: MessageData[]`
2. Se `fullHistory` estiver presente E não vazio, usar como base em vez de `input.history`
3. Construir `currentMessage` normalmente (com texto + attachments)
4. Montar `messages = [...fullHistory, currentMessage]`

**Lógica:**
```typescript
let messages: MessageData[];
if (input.fullHistory && input.fullHistory.length > 0) {
  // Histórico completo com tool context preservado
  messages = [...input.fullHistory, currentMessage];
} else {
  // Fallback: histórico simplificado (backward compat)
  messages = [...historyMessages, currentMessage];
}
```

**Evidência:** Genkit `ai.generateStream()` aceita `messages: MessageData[]` diretamente

### Passo 4: Schema — Adicionar campo `fullHistory` ao input
**Arquivo:** `functions/src/genkit/schemas/common.ts`
**Agent:** `worker`

1. Adicionar ao `AssistantInputSchema`: `fullHistory: z.array(z.any()).nullable().optional()`
2. Mesmo padrão do output

**Evidência:** `functions/src/genkit/schemas/common.ts:135-146` — `AssistantInputSchema` atual

### Passo 5: Frontend — Armazenar `fullHistory` no hook
**Arquivo:** `src/hooks/useAssistant.ts`
**Agent:** `worker`

1. Adicionar ref `fullHistoryRef = useRef<MessageData[]>([])`
2. Após receber `output` do flow (linha 601), armazenar `output.fullHistory` na ref
3. No `sendMessage`, incluir `fullHistory: fullHistoryRef.current` no input quando não vazio
4. Limpar a ref em `startNewChat()` e `loadSession()`

**Evidência:** `src/hooks/useAssistant.ts:601-633` — onde `output` é processado

### Passo 6: Frontend — Persistir `fullHistory` no `ChatSession`
**Arquivo:** `src/lib/db/types.ts` + `src/hooks/useAssistant.ts`
**Agent:** `worker`

1. Adicionar ao `ChatSession`: `fullHistory?: unknown[]` (usar `unknown[]` para evitar import de tipos Genkit no frontend)
2. No auto-save (linha 286-314), incluir `fullHistory: fullHistoryRef.current`
3. No `loadSession` (linha 401-422), restaurar `fullHistory` na ref

**Evidência:** `src/lib/db/types.ts:124-134` — `ChatSession` atual + `src/hooks/useAssistant.ts:286-314` — auto-save

### Passo 7: Frontend — Atualizar tipo do input
**Arquivo:** `src/hooks/useAssistant.ts`
**Agent:** `worker`

1. Adicionar ao `AssistantFlowInput`: `fullHistory?: unknown[]`
2. No `rawInput` (linha 476), incluir `fullHistory` quando disponível

**Evidência:** `src/hooks/useAssistant.ts:69-84` — `AssistantFlowInput`

### Passo 8: Testes
**Arquivo:** `tests/` (novo ou existente)
**Agent:** `test`

1. Testar que `response.messages` é serializável (JSON.parse(JSON.stringify(...)))
2. Testar que o histórico completo é preservado entre mensagens
3. Testar backward compat: sessão sem `fullHistory` funciona com `history` simplificado

---

## Riscos e Mitigações

| Risco | Mitigação | Fonte |
|-------|-----------|-------|
| `response.messages` pode ter tamanho grande com webSearch verbose | Monitorar tamanho; se > 500KB, truncar tool responses mais antigas | Investigação §3 |
| `z.any()` no schema perde type-safety | Aceitável — o backend garante a estrutura via Genkit, o frontend apenas transporta | Decisão 2 |
| Chat antigo sem `fullHistory` quebra | Backward compat: fallback para `history` simplificado quando `fullHistory` ausente | Passo 3 |
| Firestore doc excede 1MB com `fullHistory` | Já existe fallback para IndexedDB em `chats.ts:48` | Investigação §2 |
| `thought_signature` pode mudar entre versões do Gemini | Genkit gerencia internamente; `response.messages` já inclui | NotebookLM Gemini API |

---

## Verificação

- [ ] Assistente mantém contexto de tool calls entre mensagens (testar: pergunta → tool → resposta → pergunta follow-up sem re-chamar tool)
- [ ] `webSearch` results persistem no histórico (testar: busca → pergunta sobre detalhes da busca)
- [ ] Chat antigo sem `fullHistory` funciona normalmente (backward compat)
- [ ] `loadSession` restaura `fullHistory` corretamente
- [ ] `startNewChat` limpa `fullHistory`
- [ ] Payload não excede limites do `httpsCallable` (monitorar)
- [ ] Lint + typecheck passam sem erros

---

## Notebooks Relevantes

| Notebook | ID | Quando consultar |
|----------|----|------------------|
| Gemini API | `95d30efd-313d-457d-8a45-d973c721ee35` | Confirmar formato de `functionCall`/`functionResponse`, `thought_signature`, validação de histórico |
| Genkit Docs | `d036c47d-5ed1-4311-8273-02a20cd4ce66` | Confirmar `response.messages`, `MessageData`, `ai.generateStream()` com `messages` |

---

## Instruções de Execução

### Investigação
Antes de modificar cada arquivo, usar `suggest_reads` + `impact_analysis` + `file_context`. Consultar Notebooks para confirmar APIs.

### Divisão do Trabalho
- **Lote 1 (backend):** Passos 1-4 — todos em `functions/`, podem ser feitos pelo mesmo agent
- **Lote 2 (frontend):** Passos 5-7 — todos em `src/hooks/` + `src/lib/db/`, podem ser feitos pelo mesmo agent
- **Lote 3 (testes):** Passo 8 — após lotes 1 e 2

### Execução
- Lotes 1 e 2 são independentes (backend/frontend) — podem rodar em paralelo
- Lote 3 depende de ambos
- Após cada lote: `bun run lint` + `bun run typecheck`
- Proibido `@ts-ignore`, `@ts-expect-error` ou `eslint-disable`
