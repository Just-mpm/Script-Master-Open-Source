# Auditoria do Estado Final (R2) — useVoicePreviews + Vectorizer (limites SVG)

- **Data:** 2026-08-04
- **Escopo:** estado final (não diff) de: `src/hooks/useVoicePreviews.ts`, `src/features/speed-paint/lib/vectorizer.ts`, `src/features/speed-paint/lib/bezierFitting.ts`, `src/features/speed-paint/lib/imageProcessing.ts`, `src/features/speed-paint/store/speedPaintRenderController.tsx`, `tests/hooks/useVoicePreviews.unit.test.ts`, `tests/speed-paint/vectorizer.safetyLimits.unit.test.ts` + adjacentes (`vetorialWorker.ts`, `SpeedPaintScene.tsx`, `WhiteboardScene.tsx`, `types/vetorial.ts`, `vetorialPresets.ts`, `useSpeedPaintExporter.tsx`, `speedPaintTimings.ts`, consumidores do hook).
- **Validações confirmadas (fornecidas):** `tsc -b` exit 0 · ESLint 0 erros · `bun run test` 2645/2645.
- **Notebooks consultados:** Remotion Docs (`cd0a33cb`) — confirmou a premissa do `VetorialBatchSceneWrapper`: `useVideoConfig()` dentro de `<Sequence>` retorna a duração **total da composição raiz**, não a da cena; a doc não oferece hook nativo para duração local, então passar `durationInFrames` como prop é a solução correta. `interpolate` com inputRange degenerado `[0,0]` não documentado (edge inalcançável no fluxo real — descartado).

---

## 1. Escopo da revisão

**Fonte da verdade (lidos por completo):** os 7 arquivos listados acima.

**Adjacentes lidos por completo:** `vetorialWorker.ts`, `SpeedPaintScene.tsx`, `WhiteboardScene.tsx`, `types/vetorial.ts` (em `src/features/speed-paint/types/`), `constants/vetorialPresets.ts`, `hooks/useSpeedPaintExporter.tsx`, `lib/speedPaintTimings.ts`.

**Parciais (grep/leitura direcionada):** `Inspector.tsx` e `Configuracoes.tsx` (uso do hook: apenas `errorId`, `playPreview`, `clearError` — `stop` não é consumido pela UI), `SpeedPaintPage.tsx` (batch: `renderMode` nunca é passado), `SpeedPaintExportPanel.tsx` (qualidades oferecidas).

**Focos cobertos:** Bugs, gaps, regressões, efeitos colaterais, arquitetura, tipagem, estados, testes, aderência à stack (React 19, Remotion 4, Web Workers, Zustand).

## 2. Veredito

**Ajustes recomendados (não bloqueante).**

Nenhum CRITICAL e nenhum WARNING. Os dois contratos do escopo estão corretos e cobertos por testes:

- **(a) Hook `useVoicePreviews`:** codes 0/1 silenciados, code 4 silenciado **somente** com `src === ''`, codes 2/3/4-com-src-válido logados (`error` + `errorId`), cleanup de unmount zera listeners + invalida token, `stop()` limpa `errorId` — tudo confere linha a linha com o contrato.
- **(b) Limites SVG:** `applyVetorialSafetyLimits` aplicado nos **dois** pipelines (legado e edge+bezier) dentro de `vectorizeImage`; regex `[ \t\r\n]` (XML 1.0); 500 paths; 250KB `d` acumulado; descarte de path individual oversized; pareamento path↔contour via `BezierPath.contourIndex`; try/catch no `new Worker({ type: 'module' })` com fallback main thread — confere.

A premissa técnica da correção do batch vetorial (`VetorialBatchSceneWrapper` receber `sceneDurationInFrames` como prop em vez de `useVideoConfig()`) foi **confirmada no NotebookLM do Remotion**.

## 3. Achados priorizados

### [SUGGESTION] Teste do branch `code === 4 && src === ''` passa por razão errada — condicional sem cobertura real

- **Arquivo:** `tests/hooks/useVoicePreviews.unit.test.ts:140-165`
- **Confidence:** 90/100
- **Categoria:** Testes
- **Problema:** O teste "NÃO registra erro quando MediaError.code = 4 com src vazio (cleanup)" re-registra `audio.onerror = () => {}` (um noop) após o `stop()`. O listener real (`reportLoadError`) já foi zerado pelo stop, então o teste passaria **mesmo se a condicional `code === 4 && audio.src === ''` fosse removida do hook**. Ele não exercita o branch que afirma cobrir.
- **Evidência:**
  ```ts
  act(() => { result.current.stop(); });
  if (audio?.src === '') {
    audio.onerror = (): void => {};   // noop — substitui o listener real
    audio.triggerError(4);
  }
  expect(errorSpy).not.toHaveBeenCalled();
  ```
- **Impacto:** A defesa `code === 4 && audio.src === ''` (peça do contrato do objetivo a) fica sem teste real; regressão nessa condicional não seria detectada pela suíte. O branch é praticamente inalcançável por design (listeners são zerados **antes** do `removeAttribute('src')`), então o risco funcional é baixo — o problema é a cobertura ilusória.
- **Sugestão:** Exercitar o branch de verdade: chamar `playPreview`, setar `audio.src = ''` diretamente (listener real ainda ativo) e disparar `triggerError(4)` — o `reportLoadError` roda com `src === ''` e o silêncio vem da condicional, não da ausência de listener. Alternativamente, renomear o teste para o que ele realmente valida (listener zerado após stop).

### [SUGGESTION] `void useAnimationStore.getState().renderMode;` — leitura no-op decorativa no controller

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:616`
- **Confidence:** 90/100
- **Categoria:** Architecture / Dead Code
- **Problema:** A linha lê `renderMode` do store e descarta com `void`. `getState()` não é reativo e a leitura não alimenta log, telemetria nem branch — é um statement sem efeito observável. O comentário justifica como "telemetria/consistência", mas nada é emitido.
- **Evidência:**
  ```ts
  const isVetorial = 'paths' in animation;
  void useAnimationStore.getState().renderMode;
  ```
- **Impacto:** Ruído que sugere um mecanismo de consistência inexistente; quem lê o código pode assumir que o store influencia o ramo de execução (não influencia — o discriminante é só `'paths' in animation`, o que está correto).
- **Sugestão:** Remover a linha, ou implementar a intenção de verdade (ex.: `log.debug` quando `store.renderMode` divergir do tipo da animação, útil para diagnosticar a janela de debounce do `useSyncSpeedPaintRenderMode`).

### [SUGGESTION] `QUALITY_TO_LONGER_SIDE['4k'] = 3840` contradiz o comentário e a UI

- **Arquivo:** `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:110-115`
- **Confidence:** 88/100
- **Categoria:** Dead Code / Documentação
- **Problema:** O JSDoc diz "Speed paint não suporta 4K — usa no máximo 2560px (1440p)", mas o mapa define `'4k': 3840`. A UI (`SPEED_PAINT_QUALITY_OPTIONS` em `SpeedPaintExportPanel.tsx`) não oferece 4K, então o valor é inacessível hoje — mas quem passar `quality: '4k'` programaticamente receberia 3840px, contrariando o contrato documentado.
- **Evidência:**
  ```ts
  const QUALITY_TO_LONGER_SIDE: Record<VideoExportQuality, number> = {
    '720p': 1280, '1080p': 1920, '1440p': 2560, '4k': 3840,
  };
  ```
- **Impacto:** Inconsistência doc↔código; armadilha para callers futuros (ex.: reaproveitar `VideoExportQuality` genérico). Sem impacto em produção hoje.
- **Sugestão:** Ou remover `'4k'` do mapa (lançando erro claro para qualidade não suportada) ou atualizar o comentário caso 4K passe a ser suportado.

### [SUGGESTION] Validações com `return` silencioso no controller — sem feedback de erro

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:622` e `:866`
- **Confidence:** 85/100
- **Categoria:** UX / Robustez
- **Problema:** `if (!isVetorial && !imageSource) return;` (single) e `if (items.length === 0) return;` (batch) abortam a ação sem setar estado de erro nem log — o usuário clica em exportar e nada acontece, sem mensagem.
- **Evidência:**
  ```ts
  if (!isVetorial && !imageSource) return;
  ...
  if (items.length === 0) return;
  ```
- **Impacto:** Em condições inválidas, o `ExportCrossRouteToast`/painel não recebe `error` nem `renderStatusText` — falha invisível. Caminhos dificilmente alcançáveis pela UI tipada (o painel sempre passa `imageSource`; a página guarda `eligibleBatchQueue.length`), mas a defesa deveria ser observável.
- **Sugestão:** Setar `status: 'failed'` com `error` descritivo (ex.: "Nenhuma imagem para exportar") antes do `return`, ou lançar erro tratável no caller.

### [SUGGESTION] Pipeline mask duplicado em duas implementações (worker inline string vs `processOnMainThread` TS)

- **Arquivo:** `src/features/speed-paint/lib/imageProcessing.ts:26-274` (string do worker) vs `:771-1043` (main thread)
- **Confidence:** 85/100
- **Categoria:** Architecture (DRY)
- **Problema:** O mesmo algoritmo (grayscale → edge diff → BFS cluster → tracing → reveal) existe em duas formas: código embutido em string (executado no Worker) e implementação TypeScript (fallback). ~250 linhas duplicadas com risco real de divergência — e já divergem em detalhes: o worker inline não tem os checks de abort granulares do `processOnMainThread` (ex.: `(y & 15) === 0 && abortIfNeeded()`), e o worker não tem o `abortIfNeeded()` entre fases.
- **Evidência:** `createImageProcessingWorker()` (blob string, `self.onmessage`) vs `processOnMainThread` (TS com `sketchTimeoutId`/`revealTimeoutId` e abort cooperativo).
- **Impacto:** Correções futuras de bug (ex.: o `smoothedPath[...] !== path[...]` por referência, presente nas duas versões) precisam ser aplicadas em dois lugares; qualquer divergência cria comportamento diferente entre worker e fallback.
- **Sugestão:** Extrair o algoritmo em um módulo compartilhado importável pelo worker via `?worker&inline`/blob com `importScripts` de um chunk separado, ou ao menos adicionar teste de paridade (mesma imagem → mesmo output em ambos os caminhos).

### [SUGGESTION] `canvasColor` divergente entre os dois caminhos vetoriais (worker vs main thread)

- **Arquivo:** `src/features/speed-paint/lib/vetorialWorker.ts:111` vs `src/features/speed-paint/lib/imageProcessing.ts:732`
- **Confidence:** 82/100
- **Categoria:** Architecture
- **Problema:** O worker filtra por `filterPathsByBackgroundContrast(rawPaths, msg.canvasColor)` (honra o request, que aceita `'black'`), enquanto o fallback main thread hardcoda `'white'`. Hoje o caller sempre envia `'white'` (linha 681), então não há divergência real — mas o contrato do request permite `'black'` e os caminhos divergiriam silenciosamente.
- **Evidência:**
  ```ts
  // vetorialWorker.ts
  const paths = filterPathsByBackgroundContrast(rawPaths, msg.canvasColor);
  // imageProcessing.ts
  const paths = filterPathsByBackgroundContrast(rawPaths, 'white');
  ```
- **Impacto:** Se um caller futuro enviar `canvasColor: 'black'`, o worker descartaria paths pretos e o fallback não — resultados diferentes conforme o browser. Risco de manutenção latente.
- **Sugestão:** Hardcodar `'white'` no worker também (com comentário), ou propagar `canvasColor` real nos dois caminhos (o main thread receberia do options).

## 4. O que parece saudável

- **Hook `useVoicePreviews`:** token de sessão incremental + zeragem de listeners antes de `removeAttribute('src')` — a ordem do `stop()`/cleanup é exatamente a que elimina o `onerror` espúrio do Chrome; contrato completo e bem comentado.
- **`applyVetorialSafetyLimits`:** invariantes corretas (path individual ≤ 250KB, acumulado ≤ 250KB, ≤ 500 paths), logs `warn` únicos e descritivos, ordem sanitização→quantidade→bytes com `break` correto; coberto por testes determinísticos sólidos (incl. caso combinado quantidade+bytes).
- **Regex `[ \t\r\n]`:** exclusão deliberada de `\x0B`/`\x0C` (ilegais em XML 1.0) documentada com referência ao fix ausente no Remotion 4.0.448 — boa engenharia defensiva.
- **Pareamento `contourIndex`:** `sampleColors` usa `path.contourIndex ?? i` — correto após descartes do `fitBezierPaths`; retrocompatível.
- **`processVetorialInWorker`:** try/catch no construtor do module worker com fallback main thread — o objetivo (b) está fechado inclusive para Safari < 15/CSP restritivo.
- **Batch vetorial:** `VetorialBatchSceneWrapper` com `durationInFrames` como prop — premissa confirmada no NotebookLM Remotion; type guard `'paths' in animation` real, sem cast mentiroso.
- **Testes do vectorizer:** `makePathWithDBytes`/`makeCheckerImageData` determinísticos; cobertura dos 3 limites + sanitização + regex + integração com `vectorizeImage`.

## 5. Limites da revisão

- Não rodei lint/typecheck/tests (fornecidos: exit 0, 0 erros, 2645/2645).
- `interpolate` do Remotion com inputRange degenerado `[0, 0]` (`WhiteboardScene` com `durationInFrames = 1`) não está documentado no notebook; considerado inalcançável no fluxo real (15s × 60fps = 900 frames) e não reportado.
- `stop()` do hook não invalida o token de sessão (diferente do cleanup de unmount) — avaliado e descartado: `stop` não é consumido pela UI, e a rejeição tardia de `play()` pós-stop é `AbortError` (filtrada) na prática.
- Não verifiquei `BatchOrchestrator`/`strokeCache` a fundo (fora do escopo declarado); os contratos que os envolvem foram conferidos apenas pela interface.
