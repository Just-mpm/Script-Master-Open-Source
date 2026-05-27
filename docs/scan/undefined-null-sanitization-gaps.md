# Scan: Lacunas na Sanitização undefined→null (httpsCallable + Zod)

**Data:** 2026-05-27
**Versão do projeto:** 0.102.0
**Tipo:** Gap Scan — undefined/null sanitization

---

## 1. Contexto assumido

A correção aplicou `.nullable()` a todos os campos `.optional()` nos schemas do `common.ts` e criou o utilitário `removeUndefinedFields` em `callable-utils.ts`. Foram sanitizadas as chamadas em `useAssistant.ts`, `useImageGenerator.ts`, `gemini.ts` e `ContactPage.tsx`. Nos flows do backend, foram adicionados `?? undefined` onde campos agora podem ser `null`.

Este scan verifica se restaram lacunas nas demais chamadas, schemas e edge cases.

---

## 2. Mapa rápido: sólido vs frágil

### Sólido ✅

| Área | Status |
|------|--------|
| Schemas em `functions/src/genkit/schemas/common.ts` | ✅ Todos os 22 schemas com `.nullable().optional()` em campos opcionais |
| `removeUndefinedFields` em `callable-utils.ts` | ✅ Exportado, implementado corretamente |
| `useAssistant.ts` — sanitiza com `removeUndefinedFields` | ✅ |
| `useImageGenerator.ts` — sanitiza com `removeUndefinedFields` | ✅ |
| `gemini.ts` — sanitiza com `removeUndefinedFields` | ✅ |
| `ContactPage.tsx` — sanitiza com `removeUndefinedFields` | ✅ |
| `assistant.ts` backend — `?? undefined` para null | ✅ |
| `inline-assistant.ts` backend — `?? undefined` para null | ✅ |
| `audio-preflight.ts` backend — `?? undefined` para null | ✅ |
| Edge cases: `[]`, `Date`, `Blob`, `null`, aninhados | ✅ Sanitizador trata todos corretamente |

### Frágil ⚠️

| Área | Status |
|------|--------|
| `useAudioGenerator.ts` / `buildAudioFlowInput` | 🟡 Sanitização manual via `if (value) input.field = value` |
| `AudioGenerationHandler.tsx` / preflight | 🟡 Sanitização manual via `buildAudioFlowInput` |
| `useInlineAssistant.ts` | 🟡 Sem sanitizador (só campos obrigatórios no payload) |
| `useCredits.ts` | 🟡 Sem sanitizador (payload vazio `{}`) |

---

## 3. Gaps priorizados

### Gap-01 | BAIXO | Confidence 92

**Esquecimento: Schema `ping.ts` sem `.nullable()` em campo opcional**

**Descrição:** O schema de input do flow `ping` em `functions/src/flows/ping.ts` (linha 38) tem `message: z.string().optional()` sem `.nullable()`. Se o frontend passar `undefined` nesse campo, o JSON serializa como `null` e o schema rejeita.

**Evidência:**
```typescript
// functions/src/flows/ping.ts:36-39
inputSchema: z.object({
  message: z.string().optional(),  // ❌ sem .nullable()
}),
```

**Mitigações verificadas:**
- O flow `ping` **não é chamado por nenhum arquivo do frontend** (grep por `'ping'` em `src/` retornou 0 resultados)
- É um flow de teste/debug, sem impacto em usuários reais

**Confidence elevada:** 92 — esquecimento confirmado, mas sem impacto real.

**Decisão:** Corrigir adicionando `.nullable()` como cortesia, nenhuma urgência.

---

### Gap-02 | BAIXO | Confidence 88

**Schemas inline em `audio.ts` e `chunking.ts` usam `.optional()` sem `.nullable()`**

**Descrição:** Os schemas inline usados como `output.schema` do `ai.generate()` nos flows `audio.ts` (linhas 104-109) e `chunking.ts` (linhas 112-117) têm `emotionTag: z.string().optional()`, `isContinuation: z.boolean().optional()`, `trailingSentence: z.string().optional()` sem `.nullable()`.

**Evidência:**
```typescript
// functions/src/flows/audio.ts:104-109
schema: z.array(z.object({
  text: z.string(),
  emotionTag: z.string().optional(),       // ❌ sem .nullable()
  isContinuation: z.boolean().optional(),  // ❌ sem .nullable()
  trailingSentence: z.string().optional(), // ❌ sem .nullable()
})),
```

**Mitigações verificadas:**
- Estes schemas são **output do modelo Gemini**, não input de callable — não passam por JSON.stringify do Firebase
- O Gemini retorna objetos com campos ausentes (undefined), não null
- Se esses dados forem persistidos ou re-enviados via JSON no futuro, podem quebrar

**Confidence rebaixada para 88:** cenário hipotético, sem impacto atual.

**Decisão:** Monitorar se esses dados passam a ser re-serializados em JSON. Se sim, adicionar `.nullable()`.

---

### Gap-03 | BAIXO | Confidence 85

**`useInlineAssistant.ts` não usa `removeUndefinedFields`**

**Descrição:** O hook `useInlineAssistant.ts` (linhas 74-88) constrói o payload manualmente com apenas 4 campos obrigatórios (`selectedText`, `instruction`, `fullScript`, `requestId`). Não aplica `removeUndefinedFields`. O schema `InlineAssistantInputSchema` tem `fullScript`, `requestId`, `thinkingLevel` como `.nullable().optional()` — mas `thinkingLevel` nunca é enviado pelo frontend.

**Evidência:**
```typescript
// src/hooks/useInlineAssistant.ts:83-88
const result = await callable({
  selectedText,
  instruction,
  fullScript,
  requestId,
}); // ❌ sem removeUndefinedFields
```

**Mitigações verificadas:**
- Todos os campos enviados são strings obrigatórias — nenhum pode ser `undefined`
- O schema aceita undefined nos campos não-enviados porque são `.nullable().optional()`
- Funciona hoje, mas **quebrará silenciosamente** se novos campos opcionais forem adicionados ao schema sem atualizar o frontend

**Confidence rebaixada para 85:** funcional hoje, risco futuro.

**Decisão:** Adicionar `removeUndefinedFields` como boa prática defensiva.

---

### Gap-04 | BAIXO | Confidence 82

**`buildAudioFlowInput` faz sanitização manual em vez de usar `removeUndefinedFields`**

**Descrição:** `buildAudioFlowInput` em `useAudioGenerator.ts` (linhas 126-210) e seu uso em `AudioGenerationHandler.tsx` constroem o payload com condicionais `if (value) input.field = value`. Isso efetivamente remove undefined, mas de forma manual e frágil.

**Evidência:**
```typescript
// src/hooks/useAudioGenerator.ts:161-207
if (isMultiSpeaker) { input.multiSpeakerConfig = { ... }; }
if (audioProfile) { input.audioProfile = audioProfile; }
// ... mais 10 condicionais manuais
```

**Mitigações verificadas:**
- O código nunca deixa campos undefined no objeto final (valores falsy como `''` ou `0` seriam excluídos, mas nenhum campo obrigatório aceita esses valores)
- `isMultiSpeaker: !!isMultiSpeaker` garante boolean sempre
- `emotion` e `emotionIntensity` têm fallback para valores padrão
- O `AudioInputSchema` aceita null nos campos opcionais mesmo sem o sanitizador

**Confidence rebaixada para 82:** frágil, mas funciona. Risco maior de esquecer um `if` ao adicionar campo novo.

**Decisão:** Adicionar `removeUndefinedFields` como redundância após `buildAudioFlowInput`.

---

## 4. Cenários de borda sem resposta

| Cenário | Resposta |
|---------|----------|
| `removeUndefinedFields` com `Date` | ✅ Ignorado (retorna Date intacto) |
| `removeUndefinedFields` com `Blob` | ✅ Ignorado (retorna Blob intacto) |
| `removeUndefinedFields` com `[]` vazio | ✅ Retorna `[]` |
| `removeUndefinedFields` com `null` | ✅ Retorna `null` (não entra no objeto) |
| Campos aninhados com Date/Blob | ✅ Recursão respeita guardas instanceof |
| Flow `cancelAiRequest` recebe null? | Schema só tem `requestId: z.string()` (obrigatório) — frontend sempre envia string |
| Flow `creditSnapshot` recebe null? | Schema vazio `z.object({})` — frontend envia `{}` |

---

## 5. Checklist de sanidade

- [x] Li o `common.ts` **COMPLETO** — todos os campos `.optional()` têm `.nullable()`
- [x] Li `callable-utils.ts` **COMPLETO** — `removeUndefinedFields` exportado, lógica correta
- [x] Verifiquei com `grep` e `supergrep_find` que 8 arquivos usam `httpsCallable`
- [x] Verifiquei individualmente cada um dos 8 arquivos para uso de `removeUndefinedFields`
- [x] Busquei schemas Zod fora de `common.ts` com `grep` — encontrei 7 schemas adicionais
- [x] Li cada schema adicional para verificar `.nullable().optional()`
- [x] Verifiquei que nenhum schema adicional com `.optional()` sem `.nullable()` é input de callable chamada pelo frontend
- [x] Verifiquei que `?? undefined` está presente nos flows do backend que recebem null
- [x] Edge cases testados mentalmente: `[]`, `Date`, `Blob`, `null`, objetos aninhados

---

## Resumo

| Severidade | Quantidade | IDs |
|------------|-----------|-----|
| CRÍTICO | 0 | — |
| ALTO | 0 | — |
| MÉDIO | 0 | — |
| BAIXO | 4 | Gap-01, Gap-02, Gap-03, Gap-04 |

**Nenhuma lacuna crítica ou de alto impacto.** As 4 lacunas são de baixa severidade — nenhuma afeta usuários reais hoje. As correções são opcionais e podem ser aplicadas como hardening.

### Recomendações rápidas (opcionais)

1. Adicionar `.nullable()` no schema `ping.ts` (1 linha)
2. Adicionar `removeUndefinedFields` em `useInlineAssistant.ts` (1 import + 1 chamada)
3. Adicionar `removeUndefinedFields` no retorno de `buildAudioFlowInput` (1 chamada)
4. Adicionar `.nullable()` nos schemas inline de `audio.ts` e `chunking.ts` (3 linhas cada)
