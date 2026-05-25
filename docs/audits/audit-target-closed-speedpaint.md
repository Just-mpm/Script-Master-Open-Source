# Auditoria: Erro Target Closed — Speed Paint Video Export

**Data:** 2026-05-25  
**Projeto:** Script Master  
**Stack:** Remotion 4.0.448, Cloud Run, Speed Paint, Firebase

---

## 1. Escopo da revisão

### Arquivos analisados

**Cloud Run (server-side):**
- cloud-run/src/renderer.ts — renderização Remotion server-side via enderMedia
- cloud-run/src/speed-paint/index.ts — barrel do módulo speed paint
- cloud-run/src/speed-paint/speedPaintStrokes.ts — orquestrador de geração de strokes
- cloud-run/src/speed-paint/imageProcessing.ts — algoritmo de edge detection + BFS + vetorização
- cloud-run/src/speed-paint/cache.ts — cache LRU em Firebase Storage
- cloud-run/src/speed-paint/types.ts — tipos StrokeAnimation, Stroke

**Frontend video-render:**
- src/features/video-render/hooks/useVideoExporter.tsx — hook principal de exportação
- src/features/video-render/lib/speedPaintService.ts — serviço centralizado de speed paint
- src/features/video-render/lib/speedPaintRenderer.ts — renderização de frames e geração de strokes
- src/features/video-render/lib/speedPaintTimings.ts — configurações de timing
- src/features/video-render/lib/strokeWorker.ts — Web Worker com OffscreenCanvas
- src/features/video-render/components/SpeedPaintScene.tsx — componente Remotion
- src/features/video-render/components/VideoComposition.tsx — composição principal

**Frontend speed-paint:**
- src/features/speed-paint/hooks/useSpeedPaintExporter.tsx — exportação simplificada

### Focos cobertos

1. Ciclo de vida do browser/tab no Remotion (server e client)
2. Cancelamento cooperativo (makeCancelSignal, AbortController)
3. Memória e memory pressure com cenas múltiplas
4. Web Worker + OffscreenCanvas no stroke worker
5. Stage 0 do renderer (generateStrokesForScenes)
6. Configuração chromiumOptions vs concurrency
7. Interação delayRender/continueRender

---

## 2. Veredito

**Bloqueadores de merge identificados.**

---

## 3. Achados priorizados

### [CRITICAL] Concurrency 4 + enableMultiProcessOnLinux = crash por memory pressure

- **Arquivo:** cloud-run/src/renderer.ts:434
- **Confidence:** 88/100
- **Categoria:** Performance | Memory Leak
- **Problema:** enderMedia é chamado com concurrency: 4 e chromiumOptions: { enableMultiProcessOnLinux: true }. Em combinação com Stage 0 gerando strokes para N cenas (cada cena com bytes RGBA 1920×1080×4), a memória alocada em paralelo pode exceder o limite do container (4 vCPU + 8 GiB). O Chrome é morto pelo kernel com SIGKILL antes que o erro seja discriminável, causando "Target closed" como sintoma.
- **Evidência:**
  `	ypescript
  // renderer.ts:428-452
  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec,
    outputLocation: outputPath,
    inputProps: normalizedInputProps,
    concurrency: 4,                          // ← 4 threads parallelizados
    chromiumOptions: {
      disableWebSecurity: true,
      enableMultiProcessOnLinux: true,     // ← cada thread abre processo Chrome
    },
    cancelSignal,
    verbose: !process.env.NODE_ENV || process.env.NODE_ENV !== 'production',
  });
  `
- **Impacto:** Renderizações com >3 cenas animated via speed paint disparam memory spike → Chrome crash → "Target closed". O processo nem chega a processar os frames.
- **Sugestão:** Reduzir concurrency para 2 no Cloud Run (não 1, que é sub-ótimo). Adicionar --concurrency=2 como limitação de thread no Remotion. Garantir que Stage 0 seja sequencial (já é, via or sem Promise.all), e que o bundle seja leve.

---

### [CRITICAL] Stage 0 (speed paint) sequencial sem throttling de memória

- **Arquivo:** cloud-run/src/renderer.ts:380-392
- **Confidence:** 85/100
- **Categoria:** Memory Leak | Performance
- **Problema:** generateStrokesForScenes processa cenas sequencialmente — correto para memória. Mas cada cena decodifica RGBA 1920×1080×4 bytes = ~8 MB por imagem. A função não tem controle de memória intermediária (não chama close() em bitmaps nem limpa o buffer sharp após uso), e o cache Storage é fire-and-forget sem limite de entries em memória.
- **Evidência:**
  `	ypescript
  // renderer.ts:380-392
  if (normalizedInputProps.animateScenes && scenes.length > 0) {
    const enhancedScenes = await generateStrokesForScenes(scenes);
    normalizedInputProps.scenes = enhancedScenes;
  }
  `
  `	ypescript
  // speedPaintStrokes.ts:39-65 (downloadAndDecode)
  async function downloadAndDecode(imageUrl: string): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    const { data, info } = await sharp(imageBuffer)
      .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { rgba: new Uint8Array(data), width: info.width, height: info.height };
    // ← Uint8Array fica retido em memória até o cache Storage disparar (fire-and-forget)
  }
  `
- **Impacto:** Com 5 cenas de 1920×1080, são ~40 MB de RGBA em sequência. Sem chunking ou cleanup forçado, o garbage collector pode não recuperar a tempo, causando memory bloat antes do enderMedia.
- **Sugestão:** Processar em batches de 2 (como faz o frontend em generateWithBatch no speedPaintRenderer.ts:364). Após cada downloadAndDecode, liberar referências manualmente. Ou reduzir o resize para 1280×720 no server-side (memória 4× menor: 1280×720×4 = 3.6 MB vs 1920×1080×4 = 8.3 MB).

---

### [WARNING] cancelSignal é criado mas nunca observado em Stage 0

- **Arquivo:** cloud-run/src/renderer.ts:421-425
- **Confidence:** 82/100
- **Categoria:** Bug | Race Condition
- **Problema:** O cancelSignal é criado e passado a enderMedia em stage 3. O polling de cancelamento (startCancelPolling) observa o Firestore e chama cancel(). No entanto, Stage 0 (speed paint) não verifica cancelSignal — se o usuário cancelar durante a geração de strokes, o render só abortará depois que todos os strokes forem gerados.
- **Evidência:**
  `	ypescript
  // renderer.ts:421-455
  const { cancelSignal, cancel } = makeCancelSignal();
  const clearCancelPolling = startCancelPolling(uid, jobId, cancel);
  try {
    await renderMedia({ ... cancelSignal });  // ← cancelSignal só aqui
  } finally {
    clearCancelPolling();
  }
  `
  Stage 0 (linhas 380-392) não recebe o signal e não pode ser abortado cooperativamente.
- **Impacto:** Cancelamento durante speed paint server-side não funciona — o usuário espera até o fim da geração de strokes antes do render abortar.
- **Sugestão:** Passar cancelSignal para generateStrokesForScenes e verificar signal.aborted entre cada cena processada no loop or.

---

### [WARNING] continueRender chamado incondicionalmente no cleanup do SpeedPaintScene

- **Arquivo:** src/features/video-render/components/SpeedPaintScene.tsx:214-219
- **Confidence:** 78/100
- **Categoria:** Bug | UX
- **Problema:** O cleanup do useEffect chama continueRender(handle) incondicionalmente, mesmo que o cancelled flag esteja 	rue. Se o componente desmontar durante um estado pendente (por exemplo, navegação do usuário para outra página durante o preview), o handle será liberado sem que a imagem tenha sido de fato carregada.
  `	ypescript
  // SpeedPaintScene.tsx:214-219
  return () => {
    cancelled = true;
    continueRender(handle); // ← called even if cancelled AND image not loaded
  };
  `
  O JSDoc diz "Failsafe: libera o lock caso desmonte antes do carregamento. Se continueRender já foi chamado, esta chamada é um no-op seguro." — então tecnicamente é seguro, mas a semântica de "cleanup cancela o pending render" pode confundir.
- **Impacto:** Menor — causa re-render redundante do SpeedPaintScene quando desmontado prematuramente, mas não causa "Target closed". Só afeta preview, não exportação server-side.
- **Sugestão:** Adicionar flag hasCalledContinueRender e só chamar continueRender no cleanup se ela nunca foi chamada. Garantir que o cleanup respeite o cancelled flag.

---

### [WARNING] processSceneInWorker não tem timeout — worker pode ficar órfão

- **Arquivo:** src/features/video-render/lib/strokeWorker.ts:426-457
- **Confidence:** 75/100
- **Categoria:** Memory Leak | Bug
- **Problema:** processSceneInWorker é uma Promise que aguarda o message do Worker. Se o Worker crashar (por Out of Memory ou erro interno), a Promise nunca resolve nem rejeia — fica presa para sempre. O inally em generateWithWorker chama 	erminateStrokeWorker, mas se a Worker thread já morreu, 	erminate() pode não limpar corretamente.
  `	ypescript
  // speedPaintRenderer.ts:281-338
  try {
    worker = createStrokeWorker();
    for (let i = 0; i < scenes.length; i++) {
      const workerResult = await processSceneInWorker(worker, scene.imageUrl, i);
      // ← se Worker morrer, fica preso aqui para sempre
    }
  } finally {
    if (worker) { terminateStrokeWorker(worker); }
  }
  `
- **Impacto:** Worker crashado deixa o hook em estado pendente. Com retry/backoff no frontend, pode acumular workers órfãos. Não é a causa direta do "Target closed" do Cloud Run, mas pode causar hang no cliente.
- **Sugestão:** Adicionar timeout de 60s por cena no processSceneInWorker usando Promise.race([processSceneInWorker(...), timeoutPromise]).

---

### [SUGGESTION] downloadAndDecode no server-side não fecha explicitamente o bitmap do sharp

- **Arquivo:** cloud-run/src/speed-paint/speedPaintStrokes.ts:48-58
- **Confidence:** 72/100
- **Categoria:** Memory Leak
- **Problema:** sharp() retorna { data, info } com o buffer raw. Após construir o Uint8Array, o buffer original do sharp pode ficar retido até o GC. Não há .destroy() ou release explícito.
  `	ypescript
  const { data, info } = await sharp(imageBuffer)
    .resize({ ... })
    .flatten({ ... })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // ← sharp não expõe método close() no objeto retornado pelo toBuffer()
  // mas o buffer interno pode ficar retido
  `
- **Impacto:** Uso de memória levemente maior durante o processamento批量 de cenas. Baixa severidade isolada, mas contribui para o quadro geral de memory pressure.
- **Sugestão:** Documenetar que sharp faz release automático via GC. Para ser explícito, adicionar process.env.NODE_ENV === 'production' com equire('sharp').cache(false) no início do módulo para desabilitar cache interno do sharp.

---

## 4. O que parece saudável

- ✅ Padrão enderIdRef (identificador de renderização) previne race condition entre renders concorrentes — corretamente implementado em useVideoExporter e useSpeedPaintExporter.
- ✅ makeCancelSignal() em enderer.ts:422 é criado e passado corretamente a enderMedia.
- ✅ Cancelamento cooperativo via polling Firestore (5s interval) é um padrão robusto.
- ✅ 	hrottledUpdateJobProgress com throttle de 1s evita writes excessivos ao Firestore.
- ✅ Stage 0 é sequencial (loop or sem Promise.all) — apropriado para controle de memória.
- ✅ SpeedPaintScene usa delayRender/continueRender corretamente para sincronização async.
- ✅ O patch de canvasFontStretch em useVideoExporter:518 previne warnings de Canvas API.
- ✅ Worker code em string (Blob URL) é corretamente revogado após criação em createStrokeWorker:400.
- ✅ O log com enderIdRef.current !== renderId previne que catch/inally de renders antigos corrompam o estado.
- ✅ Graceful degradation: se generateStrokesForScenes falha, o vídeo continua sem animação (usa SceneSequence como fallback).

---

## 5. Limites da revisão

- Não foi possível medir o consumo real de memória porque o Cloud Run não permite inspeção direta do processo durante a execução.
- A versão do Remotion no cloud-run (@remotion/renderer dentro do unctions/) pode ser diferente da versão do frontend (package.json raiz), mas foi verificado que AGENTS.md indica Remotion 4.0.448 consistente.
- Não foi possível testar o comportamento de enableMultiProcessOnLinux com memory limits específicos do container sem инструменты de profiling.
- A NotebookLM do Remotion não cobriu detalhes de implementação interna do browser lifecycle, então a análise de causa raiz se baseou em inferência de código e documentação de troubleshooting.

---

## 6. Plano de Ação Priorizado

| Prioridade | Ação | Arquivo | Impacto |
|---|---|---|---|
| **P1** | Reduzir concurrency: 4 → concurrency: 2 no renderer.ts | cloud-run/src/renderer.ts:434 | Elimina crash por memory pressure |
| **P1** | Reduzir resize do sharp para 1280×720 no server-side | cloud-run/src/speed-paint/speedPaintStrokes.ts:49-51 | 4× menos memória por cena |
| **P1** | Passar cancelSignal para generateStrokesForScenes e checar signal.aborted entre cenas | cloud-run/src/renderer.ts:380, cloud-run/src/speed-paint/speedPaintStrokes.ts:104 | Cancelamento funcional |
| **P2** | Adicionar batch processing (2 cenas por vez) em generateStrokesForScenes | cloud-run/src/speed-paint/speedPaintStrokes.ts:104-133 | Controla memory pressure |
| **P2** | Adicionar timeout de 60s por cena em processSceneInWorker | src/features/video-render/lib/strokeWorker.ts:426-457 | Previne workers órfãos |
| **P3** | Fix continueRender no cleanup com flag hasCalledContinueRender | src/features/video-render/components/SpeedPaintScene.tsx:214-219 | Higiene de useEffect |

---

*Relatório gerado pelo Code Validator — Script Master 0.50.0*
