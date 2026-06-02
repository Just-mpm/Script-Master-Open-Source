/**
 * Tipos compartilhados do controlador de renderização de vídeo/speed paint.
 *
 * Estes tipos definem o contrato entre os stores singleton (M1, M2),
 * o componente de toast cross-route (M6), o indicador de sobrevivência
 * (M7) e o módulo de persistência em localStorage (M8).
 *
 * Princípios:
 * - `any` é proibido. Use tipos explícitos ou `unknown` + narrowing.
 * - Status de render é uma *discriminated union* — facilita `switch` exaustivo.
 * - Snapshot é *versionado* (`schemaVersion: 1`) para migração futura.
 */

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

/** Tipo de renderização em andamento (vídeo completo ou speed paint) */
export type RenderKind = 'video' | 'speed-paint';

/** Estado do ciclo de vida de uma renderização */
export type RenderStatus =
  | 'idle'         // Nenhum render em andamento
  | 'preparing'    // Coletando inputs, validando deps, montando composition
  | 'rendering'    // renderMediaOnWeb em execução
  | 'completed'    // Blob gerado com sucesso
  | 'cancelled'    // Usuário cancelou (ou 2ª render cancelou a 1ª)
  | 'failed';      // Erro técnico (codec, OOM, etc.)

/** Fase interna do render (informa Toast/Title o que está acontecendo) */
export type RenderPhase =
  | 'speed-paint'  // Geração de stroke animations (apenas vídeo com animateScenes)
  | 'composition'  // renderMediaOnWeb ativo
  | 'finalizing';  // getBlob() + salvamento assíncrono

// ---------------------------------------------------------------------------
// Estado público do controller (read-only para consumidores)
// ---------------------------------------------------------------------------

/**
 * Estado público de um controller de renderização (M1, M2).
 *
 * Os controllers têm, internamente, mais campos privados (AbortController,
 * currentRenderId, refs de throttle, etc.) que não fazem parte deste tipo —
 * eles vivem no closure do módulo e não são expostos via Zustand.
 */
export interface RenderControllerPublicState {
  /** Tipo de render (fixo: 'video' para M1, 'speed-paint' para M2) */
  kind: RenderKind;
  /** Status atual do ciclo de vida */
  status: RenderStatus;
  /** true enquanto há render em andamento (preparing/rendering) */
  isRendering: boolean;
  /** Progresso inteiro 0-100 (throttled — só atualiza quando o inteiro muda) */
  renderProgress: number;
  /** Texto de status legível (ex: "Renderizando... 45%") */
  renderStatusText: string;
  /** Blob final após conclusão bem-sucedida */
  outputBlob: Blob | null;
  /** URL de objeto do blob (revogada em reset/cancel quando aplicável) */
  outputUrl: string | null;
  /** Mensagem de erro quando status === 'failed' */
  error: string | null;
  /** Date.now() quando startRender() foi chamado pela última vez */
  startedAt: number | null;
  /** Date.now() do último update de progresso (para detectar render travado) */
  lastProgressUpdateAt: number;
  /** Codec de vídeo resolvido */
  codec: string;
  /** Container de saída */
  container: string;
  /**
   * Lista de cenas cuja geração de speed paint falhou (para feedback ao usuário).
   * Vazio quando a fase de speed paint não foi executada ou foi 100% bem-sucedida.
   */
  speedPaintWarnings: string[];
  /**
   * Aviso exibido quando `saveVideoToProject` falha após exportação bem-sucedida.
   * Diferente de `error`: `error` indica falha de render (status='failed'),
   * `saveWarning` indica sucesso de render com falha apenas de persistência
   * (status permanece 'completed' para que o usuário possa baixar o vídeo).
   */
  saveWarning: string | null;
}

// ---------------------------------------------------------------------------
// Ações públicas
// ---------------------------------------------------------------------------

/**
 * Ações expostas pelos controllers M1/M2 (via `getState()`).
 * O tipo concreto de `options` é parametrizado por generics — M1 usa
 * `RenderControllerActions<VideoExportOptions>`, M2 usa
 * `RenderControllerActions<SpeedPaintExportOptions>`.
 */
export interface RenderControllerActions<O = unknown> {
  /**
   * Inicia uma nova renderização. Cancela a anterior se estiver em andamento.
   * Retorna Promise que resolve quando concluída (ou rejeita em erro de validação).
   */
  startRender: (options: O) => Promise<void>;
  /**
   * Cancela a renderização em andamento. Se já concluída, descarta o blob.
   * Idempotente — pode ser chamado múltiplas vezes.
   */
  cancelRender: () => void;
  /**
   * Reseta o estado completo (revoga blob URL, limpa erro, volta a 'idle').
   * Aborta render em andamento se existir.
   */
  reset: () => void;
  /**
   * Sincroniza codec/container resolvidos pelo hook fachada
   * (`useVideoExporter`/`useSpeedPaintExporter`) quando `useCodecSupport`
   * resolve. Action nomeada para evitar `setState` externo direto
   * (`store.setState({...})`) — mantém a fronteira de mutação
   * encapsulada no store.
   */
  setCodecContainer: (codec: string, container: string) => void;
}
