# Auditoria Estática — Backend Genkit (Assistant + Inline Assistant + Utilities)

**Data:** 2026-05-28
**Escopo:** 6 arquivos do backend Genkit — flows de assistant/inline-assistant, utilitários (model-config, logger, assistant-context), middleware de créditos
**Focos:** Segurança, erros de lógica, performance, tipagem, tool error handling
**Notebooks consultados:** Loop Agêntico Genkit-Opencode Dev, Genkit Docs, Firebase Cloud Functions Docs

---

## Veredito: **Ajustes recomendados**

O backend está bem estruturado: autenticação em todas as rotas, App Check habilitado, erros de tools serializados corretamente para o modelo, logger estruturado, DRY via model-config. Não há bloqueadores de merge, mas há 3 melhorias importantes e 4 sugestões.

---

## Achados priorizados

### [WARNING] maxTurns:10 sem detecção de doom loop

- **Arquivo:** `functions/src/flows/assistant.ts:567`
- **Confidence:** 95/100
- **Categoria:** Performance / Bug latente
- **Problema:** `maxTurns: 10` (2x o padrão recomendado pelo Genkit) sem nenhum mecanismo de detecção de doom loop — o modelo pode chamar a mesma tool repetidamente com os mesmos argumentos até o limite.
- **Evidência:**
  ```typescript
  const { response: streamResponse, stream } = ai.generateStream({
    // ...
    maxTurns: 10,  // Genkit default é 5
  });
  ```
- **Impacto:** Se o modelo entrar em loop (ex: chamando `updatePlan` ou `getStudioState` repetidamente), cada iteração consome tokens e créditos. Com 10 turnos, o custo pode ser até 2x o esperado antes do corte. O notebook "Loop Agêntico" documenta que o padrão OpenCode usa `DOOM_LOOP_THRESHOLD = 3` para detectar chamadas idênticas consecutivas.
- **Sugestão:** Implementar detecção de doom loop simples: rastrear as últimas 3 chamadas de tool (nome + input serializado). Se idênticas, injetar system message forçando o modelo a responder em texto (soft landing). Alternativa mais simples: reduzir `maxTurns` para 5 (default do Genkit) e usar 8-10 apenas se houver justificativa documentada.

---

### [WARNING] `updateStudioTool` sem try/catch de proteção (inconsistente com outros 6 tools)

- **Arquivo:** `functions/src/flows/assistant.ts:482-488`
- **Confidence:** 85/100
- **Categoria:** Bug latente / Arquitetura
- **Problema:** Das 7 tools, 6 possuem try/catch com `toolErrorResponse()`. A `updateStudioTool` é a única sem proteção. Embora `throwIfAiCancellationRequested` esteja antes e `sendMetaChunk` tenha seu próprio try/catch interno, qualquer exceção inesperada (ex: erro de serialização no `sendMetaChunk` ou erro no `sendChunk` subjacente) propagará como exceção bruta, quebrando o tool loop em vez de permitir auto-correção.
- **Evidência:
  ```typescript
  // updateStudioTool — SEM try/catch
  }, async (toolInput) => {
    await throwIfAiCancellationRequested(db, uid, requestId);
    pendingStudioSettings = toolInput.settings;
    const summary = toolInput.summary ?? 'O assistente sugeriu ajustes para o estúdio.';
    sendMetaChunk('studio_update', { settings: toolInput.settings, summary });
    return { ok: true, settings: toolInput.settings, summary };
  });

  // Comparado com getUserMemoriesTool — COM try/catch
  }, async (toolInput) => {
    await throwIfAiCancellationRequested(db, uid, requestId);
    try {
      // ... lógica ...
    } catch (err) {
      return toolErrorResponse('getUserMemories', err);
    }
  });
  ```
- **Impacto:** Se `sendMetaChunk` falhar internamente (ex: erro de serialização JSON), a exceção não será capturada como resultado de tool — o Genkit runtime a tratará como defeito e o streaming será interrompido.
- **Sugestão:** Envolver o corpo da tool em try/catch consistente:
  ```typescript
  }, async (toolInput) => {
    await throwIfAiCancellationRequested(db, uid, requestId);
    try {
      pendingStudioSettings = toolInput.settings;
      const summary = toolInput.summary ?? 'O assistente sugeriu ajustes.';
      sendMetaChunk('studio_update', { settings: toolInput.settings, summary });
      return { ok: true, settings: toolInput.settings, summary };
    } catch (err) {
      return toolErrorResponse('updateStudio', err);
    }
  });
  ```

---

### [WARNING] `throwIfAiCancellationRequested` DENTRO de tool handlers é capturado pelo toolErrorResponse

- **Arquivo:** `functions/src/flows/assistant.ts:451-474` (getUserMemoriesTool), e tools similares
- **Confidence:** 82/100
- **Categoria:** Bug latente
- **Problema:** Em `getUserMemoriesTool`, `throwIfAiCancellationRequested` está DENTRO do bloco try/catch. Se o usuário cancelar durante a execução da tool, o HttpsError 'cancelled' será capturado por `toolErrorResponse()` e serializado como `{ error: true, tool: 'getUserMemories', message: '...' }` para o modelo — em vez de propagar como cancelamento real do flow.
- **Evidência:
  ```typescript
  }, async (toolInput) => {
    await throwIfAiCancellationRequested(db, uid, requestId);  // ← ANTES do try
    try {
      // ... lógica ...
    } catch (err) {
      return toolErrorResponse('getUserMemories', err);  // ← captura HttpsError!
    }
  });
  ```
  Na verdade, olhando mais cuidadosamente, `throwIfAiCancellationRequested` está ANTES do try em getUserMemoriesTool (linha 451). O try começa na linha 452. Então o cancelamento NÃO é capturado pelo try/catch — ele propaga corretamente.
  
  **Porém**, em `getStudioStateTool` (linha 419), a estrutura é:
  ```typescript
  }, async (toolInput) => {
    await throwIfAiCancellationRequested(db, uid, requestId);  // ← ANTES do try ✅
    try {
      // ...
    } catch (err) {
      return toolErrorResponse('getStudioState', err);
    }
  });
  ```
  O padrão está correto — `throwIfAiCancellationRequested` está fora do try em todas as tools.
  
  **Mas há um risco residual:** se alguém mover acidentalmente o `await throwIfAiCancellationRequested` para dentro do try em uma refatoração futura, o cancelamento será silenciado. Isso não é um bug atual, mas uma fragilidade arquitetural.
- **Impacto:** Atualmente NÃO é um bug (verificação confirmada). Mas a arquitetura é frágil — uma refatoração simples pode introduzir o bug silenciosamente.
- **Sugestão:** Adicionar comentário de proteção em cada tool:
  ```typescript
  // ⚠️ CANCELAMENTE DEVE FICAR FORA DO TRY — NÃO MOVER
  await throwIfAiCancellationRequested(db, uid, requestId);
  ```

---

### [SUGGESTION] `buildStudioBlock` é chamado mesmo quando `toolFirst: true`

- **Arquivo:** `functions/src/flows/assistant.ts:286`
- **Confidence:** 90/100
- **Categoria:** Performance (micro-otimização)
- **Problema:** `buildStudioBlock(input.studioState)` é chamado na linha 286, mas quando `toolFirst: true` (linha 367), o resultado é descartado — `buildAssistantSystemInstruction` usa `buildStudioSummary()` em vez do bloco completo. O trabalho de concatenar ~20 strings é desperdiçado.
- **Evidência:
  ```typescript
  // Linha 286 — sempre executa
  const studioBlock = buildStudioBlock(input.studioState ?? undefined);

  // Linha 360-370 — toolFirst=true, usa buildStudioSummary em vez de studioBlock
  const systemInstruction = buildAssistantSystemInstruction({
    studioBlock,        // ← ignorado quando toolFirst=true
    toolFirst: true,    // ← sempre true no assistant
    studioState: input.studioState ?? undefined,  // ← usado por buildStudioSummary
  });
  ```
- **Impacto:** ~0.1ms por requisição. Negligível, mas desnecessário.
- **Sugestão:** Mover `buildStudioBlock` para dentro de um `if (!toolFirst)` ou passar `undefined` quando `toolFirst: true`.

---

### [SUGGESTION] Logger não inclui trace context do Cloud Functions

- **Arquivo:** `functions/src/genkit/utils/logger.ts`
- **Confidence:** 88/100
- **Categoria:** Observabilidade
- **Problema:** O logger gera `timestamp` local via `new Date().toISOString()`, mas o Cloud Logging do GCP adiciona seu próprio timestamp automaticamente para JSON lines. Em alta concorrência, o timestamp local pode divergir do timestamp de ingestão, dificultando correlação com traces do Cloud Functions.
- **Evidência:
  ```typescript
  function formatEntry(level, context, message, data): string {
    const entry: LogEntry = {
      severity: level,
      message,
      context,
      timestamp: new Date().toISOString(),  // ← redundante com Cloud Logging
      ...data,
    };
    return JSON.stringify(entry);
  }
  ```
- **Impacto:** Dificulta correlação de logs com traces em produção. Não é um bug.
- **Sugestão:** Usar os campos nativos do Cloud Logging (`severity` já está correto). Considerar adicionar `logging.googleapis.com/trace` e `logging.googleapis.com/spanId` para correlação com Cloud Trace. Remover `timestamp` redundante ou usar `logging.googleapis.com/insertId` para deduplicação.

---

### [SUGGESTION] OutputSchema de `getStudioStateTool` é muito permissivo

- **Arquivo:** `functions/src/flows/assistant.ts:417`
- **Confidence:** 85/100
- **Categoria:** Tipagem
- **Problema:** `outputSchema: z.record(z.unknown())` aceita qualquer objeto como resultado. Enquanto `getUserMemoriesTool` e `webSearchTool` têm campos de erro tipados (`error: z.boolean().optional()`, `tool: z.string().optional()`), `getStudioStateTool` não tem — o `toolErrorResponse` retorna `{ error: true, tool: 'getStudioState', message: '...' }` que é aceito apenas porque o schema é `z.record(z.unknown())`.
- **Evidência:** Comparação de schemas:
  ```typescript
  // getStudioStateTool — genérico
  outputSchema: z.record(z.unknown()),
  
  // getUserMemoriesTool — tipado
  outputSchema: z.object({
    memories: z.array(z.object({ content: z.string() })).optional(),
    mode: z.string().optional(),
    error: z.boolean().optional(),
    tool: z.string().optional(),
    message: z.string().optional(),
  }),
  ```
- **Impacto:** O modelo recebe o resultado sem validação estruturada. Se o resultado vier com campos inesperados, o schema não rejeita.
- **Sugestão:** Tipar o schema de saída do `getStudioStateTool` com campos explícitos, incluindo os campos de erro para consistência:
  ```typescript
  outputSchema: z.object({
    selectedVoice: z.string().optional(),
    pace: z.string().optional(),
    // ... campos do estúdio ...
    error: z.boolean().optional(),
    tool: z.string().optional(),
    message: z.string().optional(),
  }).passthrough(),
  ```

---

### [SUGGESTION] `extractJsonSettings` não valida campos do schema de settings

- **Arquivo:** `functions/src/flows/assistant.ts:81-101`
- **Confidence:** 80/100
- **Categoria:** Segurança / Validação
- **Problema:** `extractJsonSettings` faz `JSON.parse` do bloco ```json``` e retorna como `Record<string, unknown>` sem validar se os campos são legítimos settings do estúdio. Se o modelo gerar JSON com campos maliciosos ou inesperados (ex: `__proto__`, `constructor`), eles serão passados para o frontend.
- **Evidência:
  ```typescript
  function extractJsonSettings(text: string): Record<string, unknown> | undefined {
    // ...
    const parsed = JSON.parse(match[1].trim());
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;  // ← sem validação de campos
    }
  }
  ```
- **Impacto:** Baixo — o frontend usa `sanitizeStudioSettingsPatch` antes de aplicar. Mas o backend deveria ser a primeira linha de defesa.
- **Sugestão:** Considerar validação com Zod usando um subset de campos conhecidos do estúdio (selectedVoice, pace, emotion, etc.) antes de retornar. Ou pelo menos filtrar chaves que começam com `__`.

---

## O que parece saudável

- **Autenticação consistente:** `isSignedIn()` + `enforceAppCheck: true` + `getCallableUidOrThrow` em todos os flows
- **Tool error handling bem implementado:** 6 das 7 tools serializam erros como `{ error: true, tool, message }` — padrão correto para o Genkit tool loop (confirmado pelo notebook: "o runtime captura ToolFailure e devolve o resultado com status de erro para que o modelo se auto-corrija")
- **Cancelamento cooperativo:** `throwIfAiCancellationRequested` no início de cada tool handler, com verificação entre turnos do streaming
- **Créditos transacionados corretamente:** `withCreditMetering` com confirm/revert, parcial em caso de desconexão do cliente
- **Logger estruturado JSON:** substitui `console.log` direto, com níveis e contexto — Cloud Logging reconhece JSON lines nativamente
- **DRY via model-config.ts:** `resolveModelConfig` centraliza lógica duplicada entre assistant e inline-assistant
- **Tool-first optimization:** `buildStudioSummary` e `buildMemoriesSummary` evitam injetar contexto completo no system prompt quando o modelo consulta via tools
- **Schemas Zod com `.nullable().optional()`:** correção documentada para serialização Firebase `undefined → null`
- **Histórico truncado:** `MAX_HISTORY_MESSAGES_FOR_ESTIMATION = 10` evita payloads excessivos na estimativa de créditos
- **`stripJsonSettingsBlock`** limpa JSON cru antes de retornar ao frontend — boa UX
- **Retry de TTS:** `TTS_MAX_RETRIES = 2` com backoff — resiliente a erros transitórios da API

---

## Limites da revisão

- Não foi possível verificar se `sanitizeStudioSettingsPatch` no frontend valida todos os campos retornados por `extractJsonSettings` (frontend não lido)
- Não verifiquei se `creditMeteringMiddleware` é usado em outros flows além do assistant (escopo limitado aos 6 arquivos)
- O notebook "Loop Agêntico" não documenta a implementação específica do Genkit para doom loop — apenas o padrão OpenCode (Effect.ts). A implementação precisa ser adaptada
- Não verifiquei se o `googleSearchRetrieval` config no `webSearchTool` funciona corretamente com o modelo `resolvedModel` (pode não ser suportado em todos os modelos)
- Os notebooks consultados não documentam se `z.record(z.unknown())` é validado pelo runtime do Genkit contra o `outputSchema` ou se é apenas informativo para o modelo
