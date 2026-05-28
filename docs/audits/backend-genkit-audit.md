# Auditoria Estática — Backend Genkit (Assistant, Inline Assistant, Credit Metering)

**Data:** 2026-05-28
**Escopo:** 6 arquivos do backend Genkit (Cloud Functions v2)
**Foco:** Segurança, erros de lógica, performance, tipagem

---

## Veredito: `Ajustes recomendados`

Nenhum bloqueador de merge. Existem 2 achados com severidade WARNING (um bug real em inline-assistant.ts, um schema inconsistente em assistant.ts) e 3 SUGGESTIONs de melhoria. A arquitetura tool-first com try/catch em cada tool handler está bem desenhada — erros são serializados como resultado para o modelo se auto-corrigir sem quebrar o tool loop.

---

## Achados Priorizados

### [WARNING] Dangling `ai_request` em inline-assistant.ts quando erro ocorre entre `startAiRequest` e `try`

- **Arquivo:** `functions/src/flows/inline-assistant.ts:120-173`
- **Confidence:** 92/100
- **Categoria:** Bug
- **Problema:** `startAiRequest()` é chamado na linha 120, mas o bloco `try` só começa na linha 174. Se qualquer operação entre elas lançar (Firestore reads, `withCreditMetering`, `throwIfAiCancellationRequested`), o registro `ai_request` fica com status `started` para sempre — `finishAiRequest` nunca é chamado.
- **Evidência:**
  ```typescript
  // Linha 120 — FORA do try
  await startAiRequest(db, uid, requestId, 'inline_assistant');

  // Linhas 125-168 — operações que podem throw:
  await throwIfAiCancellationRequested(db, uid, requestId); // ← pode throw
  const [memoriesSnap, settingsSnap] = await Promise.all([...]); // ← pode throw
  const creditMeter = await withCreditMetering(...); // ← pode throw se saldo insuficiente

  // Linha 174 — try começa aqui (tarde demais)
  try {
    // ...
    await finishAiRequest(db, uid, requestId, 'completed'); // só chega aqui se nada falhou antes
  }
  ```
- **Impacto:** Registros `ai_request` órfãos se acumulam no Firestore com status `started`. Não afeta o usuário diretamente (não bloqueia nada), mas polui a coleção e dificulta monitoring/debugging. Em produção, erros de crédito (saldo insuficiente) acontecem regularmente.
- **Sugestão:** Mover `startAiRequest` para dentro do bloco `try`, ou envolver toda a seção 1-2 no try/catch, como já é feito em `assistant.ts` (linha 243, dentro do try externo). Exemplo:
  ```typescript
  try {
    await startAiRequest(db, uid, requestId, 'inline_assistant');
    // ... resto do fluxo
  } catch (error) {
    await finishAiRequest(db, uid, requestId, 'failed', ...).catch(() => {});
    throw error;
  }
  ```

---

### [WARNING] `getStudioStateTool` output schema não contempla resposta de erro

- **Arquivo:** `functions/src/flows/assistant.ts:413-437`
- **Confidence:** 88/100
- **Categoria:** Type Safety
- **Problema:** O `outputSchema` do `getStudioStateTool` é `z.record(z.unknown())`, mas quando o handler captura um erro, retorna `{ error: true, tool: 'getStudioState', message: '...' }` via `toolErrorResponse`. As outras 2 tools com try/catch (`getUserMemories` e `webSearch`) incluem campos `error`, `tool` e `message` explicitamente nos seus outputSchemas. `getStudioState` é a inconsistente.
- **Evidência:**
  ```typescript
  // Schema declarado (linha 417):
  outputSchema: z.record(z.unknown()),

  // Mas o handler retorna (linha 435):
  return toolErrorResponse('getStudioState', err);
  // → { error: true, tool: 'getStudioState', message: '...' }

  // Comparar com getUserMemories (linha 443-449) que tem:
  outputSchema: z.object({
    memories: z.array(z.object({ content: z.string() })).optional(),
    mode: z.string().optional(),
    error: z.boolean().optional(),    // ← explícito
    tool: z.string().optional(),      // ← explícito
    message: z.string().optional(),   // ← explícito
  }),
  ```
- **Impacto:** Genkit pode não validar output de tools rigorosamente, então não é um crash em produção. Mas é uma inconsistência de tipagem que dificulta manutenção e pode causar problemas se a validação do Genkit mudar.
- **Sugestão:** Alinhar o schema com o padrão das outras tools:
  ```typescript
  outputSchema: z.object({
    selectedVoice: z.string().optional(),
    pace: z.string().optional(),
    // ... outros campos do studio state
    error: z.boolean().optional(),
    tool: z.string().optional(),
    message: z.string().optional(),
  }).passthrough(),
  ```

---

### [SUGGESTION] `buildStudioBlock` executado desnecessariamente quando `toolFirst=true`

- **Arquivo:** `functions/src/flows/assistant.ts:286` + `functions/src/genkit/utils/assistant-context.ts:265-267`
- **Confidence:** 95/100
- **Categoria:** Performance
- **Problema:** Na linha 286 de `assistant.ts`, `buildStudioBlock()` é sempre chamado, construindo uma string de ~50 linhas com todo o estado do estúdio. Porém, `buildAssistantSystemInstruction` recebe `toolFirst: true` (linha 367), o que faz `studioSection` usar `buildStudioSummary()` em vez de `studioBlock`. O resultado de `buildStudioBlock` é descartado.
- **Evidência:**
  ```typescript
  // assistant.ts:286 — executa SEMPRE
  const studioBlock = buildStudioBlock(input.studioState ?? undefined);

  // assistant-context.ts:265-267 — ignora quando toolFirst=true
  const studioSection = toolFirst
    ? buildStudioSummary(studioState)   // ← usa este
    : studioBlock ?? buildStudioBlock(studioState);  // ← studioBlock descartado
  ```
- **Impacto:** Trabalho de CPU desperdiçado a cada request (~50 operações de string concat + template literals). Impacto negligível em contexto de chamada LLM que leva segundos, mas é código morto que confunde o leitor.
- **Sugestão:** Não chamar `buildStudioBlock` quando `toolFirst=true`:
  ```typescript
  const studioBlock = input.studioState && !toolFirstMode
    ? buildStudioBlock(input.studioState)
    : '';
  ```
  Ou remover o parâmetro `studioBlock` de `buildAssistantSystemInstruction` e sempre derivar internamente.

---

### [SUGGESTION] `creditMeter.revert()` sem proteção no catch de inline-assistant.ts

- **Arquivo:** `functions/src/flows/inline-assistant.ts:244`
- **Confidence:** 85/100
- **Categoria:** Bug (latente)
- **Problema:** No bloco catch (linha 237), `creditMeter.revert(errorCode)` é chamado sem `.catch()`. Se a reversão falhar (ex: Firestore timeout), o erro da reversão substitui o erro original — o usuário vê uma mensagem de erro de crédito em vez do erro real da geração.
- **Evidência:**
  ```typescript
  // inline-assistant.ts:244 — sem proteção
  await creditMeter.revert(errorCode);

  // Comparar com assistant.ts:647, 688 — com .catch()
  await creditMeter.revert('CLIENT_DISCONNECTED'); // ← withCreditMetering helper tem .catch() interno

  // credit-metering.ts:397 — revert helper já tem .catch()
  revert: async (errorCode) => {
    await revertCredits(db, uid, requestId, errorCode).catch(() => {});
  },
  ```
- **Impacto:** Na prática, o `revert` do helper `withCreditMetering` já tem `.catch(() => {})` interno (credit-metering.ts:397). Então `creditMeter.revert()` NÃO vai lançar — o `.catch` interno já trata. **Falso positivo confirmado após verificação do helper.** Rebaixado de WARNING para SUGGESTION.
- **Sugestão:** Nenhuma correção necessária — o helper já protege. Poderia adicionar um comentário no inline-assistant.ts mencionando que o helper já faz best-effort.

---

### [SUGGESTION] DRY violation — boilerplate duplicado entre assistant.ts e inline-assistant.ts

- **Arquivo:** `functions/src/flows/assistant.ts:252-283` vs `functions/src/flows/inline-assistant.ts:127-155`
- **Confidence:** 90/100
- **Categoria:** Architecture
- **Problema:** Os dois flows repetem ~30 linhas idênticas: busca de memórias + user settings do Firestore, construção de `memoriesText`, `customPromptBlock`, `userProfileBlock`, `voicesList`, `paceList`. Se a lógica de contexto mudar, precisa atualizar em ambos os arquivos.
- **Evidência:**
  ```typescript
  // assistant.ts:252-283 — contexto do usuário
  const [memoriesSnap, settingsSnap] = await Promise.all([
    db.collection('memories').where('userId', '==', uid).limit(100).get().catch(() => null),
    db.collection('user_settings').doc(uid).get().catch(() => null),
  ]);
  const memories = memoriesSnap && !memoriesSnap.empty ? memoriesSnap.docs.map(...) : [];
  const memoriesText = buildMemoriesText(memories);
  const userSettings = settingsSnap?.exists ? (settingsSnap.data() as ...) : null;
  const customPromptBlock = buildCustomPromptBlock(userSettings);
  const userProfileBlock = buildUserProfileBlock(userSettings);
  const voicesList = VOICES.map(...).join('\n');
  const paceList = Object.entries(PACE_DESCRIPTIONS).map(...).join(', ');

  // inline-assistant.ts:127-155 — IDÊNTICO
  ```
- **Impacto:** Manutenção. Se alguém adicionar um novo campo de contexto em assistant.ts e esquecer de inline-assistant.ts, os dois flows ficam inconsistentes.
- **Sugestão:** Extrair para uma função helper em `assistant-context.ts`:
  ```typescript
  export async function fetchAssistantContext(db: Firestore, uid: string) {
    // ... busca memórias, settings, monta textos
    return { memoriesText, customPromptBlock, userProfileBlock, voicesList, paceList, memories };
  }
  ```

---

## O que parece saudável

- **Tool-first com error-as-result:** O padrão de try/catch em cada tool handler, serializando erros como resultado para o modelo, é sólido. `throwIfAiCancellationRequested` é chamado ANTES do try/catch em cada handler, garantindo que cancelamentos propagam corretamente (não viram tool results).
- **Dupla proteção de créditos:** `withCreditMetering` reserva → confirma/reverte, e o fluxo externo tem seu próprio try/catch com `finishAiRequest`. As flags `creditsSettled` e `requestFinished` evitam dupla reversão.
- **Logger estruturado:** `createLogger` com JSON lines é adequado para Cloud Logging do GCP. Debug suprimido em produção via `FUNCTIONS_EMULATOR` check.
- **`resolveModelConfig`:** Extraído corretamente, validação de `thinkingLevel` com array const + runtime check. Cast `as ThinkingLevel` é seguro após o `includes`.
- **`stripJsonSettingsBlock`:** Regex correta, case-insensitive, limpa o bloco JSON antes de retornar ao frontend sem afetar `jsonSettings` extraído separadamente.
- **Streaming com disconnect handling:** `sendFailed` flag + `streamResponse.catch(() => {})` + confirmação parcial de créditos — trata desconexão do cliente graciosamente.
- **Schemas com `.nullable().optional()`:** Compatibilidade correta com serialização JSON do `httpsCallable` (undefined → null).
- **Auth defense-in-depth:** `isSignedIn()` (auth policy) + `enforceAppCheck: true` + `getCallableUidOrThrow` (redundância saudável).
- **`MAX_HISTORY_MESSAGES_FOR_ESTIMATION = 10`:** Truncamento do histórico para estimativa de créditos evita custo linear com histórico crescente.

---

## Limites da revisão

- **Não foi possível verificar o comportamento runtime do Genkit:** Se `ai.dynamicTool` valida `outputSchema` rigorosamente contra o valor retornado, o achado do `getStudioStateTool` sobe de severidade. A documentação do Genkit não deixa claro se a validação é enforcement ou apenas documentacional.
- **NotebookLM não consultado:** Não há notebook dedicado para Genkit. A análise se baseia na leitura do código-fonte e na API pública do SDK (`generateMiddleware`, `dynamicTool`, `generateStream`).
- **Flows não auditados:** `audio.ts`, `chunking.ts`, `images.ts`, `scene-prompts.ts` usam o `creditMeteringMiddleware` e não foram revisados neste escopo.
- **Regras Firestore não auditadas:** A segurança das regras de leitura/escrita na coleção `memories` e `user_settings` não foi verificada.
- **Não foi verificado se `ai.generateStream` propaga `HttpsError('cancelled')` corretamente** quando um tool handler lança via `throwIfAiCancellationRequested`. Presume-se que sim pelo padrão do Genkit, mas não confirmado na documentação.
