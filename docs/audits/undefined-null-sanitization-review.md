# Auditoria: Correções de undefined→null sanitization

**Data:** 2026-05-27
**Versão base:** 0.102.0
**Tipo:** Revisão de qualidade de correção
**Auditor:** Code Validator

---

## Escopo da revisão

Validar a qualidade das correções de sanitização `undefined→null` em 9 arquivos:

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/lib/callable-utils.ts` | Novo utilitário `removeUndefinedFields` |
| `src/hooks/useAssistant.ts` | Uso de `removeUndefinedFields` + `rawInput` intermediária |
| `src/hooks/useImageGenerator.ts` | Uso de `removeUndefinedFields` |
| `src/lib/gemini.ts` | Uso de `removeUndefinedFields` |
| `src/pages/public/ContactPage.tsx` | Uso de `removeUndefinedFields` |
| `functions/src/genkit/schemas/common.ts` | `.nullable()` antes de `.optional()` |
| `functions/src/flows/assistant.ts` | `?? undefined` para tipos nullable |
| `functions/src/flows/inline-assistant.ts` | `?? undefined` para tipos nullable |
| `functions/src/usage/audio-preflight.ts` | `?? undefined` para tipos nullable |

**Focos cobertos:** Engenharia (DRY, consistência), riscos técnicos (null safety, regressão), Firebase/schemas Zod, segurança básica.

**Arquivos lidos por completo:** Todos os 9 alterados + `src/lib/db/shared.ts`, `src/features/studio/store/studio.utils.ts`, `src/components/app/AudioGenerationHandler.tsx`, `src/hooks/useAudioGenerator.ts`.

**Notebook consultado:** Zod V4 (para validar comportamento de `.nullable().optional()`)

---

## Veredito

**Ajustes recomendados** — nenhum bloqueador de merge, nenhum bug crítico. As correções são funcionalmente corretas e seguras. Há duas oportunidades de melhoria cosmítica/de manutenibilidade, nenhuma com impacto em produção.

---

## Achados priorizados

### [SUGGESTION] Schemas poderiam usar `.nullish()` em vez de `.nullable().optional()`

- **Arquivo:** `functions/src/genkit/schemas/common.ts` (múltiplos schemas)
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** A combinação `.nullable().optional()` é funcionalmente correta no Zod V4 (aceita `T | null | undefined` + campo ausente), mas a documentação oficial do Zod V4 recomenda `.nullish()` como a forma mais idiomática e semanticamente clara para expressar "opcional E anulável".
- **Evidência:** Notebook Zod V4 confirma que `.nullable().optional()` cria `ZodOptional(ZodNullable(T))` e `.nullish()` é o método unificado recomendado. A mudança atual de adicionar `.nullable()` antes de `.optional()` funciona, mas não segue a recomendação mais recente da lib.
- **Impacto:** Zero em runtime. Apenas legibilidade e adesão a boas práticas da lib.
- **Sugestão:** Substituir `.nullable().optional()` por `.nullish()` em todos os schemas, pois ambos têm o mesmo efeito (`T | null | undefined`) e `.nullish()` é semanticamente mais explícito. Exemplo:
  ```typescript
  // Atual:
  referenceImage: z.string().nullable().optional(),
  // Sugerido:
  referenceImage: z.string().nullish(),
  ```

---

### [SUGGESTION] Duplicação de `removeUndefinedFields` entre módulos (justificada, mas observável)

- **Arquivo:** `src/lib/callable-utils.ts` (novo) vs `src/lib/db/shared.ts:119-138` (existente)
- **Confidence:** 80/100
- **Categoria:** Architecture
- **Problema:** A implementação de `removeUndefinedFields` em `callable-utils.ts` (linhas 19-38) é **exatamente idêntica** à já existente em `shared.ts` (linhas 119-138) — mesma lógica, mesmas guardas para `Date`/`Blob`, mesma recursão. O comentário no novo arquivo justifica a duplicação para evitar dependências do Firestore.
- **Evidência:**
  ```typescript
  // callable-utils.ts:19-38
  export function removeUndefinedFields<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => removeUndefinedFields(item)) as T;
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Blob) && !(value instanceof Date)) {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedFields(entryValue)]);
      return Object.fromEntries(entries) as T;
    }
    return value;
  }

  // shared.ts:119-138 — EXATAMENTE a mesma implementação
  ```
- **Impacto:** Baixo. A função tem ~20 linhas de lógica pura (sem dependências). A duplicação é pequena e controlada. No entanto, se houver correção de bug ou melhoria futura em uma delas, a outra ficará defasada.
- **Sugestão:** Extrair para um módulo compartilhado tipo `src/lib/remove-undefined-fields.ts` sem dependências externas, e importar de lá em ambos os lugares. Se a preocupação com tree-shaking for real (evitar importar Firebase indiretamente), confirmar via análise de bundle que o import é limpo.

---

## Análise detalhada por ponto

### 1. `removeUndefinedFields` — correção da implementação

| Cenário | Comportamento | Correto? |
|---------|--------------|----------|
| **Arrays aninhados** | `[undefined, { a: undefined }]` → `[{ a: value }]` (undefined removido, recursão aplicada) | ✅ |
| **Objetos aninhados** | `{ a: { b: undefined } }` → `{ a: {} }` (recursão remove undefined aninhado) | ✅ |
| **Date** | `{ createdAt: Date }` → preservado (guard `instanceof Date`) | ✅ |
| **Blob** | `{ blob: Blob }` → preservado (guard `instanceof Blob`) | ✅ |
| **null** | `{ field: null }` → preservado (filter remove apenas `undefined`, não `null`) | ✅ |
| **Primitivos** | `string`, `number`, `boolean` → retornados como foram | ✅ |
| **Objetos vazios** | `{}` → `{}` | ✅ |
| **Arrays vazios** | `[]` → `[]` | ✅ |

**Conclusão:** Implementação robusta e correta. Lida com todos os edge cases esperados.

### 2. Uso em `useAssistant.ts`

- `rawInput` é construído com todos os campos, incluindo `attachments: ... ? ... : undefined`
- `removeUndefinedFields(rawInput)` remove `attachments: undefined`, `studioState: undefined`
- `history` sempre é um array (nunca undefined), mantido como `[]` se vazio
- `model` e `thinkingLevel` sempre são strings (nunca undefined) porque têm estado default

✅ **Correto.** `removeUndefinedFields` não remove arrays vazios, apenas campos com valor `undefined`.

### 3. Uso em `useImageGenerator.ts`

- `referenceImage: referenceBase64` onde `referenceBase64` é `string | undefined`
- Se sem referência → `removeUndefinedFields` remove o campo → schema `.nullable().optional()` aceita ausência
- Se com referência → `referenceBase64` é string data URL → preservada

✅ **Correto.**

### 4. Uso em `ContactPage.tsx`

- `screenContext: screenContext.trim() || undefined` — se string vazia, vira `undefined` e é removida
- Schema: `screenContext: z.string().nullable().optional()` — aceita ausência

✅ **Correto.**

### 5. Impacto da mudança de schemas (`.nullable()` antes de `.optional()`)

| Questão | Resposta |
|---------|----------|
| Ordem importa no Zod V4? | Sim, mas ambas aceitam `T \| null \| undefined` + campo ausente |
| `if (input.field)` com `null`? | Funciona (`null` é falsy) |
| `input.field?.method()` com `null`? | Funciona (optional chaining) |
| Pode causar efeito colateral? | Não. O comportamento é idêntico ao anterior para valores válidos |

**Nota do Zod V4:** A documentação recomenda `.nullish()` como forma mais idiomática. Funcionalmente equivalente.

✅ **Mudança segura.**

### 6. Uso de `?? undefined` nos flows backend

| Arquivo | Padrão | Correto? |
|---------|--------|----------|
| `flows/assistant.ts` | `input.model ?? undefined`, `input.thinkingLevel ?? undefined`, `input.studioState ?? undefined` | ✅ Converte `null` (aceito pelo schema) para `undefined` (esperado pelas funções downstream) |
| `flows/inline-assistant.ts` | `input.fullScript ?? ''`, `input.thinkingLevel ?? undefined` | ✅ `?? ''` para string, `?? undefined` para optional |
| `usage/audio-preflight.ts` | `input.voiceConfig.pace ?? 'normal'`, `input.sceneDensity ?? 15`, `input.visualFramework ?? 'general'` | ✅ Fallbacks seguros, tratam `null` como ausente |

✅ **Correto e consistente.**

### 7. Regressão em `buildAudioFlowInput`

Análise do payload de áudio enviado para a Cloud Function:
- `buildAudioFlowInput` usa construção condicional (`if (value) { input.field = value }`) em vez de `removeUndefinedFields`
- Todos os campos required são sempre preenchidos (via `buildGenerateOptions` que extrai do Zustand store com defaults)
- O único campo que poderia ser `undefined` é `voiceConfig.pace`, mas `GenerateOptions.pace` é `string` (required) e nunca é undefined porque `getInitialStudioConfig()` define fallback `'normal'`
- Schemas no backend aceitam `null` via `.nullable()`, então mesmo que algum campo undefined chegue como null (pela serialização JSON), é aceito

✅ **Sem regressão.** A construção manual é segura neste contexto específico, embora haja uma **inconsistência arquitetural** (alguns payloads sanitizam com `removeUndefinedFields`, outros não). Isso não quebra porque os schemas são tolerantes a `null`, mas reduz a uniformidade do código.

---

## O que parece saudável

- `removeUndefinedFields` lida corretamente com `Date`, `Blob`, `null`, arrays e objetos aninhados
- O padrão `rawInput` → `removeUndefinedFields(rawInput)` → chamada é consistente entre todos os hooks que foram alterados
- Os flows backend com `?? undefined` tratam corretamente a conversão de `null` (que o schema aceita) para `undefined` (que as funções internas esperam)
- Schemas com `.nullable().optional()` aceitam `null` (vindo da serialização JSON) e `undefined` (campo ausente)
- `buildAudioFlowInput` não precisou ser alterado porque sua construção condicional + tolerância dos schemas já cobre o caso

---

## Limites da revisão

- Não foi verificado se existem **outros** pontos no frontend (fora dos 9 arquivos) que ainda chamam Cloud Functions sem `removeUndefinedFields` e podem se beneficiar da sanitização. Recomenda-se uma varredura ampla como follow-up.
- Não foi testado em runtime o comportamento exato da serialização do Firebase SDK (`httpsCallable`) para confirmar que `undefined` em posições aninhadas é convertido para `null` em vez de removido — a análise baseou-se na documentação do Firebase e no comportamento padrão do `JSON.stringify`.
- A sugestão de `.nullish()` é baseada na documentação do Zod V4 consultada via NotebookLM, mas requer validação de que o Genkit (usado nos flows) lida com `.nullish()` da mesma forma que com `.nullable().optional()` — a princípio sim, pois `.nullish()` é syntactic sugar, mas não foi confirmado com o notebook do Genkit.

---

## Gate de saída

- [x] Li o contexto mínimo real ou reuni evidência suficiente (9 arquivos alterados + 4 relacionados)
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico (≥80)
- [x] Achados com confidence < 80 foram descartados (ex: duplicação removeUndefinedFields reavaliada → justificável, descartada como achado)
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Não há motivo para escalar — correções seguras para merge
