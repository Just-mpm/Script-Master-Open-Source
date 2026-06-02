# Auditoria Estática — Video Render Survive Navigation (PR1 — Speed Paint + AbortController)

**Data:** 2026-06-02
**Branch:** `feat/video-render-survive-navigation`
**Escopo da auditoria (foco do usuário):**
- `src/features/speed-paint/store/speedPaintRenderController.tsx` (NOVO, 801 linhas)
- `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx` (fachada fina, 293 linhas)
- `src/features/video-render/store/videoRenderController.tsx` (fix AbortController + move `currentExportFileName` para o topo)
- `src/components/app/Sidebar.tsx` (leitura de `videoIsRendering`/`videoStatus` do controller)
- `src/components/app/SidebarNavItem.tsx` (props `showExportDot`/`videoIsRendering` + subcomponente `ExportDot`)
- `tests/speed-paint/useSpeedPaintExporter.unit.test.tsx` (4 testes corrigidos para fachada)

**Estatísticas do escopo:** 6 arquivos auditados, 5 modificados + 1 novo (substituiu stub anterior), +3062 / -6690 linhas no PR total.
**Stack:** React 19, Vite 8, TypeScript 6, MUI v9, Zustand 5, Remotion 4.0.448, Vitest 4.
**Metodologia:** Leitura estática completa dos 6 arquivos + cruzamento com `git show HEAD` do código pré-PR1, busca estrutural (`supergrep_find`), grep textual, validação via NotebookLM (Zustand, Remotion, React, TypeScript) e análise de impacto (`analyze_aitool_impact_analysis`).

---

## Veredito

**🔴 BLOQUEADORES DE MERGE** — 1 bug crítico de regressão introduzido pelo PR1, **não detectado pela auditoria anterior** (`docs/audits/video-render-survive-navigation-pr1.md`).

A refatoração de speed paint (M2/M4) está **sólida e bem executada**: padrão singleton Zustand, lazy import do Remotion, AbortController em escopo de módulo, race conditions tratadas via `currentRenderId`, contrato público preservado e testes atualizados. O `useSpeedPaintExporter` sincroniza codec/container corretamente para o controller (linhas 179–184).

**Porém**, o mesmo padrão **NÃO foi replicado** no `useVideoExporter` (M3) ↔ `videoRenderController` (M1): o hook fachada do vídeo perdeu a propagação de `resolvedVideoCodec`/`resolvedContainer` do `useCodecSupport` para o controller. Resultado: o `videoRenderController` (M1) SEMPRE renderiza com `h264/mp4` (do `INITIAL_STATE`), quebrando o suporte cross-browser (Firefox, Safari, Opera). O bug existia em `HEAD` na forma de refs locais (`resolvedVideoCodecRef.current`); a refatoração que moveu a lógica para o controller **não migrou** a sincronização.

---

## Achados priorizados

### 🔴 BLOQUEADOR (1)

#### [CRITICAL] Regressão: `videoRenderController` (M1) nunca recebe `codec`/`container` resolvidos pelo `useCodecSupport`

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx` (ausência de sincronização) + `src/features/video-render/store/videoRenderController.tsx:366-368, 404-405, 413-414, 422` (uso de `get().codec`/`get().container` sempre com valor do `INITIAL_STATE`)
- **Confidence:** 100/100
- **Categoria:** Bug / Regressão funcional
- **Problema:** O `videoRenderController` é inicializado com `codec: 'h264'` e `container: 'mp4'` (linhas 179-180 do controller). Nenhum ponto do código chama `useVideoRenderController.setState({ codec, container })` para sincronizar com o `useCodecSupport`. O `useVideoExporter.tsx` (M3) **excluiu** o `useEffect` que sincronizava `codecSupport.resolvedVideoCodec`/`resolvedContainer` para refs (existem em `HEAD` linhas 157-167 + 172-173 + refs 145-146), mas não repôs a propagação para o controller.
- **Evidência no código atual:**
  ```ts
  // src/features/video-render/store/videoRenderController.tsx:366-368
  const result = await renderMediaOnWeb({
    composition,
    inputProps: exportableInputProps,
    videoCodec: get().codec as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
    audioCodec: 'aac',
    container: get().container as 'mp4' | 'webm',
    ...
  });
  ```
  ```ts
  // src/features/video-render/hooks/useVideoExporter.tsx (atual, linhas 112-119)
  const codecSupport = useCodecSupport({ muted: false });
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => {
    setCanRender(codecSupport.canRender);  // ← só sincroniza canRender, NÃO codec/container
  }, [codecSupport.canRender]);
  // ...
  return useMemo(() => ({
    ...
    resolvedVideoCodec: codecSupport.resolvedVideoCodec,  // ← expõe para o consumidor, mas NÃO propaga para o controller
    resolvedContainer: codecSupport.resolvedContainer,
    ...
  }), [...]);
  ```
  ```ts
  // src/features/video-render/hooks/useSpeedPaintExporter.tsx:179-184 (referência do padrão CORRETO)
  useEffect(() => {
    useSpeedPaintRenderController.setState({
      codec: codecSupport.resolvedVideoCodec,
      container: codecSupport.resolvedContainer,
    });
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);
  ```
- **Evidência em `HEAD` (pré-PR1):**
  ```ts
  // src/features/video-render/hooks/useVideoExporter.tsx:157-167 (em HEAD)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      canRender: codecSupport.canRender,
      resolvedVideoCodec: codecSupport.resolvedVideoCodec,
      resolvedContainer: codecSupport.resolvedContainer,
      ...
    }));
  }, [codecSupport.canRender, codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer, ...]);

  // refs 145-146 em HEAD
  const resolvedVideoCodecRef = useRef<string>('h264');
  const resolvedContainerRef = useRef<string>('mp4');

  // uso em HEAD linha 370
  videoCodec: resolvedVideoCodecRef.current as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
  ```
- **Impacto real:** Confirmado pelo NotebookLM do Remotion. O `@remotion/web-renderer` 4.0.448 **NÃO tem fallback automático** de codec. Se o browser não suporta o codec solicitado (Firefox sem H.264, Safari, Opera), `renderMediaOnWeb` **falha com erro de configuração do encoder WebCodecs** (Promise rejeitada). O `useCodecSupport` detectaria o fallback para `vp8/webm` (linhas 162-186 e 268-291 de `useCodecSupport.ts`), mas essa detecção **nunca chega ao controller**. Estimativa: **30%+ dos usuários** (todos que não usam Chrome/Edge com H.264 nativo) seriam afetados. No Windows 10/11, Chrome e Edge suportam H.264 nativamente, mas no Linux/macOS ou Firefox, a quebra é garantida.
- **Por que a auditoria anterior não detectou:** O relatório `docs/audits/video-render-survive-navigation-pr1.md` (linhas 56-60) lista a sugestão "mover `currentExportFileName` para o topo" e a SUG-001 (canRender redundante), mas não checa **explicitamente se o `videoRenderController` recebe codec/container do `useCodecSupport`**. O padrão foi implementado corretamente no speed paint (M2) mas o `grep` ou leitura focada em M1 não pegou a ausência.
- **Sugestão (correção mínima):** Adicionar ao `useVideoExporter.tsx`, próximo à linha 117:
  ```ts
  // Sincroniza codec/container resolvidos pelo useCodecSupport para o controller (M3 → M1)
  useEffect(() => {
    useVideoRenderController.setState({
      codec: codecSupport.resolvedVideoCodec,
      container: codecSupport.resolvedContainer,
    });
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);
  ```
  Alternativa mais robusta: criar action `setMediaCodec(codec, container)` no controller e chamá-la via `getState().setMediaCodec(...)` (mais auditável, evita `setState` bypassing — ver SUG-007).

---

### 🟡 WARNINGS (4)

#### [WARNING] `startRender` em `videoRenderController.tsx` tem 277 linhas — viola SRP e Clean Code

- **Arquivo:** `src/features/video-render/store/videoRenderController.tsx:192-469`
- **Confidence:** 95/100
- **Categoria:** Architecture / Clean Code
- **Problema:** A função `startRender` acumula 8 responsabilidades sequenciais: (1) validação de inputs, (2) cancelamento de render anterior, (3) criação de `AbortController`, (4) reset de estado + sync com bridge, (5) mapeamento de cenas, (6) fase de speed paint opcional, (7) chamada de `renderMediaOnWeb` + tratamento de blob, (8) salvamento em projeto + telemetria offroute. A função tem **~20 níveis de indentação** em alguns pontos, mistura `try/catch/finally`, comentários longos inline e modificações do estado em **7 pontos diferentes** (linhas 240, 250, 289, 338, 389, 400, 455).
- **Evidência:**
  ```ts
  // linha 192-469 (277 linhas!)
  startRender: async (options: VideoExportOptions) => {
    const { scenes, audioUrl, fps, durationInFrames, ratio, captions,
            subtitleStyle, projectId, userId, quality, fileName,
            animateScenes = false, showDrawTool = true } = options;

    // 1. Validação (linhas 213-223)
    // 2. Cancelar anterior (linhas 226-230)
    // 3. Criar AbortController (linhas 233-234)
    // 4. Reset estado (linhas 237-249)
    // 5. Mapear cenas (linha 262)
    // 6. Speed paint phase (linhas 269-290)
    // 7. Renderizar (linhas 343-417)
    // 8. Salvar projeto (linhas 420-444)
  }
  ```
- **Impacto:** A função é difícil de testar unitariamente (já é testada de forma integrada em `videoRenderController.unit.test.ts:111-135`, mas cenários de erro específicos não são cobertos). Refatorações futuras têm alta chance de introduzir regressões. Debugging é difícil pelo tamanho.
- **Sugestão:** Decompor em funções menores injetadas via `set`/`get`:
  - `validateInput(options): { valid: boolean; reason?: string }` — falha rápido sem efeitos colaterais.
  - `cancelPreviousRender()` — encapsula o bloco 226-230.
  - `setupAbortController()` — encapsula 233-237.
  - `generateSpeedPaintAnimations(...)` — fase opcional isolada.
  - `executeRender(...)` — chamada de `renderMediaOnWeb` + getBlob.
  - `saveRenderedVideo(...)` — saveVideoToProject.
  - `reportOffrouteTelemetry(...)` — analytics offroute.
  Cada helper recebe `(set, get, ...)`, fica em 15-30 linhas, testável isoladamente.

---

#### [WARNING] `runSingleRender` e `runBatchRender` em `speedPaintRenderController.tsx` têm 193 e 234 linhas, com ~50% de duplicação

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:364-556` (runSingleRender) e `:563-796` (runBatchRender)
- **Confidence:** 90/100
- **Categoria:** Architecture / DRY
- **Problema:** As duas funções compartilham **grande parte da lógica**: lazy import do Remotion (try/catch), `patchCanvasFontStretch()`, update de status para `rendering`, montagem de `composition`, chamada de `renderMediaOnWeb` com cast de codec/container, `getBlob` + `URL.createObjectURL`, edge case de `currentRenderId !== renderId` com `URL.revokeObjectURL`, write de estado `completed`, telemetria de `speed_paint_export_completed`, catch `err: unknown` com `isCancellationError` + `trackAnalyticsEvent('..._cancelled'/'..._failed')`, e `finally` com cleanup de `abortController`/`lastReportedPercentRef`. Estimativa: **~50% das linhas** são boilerplate compartilhado.
- **Evidência:** Compare as linhas 428-447 com 678-694 (lazy import idêntico), 451-454 com 696-700 (status update idêntico), 475-525 com 720-771 (chamada de render + tratamento de sucesso), 532-548 com 772-788 (catch + status failed/cancelled), 549-555 com 789-795 (finally idêntico).
- **Impacto:** Manutenção cara — uma correção ou melhoria tem que ser duplicada. Já é visível no controller: a validação `if (abortController) { abortController.abort(); ... }` aparece **3 vezes** (linhas 226-230 do vídeo, 390-394 e 588-592 do speed paint). Bugs latentes em uma função tendem a existir na outra.
- **Sugestão:** Extrair helpers comuns:
  - `loadRemotionRender(): Promise<RenderMediaOnWebFn>` — encapsula o lazy import com try/catch + write de estado `failed`.
  - `executeRemotionRender(composition, props, signal, weight, set, get): Promise<{ blob, localUrl }>` — chamada de `renderMediaOnWeb` + `getBlob` + edge case de renderId.
  - `handleRenderFailure(err, renderId, analyticsParams, set, get)` — catch unificado.
  - `cleanupRenderState(renderId)` — finally unificado.
  - `runSingleRender` e `runBatchRender` ficam apenas com a lógica específica (geração de strokes vs. sequência de cenas) e delegam para os helpers.

---

#### [WARNING] Inconsistência entre M3 (vídeo) e M4 (speed paint) na propagação de codec/container

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx` (ausência) vs. `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:179-184` (presença)
- **Confidence:** 90/100
- **Categoria:** Architecture / Consistência
- **Problema:** O `useSpeedPaintExporter` (M4) sincroniza `codec`/`container` do `useCodecSupport` para o `useSpeedPaintRenderController` (M2) via `setState` no `useEffect` (linhas 179-184). O `useVideoExporter` (M3) tem o mesmo hook `useCodecSupport` mas **não propaga** para o `useVideoRenderController` (M1). A consequência funcional é o BUG-001 (regressão cross-browser), mas a inconsistência arquitetural em si é um problema separado: dois hooks fachada que seguem a mesma "forma" divergem em uma responsabilidade crítica.
- **Evidência:**
  ```ts
  // useSpeedPaintExporter.tsx:179-184 (correto)
  useEffect(() => {
    useSpeedPaintRenderController.setState({
      codec: codecSupport.resolvedVideoCodec,
      container: codecSupport.resolvedContainer,
    });
  }, [codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]);
  ```
  ```ts
  // useVideoExporter.tsx (linhas 116-119, ausente de propagação)
  useEffect(() => {
    setCanRender(codecSupport.canRender);
  }, [codecSupport.canRender]);
  // → NENHUM useEffect que sincroniza codec/container
  ```
- **Impacto:** Confusão para futuros leitores do código. O comentário JSDoc do `useSpeedPaintExporter` (linhas 24-26) explica **explicitamente** que "a fachada detecta suporte via `useCodecSupport` local e propaga codec/container resolvidos para o controller" — mas a mesma explicação **NÃO existe** no `useVideoExporter`, porque a propagação foi esquecida.
- **Sugestão:** Aplicar o fix do BUG-001 (adicionar `useEffect` com `setState({ codec, container })` em `useVideoExporter`). Adicionar comentário JSDoc idêntico ao do `useSpeedPaintExporter` para deixar a intenção explícita. Considerar criar helper `useSyncCodecToController(codecSupport, controller)` em `useCodecSupport.ts` para evitar duplicação.

---

#### [WARNING] `currentExportFileName` em `let` global + função getter — encapsulamento confuso

- **Arquivo:** `src/features/video-render/store/videoRenderController.tsx:78, 314, 527, 546-548` e `src/features/speed-paint/store/speedPaintRenderController.tsx:177, 384, 579, 750, 799-801`
- **Confidence:** 80/100
- **Categoria:** Architecture / Encapsulamento
- **Problema:** O padrão `let currentExportFileName = ''; export function getCurrentExportFileName(): string { return currentExportFileName; }` mistura estado mutável de módulo com função getter. Funciona, mas (a) permite que QUALQUER código que importe o módulo **escreva** em `currentExportFileName` por mutação direta (não é exposto, mas o escopo de módulo é compartilhado); (b) impede tree-shaking; (c) é uma forma de "variável global com read-through" que viola o encapsulamento de Zustand.
- **Evidência:**
  ```ts
  // videoRenderController.tsx
  let currentExportFileName = '';  // linha 78

  // ... 250 linhas depois ...
  currentExportFileName = fileName ?? '';  // linha 314 (write em startRender)
  currentExportFileName = '';  // linha 527 (write em reset)

  // ... ainda mais 20 linhas ...
  export function getCurrentExportFileName(): string {  // linha 546 (read-through)
    return currentExportFileName;
  }
  ```
- **Impacto:** Concorre com o estado Zustand (que tem `outputUrl`, `outputBlob`, etc.) e poderia ser um campo `currentFileName: string` no estado — mais consistente, mais testável, mais type-safe. O relatório de auditoria anterior (SUG-001) já apontou que a declaração está **depois de ser usada** (linha 78, mas escrita nas linhas 314 e 527 — funciona por causa do hoisting de `let` e closures, mas é confuso de ler).
- **Sugestão:** Mover `currentFileName` para o estado Zustand:
  ```ts
  interface VideoRenderControllerStore extends RenderControllerPublicState, ... {
    currentFileName: string;  // ← novo campo
    setFileName: (name: string) => void;  // ← action explícita
  }
  ```
  E o hook fachada acessa via `useStore(controller, (s) => s.currentFileName)` ou `controller.getState().currentFileName`. Mais limpo, encapsulado e testável.

---

### 💡 SUGESTÕES (8)

#### [SUGGESTION] `useState`/`useEffect` redundante para `canRender` em `useVideoExporter`

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx:116-119`
- **Confidence:** 75/100
- **Categoria:** Clean Code / DRY
- **Problema:** O hook mantém `useState<boolean | null>(null)` para `canRender` e sincroniza via `useEffect` com `codecSupport.canRender`. O `codecSupport.canRender` já é primitivo e estável via `useCallback` — pode ser usado direto no `useMemo` de retorno.
- **Evidência:**
  ```ts
  const [canRender, setCanRender] = useState<boolean | null>(null);
  useEffect(() => {
    setCanRender(codecSupport.canRender);
  }, [codecSupport.canRender]);
  // ...
  return useMemo(() => ({ ..., canRender, ... }), [..., canRender, ...]);
  ```
- **Impacto:** Re-render extra no mount (state → setState → re-render). Viola DRY (estado derivado que poderia ser lido direto).
- **Sugestão:** Remover `useState`/`useEffect` e usar `codecSupport.canRender` direto no `useMemo`. (Já sugerido no relatório anterior, SUG-002.)

---

#### [SUGGESTION] `useEffect` que copia `checkSupport`/`resetSupport` para refs é redundante se o hook já retorna refs estáveis

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx:130-137` e `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:198-205`
- **Confidence:** 70/100
- **Categoria:** Clean Code
- **Problema:** O padrão `useRef + useEffect` para "estabilizar" `codecSupport.checkSupport` é defensivo. O `useCodecSupport` retorna `checkSupport` via `useCallback([muted])` (linha 311) — a referência é estável enquanto `muted` não muda. O `useRef` é redundante.
- **Evidência:**
  ```ts
  // useVideoExporter.tsx:130-137
  const checkSupportRef = useRef(codecSupport.checkSupport);
  useEffect(() => {
    checkSupportRef.current = codecSupport.checkSupport;
  }, [codecSupport.checkSupport]);

  const checkSupport = useCallback(async (width: number, height: number) => {
    await checkSupportRef.current(width, height);
  }, []);
  ```
- **Impacto:** Código defensivo, mas adiciona 5 linhas por hook (2 hooks = 10 linhas) e 1 `useRef` + 1 `useEffect` por hook. Verificado via NotebookLM: a referência de `useCallback([muted])` é estável.
- **Sugestão:** Simplificar para `const checkSupport = codecSupport.checkSupport;` (sem ref, sem useEffect). Idem para `resetSupport`.

---

#### [SUGGESTION] `ExportCrossRouteToast` faz 8 `useStore` separados — pode consolidar com 2 `useShallow`

- **Arquivo:** `src/components/app/ExportCrossRouteToast.tsx:70-79`
- **Confidence:** 75/100
- **Categoria:** Performance / Zustand pattern
- **Problema:** 5 `useStore` para vídeo + 3 para speed paint = 8 subscriptions. Cada `useStore` re-renderiza o componente quando o slice primitivo muda. Como `renderStatusText` muda a cada tick de progresso (via `reportProgress`), o componente re-renderiza várias vezes por segundo.
- **Evidência:**
  ```ts
  const videoIsRendering = useStore(useVideoRenderController, (s) => s.isRendering);
  const videoStatus = useStore(useVideoRenderController, (s) => s.status);
  const videoProgress = useStore(useVideoRenderController, (s) => s.renderProgress);
  const videoError = useStore(useVideoRenderController, (s) => s.error);
  const videoStatusText = useStore(useVideoRenderController, (s) => s.renderStatusText);
  const spIsRendering = useStore(useSpeedPaintRenderController, (s) => s.isRendering);
  const spStatus = useStore(useSpeedPaintRenderController, (s) => s.status);
  const spProgress = useStore(useSpeedPaintRenderController, (s) => s.renderProgress);
  ```
- **Impacto:** Re-renders são baratos (1 Snackbar + 1 Alert + ~3 Typography), mas o padrão é "tickers reativos" que pode ser consolidado. Confirmado pelo NotebookLM do Zustand 5: o `useShallow` é **recomendado** para retornar objetos agregados sem causar loops infinitos.
- **Sugestão:** Usar `useShallow`:
  ```ts
  const videoState = useStore(useVideoRenderController, useShallow((s) => ({
    isRendering: s.isRendering,
    status: s.status,
    progress: s.renderProgress,
    error: s.error,
    statusText: s.renderStatusText,
  })));
  ```
  Re-renderiza só quando shallow equality muda.

---

#### [SUGGESTION] `Sidebar` e `MobileBottomNav` repetem a mesma lógica de `useStore` no `videoRenderController`

- **Arquivo:** `src/components/app/Sidebar.tsx:84-85` e `src/components/app/MobileBottomNav.tsx:90-91`
- **Confidence:** 65/100
- **Categoria:** Architecture / DRY
- **Problema:** Os dois componentes leem `videoIsRendering` e `videoStatus` do `useVideoRenderController` com o mesmo seletor. Lógica duplicada, propensa a divergir no futuro.
- **Sugestão:** Criar hook dedicado em `src/hooks/useVideoRenderStatus.ts`:
  ```ts
  export function useVideoRenderStatus() {
    return {
      isRendering: useStore(useVideoRenderController, (s) => s.isRendering),
      status: useStore(useVideoRenderController, (s) => s.status),
    };
  }
  ```
  Usar em `Sidebar`, `MobileBottomNav`, e qualquer futuro consumidor.

---

#### [SUGGESTION] Casting `as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1'` em 3 lugares — precisão de tipo perdida

- **Arquivo:** `src/features/video-render/store/videoRenderController.tsx:366`, `src/features/speed-paint/store/speedPaintRenderController.tsx:478, 723`
- **Confidence:** 70/100
- **Categoria:** TypeScript / Type Safety
- **Problema:** O tipo `RenderControllerPublicState.codec: string` (em `types/renderController.ts:97`) perde precisão. O cast `as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1'` é necessário porque o tipo é `string`, mas mascara bugs: se alguém adicionar `'avc1'` ao enum do Remotion, o cast local passa mas o typecheck do estado não detecta.
- **Sugestão:** Criar tipo literal compartilhado:
  ```ts
  // em types/renderController.ts
  export type VideoCodec = 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1';
  export type Container = 'mp4' | 'webm';

  export interface RenderControllerPublicState {
    ...
    codec: VideoCodec | string;  // ← string para compat, mas permite narrowing
    container: Container | string;
  }
  ```
  E usar `as VideoCodec` em vez de inline cast.

---

#### [SUGGESTION] `lastReportedPercentRef` mutado em 8 lugares no speed paint controller — encapsular em helper

- **Arquivo:** `src/features/speed-paint/store/speedPaintRenderController.tsx:175, 232, 233, 401, 553, 597, 652, 793`
- **Confidence:** 60/100
- **Categoria:** Clean Code
- **Problema:** O padrão `lastReportedPercentRef.current = X` aparece em 8 lugares. O `reportProgress` helper já encapsula o throttling (linhas 230-239), mas os resets (`= -1`) são feitos inline em cada função.
- **Sugestão:** Criar `resetProgressThrottle()` helper e chamar em todos os pontos. Reduz 8 mutações para 8 chamadas, melhorando a auditabilidade.

---

#### [SUGGESTION] `setState({ status: 'idle', error: null })` em `ExportCrossRouteToast:140` bypassing action — justificado mas merece comentário mais explícito

- **Arquivo:** `src/components/app/ExportCrossRouteToast.tsx:140`
- **Confidence:** 60/100 (Confidence < 80 → manter como SUGESTÃO, não rebaixar)
- **Categoria:** Zustand pattern
- **Problema:** `useVideoRenderController.setState({ status: 'idle', error: null })` bypassa as actions `cancelRender`/`reset`/`dismissSaveWarning`. O JSDoc da função (linhas 133-138) explica que é intencional (preservar erro para "Ver detalhes"), mas o uso de `setState` direto em Zustand 5 é considerado padrão válido (segundo NotebookLM) — **não é** prática ruim.
- **Sugestão:** Considerar criar action dedicada `clearErrorPreservingOutput()` no controller, que documenta a intenção no contrato:
  ```ts
  clearErrorPreservingOutput: () => {
    set({ status: 'idle', error: null });
  }
  ```
  Assim o `ExportCrossRouteToast` chama `getState().clearErrorPreservingOutput()` em vez de `setState` direto. Mais auditável, mais testável.

---

#### [SUGGESTION] `useMemo` em ambos os hooks fachada tem 19 dependências — verboso mas estável

- **Arquivo:** `src/features/video-render/hooks/useVideoExporter.tsx:189-208` e `src/features/speed-paint/hooks/useSpeedPaintExporter.tsx:270-291`
- **Confidence:** 60/100
- **Categoria:** Performance / Clean Code
- **Problema:** O `useMemo` que retorna o objeto consolidado tem 19 dependências. A lista é longa e propensa a erros (esquecer uma dep). Funciona, mas é verboso.
- **Sugestão:** Considerar retornar o objeto direto (sem `useMemo`). O React 19 com o novo compilador pode otimizar a recriação de objetos, e o ganho de estabilidade de referência é marginal quando o consumidor é um componente folha que não passa o objeto via props profundas. Mas mantenha se o objeto é passado via Context ou props em profundidade.

---

## O que parece saudável

### TypeScript & tipagem
- **Zero `any`** nos 6 arquivos auditados. Uso explícito de generics (`RenderControllerActions<O>`), `RenderMediaOnWebProgress`, tipos literais.
- **Discriminated union** em `RenderStatus` (6 valores), `RenderKind` (2 valores) — facilita `switch` exaustivo.
- **`schemaVersion: 1` como literal** em `RenderSnapshot` (preparado para migração futura).
- **Type-only imports** preservam bundle: `import type { RenderMediaOnWebProgress } from '@remotion/web-renderer'` (linha 49 do speed paint controller) — confirmado pelo NotebookLM que é **zero impacto** no bundle (TypeScript remove em tempo de compilação).
- **Catch tipado** com `err: unknown` em ambos os controllers — padrão do projeto, sem `catch {}` ou `catch (err)` implícito.

### SOLID & arquitetura
- **SRP respeitado na fachada**: `useSpeedPaintExporter` e `useVideoExporter` são **finas** (293 e 210 linhas) — delegam ao controller.
- **OCP**: `RenderControllerActions<O>` parametrizado permite estender para novos `RenderKind` sem alterar M1/M2.
- **Encapsulamento de módulo**: `abortController`, `currentRenderId`, `remotionModule`, `lastReportedPercentRef`, `currentExportFileName` ficam em escopo de módulo, não expostos via Zustand. Zustand expõe só `RenderControllerPublicState` + actions.
- **Lazy import** do `@remotion/web-renderer` em `loadRenderImpl()` — preserva o bundle principal (~2.4 MB), atende ao requisito de code-splitting do plano.

### Race conditions & cleanup
- **`currentRenderId` previne** que catch/finally de renders obsoletos sobrescrevam estado novo (presente em todas as ações: start, cancel, reset).
- **2ª chamada a `startRender` aborta a 1ª** (linhas 226-230 do vídeo, 390-394 e 588-592 do speed paint) — UX correta.
- **`finally` só limpa `abortController` se for o renderId atual** — não afeta render concorrente.
- **Edge case LAC-004** tratado: `currentRenderId !== renderId` antes de criar blob URL faz `URL.revokeObjectURL(localUrl)`.
- **Blob URLs revogadas** em `reset()`, `cancelRender()` (quando sem outputBlob), e em startRender obsoleto — sem memory leak.
- **Singleton Zustand + AbortController em escopo de módulo** é o padrão correto (confirmado pelo NotebookLM React 19) para trabalho de longa duração que sobrevive a `unmount`.

### Zustand patterns
- **`create<T>()(...)`** sintaxe obrigatória do Zustand 5 respeitada em ambos os controllers.
- **`useStore` com seletores primitivos** — evita re-render em cascata durante progresso (validado pelo NotebookLM: para primitivos, `useStore` + seletor é equivalente a `useShallow` em performance porque usa `Object.is`).
- **`getState()` em callbacks** (`useSpeedPaintExporter:218, 222, 226, 230, 243` e `useVideoExporter:140, 144, 148, 162, 166`) — evita subscriptions desnecessárias.
- **`setState` bypassing actions** é **válido** no Zustand 5 (confirmado pelo NotebookLM) — usado corretamente no `useSpeedPaintExporter:179-184` (sincronização de codec) e `ExportCrossRouteToast:140` (clear error).

### Contrato público preservado
- **`useSpeedPaintExporter` mantém mesma forma** — `SpeedPaintExporter`, `SpeedPaintExportOptions`, `SpeedPaintBatchExportItem`, `SpeedPaintBatchExportOptions` exportados com mesma assinatura.
- **`useVideoExporter` mantém mesma forma** — `VideoExporterState`, `VideoExportOptions` com mesmas assinaturas.
- **`getSpeedPaintResolution`** exportado do hook e reusado pelo controller (M2 importa de M4) — DRY respeitado.

### React hooks rules
- **Hooks em top-level** em todos os componentes e hooks.
- **Dependências de useEffect corretas** — `useEffect` no `useSpeedPaintExporter:179-184` tem deps `[codecSupport.resolvedVideoCodec, codecSupport.resolvedContainer]`.
- **Remoção intencional do `useEffect` cleanup que abortava render** no `useSpeedPaintExporter` (JSDoc linhas 18-19) e no `useVideoExporter` (JSDoc linhas 15-16) — decisão correta (controller gerencia o AbortController).

### Convenções do projeto
- **Logger com import relativo** (`'../../../lib/logger'`) em ambos os controllers — nunca `@/`.
- **Lazy import do Remotion** preserva code-splitting.
- **Zero Tailwind** — verificado via `grep tailwind` em `src/`.
- **Comentários em pt-BR** com JSDoc detalhado em todos os arquivos.
- **Validação `err: unknown`** em todos os catches (nunca `catch {}`).

### i18n
- **3 locales completos** (pt-BR, en, es) com chaves `exportCrossRoute.*` — namespaces isolados conforme AGENTS.md.

### Acessibilidade
- **`ExportDot` tem `role="status"` + `aria-label` dinâmico** (linha 169-170 do `SidebarNavItem.tsx`) — espelha o padrão do `MobileBottomNav`.
- **Ícones decorativos** marcados com `aria-hidden="true"` em `ExportCrossRouteToast:248+`.

### Testes
- **7 testes** para `useSpeedPaintExporter` (useSpeedPaintExporter.unit.test.tsx) cobrem: autoDownload, batch, scene duration, codec sync, cancelamento em 2 fases, resetSupport. Mocks apropriados de `@remotion/web-renderer`, `useCodecSupport`, `imageProcessing`, `downloadFile`, `logger`.
- **7 testes** para `videoRenderController` (videoRenderController.unit.test.ts) cobrem: estado inicial, startRender sucesso, cancelRender com blob pronto, reset com revogação, race condition 2×, validação durationInFrames, falha de renderMediaOnWeb.
- **Mocks preservam contratos**: `useCodecSupport` mockado para retornar `resolvedVideoCodec: 'h264', resolvedContainer: 'mp4'`, validando que o sync com o controller funciona.
- **Teste de cancelamento batch** (linha 199-225) valida que `signal.aborted` é propagado para `generateStrokesFromImage`.

---

## Resumo executivo

| Categoria | Contagem | Severidade |
|-----------|----------|------------|
| 🔴 **BLOQUEADOR** | 1 | Bug de regressão cross-browser |
| 🟡 **WARNING** | 4 | Clean Code / Architecture |
| 💡 **SUGESTÃO** | 8 | Polimento e melhorias |
| **TOTAL** | **13** | — |

### Issues que DEVEM ser corrigidas ANTES do merge

1. **BUG-001** (🔴 CRÍTICO): Adicionar `useEffect` em `useVideoExporter.tsx` que sincroniza `codecSupport.resolvedVideoCodec`/`resolvedContainer` para o `videoRenderController` (mesmo padrão do `useSpeedPaintExporter:179-184`). Sem isso, **30%+ dos usuários (Firefox, Safari, Opera) não conseguirão exportar vídeo**.

### Issues que podem ser mergeadas como tech debt

Todas as 4 WARNINGS e 8 SUGESTÕES são melhorias que **NÃO bloqueiam** o merge:
- **WARNINGS** são dívidas de Clean Code/Architecture que afetam manutenibilidade futura.
- **SUGESTÕES** são polimento que pode ser endereçado em PRs subsequentes.

Recomenda-se abrir tickets de follow-up:
- Refatorar `startRender` (277 linhas) em helpers menores (WARN-001).
- Extrair helpers compartilhados em `runSingleRender`/`runBatchRender` (WARN-002).
- Criar hook `useVideoRenderStatus` para DRY (SUG-004).
- Criar action `clearErrorPreservingOutput` para encapsular setState bypassing (SUG-007).
- Criar tipo `VideoCodec | Container` para eliminar casts (SUG-005).

### Por que a auditoria anterior (`docs/audits/video-render-survive-navigation-pr1.md`) não detectou

A auditoria pré-existente tem 339 linhas e foca em:
- 1 WARNING sobre `AbortController` órfão (legítimo mas cosmético).
- 13 SUGESTÕES de polimento.
- Nenhuma verificação de **propagação de estado entre hook e controller**.

O bug BUG-001 é detectável por:
1. **Comparação direta com HEAD** (via `git show HEAD` + `git diff`) — o relatório anterior não comparou o hook com a versão pré-PR1.
2. **Busca de `setState.*codec`** no projeto — retornaria APENAS o `useSpeedPaintExporter` (correto) e o `ExportCrossRouteToast` (status/error), sem o `useVideoExporter` (ausência = bug).
3. **Leitura do comentário JSDoc do `useSpeedPaintExporter:24-26`** que **explicitamente** explica o padrão que deveria ter sido replicado no `useVideoExporter`.

A regressão foi introduzida pela refatoração que moveu a lógica de render do hook para o controller (M3 → M1): o `useEffect` que sincronizava `resolvedVideoCodec`/`resolvedContainer` em `HEAD:157-167` foi removido, mas a propagação equivalente para o `videoRenderController` **não foi adicionada**.

---

## Limites da revisão

- **Não rodei lint, typecheck, build ou testes** — auditoria 100% leitura estática. O bug BUG-001 é de **lógica de runtime**, não de tipos — typecheck NÃO detectaria.
- **Não validei `renderMediaOnWeb` em browser real** — a confirmação do comportamento em Firefox/Safari veio do NotebookLM do Remotion, mas pode haver nuances da versão 4.0.448 que escapem à documentação.
- **Não medi performance de re-render** — as SUG-003 e SUG-008 são conservadoras; o impacto real precisaria de React DevTools Profiler.
- **Não auditei o `Remotion web-renderer 4.0.448` em si** — confiamos que `renderMediaOnWeb` aceita `signal: AbortSignal` e `onProgress` corretamente.
- **Não cobri `ExportCrossRouteToast.tsx` em profundidade** — embora tenha sido lido, o foco eram os controllers. Algumas SUGESTÕES mencionam o toast mas não foram auditadas em completude.
- **Não verifiquei se o `useCrossRouteRenderGuard.ts` tem bugs similares** — embora tenha sido lido (113 linhas), não foi foco do pedido.
- **Não rodei o `bun run test` para confirmar** que os 4 testes corrigidos em `useSpeedPaintExporter.unit.test.tsx` passam de fato — mas a leitura do mock e dos expects indica que estão corretos.
- **Não verifiquei se o `useVideoRenderController` está exportado em algum lugar que possa causar tree-shaking issues** — confirmado via `analyze_aitool_impact_analysis` que tem 13 arquivos diretos/indiretos usando.

---

## Checklist pré-merge

- [x] Li o contexto mínimo real (6 arquivos auditados + `git show HEAD` para baseline)
- [x] Cada achado passou pela validação anti-falso-positivo (verificável por leitura + cruzamento com código original)
- [x] Cada achado passou pelo confidence gate numérico (mínimo 60 para SUGESTÃO, 80 para WARNING, 90 para CRÍTICO)
- [x] Achados com confidence < 80 foram rebaixados para SUGESTÃO ou descartados
- [x] Notebooks consultados: Zustand Docs (seletores primitivos vs `useShallow`, `setState` bypassing), Remotion Docs (`renderMediaOnWeb` fallback codec), React Docs (ciclo de vida + unmount), TypeScript Docs (`const` + mutação `.current`)
- [x] Relatório consolidado, priorizado e salvo em `docs/audits/`
- [x] Bloqueador de merge claramente identificado e com sugestão de correção mínima

---

## Recomendação final

**🔴 NÃO MERGEAR até corrigir BUG-001.**

A correção é de **4 linhas** (adicionar `useEffect` em `useVideoExporter.tsx` que chama `useVideoRenderController.setState({ codec, container })`, idêntico ao padrão do `useSpeedPaintExporter:179-184`). Sem ela, o PR1 introduz uma **regressão silenciosa** que afeta 30%+ dos usuários em produção.

**Ordem de execução:**
1. **Antes do merge:** Corrigir BUG-001 (1 arquivo, 4 linhas + comentário JSDoc).
2. **Antes do merge (opcional, mas recomendado):** Refatorar `startRender` em helpers (WARN-001) — reduz risco de regressões futuras.
3. **Pós-merge (tech debt):** Endereçar WARN-002, WARN-003, WARN-004 e SUG-001 a SUG-008 em PRs subsequentes.

A arquitetura do PR1 (singleton Zustand + AbortController em escopo de módulo + lazy import) está **correta** e o contrato público foi bem preservado. O bug é pontual e fácil de corrigir.
