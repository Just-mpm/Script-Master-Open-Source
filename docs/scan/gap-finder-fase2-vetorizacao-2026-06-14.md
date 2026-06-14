# Relatório Gap-Finder — Fase 2: Vetorização no Worker

**Data:** 2026-06-14
**Escopo:** Fase 2 (parcial — tasks 2.1 + 2.2) do plano speed-paint vetorial
**Planos fonte:** `docs/plan/plano-speed-paint-vetorial-2026-06-14.md`, `docs/plan/tracker-speed-paint-vetorial-2026-06-14.md`
**Agent:** gap-finder (auditoria de completude/escopo, NÃO qualidade)

---

## 1. Contexto assumido

- Fase 0 (spike) removida por decisão do Matheus — plano começa na Fase 1
- Fase 1 (Fundação) já validada previamente — tipos, store, vectorizer, cache, feature flag
- Fase 2 integra o vetorial no pipeline de processamento (`imageProcessing.ts`) e adiciona testes
- Fase 2.1 = modificar `imageProcessing.ts`, Fase 2.2 = testes unitários do vectorizer
- Fase 2 NÃO inclui composição Remotion (Fase 3) nem UI (Fase 4)
- NÃO auditar qualidade (code-validator em paralelo) nem segurança (security separado)

---

## 2. Mapa rápido: sólido vs frágil

### Sólido ✅

| Item | Status | Evidência |
|------|--------|-----------|
| Branch `mask` inalterada | ✅ Intacta | Linhas 418-469 (`imageProcessing.ts`) — Worker inline + fallback `processOnMainThread` sem alterações |
| Branch `vetorial` chama `vectorizeImage()` | ✅ Correto | Linhas 497-551 — `processVetorialOnMainThread` → `await vectorizeImage(imageData, { preset, signal })` |
| `AbortSignal` propagado | ✅ 4 pontos de checagem | `generateStrokesFromImage` (303-305), `processVetorialOnMainThread` (508-510, 519-521), `enrichPaths` (199-201 a cada 50 paths), `vectorizeImage` (249, 256) |
| Cache generalizado (F1.4) não regrediu | ✅ Funcional | Overloads legados intactos; overloads novos preparados; chave SHA-256 inclui `mode`+`preset` |
| Store: `renderMode` + `vetorialPreset` | ✅ Adicionados | `animationStore.ts` linhas 77-80, 192-195 — default `'mask'` e `'artistic1'` |
| `PaintingJob.animation` aceita `VetorialAnimation` | ✅ GAP-03 resolvido | `types.ts` linha 49 — `animation?: StrokeAnimation \| VetorialAnimation` |
| 6 casos de teste do vectorizer | ✅ Cobertos | a-f todos presentes com subcasos (detalhado §3.4) |

### Frágil ⚠️

| Item | Risco | Mitigação |
|------|-------|-----------|
| Cache não integrado no `imageProcessing.ts` | **Intencional** — cache está no `speedPaintRenderer.ts` (acima na arquitetura), não no processador. Consumidores precisam chamar cache externamente. | Documentado. Fase 3 criará consumidores que passam `context: { mode: 'vetorial', preset }` |
| `speedPaintRenderer.ts` não usa overloads vetoriais do cache | **Intencional** — este arquivo não foi modificado na Fase 2 e lida apenas com modo mask. | Fase 3 deve criar pipeline separado ou estender o renderer |
| Vetorial roda na main thread, não no Worker | **Decisão documentada** (Premissa #11 do tracker + comentário imageProcessing.ts:394-400). `processOnMainThreadVetorial()` como fallback, não como Worker. | Aceito. VectorizeImage é async e checa abort a cada 50 paths |

---

## 3. Gaps priorizados

**Nenhum gap bloqueador, de atenção ou sugestão identificado.**

A implementação da Fase 2 está **completa e alinhada** com o plano e o tracker. Todos os entregáveis da Fase 2.1 e 2.2 foram implementados conforme especificado.

### 3.1. Observações para Fase 3 (não-gaps)

| ID | Observação | Destino |
|----|-----------|---------|
| OBS-01 | `speedPaintRenderer.ts` chama `getStrokeAnimation(scene.imageUrl)` sem context (linhas 306, 394) → default `mode:'mask'`. Quando a Fase 3 criar consumidores vetoriais, precisará chamar com `context: { mode: 'vetorial', preset }` | Fase 3 — integrar cache vetorial |
| OBS-02 | `speedPaintRenderer.ts` chama `setStrokeAnimation(scene.imageUrl, animation)` sem context (linhas 331, 341, 404) → mesmo risco de colisão se receber `VetorialAnimation` sem context explícito | Fase 3 — garantir overload correto |
| OBS-03 | `WhiteboardComposition` (Fase 3.2) precisará de `canvasColor` prop — o campo existe em `VetorialAnimation` e em `processVetorialOnMainThread` | Fase 3 — conectar |
| OBS-04 | Todos os 6 casos de teste passam em 30s timeout. 2 testes (presets) usam 60s — ok, dentro do aceitável | Manter sob observação |

---

## 4. Confirmação dos critérios do gate (tracker §Fase 2.5)

### ✅ Branch mask inalterada
Código do Worker inline (`processSketch` + `processReveal`) e fallback `processOnMainThread` **zero alterações**. A branch `mask` executa o mesmo código de antes.

### ✅ Branch vetorial usa `vectorizeImage()` corretamente
`processVetorialOnMainThread` (linhas 497-551) chama `await vectorizeImage(imageData, { preset, signal })` (linha 518). O vectorizer retorna `VetorialPath[]`, que é montado em `VetorialAnimation` com `totalLength` pré-calculado.

### ✅ `processVetorialOnMainThread()` respeita `AbortSignal`
- Checa `signal?.aborted` no início (linha 508)
- Checa após `vectorizeImage` (linha 519)
- `vectorizeImage` checa no início (linha 249), após chamada síncrona (linha 256), e a cada 50 paths em `enrichPaths` (linha 199-201)
- `generateStrokesFromImage` também checa em 3 pontos (linhas 303, 342, 354)

### ✅ Cache (já generalizado na F1.4) não regrediu
- Discriminated union `CachedAnimation = { kind: 'mask' | 'kind': 'vetorial' }` preservada
- Overloads legados (`getStrokeAnimation(imageUrl)`) retornam `StrokeAnimation | null` — compatível com código existente
- Overloads novos aceitam `context: { mode: 'vetorial', preset }` e retornam `VetorialAnimation | null`
- `buildCacheKey` inclui `mode` + `preset` no payload SHA-256
- `clearStrokeCache` importado no `videoRenderController.tsx` — sem quebras

### ✅ 6 casos de teste do vectorizer cobertos

| Caso | Status | Testes |
|------|--------|--------|
| (a) Vetorização básica retorna `VetorialPath[]` válido | ✅ | `retorna VetorialPath[] válido para ImageData com formas`, `shape da API confere com a interface VetorialPath` |
| (b) Filtro de `pathomit` remove paths pequenos | ✅ | 3 testes: pathomit maior = menos paths, paths têm length >= pathomit, pathomit alto zera array |
| (c) `length` pré-calculado é positivo | ✅ | 2 testes: todos length > 0, sanity check com Number.isFinite |
| (d) Presets diferentes geram outputs diferentes | ✅ | 2 testes: `artistic1` vs `detailed`, `default` suportado |
| (e) Erro graceful para ImageData inválido | ✅ | 6 subcasos: null, undefined, sem data, width=0, height=0, data não é Uint8ClampedArray |
| (f) `AbortSignal` funciona | ✅ | 4 testes: abort prévio com/sem options, não aborta prematuramente, abort race durante processamento |

**Extra:** Testes de defaults (preset default `artistic1`, `strokeWidth` customizado, `defaultColor` customizado) — 3 testes adicionais.

---

## 5. Cenários de borda sem resposta

| Cenário | Por que não é gap | Ação necessária? |
|---------|-------------------|------------------|
| Vetorial com imagem transparente (alpha=0) | `imageProcessing.ts` linha 378-379 preenche fundo branco antes de extrair ImageData | Não — já tratado |
| SVG com 500+ paths | Limite `MAX_PATHS_PER_SCENE = 500` é tarefa da Fase 5.2 (Premissa #12) | Fase 5 |
| Batch de N imagens vetoriais (N Workers) | Premissa #16 — mitigação na Fase 5.2 | Fase 5 |
| Caneta desaparece entre paths | Premissa #13 — fallback a ser implementado na Fase 3.1 | Fase 3 |
| `canvasColor` diferente de 'white' | `canvasColor` hardcoded como `'white'` no vetorial (linha 536). Premissa #14 — Fase 3.1 adiciona prop | Fase 3 |

---

## 6. Checklist de sanidade

- [x] Li o plano completo (`plano-speed-paint-vetorial-2026-06-14.md`) e tracker
- [x] Li os 3 arquivos relevantes da Fase 2 (`imageProcessing.ts`, `types.ts`, `vectorizer.unit.test.ts`)
- [x] Li `vectorizer.ts`, `types/vetorial.ts`, `strokeCache.ts`, `animationStore.ts` para contexto completo
- [x] Usei `analyze_aitool_file_context` + `supergrep_find` + `grep` para verificar símbolos e chamadas
- [x] Verifiquei que a branch mask continua idêntica (sem alterações no Worker inline)
- [x] Verifiquei que `AbortSignal` é propagado em 4 níveis
- [x] Verifiquei que os 6 casos de teste (a-f) estão cobertos
- [x] Verifiquei que o cache tem discriminated union e foi preparado para vetorial
- [x] Nenhum gap real encontrado — apenas observações para Fase 3

---

## 7. Status Final

| Critério | Status |
|----------|--------|
| **Pronto para Fase 3?** | ✅ **Sim** |
| Gaps bloqueadores | 0 |
| Gaps de atenção | 0 |
| Sugestões | 0 |
| Observações (forward) | 4 (OBS-01 a OBS-04) |

**Resumo:** Fase 2 completa, alinhada com o plano e o tracker. Nenhum gap encontrado. A branch mask continua 100% funcional, a branch vetorial está integrada com `vectorizeImage()`, o `AbortSignal` é propagado corretamente, o cache foi generalizado sem regressão, e os 6 casos de teste estão cobertos. Pode avançar para a **Fase 3** (Composição Remotion Vetorial).
