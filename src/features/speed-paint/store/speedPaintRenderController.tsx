/**
 * Controller singleton da renderização de speed paint.
 *
 * Este store Zustand vive no `App.tsx` (sempre montado) e gerencia o ciclo
 * de vida do `renderMediaOnWeb` do Remotion **fora do ciclo de vida React**
 * para o speed paint.
 *
 * **Por que singleton?**
 * O hook `useSpeedPaintExporter` original era instanciado dentro de
 * `SpeedPaintPage` (rota lazy). Quando o usuário navegava para outra rota,
 * o `useEffect` cleanup chamava `abortController.abort()` e o render era
 * perdido. Este controller é importado por `useSpeedPaintExporter`
 * (fachada fina) e pelo `ExportCrossRouteToast` (M6), garantindo que o
 * render continue rodando enquanto a SPA navega.
 *
 * **Por que lazy import do Remotion?**
 * O `@remotion/web-renderer` (~2.4 MB com codecs) é importado dinamicamente
 * apenas quando `startRender()` ou `startBatchRender()` é chamado pela
 * primeira vez. Isso preserva o tamanho do bundle principal (`main-*.js`).
 *
 * **Por que AbortController em escopo de módulo?**
 * Porque precisa sobreviver a `unmount` do componente. Em React, `useRef`
 * é descartado no unmount. Variável no closure do módulo persiste enquanto
 * o JS runtime estiver vivo.
 *
 * **Sem bridge para speed paint:**
 * Diferente de M1 (que escreve em `videoRenderBridge` para consumidores
 * legados como `ActionBar`), M2 não escreve em bridge. O
 * `ExportCrossRouteToast` (M6) consome este controller diretamente via
 * `useStore(useSpeedPaintRenderController, ...)`.
 *
 * **Strings em pt-BR:**
 * O controller não usa `useLocale()` (é um hook React). Strings de status
 * são fixas em pt-BR. O hook fachada pode sobrescrever `renderStatusText`
 * com versão i18n via `setState` se necessário.
 *
 * **Codec/container resolvidos externamente:**
 * O controller não chama `checkSupport` — isso é responsabilidade do hook
 * fachada (`useSpeedPaintExporter`), que sincroniza `codec` e `container`
 * no store via `setState({ codec, container })` quando o
 * `useCodecSupport` resolve. O controller lê via `get().codec` e
 * `get().container`.
 *
 * @see videoRenderController — `docs/plan/video-render-survive-navigation-architecture.md §3 M2`
 */
import { create } from 'zustand';
import type { ComponentType, ReactNode } from 'react';
import { renderMediaOnWeb, type RenderMediaOnWebProgress, type RenderMediaOnWebResult } from '@remotion/web-renderer';
import { getSpeedPaintSequenceTiming, type SpeedPaintTimingMode } from '../../video-render/lib/speedPaintTimings';
import { patchCanvasFontStretch } from '../../video-render/lib/canvasFontStretchPatch';
import { isCancellationError, toUserFriendlyError } from '../../video-render/lib/exportUtils';
import { generateStrokesFromImage } from '../lib/imageProcessing';
import { downloadFile } from '../../../lib/download';
import { createLogger } from '../../../lib/logger';
import { trackAnalyticsEvent, categorizeAnalyticsError } from '../../../lib/analytics';
import type {
  RenderControllerPublicState,
  RenderControllerActions,
  RenderKind,
  RenderStatus,
} from '../../video-render/types/renderController';
import {
  getSpeedPaintResolution,
  type SpeedPaintExportOptions,
  type SpeedPaintBatchExportOptions,
} from '../hooks/useSpeedPaintExporter';
import type { StrokeAnimation, VetorialAnimation } from '../types';

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

/** Props da composição de speed paint para exportação (single) */
interface SpeedPaintCompositionProps {
  animation: StrokeAnimation | VetorialAnimation;
  imageSource: string;
  showDrawTool: boolean;
}

/** Props da composição de speed paint VETORIAL (whiteboard) para exportação.
 *  Não consome `imageSource` — a imagem original já foi vetorizada em
 *  `animation.paths` pelo pipeline `imageProcessing.ts` (Fase 2.1). */
interface WhiteboardRenderProps {
  animation: VetorialAnimation;
  showDrawTool: boolean;
  /**
   * Curva de easing (v0.135.2 / F3). Default `undefined` = usa o
   * default interno de `WhiteboardScene` (`Easing.inOut(Easing.ease)`).
   * Aceita a string serializável `VetorialEasingType` — a conversão
   * para `EasingFunction` do Remotion acontece dentro da composição
   * via `getRemotionEasing` (boundary entre store e Remotion).
   */
  easing?: import('../types/vetorial').VetorialEasingType;
}

/** Item de uma composição batch — par (animação, imagem) */
interface BatchSpeedPaintCompositionItem {
  animation: StrokeAnimation | VetorialAnimation;
  imageSource: string;
}

/** Props da composição batch */
interface BatchSpeedPaintCompositionProps {
  items: BatchSpeedPaintCompositionItem[];
  showDrawTool: boolean;
  sceneDurationInFrames: number;
  sceneStepFrames: number;
  timingMode: SpeedPaintTimingMode;
  /** Easing do lote (v0.135.2 / F3). */
  easing?: import('../types/vetorial').VetorialEasingType;
}

/**
 * Wrapper com index signature para satisfazer a constraint
 * `Props extends Record<string, unknown>` exigida pelo `renderMediaOnWeb`.
 */
type ExportableSpeedPaintProps = SpeedPaintCompositionProps & { [key: string]: unknown };
type ExportableWhiteboardProps = WhiteboardRenderProps & { [key: string]: unknown };
type ExportableBatchSpeedPaintProps = BatchSpeedPaintCompositionProps & { [key: string]: unknown };

/** `compositionId` único por modo — Remotion precisa de IDs distintos para
 *  cada composição, mesmo que renderizem o mesmo componente base. */
const COMPOSITION_ID_MASK = 'script-master-speed-paint-export';
const COMPOSITION_ID_VETORIAL = 'script-master-speed-paint-vetorial-export';
const COMPOSITION_ID_BATCH = 'script-master-speed-paint-batch-export';

// ---------------------------------------------------------------------------
// Composições React (exportáveis pelo Remotion)
// ---------------------------------------------------------------------------

async function createExportableSpeedPaintComposition(): Promise<ComponentType<ExportableSpeedPaintProps>> {
  const [{ AbsoluteFill, useVideoConfig }, { SpeedPaintScene }] = await Promise.all([
    import('remotion'),
    import('../../video-render/components/SpeedPaintScene'),
  ]);

  /**
   * Wrapper de SpeedPaintScene para exportação single. Usa `useVideoConfig`
   * para obter `durationInFrames` calculado pelo Remotion, e renderiza
   * SpeedPaintScene com `isExporting=true` para desabilitar overlays de debug.
   */
  return function ExportableSpeedPaintComposition(props: ExportableSpeedPaintProps): ReactNode {
    const { animation, imageSource, showDrawTool } = props;
    const { durationInFrames } = useVideoConfig();

    return (
      <AbsoluteFill style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}>
        <SpeedPaintScene
          animation={animation as StrokeAnimation}
          imageSource={imageSource}
          durationInFrames={durationInFrames}
          showDrawTool={showDrawTool}
          isLastScene
          isExporting
          timingMode="duration-based"
        />
      </AbsoluteFill>
    );
  };
}

async function createExportableBatchSpeedPaintComposition(): Promise<ComponentType<ExportableBatchSpeedPaintProps>> {
  const [{ AbsoluteFill, Sequence }, { SpeedPaintScene }, { WhiteboardScene }, { getRemotionEasing }] = await Promise.all([
    import('remotion'),
    import('../../video-render/components/SpeedPaintScene'),
    import('../../video-render/components/WhiteboardScene'),
    import('../../video-render/lib/easingConverter'),
  ]);

  /**
   * Wrapper de SpeedPaintScene para exportação em lote. Encadeia cenas via
   * `Sequence` com `from` calculado pelo `sceneStepFrames` e duração fixa por
   * cena (`sceneDurationInFrames`). Última cena tem `isLastScene=true`.
   *
   * ## Suporte ao modo vetorial (v0.135.1)
   *
   * Discrimina `VetorialAnimation` vs `StrokeAnimation` via `'paths' in animation`
   * (campo exclusivo de `VetorialAnimation`). Para vetorial, renderiza
   * `WhiteboardScene` via wrapper interno (`VetorialBatchSceneWrapper`) que
   * recebe `sceneDurationInFrames` como prop — `useVideoConfig()` dentro de
   * uma `<Sequence>` retorna a duração TOTAL da composição (todo o batch),
   * não da cena local, fazendo cada cena desenhar só uma fração dos paths.
   *
   * Antes da correção (v0.135.1), o JSX forçava `animation as StrokeAnimation`
   * sem type guard. Quando `animation` era `VetorialAnimation`, o cast silencioso
   * deixava passar para `SpeedPaintScene`, que lia `animation.strokes.length`
   * → `TypeError: Cannot read properties of undefined` no primeiro frame. A
   * UI atual (`SpeedPaintPage.startBatchRender`) nunca passa `renderMode:
   * 'vetorial'`, então o caminho era armadilha latente. Esta correção elimina
   * o cast mentiroso e o dead code.
   *
   * v0.135.2 (F3): passa `easing` (VetorialEasingType) ao wrapper vetorial
   * — convertido para `EasingFunction` do Remotion via `getRemotionEasing`.
   */
  return function ExportableBatchSpeedPaintComposition(props: ExportableBatchSpeedPaintProps): ReactNode {
    const { items, showDrawTool, sceneDurationInFrames, sceneStepFrames, timingMode, easing } = props;

    return (
      <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {items.map((item, index) => {
          const isVetorial = 'paths' in item.animation;
          return (
            <Sequence
              key={`${item.animation.id}-${index}`}
              from={index * sceneStepFrames }
              durationInFrames={sceneDurationInFrames}
            >
              {isVetorial ? (
                <VetorialBatchSceneWrapper
                  animation={item.animation as VetorialAnimation}
                  durationInFrames={sceneDurationInFrames}
                  showDrawTool={showDrawTool}
                  isLastScene={index === items.length - 1}
                  easing={easing}
                />
              ) : (
                <SpeedPaintScene
                  animation={item.animation as StrokeAnimation}
                  imageSource={item.imageSource}
                  durationInFrames={sceneDurationInFrames}
                  showDrawTool={showDrawTool}
                  isLastScene={index === items.length - 1}
                  isExporting
                  fitMode="contain"
                  timingMode={timingMode}
                />
              )}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    );
  };

  /**
   * Wrapper de WhiteboardScene para uma cena vetorial dentro do batch. Tem que
   * ser declarado dentro de `createExportableBatchSpeedPaintComposition` para
   * capturar `WhiteboardScene` do lazy import — não pode ser movido para
   * escopo de módulo sem quebrar o split de bundle (Remotion + WhiteboardScene
   * só entram no chunk quando `startBatchRender` é chamado).
   *
   * ## Por que `durationInFrames` é prop (não `useVideoConfig`)?
   *
   * Passamos `sceneDurationInFrames` como prop explícita em vez de chamar
   * `useVideoConfig().durationInFrames` dentro do wrapper. **Robustez contra
   * mudanças internas do Remotion**: na versão 4.0.448 instalada,
   * `useVideoConfig().durationInFrames` dentro de uma `<Sequence>` retorna
   * a duração da própria Sequence (não da composição raiz) — o que na
   * verdade funcionaria para nós — mas em outras versões pode variar.
   * Usar prop explícita garante o mesmo valor que `SpeedPaintScene` mask
   * recebe e elimina a dependência do comportamento implícito do
   * `SequenceContext` do Remotion.
   *
   * (W-01 da auditoria v0.135.1 rodada 6: doc-comment anterior afirmava
   * incorretamente que `useVideoConfig` retornava a duração da composição
   * raiz dentro de `<Sequence>`, com base em doc-comment de "notebook Remotion"
   * inexistente no projeto. O source real do `remotion@4.0.448` instalado
   * mostra que `useVideoConfig().durationInFrames` dentro de `<Sequence>`
   * retorna a duração da Sequence. A correção do comentário evita
   * manutenções futuras baseadas em premissa falsa — a prop explícita
   * continua sendo a escolha mais defensiva.)
   */
  function VetorialBatchSceneWrapper({
    animation,
    durationInFrames,
    showDrawTool,
    isLastScene,
    easing,
  }: {
    animation: VetorialAnimation;
    durationInFrames: number;
    showDrawTool: boolean;
    isLastScene: boolean;
    easing: import('../types/vetorial').VetorialEasingType | undefined;
  }): ReactNode {
    return (
      <WhiteboardScene
        animation={animation}
        durationInFrames={durationInFrames}
        showDrawTool={showDrawTool}
        isLastScene={isLastScene}
        isExporting
        easing={getRemotionEasing(easing)}
        // v0.135.2 (F4): espelha `fitMode="contain"` do `SpeedPaintScene`
        // (modo mask) — cenas com proporção diferente da composição são
        // redimensionadas para caber sem distorcer. Sem isso, uma cena
        // 1:1 num batch 16:9 ficaria deslocada para o canto superior
        // esquerdo, com o resto do canvas vazio.
        fitMode="contain"
      />
    );
  }
}

/**
 * Composição lazy para o modo **vetorial** (whiteboard).
 *
 * Análoga a `createExportableSpeedPaintComposition()` (modo máscara), mas
 * envolvendo `WhiteboardScene` (Fase 3.1) em vez de `SpeedPaintScene`. O modo
 * vetorial é selecionado quando `useAnimationStore.getState().renderMode ===
 * 'vetorial'` e o `animation` discriminado por `'paths' in animation`
 * (campo exclusivo de `VetorialAnimation`).
 *
 * **Por que `WhiteboardScene` direto (sem `WhiteboardComposition`)?**
 * Segue o mesmo padrão da máscara: a função retorna um componente anônimo
 * que renderiza o JSX inline. O `WhiteboardComposition` em
 * `src/features/speed-paint/components/` existe para uso fora do controller
 * (ex: Remotion Studio), mas aqui o lazy import direto de `WhiteboardScene`
 * preserva o split de bundle (evita trazer o `WhiteboardComposition` para o
 * chunk de export).
 *
 * **Não consome `imageSource`** — a imagem original já foi vetorizada em
 * `animation.paths` pelo pipeline `imageProcessing.ts` (Fase 2.1).
 *
 * v0.135.2 (F3): converte `easing: VetorialEasingType` (string) para
 * `EasingFunction` (Remotion) via `getRemotionEasing` no boundary.
 */
async function createExportableWhiteboardComposition(): Promise<ComponentType<ExportableWhiteboardProps>> {
  const [{ AbsoluteFill, useVideoConfig }, { WhiteboardScene }, { getRemotionEasing }] = await Promise.all([
    import('remotion'),
    import('../../video-render/components/WhiteboardScene'),
    import('../../video-render/lib/easingConverter'),
  ]);

  /**
   * Wrapper de WhiteboardScene para exportação single (modo vetorial). Usa
   * `useVideoConfig` para obter `durationInFrames` calculado pelo Remotion, e
   * renderiza WhiteboardScene com `isExporting=true` para desabilitar overlays
   * de debug (placeholder da Fase 3.1, ainda sem badges de preview).
   */
  return function ExportableWhiteboardComposition(props: ExportableWhiteboardProps): ReactNode {
    const { animation, showDrawTool, easing } = props;
    const { durationInFrames } = useVideoConfig();

    return (
      <AbsoluteFill
        style={{ backgroundColor: animation.canvasColor === 'white' ? '#fff' : '#000' }}
      >
        <WhiteboardScene
          animation={animation}
          durationInFrames={durationInFrames}
          showDrawTool={showDrawTool}
          isLastScene
          isExporting
          easing={getRemotionEasing(easing)}
        />
      </AbsoluteFill>
    );
  };
}

// ---------------------------------------------------------------------------
// Estado privado do módulo (não exposto via Zustand)
// ---------------------------------------------------------------------------

/** AbortController ativo — vive no closure para sobreviver a unmount de componente */
let abortController: AbortController | null = null;
/** Identifica qual render é o "atual" — renders obsoletos não devem escrever estado */
let currentRenderId = 0;
/** Cache do módulo Remotion lazy-imported (só baixa uma vez) */
let remotionModule: typeof import('@remotion/web-renderer') | null = null;
/** Objeto mutável para throttle do percentual (não é ref React — vive no módulo) */
const lastReportedPercentRef = { current: -1 };
/** Nome do arquivo do último export (usado por autoDownload e handleDownload) */
let currentExportFileName = '';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = createLogger('speedPaintRenderController');

// ---------------------------------------------------------------------------
// Lazy import do Remotion (preserva o bundle principal)
// ---------------------------------------------------------------------------

/** Carrega o `@remotion/web-renderer` apenas na primeira chamada. Retorna o módulo cacheado. */
async function loadRenderImpl(): Promise<typeof import('@remotion/web-renderer')> {
  if (!remotionModule) {
    remotionModule = await import('@remotion/web-renderer');
  }
  return remotionModule;
}

// ---------------------------------------------------------------------------
// Tipo do store
// ---------------------------------------------------------------------------

interface SpeedPaintRenderControllerStore
  extends RenderControllerPublicState,
    RenderControllerActions<SpeedPaintExportOptions | SpeedPaintBatchExportOptions> {
  /** Mantido para compatibilidade com consumidores que verificam wasCancelled. */
  wasCancelled: boolean;
  /** 0 = single render; 1-N = batch em andamento (index atual sendo processado) */
  currentBatchIndex: number;
  /** 0 = single render; >0 = tamanho do batch */
  totalBatchItems: number;
  /** Inicia exportação em lote (múltiplas cenas em uma composição sequenciada). */
  startBatchRender: (options: SpeedPaintBatchExportOptions) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers de status — throttle do percentual
// ---------------------------------------------------------------------------

type SetFn = (
  partial:
    | Partial<SpeedPaintRenderControllerStore>
    | ((state: SpeedPaintRenderControllerStore) => Partial<SpeedPaintRenderControllerStore>),
) => void;

type GetFn = () => SpeedPaintRenderControllerStore;

/**
 * Escreve progresso no Zustand (SEM bridge — speed paint não tem bridge).
 * Recebe `set` por injeção para evitar forward-reference.
 */
function reportProgress(set: SetFn, percent: number, statusText: string): void {
  // Throttle: só atualiza se o inteiro mudou
  if (percent === lastReportedPercentRef.current) return;
  lastReportedPercentRef.current = percent;
  set({
    renderProgress: percent,
    renderStatusText: statusText,
    lastProgressUpdateAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

const INITIAL_STATE: RenderControllerPublicState = {
  kind: 'speed-paint' as RenderKind,
  status: 'idle' as RenderStatus,
  isRendering: false,
  renderProgress: 0,
  renderStatusText: '',
  outputBlob: null,
  outputUrl: null,
  error: null,
  startedAt: null,
  lastProgressUpdateAt: 0,
  codec: 'h264',
  container: 'mp4',
  speedPaintWarnings: [],
  saveWarning: null,
};

// ---------------------------------------------------------------------------
// Store Zustand singleton
// ---------------------------------------------------------------------------

/** Hook de acesso ao controller — use `useStore(useSpeedPaintRenderController, selector)` para reatividade */
export const useSpeedPaintRenderController = create<SpeedPaintRenderControllerStore>()((set, get) => ({
  ...INITIAL_STATE,
  wasCancelled: false,
  currentBatchIndex: 0,
  totalBatchItems: 0,

  // -------------------------------------------------------------------------
  // startRender — dispatches para single ou batch baseado nas opções
  // -------------------------------------------------------------------------
  startRender: async (options) => {
    if ('items' in options) {
      await get().startBatchRender(options);
      return;
    }
    await runSingleRender(set, get, options);
  },

  // -------------------------------------------------------------------------
  // startBatchRender — múltiplas cenas encadeadas em uma composição
  // -------------------------------------------------------------------------
  startBatchRender: async (options) => {
    await runBatchRender(set, get, options);
  },

  // -------------------------------------------------------------------------
  // cancelRender — cancela render em andamento ou descarta blob
  // -------------------------------------------------------------------------
  cancelRender: () => {
    const state = get();

    // Se já completou, não descarta o blob — apenas marca como cancelado
    if (state.outputBlob) {
      set({
        status: 'cancelled' as RenderStatus,
        isRendering: false,
        wasCancelled: true,
      });
      return;
    }

    // Aborta render em andamento
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Revoga blob URL se existir (preemptivamente)
    if (state.outputUrl && state.outputUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.outputUrl);
    }

    set({
      status: 'cancelled' as RenderStatus,
      isRendering: false,
      wasCancelled: true,
      outputBlob: null,
      outputUrl: null,
      renderProgress: 0,
      renderStatusText: 'Exportação cancelada.',
      error: null,
      startedAt: null,
      speedPaintWarnings: [],
    });
  },

  // -------------------------------------------------------------------------
  // reset — limpa tudo (revoga blob URL, aborta, volta a 'idle').
  //    v0.135.2 (F1 da auditoria): preserva `codec`/`container` resolvidos
  //    pelo `useCodecSupport` — sem isso, a próxima exportação voltaria a
  //    usar h264/mp4 padrão em vez do fallback VP8/WebM já resolvido.
  // -------------------------------------------------------------------------
  reset: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    const url = get().outputUrl;
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }

    currentExportFileName = '';

    set({
      ...INITIAL_STATE,
      kind: 'speed-paint' as RenderKind,
      status: 'idle' as RenderStatus,
      wasCancelled: false,
      currentBatchIndex: 0,
      totalBatchItems: 0,
      codec: get().codec,
      container: get().container,
    });
  },

  // -------------------------------------------------------------------------
  // setCodecContainer — sincroniza codec/container resolvidos do hook
  // fachada (`useSpeedPaintExporter`). Chamado via useEffect quando
  // `useCodecSupport` resolve. Action nomeada evita setState externo direto
  // (mantém a fronteira de mutação encapsulada no store).
  // -------------------------------------------------------------------------
  setCodecContainer: (codec: string, container: string) => {
    set({ codec, container });
  },
}));

// ---------------------------------------------------------------------------
// Implementação: render single
// ---------------------------------------------------------------------------

/**
 * Helper genérico para chamar `renderMediaOnWeb` preservando o tipo concreto
 * de `Props` (mask **ou** vetorial). O TS rejeita uniões em
 * `composition.component` por variância (um `ComponentType<A>` não é
 * subtipo de `ComponentType<A | B>` nem vice-versa) — esta função resolve
 * isso inferindo `P` a partir do argumento `Component`, garantindo que
 * `inputProps` e `component` sejam do mesmo tipo em cada chamada.
 *
 * @param Component  - Componente lazy tipado (`ComponentType<P>`).
 * @param inputProps - Props correspondentes ao componente.
 * @param compositionId - ID único da composição (`mask` ou `vetorial`).
 * @param resolution - Resolução de saída (width/height em pixels).
 * @param fps        - FPS da composição.
 * @param durationInFrames - Duração total em frames.
 * @param signal     - `AbortSignal` para cancelamento.
 * @param codec      - Codec de vídeo resolvido pelo `useCodecSupport`.
 * @param container  - Container de saída (`mp4` ou `webm`).
 * @param onProgress - Callback de progresso (0.0–1.0).
 */
async function invokeRenderMediaOnWeb<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  inputProps: P,
  compositionId: string,
  resolution: { width: number; height: number },
  fps: number,
  durationInFrames: number,
  signal: AbortSignal,
  codec: 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
  container: 'mp4' | 'webm',
  onProgress: (progress: RenderMediaOnWebProgress) => void,
): Promise<RenderMediaOnWebResult> {
  return renderMediaOnWeb({
    composition: {
      component: Component,
      id: compositionId,
      width: resolution.width,
      height: resolution.height,
      fps,
      durationInFrames,
      defaultProps: inputProps,
    },
    inputProps,
    videoCodec: codec,
    audioCodec: null, // Sem áudio — speed paint é mudo
    container,
    licenseKey: 'free-license',
    signal,
    // DESABILITADO: allowHtmlInCanvas causa flashs pretos no speed paint.
    // O drawElementImage (Chromium experimental) não captura canvas 2D
    // de forma confiável. O software renderer lê pixels via drawImage(canvas).
    onProgress,
  });
}

/** Renderiza uma única cena de speed paint. Migrado de useSpeedPaintExporter.startRender. */
async function runSingleRender(
  set: SetFn,
  get: GetFn,
  options: SpeedPaintExportOptions,
): Promise<void> {
  const {
    animation,
    imageSource,
    fps,
    durationInFrames,
    quality,
    showDrawTool = true,
    fileName,
    autoDownload = false,
    easing,
  } = options;

  // 1. Identifica esta renderização — catch/finally antigos serão ignorados
  const renderId = ++currentRenderId;

  // 2. Cacheia fileName em escopo de módulo (usado por autoDownload e handleDownload)
  currentExportFileName = fileName ?? '';

  // 3. Decide o modo de renderização (Fase 3.2) **antes** de validar
  //    `imageSource`. O discriminante primário é o **dado** da animação
  //    (`'paths' in animation`) — é a fonte da verdade. O `renderMode` da
  //    store é um hint secundário (telemetria/consistência), mas NÃO é
  //    confiável: o usuário pode trocar o modo sem regenerar (debounce do
  //    `useSyncSpeedPaintRenderMode` abre uma janela em que o store já
  //    diz "mask" mas `job.animation` ainda é `VetorialAnimation`).
  //    Discriminar só pelo tipo do dado evita o TypeError em `SpeedPaintScene`
  //    quando ele tenta ler `animation.strokes.length` numa VetorialAnimation.
  //    Padrão idêntico ao `createExportableBatchSpeedPaintComposition` (linha 188).
  const isVetorial = 'paths' in animation;

  // 4. Validação — antes de criar AbortController.
  //    Modo máscara exige `imageSource` (raspadinha usa a imagem de fundo).
  //    Modo vetorial dispensa — a imagem já foi vetorizada em
  //    `animation.paths` pelo pipeline `imageProcessing.ts` (Fase 2.1).
  //    v0.135.2 (F14 da auditoria): em vez de retorno silencioso (`return;`),
  //    seta `status: 'failed'` com mensagem clara para que a UI não fique
  //    travada em estado idle após validação inválida.
  if (!isVetorial && !imageSource) {
    log.warn('Renderização speed paint recusada: imageSource ausente no modo máscara');
    set({
      ...INITIAL_STATE,
      kind: 'speed-paint' as RenderKind,
      status: 'failed' as RenderStatus,
      isRendering: false,
      error: 'Imagem de origem ausente — não é possível renderizar o modo máscara.',
      renderStatusText: 'Falha na exportação',
      // Preserva codec/container resolvidos pelo useCodecSupport
      codec: get().codec,
      container: get().container,
    });
    return;
  }

  // 5. Cancela render anterior se existir (2ª exportação cancela 1ª)
  if (abortController) {
    log.warn('Renderização já em andamento — abortando anterior antes de iniciar nova');
    abortController.abort();
    abortController = null;
  }

  // 6. Cria novo AbortController em escopo de módulo
  abortController = new AbortController();
  const signal = abortController.signal;

  // 7. Reseta throttle do percentual
  lastReportedPercentRef.current = -1;

  // 8. Reseta estado para "preparing" — feedback visual imediato.
  //    v0.135.2 (F1 da auditoria): `...INITIAL_STATE` zeraria `codec` e
  //    `container` para os defaults `'h264'`/`'mp4'`, sobrescrevendo o
  //    fallback VP8/WebM que `useCodecSupport` resolveu para browsers sem
  //    H.264 (ex: Firefox Linux). Preservamos os valores atuais para que
  //    o `invokeRenderMediaOnWeb` abaixo receba o codec correto.
  set({
    ...INITIAL_STATE,
    kind: 'speed-paint' as RenderKind,
    status: 'preparing' as RenderStatus,
    isRendering: true,
    renderProgress: 0,
    renderStatusText: 'Preparando exportação...',
    startedAt: Date.now(),
    lastProgressUpdateAt: Date.now(),
    wasCancelled: false,
    currentBatchIndex: 0,
    totalBatchItems: 0,
    codec: get().codec,
    container: get().container,
  });

  const resolution = getSpeedPaintResolution(animation.canvasWidth, animation.canvasHeight, quality);
  const analyticsParams = { quality, mode: 'single' as const };
  trackAnalyticsEvent('speed_paint_export_started', analyticsParams);

  // 9. Seleciona composição lazy + inputProps baseado em `renderMode` e na
  //    presença de `paths` na animação. O `compositionId` precisa ser único
  //    por composição (constraint do `renderMediaOnWeb`) — usa IDs distintos
  //    para mask e vetorial. A chamada `invokeRenderMediaOnWeb` é feita
  //    dentro de cada branch para que o generic `P` seja inferido
  //    corretamente (o TS rejeita uniões em `composition.component` por
  //    variância).
  let inputProps: ExportableSpeedPaintProps | ExportableWhiteboardProps;
  let compositionId: string;
  let ExportableComposition:
    | ComponentType<ExportableSpeedPaintProps>
    | ComponentType<ExportableWhiteboardProps>;

  // 10. Carrega Remotion lazy + composição lazy conforme o modo
  try {
    if (isVetorial) {
      // Modo vetorial (whiteboard) — `paths` foi confirmado pelo type guard.
      // Narrowing real: o `isVetorial` acima estreita `animation` para
      // `VetorialAnimation` em runtime (mesmo que o TS ainda veja a união
      // declarada em `SpeedPaintExportOptions`).
      // v0.135.2 (F3): propaga `easing` para a composição. `canvasColor`
      // já está dentro de `animation` (F2).
      inputProps = {
        animation,
        showDrawTool,
        ...(easing !== undefined ? { easing } : {}),
      };
      compositionId = COMPOSITION_ID_VETORIAL;
      ExportableComposition = await createExportableWhiteboardComposition();
    } else {
      // Modo máscara (default) — comportamento atual idêntico ao legado.
      // O cast `as StrokeAnimation` aqui é inevitável: o generic `P` de
      // `ExportableSpeedPaintProps` exige `StrokeAnimation` apenas, e o TS
      // não consegue inferir narrowing reverso (ausência de `paths` não
      // garante `StrokeAnimation`). O controller valida via `'paths' in
      // animation` em runtime, então o cast é seguro.
      inputProps = {
        animation: animation as StrokeAnimation,
        imageSource,
        showDrawTool,
      };
      compositionId = COMPOSITION_ID_MASK;
      ExportableComposition = await createExportableSpeedPaintComposition();
    }
  } catch (err) {
    log.error('Falha ao carregar módulo de renderização speed paint', { error: err });
    if (currentRenderId !== renderId) return;
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    set({
      status: 'failed' as RenderStatus,
      isRendering: false,
      wasCancelled: false,
      error: `Falha ao carregar módulo de renderização: ${message}. Tente recarregar a página.`,
      renderStatusText: 'Falha na exportação',
    });
    return;
  }

  // 11. Aplica patch que traduz fontStretch percentual → keyword para a Canvas API
  patchCanvasFontStretch();

  // 12. Atualiza status para 'rendering'
  set({
    status: 'rendering' as RenderStatus,
    renderStatusText: 'Renderizando...',
  });

  try {
    // Callback de progresso compartilhado entre as duas branches.
    const onProgress = (progress: RenderMediaOnWebProgress): void => {
      const percent = Math.round(progress.progress * 100);
      reportProgress(
        set,
        percent,
        percent < 100 ? `Renderizando... ${percent}%` : 'Finalizando exportação...',
      );
    };
    const codec = get().codec as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1';
    const container = get().container as 'mp4' | 'webm';

    // Branch dedicada para `renderMediaOnWeb` — cada uma tem tipo concreto
    // (sem uniões) para que o generic `P` do `invokeRenderMediaOnWeb` infira
    // corretamente. As branches compartilham o mesmo try/catch e o resto
    // do fluxo (blob, download, etc.) é idêntico.
    let result: RenderMediaOnWebResult;
    if (isVetorial) {
      result = await invokeRenderMediaOnWeb(
        ExportableComposition as ComponentType<ExportableWhiteboardProps>,
        inputProps as ExportableWhiteboardProps,
        compositionId,
        resolution,
        fps,
        durationInFrames,
        signal,
        codec,
        container,
        onProgress,
      );
    } else {
      result = await invokeRenderMediaOnWeb(
        ExportableComposition as ComponentType<ExportableSpeedPaintProps>,
        inputProps as ExportableSpeedPaintProps,
        compositionId,
        resolution,
        fps,
        durationInFrames,
        signal,
        codec,
        container,
        onProgress,
      );
    }

    // 13. Obtém blob final (assíncrono)
    const blob = await result.getBlob();
    const localUrl = URL.createObjectURL(blob);

    // 14. Edge case: se outra renderização sobrescreveu, não substituir estado
    if (currentRenderId !== renderId) {
      URL.revokeObjectURL(localUrl);
      log.warn('Render obsoleto — URL local descartada');
      return;
    }

    // 15. Auto-download se solicitado
    if (autoDownload) {
      const ext = get().container === 'webm' ? 'webm' : 'mp4';
      const name = currentExportFileName || `speed-paint-${Date.now()}`;
      await downloadFile(localUrl, `${name}.${ext}`);
    }

    // 16. Render concluído com sucesso
    set({
      status: 'completed' as RenderStatus,
      isRendering: false,
      renderProgress: 100,
      renderStatusText: 'Exportação concluída!',
      outputBlob: blob,
      outputUrl: localUrl,
      error: null,
      wasCancelled: false,
      lastProgressUpdateAt: Date.now(),
    });

    trackAnalyticsEvent('speed_paint_export_completed', {
      ...analyticsParams,
      codec: get().codec,
      container: get().container,
    });
  } catch (err: unknown) {
    // Ignora erros de renders antigos
    if (currentRenderId !== renderId) return;

    const cancelled = isCancellationError(err);
    trackAnalyticsEvent(cancelled ? 'speed_paint_export_cancelled' : 'speed_paint_export_failed', {
      ...analyticsParams,
      error_category: categorizeAnalyticsError(err),
    });

    set({
      status: cancelled ? ('cancelled' as RenderStatus) : ('failed' as RenderStatus),
      isRendering: false,
      wasCancelled: cancelled,
      error: cancelled ? null : toUserFriendlyError(err, log),
      renderStatusText: cancelled ? 'Exportação cancelada.' : 'Falha na exportação',
    });
  } finally {
    // Limpa refs apenas se esta ainda é a renderização atual
    if (currentRenderId === renderId) {
      abortController = null;
      lastReportedPercentRef.current = -1;
    }
  }
}

// ---------------------------------------------------------------------------
// Implementação: render batch
// ---------------------------------------------------------------------------

/**
 * Renderiza múltiplas cenas encadeadas em uma única composição. Migrado de
 * `useSpeedPaintExporter.startBatchRender`.
 *
 * **L8 (RF-07):** O batch agora aceita `renderMode`/`vetorialPreset` e gera
 * `VetorialAnimation` por item quando `renderMode === 'vetorial'`. A
 * composição (`createExportableBatchSpeedPaintComposition`) já aceita a
 * união `StrokeAnimation | VetorialAnimation` em `BatchSpeedPaintCompositionItem.animation`,
 * e o `VideoComposition` (que renderiza cada cena) já discrimina via type
 * guard real (L2) — sem cast, sem `as` bypass. Lote uniforme (D04): todas
 * as cenas usam o mesmo modo vigente na exportação.
 */
async function runBatchRender(
  set: SetFn,
  get: GetFn,
  options: SpeedPaintBatchExportOptions,
): Promise<void> {
  const {
    items,
    fps,
    quality,
    showDrawTool = true,
    fileName,
    sceneDurationSeconds = 15,
    renderMode,
    vetorialPreset,
    vetorialSortOrder,
    canvasColor,
    easing,
  } = options;

  // 1. Identifica esta renderização
  const renderId = ++currentRenderId;
  currentExportFileName = fileName ?? '';

  // 2. Validação — v0.135.2 (F14 da auditoria): em vez de retorno silencioso,
  //    seta `status: 'failed'` para que a UI mostre o motivo em vez de ficar
  //    eternamente em estado idle.
  if (items.length === 0) {
    log.warn('Renderização de lote speed paint recusada: nenhum item na fila');
    set({
      ...INITIAL_STATE,
      kind: 'speed-paint' as RenderKind,
      status: 'failed' as RenderStatus,
      isRendering: false,
      error: 'Nenhuma imagem na fila para exportar.',
      renderStatusText: 'Falha na exportação',
      codec: get().codec,
      container: get().container,
    });
    return;
  }

  const analyticsParams = { quality, mode: 'batch' as const, scene_count: items.length };
  trackAnalyticsEvent('speed_paint_export_started', analyticsParams);

  // 3. Cancela render anterior
  if (abortController) {
    log.warn('Renderização já em andamento — abortando anterior antes de iniciar lote');
    abortController.abort();
    abortController = null;
  }

  abortController = new AbortController();
  const signal = abortController.signal;

  lastReportedPercentRef.current = -1;

  // 4. Reseta estado para "preparing". v0.135.2 (F1 da auditoria): preserva
  //    `codec`/`container` resolvidos pelo `useCodecSupport` (mesma justificativa
  //    de `runSingleRender` acima).
  set({
    ...INITIAL_STATE,
    kind: 'speed-paint' as RenderKind,
    status: 'preparing' as RenderStatus,
    isRendering: true,
    renderProgress: 0,
    renderStatusText: 'Preparando exportação do lote...',
    startedAt: Date.now(),
    lastProgressUpdateAt: Date.now(),
    wasCancelled: false,
    currentBatchIndex: 0,
    totalBatchItems: items.length,
    codec: get().codec,
    container: get().container,
  });

  const generationWeight = 50;
  const batchAnimations: BatchSpeedPaintCompositionItem[] = [];

  try {
    // 5. Loop de geração de stroke animations (fase 0-50%)
    for (const [index, item] of items.entries()) {
      if (signal.aborted) {
        throw new DOMException('Batch export aborted', 'AbortError');
      }

      set({ currentBatchIndex: index + 1 });

      const animation = await generateStrokesFromImage(
        item.imageSource,
        (progress) => {
          if (signal.aborted) return;
          const itemProgress = (index + progress) / items.length;
          const percent = Math.round(itemProgress * generationWeight);
          reportProgress(
            set,
            percent,
            `Gerando animações... ${index + 1 }/${items.length}`,
          );
        },
        {
          signal,
          // L8: propaga modo+preset+sortOrder uniformes para o lote.
          // `vetorialPreset` e `vetorialSortOrder` só são enviados no modo
          // vetorial (economiza payload e evita warning do cache por chave
          // sem discriminator). (W-B da auditoria v0.135.1 rodada 6.)
          ...(renderMode !== undefined ? { renderMode } : {}),
          ...(renderMode === 'vetorial' && vetorialPreset !== undefined ? { vetorialPreset } : {}),
          ...(renderMode === 'vetorial' && vetorialSortOrder !== undefined ? { vetorialSortOrder } : {}),
          // v0.135.2 (F2): propaga canvasColor (fundo) para o pipeline.
          ...(canvasColor !== undefined ? { canvasColor } : {}),
        },
      );

      batchAnimations.push({
        animation,
        imageSource: animation.resizedImage || item.imageSource,
      });
    }

    const firstAnimation = batchAnimations[0]?.animation;
    // v0.135.3 (S3 da auditoria): este branch é **defesa em profundidade**.
    // Em produção, é inatingível — o guard `items.length === 0` no início
    // de `runBatchRender` já aborta o fluxo, e o `items.map(...)` só não
    // produz animação se TODOS os items retornarem `null` do
    // `generateStrokesFromImage` (cenário hipotético: fila com imagens
    // 100% corrompidas). Mantido por três razões:
    //   1) Simetria com F14 (edge cases explicitados, não silenciados)
    //   2) Endurecimento contra refatorações futuras que removam o
    //      `items.length === 0` guard
    //   3) Type safety: `firstAnimation` é `VetorialAnimation | undefined`
    //      e é usado em `firstAnimation.canvasWidth` abaixo — sem este
    //      guard, o TS emite erro de compilação por uso de `.canvasWidth`
    //      em `undefined` (não é `any`, é erro de tipo). O `if` confirma
    //      o narrowing para `VetorialAnimation`.
    if (!firstAnimation) {
      log.warn('Loop de geração de animações do lote não produziu resultado');
      set({
        ...INITIAL_STATE,
        kind: 'speed-paint' as RenderKind,
        status: 'failed' as RenderStatus,
        isRendering: false,
        error: 'Nenhuma cena pôde ser processada para exportação.',
        renderStatusText: 'Falha na exportação',
        codec: get().codec,
        container: get().container,
      });
      return;
    }

    // 6. Aplica patch de fontStretch
    patchCanvasFontStretch();
    lastReportedPercentRef.current = -1;

    // 7. Calcula timings do batch
    const sceneDurationInFrames = Math.max(1, Math.round(sceneDurationSeconds * fps));
    const timingMode: SpeedPaintTimingMode = 'sequenced-batch';
    const { sceneStepFrames, totalDurationInFrames } = getSpeedPaintSequenceTiming(
      sceneDurationInFrames,
      batchAnimations.length,
      fps,
      timingMode,
    );
    const durationInFrames = totalDurationInFrames;
    const resolution = getSpeedPaintResolution(
      firstAnimation.canvasWidth,
      firstAnimation.canvasHeight,
      quality,
    );
    const exportableInputProps: ExportableBatchSpeedPaintProps = {
      items: batchAnimations,
      showDrawTool,
      sceneDurationInFrames,
      sceneStepFrames,
      timingMode,
      // v0.135.2 (F3): propaga easing para a composição. Como o controller
      // já só gera VetorialAnimation quando `renderMode === 'vetorial'`,
      // o easing é consistente com o tipo de cena do lote.
      ...(easing !== undefined ? { easing } : {}),
    };

    // 8. Carrega Remotion lazy
    let renderMediaOnWeb: typeof import('@remotion/web-renderer').renderMediaOnWeb;
    let ExportableBatchSpeedPaintComposition: ComponentType<ExportableBatchSpeedPaintProps>;
    try {
      const [module, exportableComposition] = await Promise.all([
        loadRenderImpl(),
        createExportableBatchSpeedPaintComposition(),
      ]);
      renderMediaOnWeb = module.renderMediaOnWeb;
      ExportableBatchSpeedPaintComposition = exportableComposition;
    } catch (err) {
      log.error('Falha ao carregar módulo de renderização speed paint', { error: err });
      if (currentRenderId !== renderId) return;
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      set({
        status: 'failed' as RenderStatus,
        isRendering: false,
        wasCancelled: false,
        error: `Falha ao carregar módulo de renderização: ${message}. Tente recarregar a página.`,
        renderStatusText: 'Falha na exportação',
      });
      return;
    }

    // 9. Atualiza status para 'rendering'
    set({
      status: 'rendering' as RenderStatus,
      renderStatusText: 'Renderizando...',
    });

    const composition: {
      component: ComponentType<ExportableBatchSpeedPaintProps>;
      id: string;
      width: number;
      height: number;
      fps: number;
      durationInFrames: number;
      defaultProps: ExportableBatchSpeedPaintProps;
    } = {
      component: ExportableBatchSpeedPaintComposition,
      id: COMPOSITION_ID_BATCH,
      width: resolution.width,
      height: resolution.height,
      fps,
      durationInFrames,
      defaultProps: exportableInputProps,
    };

    const result = await renderMediaOnWeb({
      composition,
      inputProps: exportableInputProps,
      videoCodec: get().codec as 'h264' | 'vp8' | 'vp9' | 'h265' | 'av1',
      audioCodec: null,
      container: get().container as 'mp4' | 'webm',
      licenseKey: 'free-license',
      signal,
      onProgress: (progress: RenderMediaOnWebProgress) => {
        const percent = generationWeight + Math.round(progress.progress * (100 - generationWeight));
        reportProgress(
          set,
          percent,
          percent < 100 ? `Renderizando... ${percent}%` : 'Finalizando exportação...',
        );
      },
    });

    // 10. Obtém blob final
    const blob = await result.getBlob();
    const localUrl = URL.createObjectURL(blob);

    // 11. Edge case: render obsoleto
    if (currentRenderId !== renderId) {
      URL.revokeObjectURL(localUrl);
      log.warn('Render obsoleto — URL local descartada');
      return;
    }

    // 12. Download automático do lote
    const ext = get().container === 'webm' ? 'webm' : 'mp4';
    const name = currentExportFileName || `speed-paint-lote-${Date.now()}`;
    await downloadFile(localUrl, `${name}.${ext}`);

    // 13. Render concluído com sucesso
    set({
      status: 'completed' as RenderStatus,
      isRendering: false,
      renderProgress: 100,
      renderStatusText: 'Exportação concluída!',
      outputBlob: blob,
      outputUrl: localUrl,
      error: null,
      wasCancelled: false,
      lastProgressUpdateAt: Date.now(),
    });

    trackAnalyticsEvent('speed_paint_export_completed', {
      ...analyticsParams,
      codec: get().codec,
      container: get().container,
    });
  } catch (err: unknown) {
    // Ignora erros de renders antigos
    if (currentRenderId !== renderId) return;

    const cancelled = isCancellationError(err);
    trackAnalyticsEvent(cancelled ? 'speed_paint_export_cancelled' : 'speed_paint_export_failed', {
      ...analyticsParams,
      error_category: categorizeAnalyticsError(err),
    });

    set({
      status: cancelled ? ('cancelled' as RenderStatus) : ('failed' as RenderStatus),
      isRendering: false,
      wasCancelled: cancelled,
      error: cancelled ? null : toUserFriendlyError(err, log),
      renderStatusText: cancelled ? 'Exportação cancelada.' : 'Falha na exportação',
    });
  } finally {
    // Limpa refs apenas se esta ainda é a renderização atual
    if (currentRenderId === renderId) {
      abortController = null;
      lastReportedPercentRef.current = -1;
    }
  }
}

/** Retorna o fileName do último export — usado pelo hook fachada para download. */
export function getCurrentExportFileName(): string {
  return currentExportFileName;
}
