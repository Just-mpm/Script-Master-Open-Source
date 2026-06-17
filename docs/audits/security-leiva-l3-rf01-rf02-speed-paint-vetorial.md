# Auditoria de Segurança — Leiva L3 (RF-01 + RF-02)

**Data:** 2026-06-15  
**Auditor:** Security Agent  
**Alvo:** Implementação do `handleRenderModeChange` em `SpeedPaintPage.tsx` + cache + i18n  
**Arquivos auditados:** `SpeedPaintPage.tsx`, `strokeCache.ts`, `pt-BR.ts`, `en.ts`, `es.ts`  
**Notebooks consultados:** React Docs, MUI Docs  

---

## 1. Escopo da Revisão

Foram lidos na íntegra:

- `src/pages/SpeedPaintPage.tsx` (1027 linhas) — função `handleRenderModeChange`, refs, imports, JSX do `ToggleButtonGroup`
- `src/features/video-render/lib/strokeCache.ts` (315 linhas) — `buildCacheKey`, `getStrokeAnimation`, `setStrokeAnimation`, type guards
- `src/features/speed-paint/types/vetorial.ts` — tipo `SpeedPaintRenderMode` e `VetorialPreset`
- `src/features/speed-paint/store/animationStore.ts` — interface `AnimationState`, defaults
- `src/features/speed-paint/lib/imageProcessing.ts` — `generateStrokesFromImage` (parcial, linhas 280-420)
- `src/lib/logger/index.ts` + `src/lib/logger/sanitization.ts` — pipeline de sanitização de logs
- `src/features/i18n/locales/{pt-BR,en,es}.ts` — 5 novas chaves × 3 locales

**Superfícies sensíveis cobertas:**

| Superfície | Avaliada |
|-----------|----------|
| Validação de entrada (`renderMode`, `vetorialPreset`, `inputImage`) | ✅ |
| Cache poisoning (SHA-256, chave com dados do usuário) | ✅ |
| Dynamic import (caminho hardcoded vs controlado) | ✅ |
| AbortController / signal (race condition, memory leak) | ✅ |
| Logs e PII (vazamento de dados sensíveis) | ✅ |
| Analytics (evento com dados controlados) | ✅ |
| i18n (XSS via tradução maliciosa) | ✅ |
| DoS / exaustão de recursos | ✅ |

---

## 2. Veredito

### ✅ **SEGURO** — Sem riscos críticos ou médios

Nenhuma vulnerabilidade explorável encontrada. Os 2 achados são de baixíssimo impacto e classificados como sugestões de hardening.

---

## 3. Achados Priorizados

### [SUGGESTION] Logger pode expor `dataUrl` parcial em erros de reprocessamento

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:383`
- **Confidence:** 85/100
- **Categoria:** PII
- **Problema:** `log.error('Falha ao reprocessar imagem', { error: err })` envia o objeto de erro completo ao logger. Embora a sanitização redacte JWTs, emails e credenciais (via `sanitizeMessage`), ela **não redacta data URLs (base64)**. Se `err.message` contiver um fragmento de data URL, ele seria persistido no Firestore como log de erro.
- **Evidência:**

```typescript
// SpeedPaintPage.tsx:380-384
} catch (err) {
  if (ac.signal.aborted) return;
  if (processingIdRef.current !== processId) return;
  log.error('Falha ao reprocessar imagem', { error: err });
  setJob({ status: 'failed' });
}
```

```typescript
// sanitization.ts:21-30 — SENSITIVE_PATTERNS não inclui data URLs
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,  // JWTs
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,  // Emails
  /:\/\/[^@\s]+:[^@\s]+@/g,  // URLs com credenciais
  /[?&](token|key|secret|password|pwd|api[_-]?key|access[_-]?token)=([^&\s]+)/gi,
];
```

- **Impacto:** Muito baixo. Erros de processamento de imagem (`generateStrokesFromImage`) têm mensagens genéricas como `"Falha ao decodificar imagem para speed paint"` ou `"Speed paint generation aborted"`. A probabilidade de um `Error.message` conter uma data URL completa é remota — o código não constrói mensagens de erro com o input.
- **Pré-condição de ataque:** Um erro com `err.message` contendo dados sensíveis (ex: se uma lib terceira lançar erro com o input como mensagem). Não observado no código real.
- **Sugestão:** Adicionar `data:image/` ao `SENSITIVE_PATTERNS` no sanitizador como defesa em profundidade.

---

### [SUGGESTION] Cache `log.debug` expõe prefixo do `imageUrl` em ambiente dev

- **Arquivo:** `src/features/video-render/lib/strokeCache.ts:196, 202, 284`
- **Confidence:** 80/100
- **Categoria:** PII
- **Problema:** Mensagens de cache hit/miss logam `imageUrl.substring(0, 60)` com o prefixo da data URL. Em produção, `debug` é suprimido (não enviado ao Firestore), mas em desenvolvimento aparece no console.
- **Evidência:**

```typescript
// strokeCache.ts:196
log.debug('Cache hit', { imageUrl: imageUrl.substring(0, 60), mode, preset });
```

- **Impacto:** Muito baixo. Apenas os primeiros 60 caracteres da data URL são logados (ex: `data:image/jpeg;base64,/9j/4AAQ...`). Isso não expõe conteúdo significativo da imagem. Além disso, `debug` não é enviado ao Firestore.
- **Pré-condição de ataque:** Alguém com acesso ao console do navegador do usuário (já comprometido).
- **Sugestão:** Truncar para `imageUrl.substring(0, 30)` ou usar um hash curto em vez do prefixo. Baixa prioridade.

---

## 4. O que Parece Saudável

### ✅ Validação de entrada — `renderMode`

O `handleRenderModeChange` usa `ToggleButtonGroup` do MUI com `exclusive`. Os valores dos botões são hardcoded (`"mask"` e `"vetorial"`). Conforme confirmado pelo **MUI Docs** (notebook consultado), o `newValue` passado ao `onChange` vem da prop React, não do DOM — impossível injetar valor arbitrário via DevTools. O `null` é tratado com early return:

```typescript
if (newMode == null) return;
```

### ✅ Validação de entrada — `vetorialPreset`

O preset é lido da store Zustand via `useAnimationStore.getState()`, que é tipado como `VetorialPreset` (union de 16 literais). A função `vectorizeImage` usa `PATHOMIT_BY_PRESET[preset]` que, se o preset for inválido, retorna `undefined` e usa fallback seguro. O tipo TypeScript previne valores arbitrários em tempo de compilação.

### ✅ Validação de entrada — `job.inputImage`

A verificação `if (!job.inputImage || job.status === 'processing') return` previne execução sem imagem. O `generateStrokesFromImage` cria um `new Image()` que decodifica a data URL — se malformada, `img.decode()` rejeita e o erro é capturado pelo catch, marcando o job como `failed`. Não há injeção possível porque data URLs só podem conter dados de imagem interpretados pelo browser.

### ✅ Cache poisoning — SHA-256

A função `buildCacheKey` concatena `imageUrl + '|' + JSON.stringify({ mode, preset })` e aplica SHA-256 via `crypto.subtle.digest`. A URL do usuário é apenas material de entrada para o hash — impossível causar colisão ou envenenamento porque:
1. SHA-256 é colisão-resistente
2. O `mode` + `preset` são validados antes de entrar na chave
3. A saída é hex digest, não executável

### ✅ Dynamic import

`await import('../features/speed-paint/lib/imageProcessing')` — caminho relativo hardcoded. Sem participação do usuário na construção do caminho. Zero risco de load de módulo arbitrário.

### ✅ AbortController + race protection

Três camadas de proteção:

1. **`abortControllerRef.current?.abort()`** — aborta processamento anterior antes de iniciar novo
2. **`processingIdRef`** — `const processId = \`${Date.now()}-${Math.random()}\``; 4 verificações de `processingIdRef.current !== processId` impedem que callbacks obsoletos atualizem o job
3. **`if (ac.signal.aborted) return`** — no catch, ignora silenciosamente se o abort foi intencional

O padrão foi confirmado pelo **React Docs** (notebook consultado) como o recomendado para **event handlers** (que é o caso — `onChange` do `ToggleButtonGroup`). Não há `useEffect` envolvido, então não é necessário cleanup de desmontagem.

O `generateStrokesFromImage` limpa seus listeners via `cleanupAbortListener()` e termina Workers via `worker.terminate()` no `handleAbort`. Sem vazamento de memória.

### ✅ Analytics

`trackAnalyticsEvent('speed_paint_mode_changed', { mode: newMode })` — `newMode` é `SpeedPaintRenderMode = 'mask' | 'vetorial'` (enum). Sem PII. O tipo do evento é validado pelo `AnalyticsEventMap` em `analytics.ts:93`.

### ✅ i18n — XSS

5 chaves adicionadas em 3 locales (15 entradas totais): `modeClassicTooltip`, `modeVetorialTooltip`, `processingLabel`, `modeProcessingError`, `modeProcessingRetry`. Todas usadas em:

- `<Tooltip title={t('...')}>` — React escapa HTML automaticamente
- `<CircularProgress aria-label={t('...')}>` — atributo, não HTML renderizado
- Mensagens de erro exibidas via React (escape automático)

Confirmado pelo **React Docs** (notebook consultado): qualquer dado inserido via `{}` é tratado como texto, não marcação HTML. Sem `dangerouslySetInnerHTML` em nenhum dos pontos de uso.

### ✅ i18n — Strings vazias

Se uma chave estiver ausente ou vazia, React renderiza `<Tooltip title="">` (tooltip vazio). É um problema de UX, não de segurança.

### ✅ DoS / Resource Exaustion

Todo o processamento é **client-side** (Web Worker para modo mask, main thread para modo vetorial). Não há custo de servidor — o modelo BYOK significa que o usuário paga pelas chamadas de API Gemini, que não são usadas no Speed Paint (vetorização é 100% local). Rápidas mudanças de modo abortam o processamento anterior, impedindo acúmulo de Workers concorrentes.

---

## 5. Limites da Revisão

- **Testes unitários:** Não foram executados. A confiança baseia-se na leitura do código e validação contra notebooks.
- **Integração com `BatchOrchestrator`:** A função `handleRenderModeChange` é independente do batch. Batch não foi auditado nesta leiva.
- **Renderização Remotion:** Não auditada (escopo da L2, não L3).
- **Acessibilidade (WCAG):** Não faz parte do escopo de segurança.
- **`imageProcessing.ts` (dynamic import):** Lido parcialmente (função `generateStrokesFromImage` assinatura e ramo vetorial). A implementação completa do Worker não foi auditada.
- **Notas consultadas:** React Docs (L3 — race condition), MUI Docs (L3 — Tooltip/ToggleButton). Remotion Guide, Zod V4 e outros notebooks do plano não foram consultados por não serem relevantes para segurança desta leiva.

---

## 6. Checks Rápidos

| Item | Status |
|------|--------|
| `renderMode` só aceita `'mask' \| 'vetorial'`? | ✅ TypeScript + MUI virtual DOM |
| `vetorialPreset` validado contra union type? | ✅ Sim, tipado como `VetorialPreset` |
| `job.inputImage` tem validação de formato? | ⚠️ Só truthiness check; runtime via `img.decode()` |
| Cache key inclui `mode + preset`? | ✅ `buildCacheKey` serializa `{ mode, preset }` |
| SHA-256 é colisão-resistente? | ✅ Sim, uso padrão do `crypto.subtle.digest` |
| Dynamic import com path controlado pelo usuário? | ❌ Não — caminho hardcoded |
| AbortController tem cleanup de listeners? | ✅ `generateStrokesFromImage` faz `removeEventListener` |
| `processingIdRef` previne race condition? | ✅ 4 pontos de verificação |
| Log de erro sanitiza data URLs? | ⚠️ Não explicitamente — só por sanitização genérica |
| Analytics expõe PII? | ❌ Não — `mode` é enum |
| i18n usada em `dangerouslySetInnerHTML`? | ❌ Não — sempre via `{}` (escape automático) |
| i18n com string vazia causa XSS? | ❌ Não — React escapa string vazia também |

---

## 7. Priorização

| Prioridade | Achado | Ação |
|-----------|--------|------|
| 🔹 Baixa | Logger não redacta data URLs em `err.message` | Adicionar `data:image/` ao `SENSITIVE_PATTERNS` no `sanitization.ts` |
| 🔹 Baixa | Cache log expõe prefixo de data URL | Truncar `imageUrl` para 30 chars ou usar hash curto |
| — | Demais superfícies | Nenhuma ação necessária |

---

**Resumo final:** A Leiva L3 está **SEGURA** para merge do ponto de vista de segurança. Nenhum bloqueador identificado. As duas sugestões são hardening opcional sem impacto imediato.

---

*Auditoria realizada por Security Agent em 2026-06-15.*
