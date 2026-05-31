# Auditoria: Migração interview → defineInterrupt (Genkit Beta)

**Data:** 2026-05-31
**Versão:** 0.112.0
**Escopo:** 4 arquivos modificados + 2 arquivos de referência
**Focos:** Tipagem, lógica de erro, compatibilidade backward, uso correto da API Genkit

---

## Escopo da revisão

| Arquivo | Linhas | Lido por completo |
|---------|--------|-------------------|
| `functions/src/genkit/genkit.ts` | 141 | Sim |
| `functions/src/genkit/schemas/common.ts` | 454 | Sim |
| `functions/src/flows/assistant.ts` | 979 | Sim |
| `src/hooks/useAssistant.ts` | 904 | Sim |
| `src/lib/db/types.ts` | 223 | Parcial (ChatSession) |

**Validações realizadas:**
- Diff completo via `analyze_aitool_changes` (18 modified, 10 new)
- TypeScript compilation: `tsc --noEmit` — **5 erros confirmados**
- Tipos do Genkit verificados em `node_modules/@genkit-ai/ai/lib/` (`ToolRequestPart`, `Resumable`, `ResumeOptions`, `GenerateResponse.interrupts`)
- NotebookLM consultado: Genkit Docs (69 fontes) — API `defineInterrupt`, `.respond()`, `response.interrupts`, `resume`
- Busca estrutural por `interruptToolRequest` em todo o projeto (frontend + backend)

---

## Veredito

**Bloqueadores de merge** — a migração tem 3 erros de compilação e 4 bugs de runtime que quebram completamente o fluxo de interrupt/resume.

---

## Achados priorizados

### [CRITICAL] Import `genkit/beta` ausente — `defineInterrupt` não existe em `Genkit`

- **Arquivo:** `functions/src/genkit/genkit.ts:15`
- **Confidence:** 100/100
- **Categoria:** TypeScript / Bug
- **Problema:** O import é `import { genkit, generateMiddleware } from 'genkit'`, que retorna a classe `Genkit`. O método `defineInterrupt` pertence à classe `GenkitBeta`, disponível apenas via `import { genkit } from 'genkit/beta'`.
- **Evidência:**
  ```typescript
  // genkit.ts:15 — import atual (INCORRETO)
  import { genkit, generateMiddleware } from 'genkit';

  // genkit-beta.d.ts:143 — defineInterrupt só existe em GenkitBeta
  declare class GenkitBeta extends Genkit {
    defineInterrupt<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
      config: InterruptConfig<I, O>
    ): ToolAction<I, O>;
  }
  ```
- **Impacto:** `tsc` emite `Property 'defineInterrupt' does not exist on type 'Genkit'` (linha 637). O código **não compila**.
- **Sugestão:** Mudar import para `'genkit/beta'`:
  ```typescript
  import { genkit, generateMiddleware } from 'genkit/beta';
  ```

---

### [CRITICAL] `interruptToolRequest` ausente do `AssistantInputSchema`

- **Arquivo:** `functions/src/genkit/schemas/common.ts:171-187`
- **Confidence:** 100/100
- **Categoria:** Bug / TypeScript
- **Problema:** O campo `interruptToolRequest` foi adicionado ao `AssistantOutputSchema` (linha 201) mas **não** ao `AssistantInputSchema`. O frontend envia o campo (`useAssistant.ts:575`), mas Zod o remove durante a validação do input (schema sem `.passthrough()`).
- **Evidência:**
  ```typescript
  // common.ts:171-187 — AssistantInputSchema SEM interruptToolRequest
  export const AssistantInputSchema = z.object({
    message: z.string(),
    // ... outros campos ...
    resume: InterviewResumeDataSchema.nullable().optional(),
    fullHistory: z.array(AssistantHistoryMessageSchema).max(2_000).nullable().optional(),
    // ❌ interruptToolRequest AUSENTE
  });

  // common.ts:201 — AssistantOutputSchema COM interruptToolRequest
  interruptToolRequest: AssistantHistoryToolRequestSchema.nullable().optional(),
  ```
- **Impacto:** `input.interruptToolRequest` é sempre `undefined` após parsing Zod. `tsc` emite `Property 'interruptToolRequest' does not exist on type` (linhas 374, 390). O resume **nunca funciona**.
- **Sugestão:** Adicionar ao `AssistantInputSchema`:
  ```typescript
  interruptToolRequest: AssistantHistoryToolRequestSchema.nullable().optional(),
  ```

---

### [CRITICAL] `interviewInterrupt` usado antes da declaração

- **Arquivo:** `functions/src/flows/assistant.ts:389`
- **Confidence:** 100/100
- **Categoria:** Bug / TypeScript
- **Problema:** A lógica de resume (linhas 373-393) referencia `interviewInterrupt.respond()`, mas `interviewInterrupt` é declarado na linha 637 — **248 linhas depois**. O bloco de resume foi colocado acima das definições de tools.
- **Evidência:**
  ```typescript
  // assistant.ts:389 — uso (ANTES da declaração)
  genkitResume = interviewInterrupt.respond(
    input.interruptToolRequest as Parameters<typeof interviewInterrupt.respond>[0],
    outputData,
  );

  // assistant.ts:637 — declaração (DEPOIS do uso)
  const interviewInterrupt = ai.defineInterrupt({ ... });
  ```
- **Impacto:** `tsc` emite `Block-scoped variable 'interviewInterrupt' used before its declaration`. O código **não compila**.
- **Sugestão:** Mover a declaração de `interviewInterrupt` para antes do bloco de resume (antes da linha 373), ou reestruturar o código para que o resume seja construído após as definições de tools.

---

### [WARNING] Acesso incorreto a `ToolRequestPart` — estrutura aninhada ignorada

- **Arquivo:** `functions/src/flows/assistant.ts:822-828`
- **Confidence:** 98/100
- **Categoria:** Bug
- **Problema:** O código acessa `interrupt.input`, `interrupt.name`, `interrupt.ref` diretamente, mas `response.interrupts` retorna `ToolRequestPart[]` cuja estrutura é `{ toolRequest: { name, ref, input } }`. As propriedades estão aninhadas sob `toolRequest`.
- **Evidência:**
  ```typescript
  // assistant.ts:822-828 — acesso DIRETO (incorreto)
  const interruptInput = (interrupt as { input?: unknown }).input as InterviewInput | undefined;
  const interruptToolRequest = {
    name: (interrupt as { name?: string }).name ?? 'interview',
    ref: (interrupt as { ref?: string }).ref,
    input: interruptInput,
  };

  // ToolRequestPart real (parts.d.ts:225-228)
  type ToolRequestPart = {
    toolRequest: { name: string; ref?: string; input?: unknown; partial?: boolean };
    metadata?: Record<string, unknown>;
    // ...
  };
  ```
- **Impacto:** Todos os três campos (`name`, `ref`, `input`) seriam `undefined` em runtime. O `interruptToolRequest` enviado ao frontend seria `{ name: 'interview', ref: undefined, input: undefined }`.
- **Sugestão:** Acessar via `interrupt.toolRequest`:
  ```typescript
  const toolReq = (interrupt as { toolRequest?: { name?: string; ref?: string; input?: unknown } }).toolRequest;
  const interruptToolRequest = {
    name: toolReq?.name ?? 'interview',
    ref: toolReq?.ref,
    input: toolReq?.input as InterviewInput | undefined,
  };
  ```

---

### [WARNING] `outputSchema` do interrupt não inclui `answer` — resposta do usuário é ignorada

- **Arquivo:** `functions/src/flows/assistant.ts:641-644`
- **Confidence:** 95/100
- **Categoria:** Bug
- **Problema:** O `outputSchema` do `defineInterrupt` tem `{ status, question }`, mas o `respond()` na linha 377-387 envia `{ status, question, answer }`. Zod em modo `strip` (padrão) remove o campo `answer` durante a validação. O modelo nunca vê a resposta do usuário.
- **Evidência:**
  ```typescript
  // assistant.ts:641-644 — outputSchema SEM answer
  outputSchema: z.object({
    status: z.literal('awaiting_input'),
    question: z.string(),
  }),

  // assistant.ts:377-387 — respond COM answer
  const outputData = {
    status: 'awaiting_input' as const,
    question: input.resume.question,
    answer: input.resume.answers.join('\n'), // ❌ será removido por Zod
  };
  ```
- **Impacto:** Mesmo que o resume funcione mecanicamente, o modelo receberia `{ status, question }` sem saber qual foi a resposta do usuário. A interview seria inútil.
- **Sugestão:** Atualizar `outputSchema` para incluir `answer`:
  ```typescript
  outputSchema: z.object({
    status: z.literal('awaiting_input'),
    question: z.string(),
    answer: z.string().optional(),
  }),
  ```

---

### [WARNING] Estrutura `interruptToolRequest` incompatível com `.respond()` ao longo de toda a cadeia

- **Arquivo:** `functions/src/flows/assistant.ts:825-828` → `src/hooks/useAssistant.ts:93,262,575,704` → `functions/src/flows/assistant.ts:389-392`
- **Confidence:** 98/100
- **Categoria:** Bug / Architecture
- **Problema:** A cadeia inteira backend→frontend→backend passa `{ name, ref, input }` (plano), mas `interviewInterrupt.respond()` espera `ToolRequestPart` = `{ toolRequest: { name, ref, input } }` (aninhado). O frontend armazena a estrutura errada e a devolve ao backend.
- **Evidência:**
  ```typescript
  // Backend envia (assistant.ts:825-828) — { name, ref, input }
  const interruptToolRequest = { name: ..., ref: ..., input: ... };

  // Frontend armazena (useAssistant.ts:262) — { name, ref, input }
  const interruptToolRequestRef = useRef<{ name: string; ref?: string; input?: unknown } | null>(null);

  // Frontend envia de volta (useAssistant.ts:575) — { name, ref, input }
  interruptToolRequest: resume ? interruptToolRequestRef.current ?? undefined : undefined,

  // Backend usa (assistant.ts:389-392) — espera ToolRequestPart { toolRequest: {...} }
  genkitResume = interviewInterrupt.respond(
    input.interruptToolRequest as Parameters<typeof interviewInterrupt.respond>[0], // cast inseguro
    outputData,
  );
  ```
- **Impacto:** O cast `as Parameters<typeof interviewInterrupt.respond>[0]` esconde a incompatibilidade estrutural. Em runtime, `..respond()` receberia `{ name, ref, input }` em vez de `{ toolRequest: { name, ref, input } }`, causando comportamento indefinido ou erro.
- **Sugestão:** Padronizar toda a cadeia para usar `ToolRequestPart` (`{ toolRequest: { name, ref, input } }`).

---

### [WARNING] `resume` passado como `ToolResponsePart` direto, não como `ResumeOptions`

- **Arquivo:** `functions/src/flows/assistant.ts:713`
- **Confidence:** 90/100
- **Categoria:** Bug
- **Problema:** `resume: genkitResume` passa um `ToolResponsePart` (retorno de `.respond()`) diretamente, mas `GenerateOptions.resume` espera `ResumeOptions = { respond?: ToolResponsePart | ToolResponsePart[], restart?: ToolRequestPart | ToolRequestPart[], metadata?: Record<string, any> }`.
- **Evidência:**
  ```typescript
  // assistant.ts:713 — resume direto (incorreto)
  resume: genkitResume, // ToolResponsePart

  // GenerateOptions (generate-msasDhVC.d.ts:1124)
  resume?: ResumeOptions; // { respond?: ToolResponsePart | ToolResponsePart[], ... }

  // Documentação oficial (Genkit Docs):
  resume: myInterrupt.respond(interrupt, replyData)
  ```
  Nota: a documentação do Genkit mostra o padrão direto, o que sugere que o runtime pode aceitar ambos os formatos. Porém, o TypeScript não aceitaria sem cast.
- **Impacto:** Pode causar erro de tipo em compilação ou comportamento inesperado em runtime.
- **Sugestão:** Envolver em `ResumeOptions`:
  ```typescript
  resume: genkitResume ? { respond: genkitResume } : undefined,
  ```

---

### [MEDIUM] `interruptToolRequest` não persistido em `ChatSession`

- **Arquivo:** `src/lib/db/types.ts:174-192`
- **Confidence:** 95/100
- **Categoria:** Bug / UX
- **Problema:** `ChatSession` persiste `pendingInterview` mas **não** persiste o `interruptToolRequest` correspondente. Se o usuário der reload durante uma interview ativa, o `interruptToolRequestRef` volta `null` e o resume falha.
- **Evidência:**
  ```typescript
  // types.ts:174-192 — ChatSession sem interruptToolRequest
  export interface ChatSession {
    // ...
    pendingInterview?: InterviewDatum;      // ✅ persistido
    interruptToolRequest?: ???;              // ❌ AUSENTE
    // ...
  };

  // useAssistant.ts:354 — salva pendingInterview mas não interruptToolRequest
  pendingInterview: interviewRef.current ?? undefined,
  // interruptToolRequest NÃO é salvo
  ```
- **Impacto:** Usuário perde a capacidade de responder a uma interview ativa após reload. A interview fica "pendurada" sem possibilidade de retomada.
- **Sugestão:** Adicionar `interruptToolRequest` ao `ChatSession` e persistir/restaurar junto com `pendingInterview`.

---

### [MEDIUM] Parâmetro `input` com `any` implícito no `requestMetadata`

- **Arquivo:** `functions/src/flows/assistant.ts:645`
- **Confidence:** 90/100
- **Categoria:** TypeScript
- **Problema:** `requestMetadata: (input) => ({ interview: input })` — o parâmetro `input` tem tipo `any` implícito. O `InterruptConfig` pode não inferir corretamente o tipo do parâmetro da função quando `requestMetadata` é uma união de objeto | função.
- **Evidência:**
  ```
  src/flows/assistant.ts(645,29): error TS7006: Parameter 'input' implicitly has an 'any' type.
  ```
- **Impacto:** Sem type safety no callback. Erros de digitação ou estrutura não seriam detectados.
- **Sugestão:** Anotar o tipo explicitamente:
  ```typescript
  requestMetadata: (input: InterviewInput) => ({
    interview: input,
  }),
  ```

---

## O que parece saudável

- **Frontend (`useAssistant.ts`)**: O `interruptToolRequestRef` está bem integrado ao fluxo de sendMessage — é enviado no input e armazenado do output. A lógica de `clearInterview` limpa corretamente a ref.
- **Schemas Zod**: `AssistantHistoryToolRequestSchema`, `AssistantHistoryMessageSchema` e schemas relacionados estão bem definidos com `.passthrough()` para compatibilidade.
- **Streaming**: O tratamento de `response.interrupts` no fluxo de streaming (linhas 815-871) está estruturalmente correto — verifica `interrupts.length > 0`, extrai o primeiro, emite metadado via `sendMetaChunk`, e retorna `fullHistory` preservado.
- **Créditos**: A lógica de créditos no interrupt (confirmar parcial ou reverter) está bem implementada.
- **Compactação**: O fluxo de compactação não interfere com o fluxo de interrupt — são independentes.

---

## Limites da revisão

- **Testes não executados**: Não foram rodados testes (`bun run test`) — apenas `tsc --noEmit`.
- **Runtime não verificado**: Os bugs de estrutura (`ToolRequestPart`, `resume`) foram identificados por leitura de tipos e documentação, não por execução real.
- **Genkit version**: A análise assume Genkit 1.34.0 (instalada). Comportamento de `response.interrupts` e `.respond()` pode variar em outras versões.
- **NotebookLM**: Consultado o notebook de Genkit Docs. A documentação mostra `resume: myInterrupt.respond(...)` diretamente (sem `{ respond: ... }`), sugerindo que o runtime pode aceitar ambos os formatos — mas o finding #7 mantém confidence 90 por causa da incompatibilidade de tipos.

---

## Próximos passos

1. **Corrigir os 3 erros de compilação** (P0): import `'genkit/beta'`, schema `interruptToolRequest`, mover declaração de `interviewInterrupt`
2. **Corrigir os 4 bugs de runtime** (P1): acesso `ToolRequestPart`, `outputSchema.answer`, estrutura `resume`, cadeia completa
3. **Persistir `interruptToolRequest`** em `ChatSession` (P2)
4. **Rodar `bun run test`** após correções para verificar regressões
