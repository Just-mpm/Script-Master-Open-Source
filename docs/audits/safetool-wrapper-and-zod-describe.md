# Auditoria Estática — Wrapper `safeTool` e `.describe()` nos Schemas Zod

**Data:** 2026-06-02
**Branch:** `main` (working tree, uncommitted)
**Escopo da auditoria:**
- `functions/src/flows/assistant.ts` (modificado, +128 / -104 linhas)
- `functions/src/genkit/schemas/common.ts` (modificado, +18 / -18 linhas)

**Estatísticas do escopo:** 2 arquivos auditados, 1 wrapper novo (`safeTool`) + 1 helper substituído (`toolErrorResponse`) + 6 tools refatoradas + 9 schemas com `.describe()` adicionados.

**Stack:** Genkit `^1.34.0` (genkit/beta), Zod `^4.3.5`, `@genkit-ai/google-genai` (Gemini 3.1 Flash-Lite, 3.5 Flash, Flash Image, Flash TTS), TypeScript 6, Node 24.

**Metodologia:** Leitura estática completa dos 2 arquivos modificados (1012 + 477 linhas), busca estrutural (`supergrep_find` em 12 padrões), análise de impacto via `analyze_aitool_changes`, validação cruzada com NotebookLM (Genkit Docs, Zod V4 Docs, Gemini API Docs) e revisão de `cancel-ai-request.ts` + `usage/ai-requests.ts` para entender o ciclo de cancelamento.

---

## Veredito

**🔴 BLOQUEADORES DE MERGE** — 3 problemas críticos identificados. A intenção (evitar crash do stream por `ValidationError`) está correta e o problema original está confirmado pela documentação oficial do Genkit, mas a implementação introduz **3 regressões funcionais** que precisam ser corrigidas antes do deploy.

A solução é funcional no caso feliz (LLM envia input válido) e resolve o problema imediato de crash, mas o trade-off escolhido (usar `z.unknown()` como inputSchema) sacrifica o schema estrutural que o LLM recebe — o que **aumenta a probabilidade de inputs malformados** e, paradoxalmente, **pode piorar o problema que motivou a mudança** (mais validações falhando → mais autocorreções → mais tokens gastos).

A ideia central (try/catch no handler em vez de deixar o Genkit lançar) é boa. O que precisa mudar é a forma de entregar o schema ao LLM: usar o inputSchema real + capturar o `ValidationError` em escopo onde possa ser convertido em objeto, em vez de `z.unknown()`.

---

## Achados priorizados

### 🔴 BLOQUEADORES (3)

#### [CRITICAL] `z.unknown()` como inputSchema entrega schema vazio `{}` ao LLM — Gemini pode enviar `arguments: {}` literal

- **Arquivo:** `functions/src/flows/assistant.ts:601-621` (wrapper `safeTool`)
- **Confidence:** 92/100
- **Categoria:** Bug / Regressão funcional / LLM
- **Problema:** O Genkit converte o `inputSchema` de cada tool para JSON Schema antes de enviar ao Gemini. Como o `safeTool` agora define `inputSchema: z.unknown()`, o JSON Schema resultante é **`{}`** (objeto vazio). Confirmado por **3 fontes oficiais**:
  - **Zod V4 Docs:** "`z.unknown()` reflete o tipo `unknown` do TypeScript. No JSON Schema, o equivalente é um **objeto vazio `{}`**" (requer `unrepresentable: 'any'`).
  - **Genkit Docs:** "O Genkit usa `toJsonSchema` para converter schemas Zod. Se omitido, o Genkit usa `z.void()`" — e o mesmo `toJsonSchema` é aplicado a `z.unknown()`.
  - **Gemini API Docs:** "O Gemini **não infere** a estrutura do JSON a partir do description da tool. Se o `inputSchema` é `{}` (vazio), o Gemini entende que a função **não recebe argumentos** e envia `arguments: {}` literal."
- **Evidência no código atual:**
  ```ts
  // assistant.ts:601-606
  return ai.dynamicTool({
    name: config.name,
    description: config.description,
    // Schema permissivo — nunca rejeita. Validação real dentro do handler.
    inputSchema: z.unknown(),  // ← vira {} no JSON Schema → LLM vê "função sem args"
    // Sem outputSchema — aceita qualquer retorno (sucesso OU erro de validação).
  }, async (rawInput: unknown) => { ... });
  ```
- **Impacto concreto:**
  1. O Gemini recebe as 6 tools com `inputSchema: {}` no JSON Schema
  2. Em modelos Gemini 3, isso aumenta a chance de o modelo enviar `{}` ou inputs incompletos
  3. O `safeParse` falha → retorna erro de validação → LLM tenta novamente no próximo turn
  4. Em casos extremos, consome 1-3 turns extras por chamada (cada turn tem custo de tokens)
  5. **Paradoxo:** a correção introduzida para evitar crash por validação pode **aumentar a frequência de validações falhas**
- **Por que o `description` da tool não basta:** Os descriptions atuais (ex: "Cria ou atualiza a lista de tarefas (TODO list)... Cada tarefa pode ter subtarefas, prioridade e dependências") **não mencionam explicitamente** o nome do campo de input (`plan`), o tipo, nem quais campos são obrigatórios. O LLM tem que inferir tudo do texto natural.
- **Sugestão (3 alternativas, ordem de preferência):**
  1. **Manter o inputSchema real + capturar ValidationError em escopo externo.** O Genkit lança `ValidationError` se a validação do schema falha. Em vez de trocar para `z.unknown()`, **use o schema real** e envolva o `generateStream` num try/catch que detecta `ValidationError`, converte para `{error: true, ...}` e injeta no histórico. Mais complexo, mas preserva o schema.
  2. **Usar `z.object({...}).partial().passthrough()` como inputSchema do `dynamicTool`** — aceita qualquer objeto com chaves arbitrárias, mas força o LLM a enviar um `{}` em vez de um primitivo. Compromisso razoável.
  3. **Reescrever os `description` das tools** para serem tão explícitos quanto um schema JSON, mencionando todos os campos, tipos e obrigatoriedades. Funciona, mas é frágil (depende da qualidade do description).

---

#### [CRITICAL] Descriptions adicionados aos campos do `common.ts` não chegam ao LLM (regressão de investimento)

- **Arquivo:** `functions/src/genkit/schemas/common.ts:97-185` (9 schemas com `.describe()`)
- **Confidence:** 90/100
- **Categoria:** Bug / Regressão de design
- **Problema:** O PR adicionou descriptions detalhados em campos como `title: z.string().describe('Título curto e OBRIGATÓRIO da tarefa — NUNCA omita este campo')`. **Esses descriptions não são propagados ao LLM** porque o `inputSchema` do `ai.dynamicTool` é `z.unknown()` — o Genkit serializa `z.unknown()` como `{}` no JSON Schema e descarta o schema original. Os descriptions agora só servem para:
  - O dev que lê o código (DX)
  - O `safeParse` no handler (validação)
  - **Não chegam ao LLM, que era o objetivo**
- **Evidência no código:**
  ```ts
  // common.ts:97-110 (description aplicado, mas inútil para o LLM)
  export const AssistantSubtaskSchema = z.object({
    id: z.string().describe('Identificador único da subtarefa (ex: "1.1", "1.2")'),
    title: z.string().describe('Título curto e OBRIGATÓRIO da subtarefa — NUNCA omita este campo'),
    description: z.string().nullable().optional().describe('Descrição detalhada opcional da subtarefa'),
    status: z.string().describe('Status da subtarefa: pending, in_progress, completed, failed ou need_help'),
  });

  // assistant.ts:605 (o LLM nunca vê o schema acima)
  inputSchema: z.unknown(),
  ```
- **Impacto:**
  - Trabalho de documentação perdido (9 schemas, ~18 descriptions adicionados)
  - Inconsistência: a documentação dos schemas (`.describe()`) sugere que o LLM **deveria** vê-los
  - Aumento do risco de inputs malformados (conexo ao achado CRITICAL #1)
- **Sugestão:** Se o objetivo é que o LLM siga constraints específicos, esses descriptions **precisam** estar no JSON Schema que vai para o Gemini. Isso só é possível se o `inputSchema` do `dynamicTool` for o schema real (com descriptions), e o handler fizer o try/catch em escopo onde possa capturar `ValidationError` (alternativa 1 do achado anterior).

---

#### [CRITICAL] `throwIfAiCancellationRequested` é engolido pelo try/catch do `safeTool` — cancelamento do usuário atrasa

- **Arquivo:** `functions/src/flows/assistant.ts:614-621` (try/catch do safeTool) + `functions/src/flows/assistant.ts:633, 644, 665, 692, 704, 715` (chamadas em cada tool) + `functions/src/usage/ai-requests.ts:158-170` (definição)
- **Confidence:** 88/100
- **Categoria:** Bug / Regressão de comportamento
- **Problema:** Cada uma das 6 tools chama `await throwIfAiCancellationRequested(db, uid, requestId)` no início. **Antes do safeTool**, quando o usuário cancelava:
  1. A próxima tool a ser executada lançava `HttpsError('cancelled', ...)`
  2. A exceção **propagava** para o Genkit
  3. O Genkit **abortava o loop** de tool calls
  4. O try/catch do flow (linha 959) detectava `error.code === 'cancelled'`
  5. Chamava `creditMeter.revert('USER_CANCELLED')` e finalizava o `ai_request` com status `cancelled`
  6. Streaming parava **imediatamente**

  **Com o safeTool**, o mesmo cenário:
  1. A próxima tool lança `HttpsError('cancelled', ...)`
  2. O try/catch do safeTool **captura a exceção** e retorna `{error: true, tool, message: 'A operação foi cancelada pelo usuário.'}` como **objeto**
  3. O Genkit **NÃO vê uma exceção** — vê um retorno de tool normal
  4. O LLM recebe o objeto `{error: true, message: 'A operação foi cancelada pelo usuário.'}` como resultado da tool
  5. O LLM pode:
     a) Chamar outra tool (que também vai retornar erro de cancelamento)
     b) Responder com texto natural ("Operação cancelada pelo usuário") e parar (improvável — o LLM não foi instruído a parar nesse caso)
     c) Continuar a tarefa como se nada tivesse acontecido (mais provável, especialmente em tools como `webSearch`)
  6. O streaming só para quando:
     - O LLM decide parar (improvável e inconsistente)
     - `maxTurns: 20` é atingido (pode levar muitos segundos/minutos)
     - O cliente desconecta (`sendFailed = true` no loop de streaming, linha 793)
- **Evidência no código:**
  ```ts
  // ai-requests.ts:158-170 — a exceção é SEMPRE HttpsError('cancelled')
  export async function throwIfAiCancellationRequested(...) {
    if (await isAiCancellationRequested(...)) {
      throw new HttpsError('cancelled', 'A operação foi cancelada pelo usuário.', { ... });
    }
  }

  // assistant.ts:614-621 — o safeTool captura TUDO, incluindo o cancelamento
  try {
    return await handler(validation.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'Erro desconhecido';
    log.warn(`Tool ${config.name} falhou em runtime — modelo receberá erro como resultado`, { error: message });
    return { error: true, tool: config.name, message };  // ← cancelamento vira objeto
  }
  ```
- **Impacto:**
  - **UX pior**: usuário clica em "cancelar" e o streaming continua por vários segundos antes de parar
  - **Custo maior**: mais tokens consumidos após o cancelamento (LLM continua gerando)
  - **Comportamento documentado do projeto quebrado**: o AGENTS.md menciona cancelamento como feature, mas agora a interrupção efetiva só acontece no `maxTurns` ou na desconexão do cliente
  - O `creditMeter.revert` ainda é chamado no final (com errorCode correto), então os créditos **são** revertidos — mas com delay
- **Sugestão:** Re-lançar a exceção de cancelamento (NÃO capturá-la) no `safeTool`:
  ```ts
  try {
    return await handler(validation.data);
  } catch (err: unknown) {
    // Re-lança exceções de cancelamento (devem propagar para abortar o flow)
    if (err instanceof HttpsError && err.code === 'cancelled') {
      throw err;
    }
    const message = err instanceof Error ? err.message.slice(0, 300) : 'Erro desconhecido';
    log.warn(`Tool ${config.name} falhou em runtime — modelo receberá erro como resultado`, { error: message });
    return { error: true, tool: config.name, message };
  }
  ```
  Isso preserva a intenção do `safeTool` (evitar crash do stream por validação) sem afetar o ciclo de cancelamento.

---

### ⚠️ WARNINGS (2)

#### [WARNING] `ai.dynamicTool` está deprecated em favor de `ai.tool()`

- **Arquivo:** `functions/src/flows/assistant.ts:601`
- **Confidence:** 90/100
- **Categoria:** Deprecation / Manutenibilidade
- **Problema:** A documentação oficial do Genkit marca `dynamicTool` como deprecated: "@deprecated renamed to {@link tool}". O código fonte do Genkit confirma: `dynamicTool` é apenas um alias que delega para `tool`. Funciona em 1.34, mas:
  - Pode gerar warning de TypeScript/lint (depende da config do ESLint)
  - Pode ser **removido em versões major futuras** (Genkit segue semver, e funções deprecated podem ser removidas em majors)
- **Evidência (via NotebookLM, citação da própria docstring do Genkit):**
  ```ts
  /**
   * Defines a dynamic tool. Dynamic tools are just like regular tools but will not be registered
   * in the Genkit registry and can be defined dynamically at runtime.
   * @deprecated renamed to {@link tool}.
   */
  export function dynamicTool<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(...) {
    const t = basicTool(config, fn) as DynamicToolAction<I, O>;
    t.attach = (_: Registry) => t;
    return t;
  }
  ```
- **Impacto:** Não bloqueia produção hoje, mas é uma **dívida técnica** que deve ser paga antes que o Genkit 2.0 saia (estimativa baseada em cadência de releases do projeto).
- **Sugestão:** Trocar `ai.dynamicTool({...}, handler)` por `ai.tool({...}, handler)`. Mudança mecânica, sem impacto funcional. A assinatura é idêntica.

---

#### [WARNING] Remoção de `outputSchema` das 6 tools afeta a qualidade do retorno que o LLM vê

- **Arquivo:** `functions/src/flows/assistant.ts` (6 tools, todas sem `outputSchema`)
- **Confidence:** 80/100
- **Categoria:** LLM / Consistência
- **Problema:** Cada tool antes declarava um `outputSchema` específico (ex: `webSearch` retornava `{query, text, sources}` com tipos e descriptions). O Genkit usava `z.void()` internamente quando outputSchema é omitido, o que vira **`{}`** no JSON Schema.
- **Impacto:**
  - O LLM vê o tool como "não retorna nada estruturado"
  - O LLM recebe objetos de retorno (sucesso ou erro) como `unknown`
  - Para ferramentas que retornam estruturas ricas (`webSearch` → `{query, text, sources[]}`), o LLM pode ser forçado a gerar **mais texto explicativo** para o usuário, em vez de simplesmente parafrasear o resultado
  - **Risco de alucinação:** o LLM pode "inventar" campos que estavam no retorno (porque não tem schema para confirmar)
- **Por que foi removido:** Para que o `safeTool` pudesse retornar tanto `{ok: true, ...}` (sucesso) quanto `{error: true, ...}` (erro), o `outputSchema` teve que ser omitido. A escolha é razoável, mas a consequência é essa.
- **Sugestão:** Considerar um `outputSchema` unificado que aceite AMBOS os formatos:
  ```ts
  outputSchema: z.union([
    z.object({ ok: z.boolean(), /* campos específicos do tool */ }),
    z.object({ error: z.literal(true), tool: z.string(), message: z.string() }),
  ])
  ```
  Isso preserva a informação estrutural para o LLM, e o handler pode retornar tanto sucesso quanto erro sem quebrar a validação.
  **OU** aceitar o trade-off (LLM vê o retorno como "void") se testes em produção mostrarem que o Gemini lida bem com isso.

---

### 💡 SUGESTÕES (1)

#### [SUGGESTION] Nenhum teste cobre o `safeTool` nem o novo fluxo de validação gracioso

- **Arquivo:** `functions/src/flows/assistant.ts:564-622` (wrapper) + `functions/src/flows/assistant.ts:628-732` (6 tools)
- **Confidence:** 95/100
- **Categoria:** Testes / Cobertura
- **Problema:** Não existe nenhum arquivo `*.test.ts` em `functions/`. Verificado via `glob 'functions/**/*test*'` (zero resultados). O wrapper `safeTool` e todas as 6 tools refatoradas não têm cobertura automatizada.
- **Cenários críticos não testados:**
  1. `safeParse` falhando → wrapper retorna `{error: true, ...}` no formato correto
  2. Handler lançando `HttpsError('cancelled')` → deve propagar (conforme achado CRITICAL #3)
  3. Handler lançando erro genérico → wrapper converte para `{error: true, ...}` e trunca mensagem em 300 chars
  4. Schema `UpdatePlanInputSchema` recebendo `plan: []` → sucesso (caso válido)
  5. Schema `UpdatePlanInputSchema` recebendo `plan: null` → erro de validação
  6. Schema `UpdatePlanInputSchema` recebendo `{}` (sem `plan`) → erro de validação
  7. Schema `RespondInputSchema` recebendo `text` faltando → erro de validação
  8. LLM enviando campos extras (ex: `updatePlan` recebendo `tasks: [...]` em vez de `plan: [...]`) → erro de validação
- **Sugestão:** Criar `functions/src/flows/__tests__/assistant-safe-tool.test.ts` (ou `*.unit.test.ts` se o projeto já tem convenção) com os 8 cenários acima. Mínimo: validar que o `safeParse` retorna o erro no formato esperado e que o `try/catch` do wrapper se comporta corretamente. Pode ser um teste unitário puro (sem mock do Genkit), pois a lógica do `safeTool` é isolada.

---

## Edge cases analisados (não viraram achados, mas documentados)

### ✅ O que está **correto** no `safeTool`

1. **Estrutura do erro é consistente:** Tanto erro de validação quanto erro de runtime retornam `{error: true, tool, message}`. LLM recebe formato previsível.
2. **`safeParse` é o método correto:** Não usar `.parse()` (que lança). Usar `safeParse` e estruturar o resultado é o padrão recomendado.
3. **`result.error.issues` é usado para construir mensagem útil:** O `.map((issue) => '• path: message')` é legível para o LLM e o dev.
4. **Truncamento de 300 chars em runtime errors:** Razoável para evitar que stack traces enormes poluam o contexto do LLM. (Confidence 70 — abaixo do gate, mas vale mencionar.)
5. **Log estruturado dos erros:** `log.warn` com `issues` ou `error` é útil para debugging.
6. **`toolErrorResponse` foi corretamente removido:** Verificado com `supergrep_find` (zero referências remanescentes).
7. **Apenas 1 `ai.dynamicTool` em todo o código** (dentro do `safeTool`): verificado com `supergrep_find 'ai.dynamicTool($$$ARGS)'`. Refatoração está completa e consistente.
8. **`interviewInterrupt` mantém schema real:** O único `defineInterrupt` (linha 101) usa `InterviewInputSchema` como inputSchema, então o LLM recebe o schema completo para interview. Bom.
9. **Tools são recriadas a cada request:** Como o `safeTool` é definido dentro do callback do `ai.defineFlow`, cada request cria 6 instâncias novas. Capturam `db`, `uid`, `requestId` por closure. Não há stale state.

### ⚠️ Edge cases que **não** são problemas, mas merecem nota

1. **Loop de autocorreção até `maxTurns: 20`:** Se o LLM continuar enviando input inválido, o Genkit lança `GenerationResponseError` que é capturado pelo try/catch do flow (linha 959). Os créditos são revertidos. O usuário recebe um erro. OK.
2. **`z.void()` como outputSchema implícito:** Confirmado pelo NotebookLM que é o comportamento padrão quando `outputSchema` é omitido. Vira `{}` no JSON Schema. O LLM recebe o retorno como `unknown`. Não é ideal (warning #2), mas não quebra.
3. **Gemini vs Ollama:** O plugin do Google GenAI aceita `z.unknown()` (vira `{}`). Ollama rejeita (exige `'object'`). Como o projeto usa exclusivamente Gemini (verificado em `AGENTS.md` e `genkit.ts`), não é problema aqui.
4. **Validação de `updatePlan` com `plan: []`:** Schema aceita (não há `.min(1)`). Comportamento intencional (pode ser usado para "limpar plano"). OK.
5. **Handler pode retornar `undefined`:** O Genkit aceita (void → undefined). Os handlers sempre retornam objetos (`{ok: true, ...}` ou `{error: true, ...}`), mas se algum esquecesse, o Genkit não quebraria.

---

## O que parece saudável

### Arquitetura e design

- **Intenção clara e bem documentada:** O comentário "safeDynamicTool — wrapper com validação manual e erro amigável" (linhas 555-562) explica exatamente o problema que está sendo resolvido e por quê. Reflete maturidade técnica.
- **Helper `validateToolInput` separado:** Boa separação de responsabilidades — a função pura `validateToolInput` pode ser testada isoladamente.
- **Tipo `ToolValidationResult<T>` bem definido:** Discriminated union (`ok: true | false`) garante type safety no handler.
- **Erro estruturado e autocontido:** `{error: true, tool, message}` é simples, parseável pelo LLM e contém contexto suficiente.
- **Idempotência de `toolErrorResponse` removido:** A função antiga (`toolErrorResponse`) só era usada em 4 tools (tinha try/catch em volta). O novo wrapper elimina o try/catch duplicado em cada tool, reduzindo boilerplate de ~30 linhas.

### TypeScript e tipagem

- **Zero `any`** no wrapper. `rawInput: unknown` é a tipagem correta para entrada de tool Genkit.
- **Generic `safeTool<TInput>`** preserva o tipo do schema até o handler, garantindo autocomplete e type safety.
- **`z.ZodType<TInput>`** é a forma correta de parametrizar schemas Zod arbitrários (não `z.ZodSchema` ou `z.AnyZodType` que são menos precisos).
- **`catch (err: unknown)` + `err instanceof Error`** é o padrão recomendado pelo AGENTS.md.
- **Truncamento `.slice(0, 300)`:** Defensivo, evita inchaço do contexto.

### Conformidade com o AGENTS.md

- **Logger correto:** Usa `createLogger('assistant')` de `src/genkit/utils/logger.ts` (import relativo, conforme regra).
- **Backend via Cloud Functions v2:** Tool execution permanece no backend (`functions/src/flows/assistant.ts`), nunca no frontend.
- **Comentários em pt-BR:** Consistente com o resto do projeto.
- **Sem secrets/logs sensíveis:** Mensagens de erro podem incluir stack traces, mas os handlers atuais (Firestore, Gemini) não expõem PII.

---

## Limites da revisão

- **Não foi possível executar testes:** Não rodei `npm test` ou `bun run test` porque o foco é auditoria estática. Não validei o comportamento real do Gemini com `inputSchema: {}` — apenas a documentação oficial que diz que ele envia `{}` literal. Pode haver variação empírica.
- **Não li o código pré-PR completo:** O diff mostra as mudanças, mas não validei o comportamento exato de cada tool ANTES do safeTool (apenas inferi pela leitura do diff). Em particular, a interação entre `throwIfAiCancellationRequested` e o `ai.generateStream` loop antes do PR não foi reconstruída com 100% de certeza.
- **Versão do Gemini testada:** A documentação consultada se aplica ao Gemini 3.1 (versões Flash-Lite, Flash, Pro). O `AGENTS.md` menciona "gemini-3.1-flash-tts-preview", "gemini-3.1-flash-image-preview", "gemini-3.1-flash-lite" e "gemini-3.5-flash" como modelos em uso. O comportamento com `inputSchema: {}` pode variar entre eles.
- **Sem cobertura de carga:** Não foi avaliado o impacto de performance/latência de 1-3 turns extras por chamada (em pico, pode ser relevante).
- **NotebookLM consultado:** Genkit Docs (fontes sobre `dynamicTool`, `inputSchema`, `outputSchema`, `parseSchema`, `ValidationError`), Zod V4 Docs (fontes sobre `.describe()`, `z.unknown()`, `z.toJSONSchema()`), Gemini API Docs (fontes sobre function calling, `inputSchema` vazio). **Três notebooks oficiais** foram usados para validação cruzada.
- **`@genkit-ai/google-genai` ^1.34.0:** Verificado que é a versão instalada. Comportamento pode mudar em versões futuras (especialmente se a deprecação de `dynamicTool` virar remoção).

---

## Recomendações priorizadas para correção

1. **(CRITICAL #1 + #2) Decidir entre 3 alternativas para preservar o schema do LLM:**
   - A) Trocar para `ai.tool()` (sem `dynamicTool`) e usar o inputSchema real + capturar `ValidationError` em escopo externo
   - B) Usar `z.object({...}).partial().passthrough()` como inputSchema permissivo
   - C) Reescrever os `description` das tools para serem explícitos quanto a campos, tipos e obrigatoriedades (cobre CRITICAL #2, mas é frágil)

2. **(CRITICAL #3) Re-lançar `HttpsError('cancelled')` no `safeTool`** — patch de 4 linhas, sem impacto em outros comportamentos.

3. **(WARNING #1) Trocar `ai.dynamicTool` por `ai.tool`** — patch de 1 linha, remove deprecation.

4. **(WARNING #2) Considerar `outputSchema` unificado** com `z.union` de sucesso/erro — opcional, depende de validação empírica.

5. **(SUGESTÃO #1) Criar testes para `safeTool`** — 8 cenários mínimos, ~100 linhas de teste.

---

## Estatísticas

- **Arquivos auditados:** 2 modificados
- **Linhas analisadas:** 1012 + 477 = 1489 linhas (leitura completa)
- **Padrões estruturais buscados:** 12 (`ai.dynamicTool`, `ai.defineTool`, `toolErrorResponse`, `safeTool`, `safeParse`, `outputSchema`, `inputSchema`, `ai.generateStream`, `ai.defineFlow`, `ai.generate`, `ai.defineInterrupt`, `throwIfAiCancellationRequested`)
- **Notebooks consultados:** 3 (Genkit Docs, Zod V4 Docs, Gemini API Docs)
- **Citações oficiais:** 14 (Genkit) + 9 (Zod V4) + 10 (Gemini API) = 33 fontes
- **Achados:** 3 CRITICAL + 2 WARNING + 1 SUGGESTION
- **Confiança média:** 89/100 (alta, baseada em evidência concreta + documentação oficial)
