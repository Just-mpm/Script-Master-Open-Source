# Auditoria de estado final — v0.135.1 (useVoicePreviews + limites SVG vetorial)

**Data:** 2026-08-04
**Método:** leitura completa dos arquivos-fonte (não diff), adjacentes e testes; busca estrutural (`supergrep_find`) para `new Worker`, `MediaError` e type guards.
**Validações confirmadas pelo orquestrador:** `tsc -b` exit 0 · ESLint 0 erros · 2645/2645 testes passando.

---

## 1. Contexto assumido

- Escopo (a): eliminar falso positivo de `useVoicePreviews` (log de erro espúrio ao limpar/abortar `<audio>` no Chrome). Contrato: silenciar codes `null/0/1` e `4` apenas com `src === ''`; codes `2/3` e `4`-com-src-válido viram `log.error` + `errorId`.
- Escopo (b): proteger a complexidade SVG do pipeline vetorial (limitadores de paths/bytes + regex whitelist sem `\s`) para evitar `Failed to convert SVG to image` no `renderMediaOnWeb`.
- `contourIndex` setado por `fitBezierPaths` e consumido por `sampleColors` após descartes.
- Fallback de module worker → main thread com parâmetros idênticos.
- Discriminação single/batch vetorial exclusivamente por dado (`'paths' in animation`).

---

## 2. Mapa rápido: sólido vs frágil

**Sólido (verificado):**
- Hook: `stop()`/cleanup zeram listeners ANTES de limpar `src`; token incremental invalida callbacks de áudios antigos; unmount replica `stop()` + incrementa token. Condicional `code === 4 && audio.src === ''` correta nos browsers (IDL `src` retorna `''` após `removeAttribute`).
- `applyVetorialSafetyLimits` aplicado nos DOIS pipelines (legado e edge-bezier), em todos os caminhos (worker e main thread) — `vectorizeImage` é o único ponto de saída.
- Regex whitelist `[ \t\r\n]` cobre corretamente o vetor XML 1.0 (qualquer char fora do whitelist é rejeitado; `\x0B`/`\x0C` — ilegais — ficam de fora). Defesa em profundidade: `enrichPaths` + `sanitizePathOrNull`.
- `contourIndex`: `fitBezierPaths` é o único produtor de `BezierPath` no pipeline e seta o índice em todos os caminhos; `sampleColors` usa a mesma lista de contours pós-filtro de compacidade (consistente).
- Fallback do worker: `processVetorialOnMainThread` recebe os 12 parâmetros corretos (imageProcessing.ts:607-620); todos os `new Worker` do projeto têm try/catch no caller (vetorialWorker via try/catch na criação; inline mask via try/catch em imageProcessing.ts:468-475; strokeWorker via try/catch em speedPaintRenderer.ts:385).
- Discriminação por dado consistente: `SpeedPaintPlayer` (type guard `'paths' in`), `ExportableBatchSpeedPaintComposition` e `runSingleRender` usam o mesmo discriminante.
- Testes de token com `delayedRejection` + `act` async **exercitam `isStale()` de verdade** (rejeição ocorre após o incremento do token; microtasks drenadas).

**Frágil (detalhado abaixo):**
- 1 teste de contrato do hook vacuoso (não exercita o handler).
- Batch export vetorial latente sem `fitMode` no `WhiteboardScene`.
- Calibração do limite individual de bytes igual ao acumulado.

---

## 3. Achados

### CRITICAL

Nenhum.

### WARNING

| # | Arquivo | Linhas | Gap | Recomendação |
|---|---------|--------|-----|--------------|
| W-01 | `tests/hooks/useVoicePreviews.unit.test.ts` | 140-165 | **Teste de code 4 com src vazio é vacuoso.** Após `stop()`, o teste substitui o `onerror` real por `audio.onerror = (): void => {}` (no-op) e só então dispara `triggerError(4)`. `reportLoadError` **nunca roda** — o teste passa por vacuidade: remover a condicional `code === 4 && audio.src === ''` do hook não quebraria o teste. A garantia central do escopo (a) fica sem guarda de regressão real. O comentário do teste ("valida a lógica condicional de `reportLoadError`") é falso. | Capturar a referência do handler original antes do `stop()` e invocá-lo após o `stop()` (com `src === ''`), ou restaurar o handler original sobre o áudio já limpo e disparar `triggerError(4)` — assim o caminho `code === 4 && src === ''` é exercitado de fato (asserção em `debugSpy`, não apenas `errorSpy` ausente). |

### SUGGESTION

| # | Arquivo | Linhas | Gap | Recomendação |
|---|---------|--------|-----|--------------|
| S-01 | `src/hooks/useVoicePreviews.ts` | 56-81, 104 | `stop()` **não invalida o token de sessão** — diverge do doc-comment ("interrompidos por `stop`... descartados via `token`"). O caminho `onerror` é coberto por zerar listeners, mas o `play().catch` pendente não é invalidado: se `play()` rejeitar com erro **não**-`AbortError` após um `stop()` explícito isolado (ex: `NotAllowedError` tardio), loga `warn` de autoplay espúrio e `setPlayingId(null)` — falso positivo do mesmo tipo que o escopo (a) eliminou (em nível warn). Impacto real baixo (browsers rejeitam com `AbortError` após `pause()`), mas a divergência doc↔código é objetiva. | Incrementar `sessionTokenRef.current` no início de `stop()` (idempotente com o incremento posterior de `playPreview`). |
| S-02 | `src/features/speed-paint/lib/vectorizer.ts` | 1181-1187 | Limite individual de bytes é **igual ao acumulado** (250KB). Um único path de ~249KB passa pelo filtro e ainda gera data URI base64 de ~330KB+ — faixa que historicamente causou `Failed to convert SVG to image`. O invariante "nenhum path individual estoura" é verdadeiro, mas o threshold individual deveria ser muito menor que o acumulado para ter valor prático. | Calibrar empiricamente (sugestão inicial: `MAX_D_BYTES_PER_PATH ≈ 50_000`) e adicionar teste com path único na faixa 100-200KB. |
| S-03 | `src/features/speed-paint/lib/vectorizer.ts:1046` + `imageProcessing.ts:732` + `vetorialWorker.ts:111` | — | `filterPathsByBackgroundContrast` é aplicado **duas vezes** no pipeline edge-bezier (dentro de `vectorizeImageEdgeBezier` e novamente no worker/main-thread). Idempotente (sem bug funcional), mas O(n) redundante e com divergência futura: main-thread hardcoda `'white'` enquanto o worker usa `msg.canvasColor`. | Remover a aplicação externa (a interna já cobre) ou documentar que a externa é o único ponto canônico e remover a interna. |
| S-04 | `src/features/speed-paint/store/speedPaintRenderController.tsx` 182-262 + `WhiteboardScene.tsx` 138-170 | — | **Batch export vetorial é caminho latente** (a UI `SpeedPaintPage.startBatchRender` nunca passa `renderMode: 'vetorial'` — confirmado nas linhas 325-334 da página) e, se ativado, `WhiteboardScene` não tem `fitMode`/tratamento de aspect ratio (o `<svg>` usa `width/height` nativos da cena): cenas com proporções diferentes da primeira (que define a resolução da composição) seriam cortadas/deslocadas — enquanto o mask usa `fitMode="contain"` (controller:210). | Documentar a limitação no `SpeedPaintBatchExportOptions.renderMode` (ou implementar `fitMode` no `WhiteboardScene` quando o caminho for exposto na UI). |
| S-05 | `src/features/speed-paint/lib/imageProcessing.ts` 384-413 | — | O bloco do `img.onload` (canvas, `getContext('2d')`, `drawImage`, `toDataURL`, `getImageData`) **não está em try/catch**. Exceção rara (ex: `getContext` retorna null) vira unhandled rejection — a Promise externa nunca settle e o job fica travado em `'processing'` no `BatchOrchestrator` (sem log, sem timeout). | Envolver o bloco em try/catch com `rejectOnce(new Error(...))` — mesmo padrão já usado para `img.decode()`. |
| S-06 | `src/features/speed-paint/lib/vectorizer.ts` 1092-1112 | — | `sanitizePathOrNull` não valida `color` — um path com `color: undefined` (callers manuais) passa e o `stroke={undefined}` vira preto default no SVG. Inofensivo hoje, mas o "sanitizer" deveria garantir o invariante completo de `VetorialPath`. | Normalizar `color` para `DEFAULT_COLOR` quando não for string não-vazia. |
| S-07 | `src/features/speed-paint/lib/vectorizer.ts` 304, 310-345 | — | `PATH_POINT_REGEX` (`\d+\.?\d*`) não captura coordenadas **negativas** (`-5.5`) nem fracionárias iniciando em ponto (`.5`). Handles Bézier negativos (possíveis em curvas próximas à borda 0) fazem `getMinY` retornar 0 e `distFromCenter` `Infinity` — ordenação `top-down`/`center-out` degrada silenciosamente para esses paths. Não quebra, mas é fragilidade de parsing. | Usar regex numérica genérica (ex: `[-+]?\d*\.?\d+(?:e[-+]?\d+)?`) — segura porque o `d` já passou pela whitelist. |

---

## 4. Cenários de borda sem resposta (verificação concluída)

1. **Code 4 em todos os browsers?** ✅ IDL `audio.src` retorna `''` após `removeAttribute('src')` em Chrome/Firefox/Safari; listeners zerados antes do cleanup eliminam o caminho mais comum do falso positivo.
2. **Fallback do worker exercitado?** ✅ try/catch na construção + `worker.onerror` cobrem falha síncrona e assíncrona do module worker; parâmetros idênticos entre worker e main-thread (confirmado por leitura das duas assinaturas).
3. **`contourIndex` em todos os caminhos?** ✅ único produtor (`fitBezierPaths`) seta em todos os paths aceitos; fallback posicional cobre callers manuais.
4. **Outros `new Worker` sem try/catch?** ✅ Nenhum — os 3 caminhos (vetorial, inline mask, strokeWorker) têm try/catch no caller ou no construtor. **Nenhum outro uso de `MediaError`** no projeto (grep confirmou apenas `useVoicePreviews.ts`).
5. **Testes code 4 exercitam caminhos diferentes?** Parcial — o de src válido sim; o de src vazio **não** (W-01).
6. **Testes `isStale()`?** ✅ exercitam de verdade (rejeição controlada externamente após troca de voz + draining de microtasks).

---

## 5. Checklist de sanidade

- [x] Li os 7 arquivos-fonte da verdade por completo (sem diff).
- [x] Li os adjacentes influentes: `vetorialWorker.ts`, `SpeedPaintScene.tsx`, `WhiteboardScene.tsx`, `BatchOrchestrator.tsx`, `useSpeedPaintExporter.tsx`, `strokeWorker.ts`, `speedPaintRenderer.ts`, `SpeedPaintPlayer.tsx`.
- [x] `supergrep_find`/`grep` confirmaram ausência/presença: `new Worker` (3 locais, todos com try/catch no caller), `MediaError` (só no hook), `'paths' in` (3 locais consistentes).
- [x] Verifiquei handling no parent: cleanup/unmount do hook, settle-guards (`resolveOnce`/`rejectOnce`), ErrorBoundary/`worker.onerror`.
- [x] Nenhum achado depende de mudança recente; todos são propriedades do estado atual do código.
- [x] Observação (pré-existente, fora do escopo, sem ação): `URL.revokeObjectURL(url)` imediato após `new Worker(blobUrl)` em `imageProcessing.ts:278` e `strokeWorker.ts:400` — race teórico em Safari antigo; padrão já em produção há múltiplas versões sem incidente.

---

## 6. RESUMO EXECUTIVO

1. **Escopo coberto:** ambos os objetivos originais estão implementados e corretos no código de produção — hook silencia corretamente os códigos esperados (incluindo code 4 condicional), limites SVG (500 paths / 250KB + whitelist sem `\s`) aplicados nos dois pipelines em todos os caminhos, `contourIndex` setado em todos os produtores, fallback de worker íntegro e discriminação por dado consistente em single/batch/player.
2. **Bloqueios:** **nenhum CRITICAL**; **1 WARNING** (W-01 — teste de code-4-src-vazio vacuoso, que deixa o contrato central do escopo (a) sem guarda de regressão real). W-01 não bloqueia o produto, mas deveria ser corrigido antes de considerar a correção do falso positivo "fechada" do ponto de vista de testes.
3. **Recomendação de fechamento:** fechar a auditoria como **APROVADA com 1 pendência de teste** (W-01): corrigir o teste para exercitar `reportLoadError` com src vazio (capturar o handler original antes do `stop()`). As SUGGESTIONs (S-01 a S-07) são melhorias opcionais — priorizar S-02 (calibração do limite individual) e S-05 (try/catch no `img.onload`) por serem defesas baratas contra travamento/regressão.
