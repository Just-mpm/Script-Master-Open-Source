# Auditoria de Segurança — Leiva L1 (RF-04) | Speed Paint Vetorial

**Data:** 2026-06-15
**Escopo:** Propagação de `renderMode`/`vetorialPreset` na cadeia de processamento de vídeo
**Auditor:** Security Agent

---

## 1. Escopo da Revisão

### Arquivos lidos por completo

| Arquivo | Linhas | Função |
|---------|--------|--------|
| `src/features/video-render/lib/speedPaintService.ts` | 142 | Ponto único de geração: orquestra cache + worker + progresso |
| `src/features/video-render/lib/speedPaintRenderer.ts` | 514 | Renderização: modo mask (Worker/batch) + vetorial (main thread) |
| `src/features/video-render/hooks/useSpeedPaintEnhancer.ts` | 154 | Hook React com lifecycle, AbortController e race condition |
| `src/features/video-render/lib/strokeCache.ts` | 315 | Cache LRU SHA-256 com discriminated union mask/vetorial |
| `src/features/speed-paint/lib/imageProcessing.ts` | 830 | Geração de strokes: Worker inline + vetorização na main thread |
| `src/features/speed-paint/lib/vectorizer.ts` | 362 | Wrapper `imagetracerjs` com pathomit, truncamento e abort |
| `src/features/speed-paint/types/vetorial.ts` | 88 | Tipos `SpeedPaintRenderMode` e `VetorialPreset` (unions) |
| `src/features/speed-paint/store/animationStore.ts` | 196 | Zustand store com `renderMode` e `vetorialPreset` |
| `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts` | 69 | Sincroniza renderMode com UserSettings (Firestore/IndexedDB) |
| `src/features/speed-paint/lib/userSettings.ts` | 37 | Helpers de persistência do renderMode |
| `firestore.rules` | 257 | Regras de segurança do Firestore |

### Superfícies sensíveis cobertas

- [x] Validação de entrada (`renderMode`, `vetorialPreset`)
- [x] Cache poisoning (SHA-256, imageUrl como chave)
- [x] AbortController / signal propagation
- [x] PII em logs
- [x] XSS / injection (vetorialPreset em query strings, localStorage, SVG)
- [x] CT-S01: `any`, `@ts-ignore`, `as` bypass
- [x] CT-S02: COEP / SharedArrayBuffer
- [x] Firestore Rules e validação de schema
- [x] Persistência de UserSettings (dual storage)

---

## 2. Veredito

**SEGURO COM RESSALVAS**

A L1 implementa a propagação de `renderMode`/`vetorialPreset` de forma sólida. Os riscos encontrados são baixos/médios, com pré-condições de ataque específicas. Nenhum bloqueador de merge identificado.

---

## 3. Achados Priorizados

### [WARNING] Ausência de validação runtime do `renderMode` nos setters do Zustand e nas Firestore Rules

- **Arquivos:** `src/features/speed-paint/store/animationStore.ts:193-195`, `firestore.rules:35-41`
- **Confidence:** 85/100 (rebaixado de CRITICAL → WARNING pelo confidence gate)
- **Categoria:** Authorization / Data Integrity
- **Notebook consultado:** TypeScript 6 Guide, Firebase Firestore Docs

**Problema:**
O tipo `SpeedPaintRenderMode = 'mask' | 'vetorial'` não tem validação runtime. O Zustand store aceita qualquer string se chamado com `as any`. As Firestore Rules não validam o campo `speedPaintRenderMode`, permitindo que um cliente malicioso grave valores arbitrários via REST API direta.

**Evidência no código:**

```typescript
// animationStore.ts:193 — sem validação runtime
setRenderMode: (renderMode) => set({ renderMode }),

// animationStore.ts:195 — sem validação runtime
setVetorialPreset: (vetorialPreset) => set({ vetorialPreset }),
```

```typescript
// firestore.rules:35-41 — não valida speedPaintRenderMode
function isValidUserSetting(data) {
  return data.keys().hasAll(['id', 'userId', 'customSystemPrompt', 'updatedAt']) &&
         data.id is string &&
         data.userId == request.auth.uid &&
         data.customSystemPrompt is string && ...
}
```

```typescript
// vectorizer.ts:326 — PATHOMIT_BY_PRESET[preset] retorna undefined para presets inválidos
const effectivePathomit = Math.max(pathomit, PATHOMIT_BY_PRESET[preset]);
// Math.max(8, undefined) → NaN — comportamento imprevisível
```

**Cadeia de propagação do ataque:**

1. Usuário autenticado faz PATCH `https://firestore.googleapis.com/v1/projects/.../documents/user_settings/{uid}` com token de auth válido
2. Adiciona campo `speedPaintRenderMode: '"INVALIDO"'` (string arbitrária)
3. `isValidUserSetting` não valida o campo → Firestore aceita a escrita
4. Ao recarregar a página, `useSyncSpeedPaintRenderMode.ts:40` lê o valor corrompido e chama `setRenderMode('INVALIDO')`
5. `speedPaintRenderer.ts:325` → `effectiveMode` vira `'INVALIDO'` (não cai no `?? 'mask'`)
6. `strokeCache.ts:247` → cache key com `mode: 'INVALIDO'` — cache contaminado para esta sessão
7. `imageProcessing.ts:401` → `renderMode === 'vetorial'` → falso, cai no caminho mask (comportamento seguro, apenas cache contaminado)

**Impacto real (limitado):**
- Cache LRU da sessão pode ser contaminado com chaves inválidas
- `PATHOMIT_BY_PRESET[preset]` retorna `undefined` se `VetorialPreset` for inválido → `Math.max` devolve `NaN` → comportamento imprevisível no `imagetracerjs`
- Apenas o próprio atacante corrompe seu cache/estado (não afeta outros usuários)
- O modo mask (default) continua funcionando para valores inválidos de `renderMode`

**Pré-condição de ataque:**
- Token de Firebase Auth válido (usuário logado)
- Conhecimento da estrutura Firestore REST API
- Intenção de corromper o próprio estado (sem benefício aparente)

**Sugestão (defesa em profundidade):**

1. **Firestore Rules** — Adicionar validação do campo:
```javascript
function isValidUserSetting(data) {
  // ... validações existentes ...
  (!('speedPaintRenderMode' in data) || data.speedPaintRenderMode in ['mask', 'vetorial']);
}
```

2. **Zustand store** — Validação runtime nos setters:
```typescript
setRenderMode: (mode: SpeedPaintRenderMode) => {
  if (mode !== 'mask' && mode !== 'vetorial') {
    log.warn('Tentativa de setar renderMode inválido', { mode });
    return; // ou usa default
  }
  set({ renderMode: mode });
}
```

3. **`PATHOMIT_BY_PRESET`** — Fallback para preset desconhecido:
```typescript
const minPathomit = PATHOMIT_BY_PRESET[preset] ?? DEFAULT_PATHOMIT;
const effectivePathomit = Math.max(pathomit, minPathomit);
```

---

### [SUGGESTION] AbortSignal não propagado internamente (resource leak)

- **Arquivo:** `src/features/video-render/lib/speedPaintService.ts:102-106`
- **Confidence:** 75/100 (descartado pelo confidence gate < 80 — reportado como observação)
- **Categoria:** Rate Limit / Resource Leak

**Problema:**
O `AbortSignal` recebido em `enhanceScenesWithSpeedPaint` não é propagado para `generateScenesWithSpeedPaint`. Quando o usuário cancela (muda de página, novo processamento), apenas a flag `ignore` é setada para descartar resultados — o processamento interno continua rodando.

**Evidência:**
```typescript
// speedPaintService.ts:102-106 — signal não é passado
const results = await generateScenesWithSpeedPaint(
  scenes.map((scene) => ({ imageUrl: scene.imageUrl })),
  onProgress,
  { useWorker: true, renderMode, vetorialPreset }, // sem signal
);
```

```typescript
// speedPaintRenderer.ts:372-374 — generateStrokesFromImage sem signal
const animation = await generateStrokesFromImage(scene.imageUrl, () => {}, {
  renderMode: effectiveMode,
  vetorialPreset: effectivePreset,
  // signal está disponível no escopo? Não — GenerateSpeedPaintOptions não tem signal
});
```

**Impacto:** O Web Worker ou processamento na main thread continua executando até completar, mesmo após o cancelamento. O Worker é terminado apenas no `finally` do `generateWithWorker`. Não é risco de segurança (processamento client-side, sem custo de servidor).

**Sugestão:** Propagar o `AbortSignal` para `generateScenesWithSpeedPaint` e para as chamadas internas de `generateStrokesFromImage`. Ou, como alternativa mínima, terminar o Worker no handler de abort do `speedPaintService`.

---

## 4. O que parece saudável

### ✅ SHA-256 cache key (CT-S01, cache poisoning)

`strokeCache.ts:77-84` — Chave do cache construída com `crypto.subtle.digest('SHA-256', \`${imageUrl}|${JSON.stringify(context)}\`)`:
- SHA-256 é resistente a colisão computacionalmente
- `imageUrl` + `context` (mode + preset) na payload garante chaves distintas por modo de renderização
- Cache LRU em memória (20 entradas), não compartilhado entre sessões
- Se `crypto.subtle` falhar (contexto inseguro), o cache é ignorado com `log.warn` → degradação graciosa

### ✅ Sem `any`, `@ts-ignore`, `as` bypass (CT-S01)

Zero ocorrências nos 8 arquivos auditados. O código usa discriminated unions com type guards reais (`isVetorialAnimation`, `isStrokeAnimation`) em vez de `as` bypass. Destaque para o narrowing sem cast em:

```typescript
// speedPaintRenderer.ts:379-392
if (effectiveMode === 'vetorial') {
  if (!isVetorialAnimation(animation)) { throw new TypeError(...); }
  await setStrokeAnimation(scene.imageUrl, animation, { mode: 'vetorial', preset: effectivePreset });
}
```

### ✅ COEP / SharedArrayBuffer não alterado (CT-S02)

A L1 não modifica configuração COEP. Web Workers com Blob URLs (`createStrokeWorker`, `createImageProcessingWorker`) são compatíveis com COEP.

### ✅ XSS / Injection

- `vetorialPreset` **não é usado** em query strings, SQL, localStorage, ou `innerHTML`
- SVG parsing (`vectorizer.ts:111`) usa regex em SVG gerado por `imagetracerjs` — nenhum input do usuário entra no SVG
- `dangerouslySetInnerHTML` existe no projeto mas fora do escopo: `Inspector.tsx:430` (com `escapeHtml`) e `DeleteAccountDialog.tsx:89` (tradução estática)
- `imageUrl` no pipeline é blob URL, data URL ou Storage URL — nenhuma dessas é controlada por atacante para envenenamento
- Prototype pollution: `JSON.stringify(context)` e `Map.set()` são usados com strings internas, não com chaves de objeto derivadas de input

### ✅ PII em logs

`strokeCache.ts:196,202,284` — `imageUrl.substring(0, 60)`:
- Blob URL: `blob:https://script-master.pro/...` → apenas origem + início do UUID
- Data URL: `data:image/png;base64,iVBORw0KG...` → prefixo + ~40 chars de base64 (insuficiente para reconstruir imagem)
- Storage URL: `https://firebasestorage...` → pode conter project ID mas não PII do usuário
- `mode` e `preset` nos logs são valores controlados (literals)

### ✅ AbortController e race condition

`useSpeedPaintEnhancer.ts:80-131`:
- `renderIdRef` previne race condition entre chamadas concorrentes
- `abortControllerRef` aborta chamada anterior antes de iniciar nova
- Cleanup no `useEffect` (desmontagem)
- `ignore` flag no service como proteção adicional
- Combinando `ignore` + `renderIdRef.current === currentRenderId`: proteção dupla contra atualização de estado com resultado desatualizado

### ✅ Cache LRU bounds

`strokeCache.ts:55` — `MAX_CACHE_SIZE = 20` com eviction LRU (timestamp-based). Previne memory leak.

### ✅ Validação de `imageUrl` no Worker

`imageProcessing.ts:340` — `img.crossOrigin = 'anonymous'` previne erros de CORS com blob/data URLs.
`imageProcessing.ts:339-341` — Verificação de `signal?.aborted` antes de iniciar decode.

---

## 5. Limites da Revisão

- **Análise estática apenas:** Não foi possível executar o código ou testar a REST API do Firestore
- **`imagetracerjs` não auditado:** A lib `imagetracerjs@1.2.6` (~290 KB) não foi inspecionada internamente. O risco é baixo porque é uma lib de processamento de imagem puro (sem rede, sem eval)
- **`@remotion/paths` não auditado:** Função `getLength()` usada para pré-calcular comprimento de paths SVG
- **BYOK (chave Gemini):** Não foi verificado se a chave API do Gemini pode vazar via `imageUrl` em logs porque a chamada TTS é feita no backend (Cloud Functions), não no frontend auditado
- **Batch vetorial não suportado:** Conforme documentação, o batch só funciona com modo `mask`. Se no futuro o batch vetorial for adicionado, os mesmos riscos de validação se aplicam

---

## 6. Checks Rápidos

| Superfície | Status | Detalhes |
|-----------|--------|----------|
| Validação de entrada `renderMode` | ⚠️ Parcial | Tipo TS protege compile-time; runtime sem validação; Firestore Rules sem validação |
| Validação de entrada `vetorialPreset` | ⚠️ Parcial | Mesmo problema, mas não exposto na UI nem persistido |
| Cache poisoning (SHA-256) | ✅ Seguro | SHA-256 resistente a colisão; LRU em memória (20 entr.) |
| Cache poisoning (imageUrl) | ✅ Seguro | imageUrl é blob/data/Storage URL — não controlável por atacante |
| AbortSignal propagation | ⚠️ Parcial | Signal escutado no service mas não propagado internamente |
| PII em logs | ✅ Seguro | `imageUrl.substring(0, 60)` + apenas mode/preset nos logs |
| CT-S01 (`any`, `@ts-ignore`, `as`) | ✅ Zero ocorrências | Nenhum bypass de tipo nos 8 arquivos auditados |
| CT-S02 (COEP) | ✅ Não alterado | Web Workers com Blob URL compatíveis com COEP |
| XSS (dangerouslySetInnerHTML) | ✅ Fora do escopo | Ocorrências existentes usam escapeHtml ou tradução estática |
| XSS (SVG injection) | ✅ Seguro | SVG gerado por `imagetracerjs`, não por input do usuário |
| Firestore Rules schema | ⚠️ Ausente | `isValidUserSetting` não valida `speedPaintRenderMode` |
| Prototype pollution | ✅ Seguro | Sem spread de objetos não confiáveis ou `__proto__` |

---

## 7. Priorização

| Prioridade | Achado | Ação |
|-----------|--------|------|
| 🔴 Média | Firestore Rules sem validação de `speedPaintRenderMode` | Adicionar `data.speedPaintRenderMode in ['mask', 'vetorial']` em `isValidUserSetting` |
| 🟡 Baixa | Zustand setters sem validação runtime | Adicionar type guards ou fallback para valores inválidos |
| 🟢 Observação | AbortSignal não propagado internamente | Propagar signal para `generateScenesWithSpeedPaint` (apenas eficiência, sem impacto de segurança) |

---

## 8. Resumo para o Time

**O que precisa ser corrigido (antes do próximo deploy de rules):**

```javascript
// firestore.rules — dentro de isValidUserSetting (linha 35)
function isValidUserSetting(data) {
  // Adicionar após a validação existente:
  let basicCheck = data.keys().hasAll([...]) && ...;
  let renderModeCheck = !('speedPaintRenderMode' in data) || 
                         data.speedPaintRenderMode in ['mask', 'vetorial'];
  return basicCheck && renderModeCheck;
}
```

**O que pode esperar (defesa em profundidade):**

```typescript
// animationStore.ts — setRenderMode com validação (opcional)
setRenderMode: (mode: SpeedPaintRenderMode) => {
  if (mode !== 'mask' && mode !== 'vetorial') {
    log.warn('renderMode inválido ignorado', { mode });
    return;
  }
  set({ renderMode: mode });
}
```

---

*Relatório gerado pelo Security Agent. Nenhum código foi modificado durante a auditoria.*
