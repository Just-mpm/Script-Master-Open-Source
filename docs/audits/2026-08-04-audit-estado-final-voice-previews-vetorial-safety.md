# Auditoria de Estado Final — useVoicePreviews + Segurança SVG do Pipeline Vetorial

- **Data:** 2026-08-04
- **Auditor:** Code Validator (auditoria estática de estado final — sem diff, sem foco em mudanças recentes)
- **Escopo original:** (a) falso positivo `Preview para Aoede/Zephyr não encontrado` no Android; (b) proteção da complexidade SVG do pipeline vetorial após `Failed to convert SVG to image` no `videoRenderController`.

---

## 1. Escopo da revisão

**Arquivos lidos por completo (fonte da verdade):**
- `src/hooks/useVoicePreviews.ts` (151 linhas)
- `src/features/speed-paint/lib/vectorizer.ts` (1310 linhas)
- `src/features/speed-paint/lib/bezierFitting.ts` (601 linhas)
- `src/features/speed-paint/lib/imageProcessing.ts` (1044 linhas)
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (1093 linhas)
- `tests/hooks/useVoicePreviews.unit.test.ts` (385 linhas)
- `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` (307 linhas)
- `tests/speed-paint/bezierFitting.unit.test.ts` (727 linhas)
- `tests/speed-paint/imageProcessing.vetorial.e2e.test.ts` (700 linhas)

**Adjacentes lidos:**
- `src/features/speed-paint/lib/vetorialWorker.ts` (138 linhas)
- `src/features/speed-paint/types/vetorial.ts` (122 linhas)
- `src/features/speed-paint/types.ts` (76 linhas)
- `src/features/speed-paint/constants/vetorialPresets.ts` (151 linhas)
- `src/features/video-render/components/WhiteboardScene.tsx` (622 linhas)
- `src/features/video-render/components/SpeedPaintScene.tsx` (parcial — 260/473 linhas, suficiente p/ contexto do controller)
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (329 linhas)
- `src/features/video-render/lib/speedPaintTimings.ts` (56 linhas)
- `src/pages/SpeedPaintPage.tsx` (trechos relevantes: batch record ~linhas 280-360, reprocessamento ~420-550)
- `src/features/speed-paint/components/SpeedPaintExportPanel.tsx` (trecho ~100-190)
- `src/features/speed-paint/components/batch/BatchOrchestrator.tsx` (trecho ~80-200)
- `src/features/video-render/store/videoRenderController.tsx` (trecho de revogação ~380-420)
- Source instalado `remotion@4.0.448`: `Sequence.js`, `use-video-config.js`, `use-unsafe-video-config.js`

**Validações executadas (fornecidas pelo orquestrador):** `tsc -b` exit 0 · ESLint 0 erros nos arquivos do escopo · `bun run test` 2644/2644.

**Focos cobertos:** hooks/estado (useVoicePreviews), engenharia (vectorizer/controller), segurança de dados malformados, performance, testes, tipagem, aderência à stack (lazy import, workers, Zustand, Remotion).

---

## 2. Veredito

**Ajustes recomendados** — nenhum bloqueador CRITICAL; 1 WARNING (UX/feature gap no batch) e 8 SUGGESTIONs. O escopo (a) e (b) está tecnicamente correto e bem testado; os achados são de robustez, documentação e completude de feature.

---

## 3. Achados priorizados

### [WARNING] "Batch record" ignora o modo vetorial da fila — exportação em lote regera tudo em máscara e diverge do preview sem aviso

- **Arquivo:** `src/pages/SpeedPaintPage.tsx:325-334` (chamada `startBatchRender`) + `src/features/speed-paint/store/speedPaintRenderController.tsx:923-924` (spread condicional)
- **Confidence:** 92/100
- **Categoria:** UX / Architecture
- **Problema:** O controller agora suporta batch vetorial (`'paths' in animation` + `VetorialBatchSceneWrapper`), e o `BatchOrchestrator` gera itens com `renderMode` per-item (`QueuedImage.renderMode` pode ser `'vetorial'`), mas a UI do "Batch record" monta as options sem `renderMode`/`vetorialPreset` — só `imageSource`.
- **Evidência:**
  ```ts
  // SpeedPaintPage.tsx:325
  void speedPaintExporter.startBatchRender({
    items: eligibleBatchQueue.map((item) => ({ imageSource: item.dataUrl })),
    fps: FPS, quality: '1080p', showDrawTool,
    fileName: ..., sceneDurationSeconds: animationDuration,
    // ← sem renderMode / vetorialPreset
  });
  ```
  ```ts
  // controller:923 — renderMode undefined → mask para TODOS os itens
  ...(renderMode !== undefined ? { renderMode } : {}),
  ```
- **Impacto:** Usuário que gerou a fila em "Desenho" (vetorial) e exporta o lote recebe um vídeo raspadinha (mask), com as animações **regeradas** em outro modo — resultado diferente do preview da fila, sem qualquer aviso. A correção vetorial do batch fica inacessível pela UI (caminho morto na prática, conforme admitido no comentário da linha 178 do controller).
- **Sugestão:** Propagar `renderMode`/`vetorialPreset` no `startBatchRender` da página (idealmente por item, respeitando `QueuedImage.renderMode`) ou, no mínimo, exibir aviso/confirmar quando a fila contém itens vetoriais.

---

### [SUGGESTION] Premissa documentada incorreta sobre `useVideoConfig()` dentro de `<Sequence>` — justificativa da correção do batch vetorial é falsa

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:228-241` (comentário do `VetorialBatchSceneWrapper`)
- **Confidence:** 97/100
- **Categoria:** Architecture / Documentação
- **Problema:** O comentário afirma que "`useVideoConfig()` retorna a duração TOTAL da composição (todo o batch), não da cena local" e cita o source instalado como confirmação. O source instalado do `remotion@4.0.448` diz o **oposto**.
- **Evidência:**
  ```js
  // node_modules/remotion/dist/cjs/use-unsafe-video-config.js:9-12,24
  const context = useContext(SequenceContext);
  const ctxDuration = context?.durationInFrames ?? null;
  ...
  durationInFrames: ctxDuration ?? durationInFrames,
  ```
  ```js
  // node_modules/remotion/dist/cjs/Sequence.js:70
  durationInFrames: actualDurationInFrames,   // exposto no SequenceContext
  ```
- **Impacto:** O comportamento funcional está correto (a prop `sceneDurationInFrames` é passada com o valor certo), então não há bug — mas o `VetorialBatchSceneWrapper` é desnecessário e a premissa falsa (atribuída a um "Notebook oficial do Remotion" que não existe entre os notebooks do projeto) vai enganar manutenções futuras.
- **Sugestão:** Corrigir o comentário (ou simplificar: `WhiteboardScene` poderia usar `useVideoConfig()` como o export single faz, eliminando o wrapper).

---

### [SUGGESTION] Vazamento de blob URL a cada novo render sem `reset()`/`cancelRender()` prévio

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:635-647` e `:880-892` (`set({...INITIAL_STATE})` no início de `runSingleRender`/`runBatchRender`)
- **Confidence:** 92/100
- **Categoria:** Memory Leak
- **Problema:** Ao iniciar um novo render, o estado é redefinido com `INITIAL_STATE`, o que derruba `outputUrl` anterior **sem `URL.revokeObjectURL`**. Só `cancelRender` (linha 467) e `reset` (linha 494) revogam.
- **Evidência:** `INITIAL_STATE` tem `outputUrl: null` e nenhum dos dois `run*` revoga a URL do render anterior; padrão idêntico no `videoRenderController` (pré-existente, não é regressão deste escopo).
- **Impacto:** A cada exportação concluída seguida de nova exportação, um blob de vídeo (potencialmente dezenas de MB) fica preso na memória da sessão SPA até o reload.
- **Sugestão:** Revogar `outputUrl` anterior no início de `runSingleRender`/`runBatchRender` (e idealmente no `videoRenderController`, mesmo padrão).

---

### [SUGGESTION] Teste duplicado em `useVoicePreviews.unit.test.ts` — cópia exata sem cobertura adicional

- **Arquivo:** `tests/hooks/useVoicePreviews.unit.test.ts:314-350` vs `:352-384`
- **Confidence:** 97/100
- **Categoria:** Testes / Dead Code
- **Problema:** Os dois `it` ("play().catch tardio no áudio anterior é descartado pelo isStale()" e "token: play().catch do áudio antigo é descartado pelo isStale()") executam os mesmos passos e as mesmas asserções — o segundo não adiciona cobertura.
- **Evidência:** Ambos: `MockAudio.pendingReject = new Error('NotAllowedError')` → `playPreview('Aoede')` → `playPreview('Zephyr')` → `await act(...)` → `expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('autoplay'))`.
- **Impacto:** Zero valor diagnóstico; se o contrato quebrar, os dois falham juntos sem informação extra; manutenção duplicada.
- **Sugestão:** Remover o segundo teste (ou transformá-lo num cenário genuinamente diferente, ex: erro `NotAllowedError` real vs `AbortError`).

---

### [SUGGESTION] JSDoc de `filterContoursByCompactness` contradiz o uso real — diz "não conectado", mas está conectado em todos os presets edge

- **Arquivo:** `src/features/speed-paint/lib/vectorizer.ts:715-717` vs `:1003-1013`
- **Confidence:** 95/100
- **Categoria:** Architecture / Documentação
- **Problema:** A doc da função afirma "Helper público mas NÃO conectado ao pipeline por padrão", porém o pipeline chama o filtro sempre que `config.filterSpeckle > 0` — e `filterSpeckle: 0.0001` existe em **todos** os presets `edge-*` (`vetorialPresets.ts:148-150`).
- **Evidência:**
  ```ts
  // vectorizer.ts:1003
  if (config.filterSpeckle > 0) {
    contours = filterContoursByCompactness(contours, config.filterSpeckle, epsilon);
  ```
- **Impacto:** Confusão real de manutenção: alguém confiando na doc pode "ativar" o filtro que já roda, ou remover a chamada achando que é opt-in, mudando o comportamento em produção.
- **Sugestão:** Atualizar o JSDoc para refletir o estado real (conectado com `filterSpeckle` > 0, calibrado em 0.0001).

---

### [SUGGESTION] Duplicação da chamada ao `renderMediaOnWeb` — batch não usa `invokeRenderMediaOnWeb`

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:1012-1028` (chamada direta no batch) vs `:545-578` (helper `invokeRenderMediaOnWeb` no single)
- **Confidence:** 95/100
- **Categoria:** Architecture (DRY)
- **Problema:** O single usa o helper genérico tipado; o batch repete o objeto `composition`/`inputProps`/`licenseKey`/`audioCodec`/`container` inline, com tipos castados (`get().codec as 'h264' | ...`).
- **Impacto:** Risco de divergência futura entre os dois caminhos (ex: mudança de `licenseKey`, opções do renderer) e `as` casts que o helper eliminaria.
- **Sugestão:** Extrair um helper `invokeRenderMediaOnWebForBatch` ou generalizar o existente para receber o objeto `composition` já montado.

---

### [SUGGESTION] RDP recursivo com `slice` O(n²) e profundidade O(n) no pior caso — risco de travamento no fallback main thread

- **Arquivo:** `src/features/speed-paint/lib/bezierFitting.ts:149-174` (`rdp`)
- **Confidence:** 82/100
- **Categoria:** Performance
- **Problema:** Cada nível de recursão aloca `points.slice(...)`; no pior caso (contorno em espiral/zigue-zague com distância crescente) a profundidade é O(n) e o custo O(n²). O `minContourLength: 30` limita o mínimo, não o máximo — imagens 1920×1080 podem produzir contornos com milhares de pontos.
- **Evidência:** `rdp(points.slice(0, maxIdx + 1), epsilon)` + `rdp(points.slice(maxIdx), epsilon)` — sem limite de profundidade nem iteração.
- **Impacto:** No worker (presets `edge-*`), é off-thread e aceitável; no fallback main thread (browsers sem module worker), um contorno muito longo pode congelar a UI por segundos ou estourar a stack em casos extremos.
- **Sugestão:** Implementar RDP iterativo ou com índices (`lo/hi`) sem alocar slices; opcionalmente limitar o tamanho do contour antes do fitting.

---

### [SUGGESTION] Discriminação do single render por estado global em vez do dado concreto — cast `as StrokeAnimation` depende de coerência externa

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:611-612`
- **Confidence:** 85/100
- **Categoria:** Architecture
- **Problema:** `isVetorial = useAnimationStore.getState().renderMode === 'vetorial' && 'paths' in animation` — a decisão usa o estado global da store como fonte adicional de verdade; o batch, no mesmo arquivo (linha 188), discrimina apenas por `'paths' in animation`. Se as fontes divergirem (renderMode = `'mask'` + animação vetorial), a branch mask casta `animation as StrokeAnimation` e o `SpeedPaintScene` lê `animation.strokes.length` → `TypeError` no primeiro frame do export.
- **Evidência:** O fluxo atual da UI (`reprocessInMode` → `setRenderMode` + `reprocessCurrentImage` com `setJob({status:'processing'})` imediato) protege o caso na prática, mas é um invariante implícito frágil — o JSDoc de `SpeedPaintExportOptions` documenta apenas o caso "vetorial + StrokeAnimation → fallback mask", não o inverso.
- **Impacto:** Crash latente de exportação se qualquer outro caminho alterar `renderMode` sem reprocessar (ex: futuras restaurações de estado, testes, novos consumidores do controller).
- **Sugestão:** Discriminar apenas por `'paths' in animation` (o dado concreto) nos dois caminhos, e tratar `renderMode` da store como preferência de UI apenas — eliminando a classe inteira de mismatch.

---

## 4. O que parece saudável

- **`useVoicePreviews`:** contrato de códigos corretamente implementado (0/1/4 → debug, 2/3 → error + `errorId`); token de sessão + cleanup de unmount (zera listeners e invalida token) cobrem o falso positivo do escopo; os testes fixam o contrato dos 5 códigos, do stop e do unmount.
- **`vectorizer`:** sanitização regex antes de `getLength` (que lança em `d` malformado), limites de segurança 500 paths / 250 KB `d`-bytes com logs `warn` e descarte de path individual oversized; testes determinísticos via namespace `__testing`; invariante de pareamento `contourIndex` em `sampleColors` correta mesmo após descartes do `fitBezierPaths`.
- **`bezierFitting`:** validação `getLength` em `buildValidatedPath`, descarte de contornos degenerados, testes sintéticos extensos (RDP, círculo, zigzag, colineares, closed vs open, fitError/maxDepth).
- **`imageProcessing`:** try/catch no `new Worker(url, { type: 'module' })` com fallback para main thread (sem job travado em `'processing'`); race protection (`settled`, `resolveOnce`/`rejectOnce`) em todos os caminhos; abort handling completo (worker inline, worker vetorial e main thread).
- **`speedPaintRenderController`:** lazy import do Remotion preservando bundle; `AbortController` em escopo de módulo (sobrevive à navegação); `renderId` protege renders obsoletos; type guard real `'paths' in animation` no batch eliminou o cast mentiroso.
- **`vetorialWorker`:** reutiliza o pipeline real (sem duplicação de algoritmo), mensagens tipadas progress/result/error.
- **Testes:** 2644/2644 passando; os novos testes de limites de segurança e o e2e de 10 imagens validam exatamente as garantias do escopo (b) (`<= 500 paths`, `<= 250_000 bytes`, sem `d` inválido).

## 5. Limites da revisão

- **NotebookLM Remotion indisponível:** o notebook `c58f332f` é de Motion (Framer Motion), não de Remotion — a validação do claim de `useVideoConfig()`/`Sequence` foi feita diretamente no source instalado (`remotion@4.0.448`), que é a fonte mais forte disponível. Nenhum achado depende de comportamento não verificado.
- Não executei `tsc`/ESLint/testes (resultados fornecidos pelo orquestrador: exit 0, 0 erros, 2644/2644).
- `SpeedPaintScene.tsx` lido parcialmente (260/473) — suficiente para validar o contrato com o controller, mas não auditei o corpo completo do componente (fora do escopo declarado).
- A análise do fluxo "Batch record" considerou apenas os pontos-chave da página (options da chamada e guards de estado); não auditei toda a UI do botão de record (possíveis avisos visuais em outros trechos).
- Comportamento de browser (ex: `AbortError` no `play()` após `pause()`/`load()`) foi assumido conforme a spec HTML Media — não testável por leitura estática.

---

## RESUMO EXECUTIVO

(1) Estado geral: **bom** — o escopo (a) falso positivo de preview e (b) proteção SVG estão implementados de forma correta, defensiva e bem testada (2644/2644, tsc/eslint limpos), sem bugs funcionais encontrados nos arquivos centrais. (2) Bloqueios: nenhum CRITICAL; 1 WARNING — a exportação em lote não propaga o modo vetorial da fila, então o usuário recebe vídeo em modo máscara divergente do preview sem aviso (feature gap conhecido, mas com surpresa de UX real). (3) Recomendação: **fechamento autorizado** — os SUGGESTIONs não bloqueiam; priorizar em follow-up: corrigir o comentário falso sobre `useVideoConfig()`/Sequence (evita manutenção enganada), propagar `renderMode` no batch record, e revogar blob URL no início de novo render.
