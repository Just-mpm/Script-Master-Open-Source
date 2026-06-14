# Auditoria de Segurança — Speed Paint Vetorial Fases 1–5 (Reauditoria Final)

**Data:** 2026-06-14  
**Versão alvo:** v0.131.0  
**Tipo:** Reauditoria final após conclusão de todas as 5 fases  
**Responsável:** Agent `security`

---

## Escopo da Revisão

### Arquivos novos (6)

| Arquivo | Papel |
|---------|-------|
| `src/features/speed-paint/types/vetorial.ts` | Tipos `VetorialPath`, `VetorialAnimation`, `SpeedPaintRenderMode`, `VetorialPreset` |
| `src/features/speed-paint/lib/vectorizer.ts` | Wrapper `imagetracerjs` → parser SVG → `VetorialPath[]` |
| `src/features/video-render/components/WhiteboardScene.tsx` | Composição Remotion vetorial (paths animados + caneta SVG) |
| `src/features/speed-paint/components/WhiteboardComposition.tsx` | Wrapper de exportação |
| `src/types/imagetracerjs.d.ts` | Declarações de tipo |
| `src/features/speed-paint/lib/userSettings.ts` | Persistência do `renderMode` |

### Arquivos modificados (9+)

`src/features/speed-paint/lib/imageProcessing.ts`, `src/features/speed-paint/store/animationStore.ts`, `src/features/speed-paint/types.ts`, `src/features/video-render/lib/strokeCache.ts`, `src/features/speed-paint/store/speedPaintRenderController.tsx`, `src/features/speed-paint/hooks/useSyncSpeedPaintRenderMode.ts`, `src/pages/SpeedPaintPage.tsx`, `src/lib/analytics.ts`

### Superfícies sensíveis cobertas

- Processamento de imagem do usuário (`ImageData`, data URLs)
- Renderização de path data SVG (injeção no DOM via React)
- Persistência de preferências (Firestore / IndexedDB)
- Cache LRU com hash SHA-256
- Eventos analytics
- Logging estruturado (sanitização)
- Web Worker inline (edge detection existente, intocado)

---

## Resultados das Buscas Globais

| Padrão | Resultado | Observação |
|--------|-----------|------------|
| `dangerouslySetInnerHTML` | 3 matches **fora do escopo** | `Inspector.tsx:430` (com `escapeHtml()`) e `DeleteAccountDialog.tsx:89` (string i18n controlada) — ambos legítimos e sanitizados. **Nenhum em speed-paint ou video-render.** |
| `innerHTML` | 1 match **fora do escopo** | `main.tsx:28` — `root.innerHTML` padrão do React. **Nenhum em speed-paint/video-render.** |
| `eval(` | **0 matches** | — |
| `new Function` | **0 matches** | — |
| `console.` em speed-paint/WhiteboardScene | **0 matches** | Zero `console.log/error/warn` no código novo. Todo logging usa `createLogger`. |
| `localStorage` / `sessionStorage` em speed-paint | **0 matches** | Apenas referência em comentário (`renderController.ts:6`). |
| `as any` / `as unknown` em speed-paint | **0 matches** | Tipagem explícita rigorosa. |
| `as any` / `as unknown` em video-render | **0 matches** | Tipagem explícita rigorosa. |

---

## Veredito

### ✅ **Release v0.131.0 seguro** — Sem vulnerabilidades críticas ou de alto impacto.

**1 achado LOW (não-bloqueante):** Sugestão de segurança anterior (F5.5) **não implementada** — falta validação runtime do `renderMode` carregado do UserSettings. Não bloqueia o release, mas merece atenção.

---

## Achados Priorizados

### [LOW] Sugestão não implementada: sem validação runtime do `renderMode` carregado de UserSettings

- **Arquivo:** `src/features/speed-paint/lib/userSettings.ts:20-25`  
- **Confidence:** 85/100  
- **Categoria:** Authorization  
- **Problema:** `loadSpeedPaintRenderMode()` retorna o valor do Firestore/IndexedDB sem validar se é `'mask'` ou `'vetorial'`. Se o banco for corrompido ou comprometido com um valor arbitrário, o modo inválido é passado adiante sem verificação.  
- **Evidência:**

```typescript
// userSettings.ts:20-25 — SEM validação runtime
export async function loadSpeedPaintRenderMode(
  userId?: string,
): Promise<SpeedPaintRenderMode | undefined> {
  const settings = await getUserSettings(userId);
  return settings?.speedPaintRenderMode; // ← qualquer string passa
}
```

- **Impacto:** Baixo. Se um valor inválido for carregado:
  - `generateStrokesFromImage()` testa `renderMode === 'vetorial'` → cai no ramo `else` (mask mode, comportamento seguro)
  - O seletor de modo na UI mostra `undefined` → MUI ToggleButtonGroup trata como `null` → mantém o valor ativo anterior
  - Não causa crash, data leak, ou perda de dados. A pior consequência é o modo visual errado.
- **Pré-condição de ataque:** Necessita comprometimento do Firestore (escrita no documento `user_settings/{uid}`) ou corrupção do IndexedDB local. Cenário de baixíssima probabilidade.
- **Sugestão:** Adicionar guarda runtime:

```typescript
const VALID_MODES: SpeedPaintRenderMode[] = ['mask', 'vetorial'];
const mode = settings?.speedPaintRenderMode;
return VALID_MODES.includes(mode as SpeedPaintRenderMode) ? (mode as SpeedPaintRenderMode) : undefined;
```

---

## Confirmação dos 10 Focos Específicos

### Foco 1 — Path data injection (XSS) no WhiteboardScene ✅ Seguro

**Investigação:**
- `<path d={path.d} />` em `WhiteboardScene.tsx:213` — React JSX escapa automaticamente. O `d` é passado como string via `setAttribute('d', path.d)` pelo React, sem risco de XSS.
- NENHUM uso de `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `new Function` no componente.
- `Pencil` (SVG inline, linhas 272-297) renderiza com JSX puro — atributos numéricos e strings controladas. `transform` tem `x`/`y` numéricos de `getPointAtLength()` + `Math.sin()`. `filter` é string constante.
- `imagetracerjs` gera SVG → regex extrai `d` entre aspas → `getLength()` valida o path data → React renderiza. Quatro camadas de segurança.

### Foco 2 — Validação de input avançada ✅ Seguro

**Investigação:**
- `isValidImageData` (vectorizer.ts:155-163): valida `null`, `undefined`, `instanceof Uint8ClampedArray`, `width > 0`, `height > 0`. **Não valida** `data.length >= width * height * 4`, mas a fonte do `ImageData` é sempre `ctx.getImageData()` (Canvas API) que garante consistência. Nenhum atacante pode injetar um `ImageData` malformado diretamente.
- `generateStrokesFromImage` (imageProcessing.ts:339-341): `new Image()` decodifica a `dataUrl` — o navegador só aceita formatos de imagem suportados (PNG, JPEG, WebP, GIF, BMP, SVG). SVG em `<img>` **não executa scripts** (CORS/sandboxing do navegador). Nenhum vetor de SVG injection.
- `canvas.toDataURL('image/jpeg', 0.9)` (linha 384) — saída controlada, sem risco.

### Foco 3 — Validação de UserSettings ⚠️ Sugestão não implementada

**Investigação:**
- `loadSpeedPaintRenderMode` retorna o valor sem validação runtime (detalhado no achado LOW acima).
- `setRenderMode` no Zustand (animationStore.ts:193) aceita qualquer valor — apenas type-level.
- Mitigações naturais: (1) valor inválido cai em `else` (mask mode); (2) UI ToggleButtonGroup só emite `'mask'`/`'vetorial'`; (3) Firestore comprometido é pré-condição improvável.
- **Veredito:** Sugestão da auditoria F5.5 anterior não foi implementada, mas o risco é baixo e não bloqueia o release.

### Foco 4 — Cache SHA-256 ✅ Seguro

**Investigação:**
- `buildCacheKey` (strokeCache.ts:77-84): `SHA-256(`${imageUrl}|${JSON.stringify({mode, preset})}`)` — hash criptográfico seguro, sem risco de colisão.
- Cache é `Map<string, CacheEntry>` em memória local (escopo de módulo JS). **NÃO compartilhado entre usuários** — cada aba/tab tem seu próprio cache.
- `imageUrl` é data URL do upload do próprio usuário. Cache poisoning exigiria que o atacante controle o hash SHA-256, o que é computacionalmente inviável.
- `clearStrokeCache()`: público, mas limpa apenas o cache local do usuário. No máximo causa reprocessamento — não é DoS (atinge apenas o próprio usuário).

### Foco 5 — Analytics ✅ Seguro

**Investigação:**
- Evento `speed_paint_mode_changed` (SpeedPaintPage.tsx:305): `{ mode: newMode }` onde `newMode` vem do `ToggleButtonGroup.onChange`.
- MUI `ToggleButton` values são hardcoded: `"mask"` e `"vetorial"` (SpeedPaintPage.tsx:852, 865). Sem input do usuário.
- Interface do AnalyticsEventMap (analytics.ts:93): `{ mode: 'mask' | 'vetorial' }` — tipado.
- Demais eventos de exportação: `quality`, `codec`, `container`, `mode` — nenhum PII.

### Foco 6 — Logging e sanitização ✅ Seguro

**Investigação:**
- Logger usa `sanitizeMessage()`, `sanitizePayload()` e `sanitizeStackTrace()` (logger/sanitization.ts) que redactam: JWTs, emails, URLs com credenciais, query params sensíveis, caminhos de arquivo.
- Logs em vectorizer.ts: `{ preset, width, height }`, `{ originalCount, maxAllowed, preset }` — apenas metadados.
- Logs em imageProcessing.ts: `{ error: workerError }`, `{ error: err.message }` — sanitizados.
- Logs em strokeCache.ts: `imageUrl.substring(0, 60)` — truncado. Debug level (não enviado ao Firestore).
- Logs em speedPaintRenderController.tsx: `{ error: err }` — sanitizados.
- **Nenhum `console.log`** no código novo.
- **Nota:** Data URLs truncadas (`substring(0, 60)`) ainda podem conter base64 parcial. Mas estão apenas em `debug` level → não vão para Firestore.

### Foco 7 — AbortSignal DoS ✅ Seguro

**Investigação:**
- `vectorizeImage` (vectorizer.ts): checa abort antes da chamada pesada (linha 318), depois (linha 336), e a cada 50 paths em `enrichPaths` (linha 268).
- `processVetorialOnMainThread` (imageProcessing.ts:508-551): checa antes e depois de `vectorizeImage`.
- `processOnMainThread` fallback: usa `setTimeout` para yield + `signal.addEventListener('abort', ...)` para limpar timeouts. Checagens periódicas via `abortIfNeeded()`.
- `generateStrokesFromImage`: abort listener termina o Worker e rejeita o Promise.
- **Cobertura completa.** Não há DoS por AbortController preso.

### Foco 8 — CSS injection via SVG ✅ Seguro

**Investigação:**
- `style={{ backgroundColor: effectiveCanvasColor === 'white' ? '#fff' : '#000' }}` — apenas dois valores controlados pelo código (WhiteboardScene.tsx:196).
- `style={{ filter: 'drop-shadow(rgba(0,0,0,0.3) 5px 5px 5px)' }}` — string constante (Pencil, linha 284).
- `transform={`translate(${x} ${y + bob}) rotate(-45)`}` — valores numéricos de `getPointAtLength()` + `Math.sin()`.
- Nenhuma prop de `style` recebe string do usuário ou do `imagetracerjs`.

### Foco 9 — Sanitização SVG do imagetracerjs ✅ Seguro

**Investigação:**
- Regex `PATH_TAG_REGEX = /<path\b[^>]*\bd="([^"]+)"[^>]*?>/g`:
  - Captura `[^"]+` entre `d="` e `"`. Aceita `\n` (newlines em path data são válidos em SVG).
  - O path data capturado é passado para `getLength(d)` do `@remotion/paths` — se o path data for inválido, `getLength` retorna 0 (o path é filtrado por `pathomit`).
  - Renderizado via React JSX `<path d={path.d} />` — escapado.
- `FILL_ATTR_REGEX` valida apenas cores hex, `rgb()`/`rgba()` ou `none`. Se não capturar, usa `DEFAULT_COLOR = '#222222'`.
- `imagetracerjs` é lib madura (1.5k stars, ~1.2k downloads/semana). O `innerHTML` na lib (linha 1029) está em `appendSVGString()` — função **NÃO chamada** pelo nosso código. Usamos apenas `imagedataToSVG()` que retorna string.

### Foco 10 — Visibilidade do cache ✅ Seguro

**Investigação:**
- `clearStrokeCache()` (strokeCache.ts:299) é exportada e chamável por qualquer código. Apenas limpa o cache em memória local. Não afeta outros usuários.
- Cache é por aba/tab (não compartilhado). Um atacante não pode induzir vítima a limpar cache.
- Chamado apenas em cenários de reset legítimos (pelo controller).

---

## O que Parece Saudável

- **Tipagem rigorosa:** Zero `as any`/`as unknown` nos 10+ arquivos auditados. `VetorialPath`, `VetorialAnimation`, `SpeedPaintRenderMode` e `VetorialPreset` são tipos explícitos com discriminated union no cache.
- **Cache discriminado:** A chave SHA-256 inclui `mode` + `preset` — evita colisão entre animações mask e vetorial da mesma imagem (Premissa #10).
- **AbortSignal cooperativo:** Checagens de abort a cada 50 paths no `enrichPaths` e antes/depois de cada etapa pesada.
- **Logger com sanitização:** `sanitizeMessage()`, `sanitizePayload()`, `sanitizeStackTrace()` — JWTs, emails, tokens e caminhos de arquivo redactados antes de ir ao Firestore.
- **Limite de paths (MAX_PATHS_PER_SCENE = 500):** `truncatePaths()` com warning log. Mitiga travamento do Remotion com SVGs complexos.
- **Fallback mask preservado:** `renderMode` default `'mask'` — projetos existentes não quebram.
- **Sem armazenamento de vídeo em Storage/Firestore:** Vídeos exportados ficam apenas em IndexedDB local (desde v0.128.0).
- **BYOK sem billing:** API key do Gemini fica apenas no IndexedDB local, nunca no Firestore. Backend sem chave global.

---

## Limites da Revisão

- **Análise estática apenas.** Não foi executado teste de penetração ou fuzzing.
- `imagetracerjs` (v1.2.6) não foi auditado linha a linha — confiamos na maturidade da lib (1.5k stars, 6+ anos, 0 dependências) + no fato de que usamos apenas `imagedataToSVG()` (que retorna string, não manipula DOM).
- **Cache in-memory não foi testado em cenário de memory pressure.** O limite de 20 entradas é empírico.
- **Não foram executados testes de integração** com imagens maliciosas (SVG polyglot, etc.) — `new Image()` do navegador já faz a sanitização.
- **Worker inline existente** (edge detection) não foi reauditado — apenas a branch vetorial foi adicionada.

---

## Checks Rápidos

| Superfície | Status |
|------------|--------|
| Validação de ImageData no vectorizer | ✅ `isValidImageData` + fonte confiável (Canvas API) |
| Path data injection via React JSX | ✅ Escapado pelo React |
| sanitização de logs no logger | ✅ `sanitizePayload()` + `sanitizeMessage()` + filtro de nível (debug/info não vão ao Firestore) |
| Persistência segura de `renderMode` | ⚠️ Sem validação runtime (ver achado LOW) |
| Cache key com discriminação de modo | ✅ SHA-256 inclui `mode` + `preset` |
| Analytics sem PII | ✅ Apenas `mode: 'mask' | 'vetorial'` (hardcoded no ToggleButton) |
| AbortSignal em `vectorizeImage` | ✅ 3 pontos de checagem + intervalos de 50 paths |
| Limite de paths complexos | ✅ `MAX_PATHS_PER_SCENE = 500` com truncamento e warning |
| Fallback mask preservado | ✅ Branch inalterada em `imageProcessing.ts` |
| Sem `console.log` no código novo | ✅ Confirmado |

---

## Priorização de Correções

1. **[LOW] Validar `renderMode` carregado de UserSettings** — Adicionar guarda runtime em `loadSpeedPaintRenderMode()` para aceitar apenas `'mask'` ou `'vetorial'`. Não bloqueia release, mas é boa prática.

---

## Confirmação Final

### ✅ **Status: Release v0.131.0 seguro**

Nenhuma vulnerabilidade crítica, warning de alto impacto ou superfície explorável foi encontrada. A reauditoria confirma que:

- As 5 fases foram implementadas com segurança consistente
- A tipagem TypeScript rigorosa eliminou conversões inseguras
- O logger sanitiza dados automaticamente
- O cache é local e discriminado por modo
- As analytics não expõem PII
- A renderização SVG via React JSX é segura contra XSS
- O abort signal é respeitado cooperativamente
- O fallback mask permanece intocado

**Gate de Saída Final:**

- [x] Li o contexto mínimo real ou reuni evidência suficiente
- [x] Cada achado passou pela validação anti-falso-positivo
- [x] Cada achado passou pelo confidence gate numérico
- [x] Achados com confidence < 80 foram descartados (1 achado com 85/100 mantido como LOW)
- [x] O relatório está consolidado, priorizado e salvo em `docs/audits/`
- [x] Não há motivo para escalar (risco residual é baixo e documentado)

---

*Relatório gerado pelo agent `security` em 2026-06-14 como parte do Gate de Release F5.5.*
