# Auditoria de Estado Final — v0.135.2 (Follow-ups F1–F14)

- **Data:** 2026-08-04
- **Escopo:** 14 arquivos lidos por completo (não foi revisado o diff; leitura do estado final + código adjacente necessário)
- **Quality gate informado:** 2649/2649 tests, `tsc -b` exit 0, eslint 0 errors
- **Veredito:** **Ajustes recomendados** — 4 achados de severidade média (2 com trigger raro/condicional), 3 sugestões. Nenhum bloqueador absoluto de merge, mas 2 achados (F3 preview, F2 edge-bezier) indicam follow-ups incompletos que merecem correção antes do fechamento.

---

## Achados priorizados

### [WARNING] F3 incompleto: easing do seletor não chega ao preview do player (só ao export)

- **Arquivo:** `src/features/speed-paint/components/SpeedPaintPlayer.tsx:131-135` (adjacente) / `src/features/speed-paint/components/WhiteboardComposition.tsx:37`
- **Confidence:** 96/100
- **Categoria:** Bug
- **Problema:** O `VetorialPlayer` monta `inputProps` sem `easing`, e o `SpeedPaintPlayer`/`SpeedPaintPage` não leem o easing da store para o preview. O export single (SpeedPaintExportPanel → controller) e o batch (SpeedPaintPage → controller) propagam o easing (F3), mas o **preview** sempre recebe `undefined` → `getRemotionEasing(undefined)` → `Easing.inOut(Easing.ease)` fixo.
- **Evidência:**
  ```tsx
  // SpeedPaintPlayer.tsx — VetorialPlayer
  const inputProps: WhiteboardCompositionProps = { animation, showDrawTool, isLastScene }; // sem easing
  ```
  Enquanto `SpeedPaintExportPanel.tsx:149` e `SpeedPaintPage.tsx:360` passam `easing: storeEasing`. O único consumidor real de `WhiteboardComposition` é o player (grep confirma), então a prop `easing` documentada como "F3: o seletor finalmente propaga para o render" está morta no preview.
- **Impacto:** Usuário escolhe "Linear"/"Bounce" → o vídeo exportado usa a curva escolhida, mas o preview (o que ele vê enquanto trabalha) continua `smooth`. É exatamente a classe de divergência preview ≠ export que esta rodada de auditoria visava eliminar (mesmo padrão do W-B da rodada 6).
- **Sugestão:** Propagar `easing` da store: `SpeedPaintPage` → prop `easing` em `SpeedPaintPlayer` → `VetorialPlayer` → `inputProps.easing`.

### [WARNING] F2 parcial: filtro de contraste interno do pipeline edge+bezier ainda hardcoda `'white'`

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:1059`
- **Confidence:** 92/100
- **Categoria:** Bug (inconsistência de implementação)
- **Problema:** O F2 propagou `canvasColor` nos filtros externos (`imageProcessing.ts:794`, `vetorialWorker.ts:111`) mas o filtro **dentro** de `vectorizeImageEdgeBezier` permanece `filterPathsByBackgroundContrast(enriched, 'white')`. Com `canvasColor: 'black'`, o filtro interno remove paths **claros** (distância < 30 de branco) — exatamente os paths mais visíveis no fundo preto — antes que o filtro externo com `'black'` rode. O resultado é dupla filtragem com cores conflitantes.
- **Evidência:**
  ```ts
  // vectorizer.ts:1059 (dentro de vectorizeImageEdgeBezier)
  const visible = filterPathsByBackgroundContrast(enriched, 'white');
  // imageProcessing.ts:794 e vetorialWorker.ts:111 re-filtram com canvasColor do usuário
  ```
- **Impacto:** Fundo preto + presets `edge-*` → traços claros somem e a caneta percorre paths sem traço visível (o "ghost pen" que o filtro foi criado para eliminar, agora causado por ele). No worker e na main thread, o caminho duplo roda; para `'white'` é redundante mas inofensivo.
- **Sugestão:** Remover o filtro interno (o filtro externo com `canvasColor` já cobre os dois consumidores) ou aceitar `canvasColor` em `VectorizeOptions` e passá-lo aqui.

### [WARNING] `processSceneInWorker`: timeout termina o worker compartilhado — cenas seguintes do mesmo lote ficam sem processamento

- **Arquivo:** `src/features/video-render/lib/strokeWorker.ts:452-494` + `speedPaintRenderer.ts:407` (adjacente)
- **Confidence:** 85/100
- **Categoria:** Bug (robustez / fallback quebrado)
- **Problema:** No timeout de 60s, `terminateStrokeWorker(worker)` mata o worker **compartilhado** pelo loop. A cena atual cai no fallback main-thread (correto), mas as cenas seguintes chamam `processSceneInWorker` no worker morto: `postMessage` em worker terminado lança (rejeição da Promise → aborte do lote inteiro, pois o `try` de `generateWithWorker` só tem `finally`) ou, no melhor caso, o handler nunca responde e cada cena restante espera mais 60s de timeout. O contrato documentado ("worker falhou → fallback main thread") só vale para a cena do timeout.
- **Evidência:**
  ```ts
  const timeoutId = setTimeout(() => {
    timedOut = true;
    terminateStrokeWorker(worker); // mata o worker do loop inteiro
    resolve(null);
  }, TIMEOUT_MS);
  ```
- **Impacto:** Imagem grande/lenta (>60s) em lote multi-cena → stall de 60s por cena restante ou aborto do lote, sem fallback por cena.
- **Sugestão:** Não terminar o worker no timeout; sinalizar falha e deixar o caller decidir (ou recriar o worker no caller após timeout). Alternativa: `postMessage` envolto em try/catch com `resolve(null)`.

### [WARNING] BatchOrchestrator: cleanup aborta processamento em qualquer mudança de deps e o re-run com mesmo id não reinicia (travamento em dev/StrictMode)

- **Arquivo:** `src/features/speed-paint/components/batch/BatchOrchestrator.tsx:53-187`
- **Confidence:** 80/100 (rebaixado pelo gate estrutural: depende de comportamento do React 19 — StrictMode — e o notebook dedicado não pôde ser consultado nesta sessão; rebaixado de WARNING → SUGGESTION conforme regra, mas mantido por impacto real em dev)
- **Categoria:** Race Condition
- **Problema:** O cleanup do efeito de pipeline aborta `abortControllerRef.current` incondicionalmente, e no re-run a guarda `currentImageIdRef.current !== currentImgId` pula o restart quando o id não mudou. Com `StrictMode` ativo (`main.tsx:63`), montar a página com `batchMode === 'watch'` já ativo (ex.: voltar de navegação no meio do watch, ou HMR) dispara: run 1 inicia o processamento → cleanup aborta → run 2 vê mesmo id → skip. O job fica eternamente em `'processing'` (o `.catch` retorna em `signal.aborted`), e a UI de "Gerando..." não oferece recovery.
- **Evidência:**
  ```ts
  return () => { abortControllerRef.current?.abort(); ... }; // cleanup
  // re-run:
  if (currentImageIdRef.current !== currentImgId) { /* só processa aqui */ }
  ```
- **Impacto:** Dev-only hoje (produção sem StrictMode e as deps que mudam durante o processamento não são alteráveis pela UI no meio da janela de processamento). Latente para produção se qualquer dep mudar mid-flight (ex.: futura UI de troca de cor durante o watch).
- **Sugestão:** No re-run com mesmo id, verificar se o processamento anterior foi abortado e reiniciar; ou remover deps que não afetam o item atual do array de deps (ex.: ler `canvasColor` via `getState()` como já é feito para `renderMode`).

---

## Sugestões

### [SUGGESTION] `getRemotionEasing` aloca closures a cada frame de render

- **Arquivo:** `src/features/video-render/lib/easingConverter.ts:39-49` (consumido em `WhiteboardComposition.tsx:73` e `speedPaintRenderController.tsx:283`)
- **Confidence:** 85/100
- **Categoria:** Performance
- **Justificativa:** `Easing.out(Easing.bounce)` e `Easing.inOut(Easing.ease)` criam funções novas a cada chamada; em composição Remotion o render roda por frame (30–60×/s). A alocação é minúscula e o impacto é desprezível em absoluto, mas a função é pura e determinística — hoisting para constantes de módulo (`const EASING_LINEAR = Easing.linear` etc.) elimina a alocação sem custo e mantém o contrato.

### [SUGGESTION] `safeGetPointAtLength` loga `error` por frame — amplificação de escrita no errorLogs

- **Arquivo:** `src/features/video-render/components/WhiteboardScene.tsx:85-96`
- **Confidence:** 80/100
- **Categoria:** Performance (telemetria)
- **Justificativa:** Se um path malformado escapar da validação (`SVG_PATH_DATA_REGEX` em `vectorizer.ts`), `getPointAtLength` lança **em todo frame** → `log.error` por frame (300+ por export de 10s). Em produção, `warn/error/fatal` vão ao Firestore `errorLogs`. O logger tem batch processor, mas 300+ eventos por export é ruído evitável. Sugestão: logar uma vez por animação (flag por `animation.id`) ou usar `log.warn` throttled.

### [SUGGESTION] Pipeline mask triplicado (3 cópias divergentes do mesmo algoritmo)

- **Arquivo:** `src/features/video-render/lib/strokeWorker.ts:70-371` vs `src/features/speed-paint/lib/imageProcessing.ts:26-274` vs `imageProcessing.ts:833-1106`
- **Confidence:** 82/100
- **Categoria:** Architecture (DRY)
- **Justificativa:** O comentário em `strokeWorker.ts:8` afirma "lógica idêntica à de imageProcessing.ts (linhas 42-285)", mas as cópias já divergem: o worker de `imageProcessing` recebe `ImageData` por postMessage, o de `strokeWorker` faz fetch da URL + resize + `bitmap.close()`; `processOnMainThread` tem checagens de abort que os workers não têm. Divergência é o risco exato que DRY mitiga (ex.: o próximo fix de algoritmo precisará ser aplicado 3×). É uma decisão documentada (worker sem DOM), então fica como sugestão de mitigação: extrair o corpo do algoritmo para um arquivo compartilhado em string/`shared worker` ou adicionar teste de paridade entre as saídas.

---

## O que parece saudável

- **`useVoicePreviews.ts`:** token de sessão + cleanup de unmount completo (pause, listeners zerados, `removeAttribute('src')` + `load()` em try/catch), discriminação correta de `MediaError` codes, sem setState pós-unmount. Referência de qualidade.
- **`strokeCache.ts`:** overloads com discriminated union e type guards reais (`isVetorialAnimation`/`isStrokeAnimation`) sem `as`; chave inclui `mode + preset + sortOrder + canvasColor`; eviction LRU correto; `TypeError` propagado (erro de caller) vs. `warn` para falha de runtime.
- **`easingConverter.ts`:** boundary limpo (store Zustand puro nunca importa Remotion); doc-comment honesto sobre o F3.
- **Controller (`speedPaintRenderController.tsx`):** F1 correto (preserva codec/container no reset/init sem `...INITIAL_STATE` cego); F14 correto (status `failed` com mensagem em vez de retorno silencioso); `currentRenderId` guarda renders obsoletos inclusive revogando blob URL; throttle de progresso via `lastReportedPercentRef`.
- **Race protection em `reprocessCurrentImage`/`BatchOrchestrator`:** leitura via `getState()` para evitar closure stale, `processingIdRef` checado antes de cada setState, abort cooperativo com `signal`.
- **`WhiteboardScene.tsx`:** determinismo (sem `Math.random`, sem efeitos colaterais no render), `useId` para `pencil-fx` (F7 correto), easing default consistente entre store/composição/export, motion blur condicional por velocidade.
- **F5:** badge de modo misto no `QueueStaging` + export uniforme via store global, com tooltip explicando a decisão.
- **Tipagem geral:** nenhum `any` novo; casts restantes são documentados e justificados (`as StrokeAnimation` no mask com guard runtime `'paths' in animation`; `as 'h264'|...` com valores vindos de `useCodecSupport`).

---

## Limites da revisão

- **NotebookLM indisponível nesta sessão** (tools `nlm_list`/`nlm_query` não expostas no ambiente). Achados dependentes de comportamento de framework (StrictMode/React) tiveram confiança rebaixada conforme o gate estrutural. Comportamentos de Web Worker (`postMessage` pós-terminate) não têm notebook dedicado na lista.
- `speedPaintRenderer.ts` e `SpeedPaintPlayer.tsx` foram lidos apenas nas seções necessárias à avaliação dos arquivos do escopo (worker, easing preview), não por completo.
- Não foi executado lint/typecheck/build/testes (proibido pelo protocolo); os gates informados foram aceitos.
- Não foi possível afirmar por leitura estática a frequência real de timeouts de 60s por cena (achado 3) nem o comportamento exato do browser em `postMessage` de worker terminado.
- `vetorialWorker.ts`, `SpeedPaintScene.tsx`, `speedPaintRenderer.ts` e `animationStore.ts` foram lidos como adjacência (grep/parcial), não integralmente.
