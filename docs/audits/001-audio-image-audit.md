# Auditoria Unificada: Geração de Áudio e Imagem com IA

## Achados

### [P1] PII exposta em logs de erro do frontend

- **Arquivo:** `src/lib/db/shared.ts:93-117`
- **Categoria:** Security / PII
- **Confidence:** 95/100
- **Problema:** `handleFirestoreError` captura `currentUser.email`, `providerData` (displayName, email, photoUrl), serializa tudo em JSON e loga via `log.error()`. O mesmo objeto completo é lançado como `new Error(errorString)`.
- **Evidência:** `shared.ts:98-109` — coleta `userId`, `email`, `emailVerified`, `isAnonymous`, `tenantId`, `providerInfo[]` com `displayName`, `email`, `photoUrl` de cada provider.
- **Impacto:** Se logs do frontend forem acessados por ferramenta de erro tracking ou console do navegador, dados pessoais ficam expostos.
- **Sugestão:** Remover `email`, `displayName`, `photoUrl` e `providerInfo` dos logs. Manter apenas `userId` e `operationType`/`path`. No erro lançado, usar apenas a mensagem original sem PII.

---

### [P2] Validação de comprimento ausente nos schemas Zod do backend

- **Arquivo:** `functions/src/genkit/schemas/common.ts:195` (AudioInputSchema), `common.ts:277` (ImageInputSchema)
- **Categoria:** Security / Validation
- **Confidence:** 90/100
- **Problema:** `AudioInputSchema.script` e `ImageInputSchema.prompt` são `z.string()` sem `.min()` ou `.max()`. O frontend valida (MAX_CHARS=50000, prompt vazio), mas o backend aceita qualquer payload diretamente via httpsCallable.
- **Evidência:** `common.ts:195` → `script: z.string()`, `common.ts:277` → `prompt: z.string()`. Frontend valida em `useAudioGenerator.ts:360` com `MAX_CHARS`.
- **Impacto:** Cliente malicioso ou bypass pode enviar scripts/prompts arbitrariamente grandes, esgotando créditos do usuário ou sobrecarregando a Cloud Function.
- **Sugestão:** `AudioInputSchema.script: z.string().min(1).max(50_000)`, `ImageInputSchema.prompt: z.string().min(1).max(5000)`.

---

### [P2] `base64ToBlobSync` bloqueia main thread — usado tanto em áudio quanto em imagem

- **Arquivo:** `src/hooks/useAudioGenerator.ts:481`, `src/hooks/useImageGenerator.ts:172`
- **Categoria:** Performance
- **Confidence:** 90/100
- **Problema:** Ambos os hooks usam `base64ToBlobSync()` (que chama `atob()` síncrono). A versão async `base64ToBlob()` já existe em `src/lib/audio.ts:62-65` e usa `fetch(data:...)` não-bloqueante.
- **Evidência:** `useAudioGenerator.ts:481` → `base64ToBlobSync(audioBase64, mimeType)`. `useImageGenerator.ts:172` → `base64ToBlobSync(imageBase64, mimeType)`. `audio.ts:62` → `export async function base64ToBlob(...)` já disponível.
- **Impacto:** Freeze de UI de ~50-200ms (imagens) a 5-10s (áudios grandes em mobile).
- **Sugestão:** Substituir ambas as ocorrências por `await base64ToBlob(imageBase64, mimeType)`.

---

### [P2] Sem Replay Protection no App Check

- **Arquivo:** `functions/src/flows/audio.ts:205`, `functions/src/flows/images.ts:72`
- **Categoria:** Auth / Security
- **Confidence:** 88/100
- **Problema:** Todos os flows de IA usam `enforceAppCheck: true` mas nenhum usa `consumeAppCheckToken: true`. Um token App Check válido interceptado pode ser reutilizado até expirar.
- **Evidência:** `audio.ts:205` → `enforceAppCheck: true` sem `consumeAppCheckToken`. `images.ts:72` → idem.
- **Impacto:** Token replay permite gerar áudio/imagens consumindo créditos da vítima.
- **Sugestão:** Adicionar `consumeAppCheckToken: true` nos flows `audio` e `images`. Conceder papel "Firebase App Check Token Verifier" à service account.

---

### [P2] Backend usa `console.log/warn/error` em vez de logger estruturado

- **Arquivo:** `functions/src/flows/audio.ts` (10+ ocorrências), `functions/src/flows/images.ts` (5 ocorrências)
- **Categoria:** Architecture / Observability
- **Confidence:** 92/100
- **Problema:** Ambos os flows usam `console.log/warn/error` diretamente. O `createLogger()` existe em `functions/src/genkit/utils/logger.ts` e já é usado por outros flows (`assistant.ts`, `inline-assistant.ts`, `credit-metering.ts`).
- **Evidência:** `audio.ts:142` → `console.warn(...)`, `audio.ts:285` → `console.error(...)`, `audio.ts:432` → `console.log(...)`, `audio.ts:458` → `console.warn(...)`, `audio.ts:472` → `console.error(...)`, `audio.ts:541` → `console.log(...)`, `audio.ts:564` → `console.error(...)`, `audio.ts:571` → `console.log(...)`, `audio.ts:599` → `console.error(...)`. `images.ts:184` → `console.error(...)`, `images.ts:190` → `console.log(...)`, `images.ts:214` → `console.error(...)`. `chunking.ts:142` → `console.warn(...)`.
- **Impacto:** Logs não estruturados no Cloud Logging (sem severity, context, timestamp JSON). Dificulta filtragem, alertas e debugging em produção.
- **Sugestão:** Importar `createLogger` nos dois arquivos: `const log = createLogger('audio'/'images')` e substituir todos `console.*` por `log.*`.

---

### [P2] Lógica de header WAV duplicada entre frontend e backend

- **Arquivo:** `src/lib/audio.ts:26-56` (frontend) vs `functions/src/flows/audio.ts:161-185` (backend)
- **Categoria:** Architecture / DRY
- **Confidence:** 92/100
- **Problema:** Ambos implementam o mesmo header WAV 44 bytes para PCM 24kHz mono 16-bit de forma independente.
- **Evidência:** Frontend `createWavBlob`: `new ArrayBuffer(44)` + `DataView`. Backend `createWavBuffer`: `Buffer.alloc(44)`. Ambos escrevem RIFF/WAVE/fmt/data com os mesmos valores.
- **Impacto:** Se o formato mudar (stereo, 48kHz), ambas precisam atualização sincronizada — risco de corrupção silenciosa.
- **Sugestão:** Extrair para módulo compartilhado ou adicionar comentário cross-reference entre os dois arquivos.

---

### [P2] Validação de PCM mínimo ausente — chunks corrompidos não são rejeitados

- **Arquivo:** `functions/src/flows/audio.ts:455-462`
- **Categoria:** Bug
- **Confidence:** 85/100
- **Problema:** AGENTS.md documenta `MIN_TTS_PCM_BYTES=1024`, mas não há constante nem validação rejeitando chunks abaixo do mínimo. O código apenas loga um warning.
- **Evidência:** `audio.ts:456-462` → `console.warn(...)` quando `durationSec < MIN_CHUNK_DURATION_SECONDS` (1.5s). Sem `MIN_TTS_PCM_BYTES` em `constants.ts`.
- **Impacto:** PCM corrompido/curto gera áudio silencioso ou distorcido sem feedback ao usuário.
- **Sugestão:** Adicionar `MIN_TTS_PCM_BYTES = 1024` em `constants.ts` e rejeitar após retry: `if (pcmBuffer.length < MIN_TTS_PCM_BYTES) throw new Error(...)`.

---

### [P2] `mimeType` hardcoded como `'image/png'` na resposta de imagens

- **Arquivo:** `functions/src/flows/images.ts:196-198`
- **Categoria:** Bug
- **Confidence:** 88/100
- **Problema:** O flow retorna `mimeType: 'image/png'` fixo independentemente do formato real retornado pelo Gemini. `getDataUrlContentType()` existe (linha 59) mas não é usado para o output.
- **Evidência:** `images.ts:197` → `mimeType: 'image/png'`. `images.ts:59` → `getDataUrlContentType()` disponível.
- **Impacto:** Se Gemini retornar JPEG ou outro formato, Blob é criado com MIME errado — problemas de exibição e download.
- **Sugestão:** Extrair mimeType do data URL: `const mimeType = getDataUrlContentType(mediaUrl)`.

---

### [P2] Falta de rate limiting explícito nas Cloud Functions de IA

- **Arquivo:** `functions/src/flows/audio.ts`, `functions/src/flows/images.ts`, `functions/src/flows/chunking.ts`
- **Categoria:** Rate Limit
- **Confidence:** 85/100
- **Problema:** As Cloud Functions não possuem rate limiting por tempo ou concorrência. A única proteção é o sistema de créditos (1.000/mês).
- **Evidência:** Nenhum dos flows (`audio.ts:201-211`, `images.ts:68-75`) tem throttling configurado.
- **Impacto:** Usuário autenticado pode fazer múltiplas requisições simultâneas, sobrecarregando infraestrutura e consumindo cota do Gemini rapidamente.
- **Sugestão:** Considerar limite de gerações simultâneas por usuário (ex: 3 via Firestore) ou Cloud Tasks com fila limitada.

---

### [P2] Sem validação de tipo/tamanho de referência de imagem no backend

- **Arquivo:** `functions/src/flows/images.ts:130-137`
- **Categoria:** Upload / Security
- **Confidence:** 78/100
- **Problema:** `referenceImage` (data URL base64) é enviado diretamente ao Gemini sem validação server-side de tamanho ou content type.
- **Evidência:** `images.ts:130-136` → sem verificação de tamanho antes de `promptParts.push({ media: { url: input.referenceImage, ... } })`.
- **Impacto:** Data URL de 50MB pode causar OOM na Cloud Function ou timeout antes da rejeição pelo Gemini.
- **Sugestão:** Validar tamanho (`input.referenceImage.length > 15_000_000`) e content type (aceitar apenas `image/jpeg`, `image/png`, `image/webp`).

---

### [P3] `CHUNK_LIMIT` redefinido localmente em `audio-preflight.ts`

- **Arquivo:** `functions/src/usage/audio-preflight.ts:17`
- **Categoria:** Architecture / DRY
- **Confidence:** 95/100
- **Problema:** `CHUNK_LIMIT = 500` definido localmente em vez de importar de `genkit/constants.ts`.
- **Evidência:** `audio-preflight.ts:17` → `const CHUNK_LIMIT = 500;`. `constants.ts:74` → `export const CHUNK_LIMIT = 500;`.
- **Impacto:** Se `CHUNK_LIMIT` mudar, o preflight fica dessincronizado, gerando estimativas incorretas.
- **Sugestão:** Importar de `../genkit/constants.js`.

---

### [P3] Retry manual com delay linear em vez de exponential backoff

- **Arquivo:** `functions/src/flows/audio.ts:429-477`
- **Categoria:** Performance / Architecture
- **Confidence:** 85/100
- **Problema:** Retry usa `500 * attempt` (linear) em vez de exponential backoff com jitter.
- **Evidência:** `audio.ts:434` → `await new Promise((resolve) => setTimeout(resolve, 500 * attempt));`
- **Impacto:** Em rate limit, múltiplos usuários retry simultâneo criam thundering herd.
- **Sugestão:** Implementar exponential backoff com jitter: `Math.min(500 * Math.pow(2, attempt) + Math.random() * 500, 5000)`.

---

### [P3] `StockMediaPicker` engole erros silenciosamente

- **Arquivo:** `src/features/studio/components/StockMediaPicker.tsx:62-66`
- **Categoria:** UX
- **Confidence:** 92/100
- **Problema:** Catch block do `handleSearch` apenas seta `results` como array vazio sem log ou feedback ao usuário.
- **Evidência:** `StockMediaPicker.tsx:63` → `catch { setResults([]); }` — sem log, sem estado de erro.
- **Impacto:** Usuário não diferencia "busca sem resultados" de "falha na API Pexels" (rate limit 200 req/h).
- **Sugestão:** Adicionar estado `searchError` e exibir mensagem: `log.error('Erro ao buscar imagens stock', { error: searchError })`.

---

### [P3] Erro de auto-save usa mesma flag `error` que erros de geração

- **Arquivo:** `src/hooks/useAudioGenerator.ts:539-547`
- **Categoria:** UX
- **Confidence:** 82/100
- **Problema:** Quando auto-save falha, o erro é setado na mesma flag `error` e auto-dismiss após 8s.
- **Evidência:** `useAudioGenerator.ts:541` → `storeApi.getState().setError('...')`. `543-546` → `setTimeout(() => setError(''), 8000)`.
- **Impacto:** Mensagem de erro de salvamento pode ser substituída por erro de geração posterior. Áudio gerado mas não salvo pode ser perdido se fechar a aba.
- **Sugestão:** Usar flag separada `saveError` ou `warning` (que existe no store) em vez de `error`. Remover auto-dismiss para erros de salvamento.

---

### [P3] Pressão de memória com PCM buffers mantidos simultaneamente

- **Arquivo:** `functions/src/flows/audio.ts:372-501`
- **Categoria:** Performance
- **Confidence:** 80/100
- **Problema:** `pcmBuffers` acumula todos os chunks antes de `Buffer.concat()`. Sem `MAX_TTS_CHUNKS`, 100 chunks × ~1.4MB = ~140MB em buffers + ~140MB do resultado.
- **Evidência:** `audio.ts:372` → `const pcmBuffers: Buffer[] = []`. `audio.ts:490` → `pcmBuffers.push(pcmBuffer)`. `audio.ts:506` → `Buffer.concat(pcmBuffers)`.
- **Impacto:** Risco de OOM com limite de 256MB da Cloud Functions para roteiros longos.
- **Sugestão:** Se `MAX_TTS_CHUNKS` for implementado (24 × ~1.4MB = ~34MB), o risco mitiga. Alternativa: streaming incremental para Storage.

---

### [P3] `AudioSegment` duplicado entre frontend e backend

- **Arquivo:** `src/lib/db/types.ts:138` (export) vs `functions/src/flows/audio.ts:54` (local)
- **Categoria:** TypeScript / Architecture
- **Confidence:** 90/100
- **Problema:** Interface idêntica `{ text, startSec, endSec, chunkIndex }` em dois lugares.
- **Evidência:** `db/types.ts:138-147` → `export interface AudioSegment {...}`. `audio.ts:54-59` → `interface AudioSegment {...}`.
- **Impacto:** Se um campo for adicionado em um lado, o outro fica dessincronizado.
- **Sugestão:** Extrair para pacote compartilhado ou adicionar comentário cross-reference.

---

### [P3] Função `generateAudio` tem ~460 linhas — complexidade alta

- **Arquivo:** `src/hooks/useAudioGenerator.ts:330-790`
- **Categoria:** Architecture
- **Confidence:** 82/100
- **Problema:** Callback de `useCallback` com ~460 linhas, múltiplos try/catch aninhados, lógica de cancelamento, progresso, salvamento e cenas.
- **Evidência:** Escopo do callback: linha 330 a 790.
- **Impacto:** Dificulta manutenção, testabilidade e debugging.
- **Sugestão:** Extrair sub-funções: `generateAudioCore()`, `saveAudioToCloud()`, `generateScenes()`, `handleSceneError()`.

---

### [P3] Aspect ratios não validados pelo schema Zod do backend

- **Arquivo:** `src/components/ImageStudio.tsx:56-70` (frontend) vs `functions/src/genkit/schemas/common.ts:278` (backend)
- **Categoria:** TypeScript
- **Confidence:** 82/100
- **Problema:** Frontend oferece 8 ratios, backend aceita qualquer string.
- **Evidência:** `ImageStudio.tsx:56-58` → 8 ratios. `common.ts:278` → `aspectRatio: z.string()` sem enum.
- **Impacto:** Ratios não suportados pelo Gemini causam erro no backend após consumo de créditos.
- **Sugestão:** Centralizar em tipo union compartilhado ou `z.enum()` no schema Zod.

---

### [P3] `downloadStockImage` não valida content type da resposta

- **Arquivo:** `src/lib/stockMedia.ts:192-201`
- **Categoria:** Security
- **Confidence:** 80/100
- **Problema:** Fetch retorna blob sem verificar se content type é imagem.
- **Evidência:** `stockMedia.ts:201` → `return response.blob()` sem validação de headers.
- **Impacto:** Baixo (URLs de fonte confiável Pexels), mas defesa em profundidade ausente.
- **Sugestão:** Validar `response.headers.get('content-type')` antes de retornar blob.

---

### [P3] `audioPreflight` usa `onCall` em vez de `onCallGenkit` com `authPolicy`

- **Arquivo:** `functions/src/flows/audio-preflight.ts:15-21`
- **Categoria:** Architecture / Consistency
- **Confidence:** 82/100
- **Problema:** Usa `onCall` + validação manual de `request.auth?.uid` em vez de `onCallGenkit` com `authPolicy: isSignedIn()`.
- **Evidência:** `audio-preflight.ts:15` → `export const audioPreflight = onCall(...)`. Demais flows usam `onCallGenkit`.
- **Impacto:** Funcionalmente seguro, mas inconsistente — se validação manual for removida em refator, perde proteção.
- **Sugestão:** Padronizar para `onCallGenkit` com `authPolicy: isSignedIn()` e `getCallableUidOrThrow(flowContext)`.

---

### [P3] Potencial divergência de saldo entre `beta_access` e `credit_months`

- **Arquivo:** `functions/src/usage/credit-service.ts:636-638`
- **Categoria:** Authorization
- **Confidence:** 80/100
- **Problema:** Confirmação de créditos lê dois documentos independentes (`beta_access`, `credit_months`) e checa ambos. `Math.max(0, ...)` previne negativos mas não reconcilia divergências.
- **Evidência:** `credit-service.ts:635-636` → dois cálculos independentes. `credit-service.ts:651-653, 660-662` → `Math.max(0, newAvailable)` em cada um.
- **Impacto:** Raro (falha parcial de transação Firestore), mas saldos podem divergir sem reconciliação automática.
- **Sugestão:** Considerar função de reconciliação periódica (Cloud Scheduler) comparando saldo real com `credit_events`.

---

## Limites da auditoria

1. **Testes de penetração não executados** — análise exclusivamente estática.
2. **`functions/src/usage/credit-estimator.ts`** não auditado em profundidade para precisão.
3. **Flows não auditados:** `assistant.ts`, `inline-assistant.ts`, `scene-prompts.ts`, `feedback.ts`.
4. **Não foi possível confirmar** se `consumeAppCheckToken` está configurado no console GCP (IAM).
5. **Não foi possível confirmar** se `GOOGLE_GENAI_API_KEY` está configurada como secret no Cloud Functions.
6. **Regras do Firestore** não cobrem explicitamente a subcoleção `ai_requests` (funciona via Admin SDK).
7. **Emuladores não verificados** — comportamento local vs produção pode divergir.
