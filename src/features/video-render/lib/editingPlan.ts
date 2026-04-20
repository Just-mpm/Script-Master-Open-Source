// ─── Arrays canônicos (fonte única de verdade) ────────────────

export const TRANSITION_TYPE_LIST = [
  'fade', 'slide-left', 'slide-right', 'slide-up', 'zoom', 'cut', 'dissolve', 'wipe',
] as const;

export const CAMERA_MOVEMENT_LIST = [
  'static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'ken-burns',
] as const;

export const VISUAL_EFFECT_LIST = [
  'none', 'grayscale', 'sepia', 'blur', 'vignette', 'brightness-up', 'contrast-up', 'saturate',
] as const;

// ─── Tipos derivados dos arrays canônicos ─────────────────────

/** Tipos de transição entre cenas */
export type TransitionType = (typeof TRANSITION_TYPE_LIST)[number];

/** Movimentos de câmera virtuais */
export type CameraMovement = (typeof CAMERA_MOVEMENT_LIST)[number];

/** Efeitos visuais aplicáveis a uma cena */
export type VisualEffect = (typeof VISUAL_EFFECT_LIST)[number];

// ─── Estilos de overlay de título ─────────────────────────────

export const TITLE_OVERLAY_STYLES = ['intro', 'credit', 'lower-third'] as const;
export type TitleOverlayStyle = (typeof TITLE_OVERLAY_STYLES)[number];

/** Labels para estilos de título */
export const TITLE_OVERLAY_LABELS: Record<TitleOverlayStyle, string> = {
  intro: 'Introdução',
  credit: 'Créditos',
  'lower-third': 'Lower Third',
};

// ─── Efeitos visuais — constantes de intensidade ──────────────

/** Intensidade padrão dos efeitos visuais (0-1) */
export const DEFAULT_EFFECT_INTENSITY = 0.5;

/** Converte intensidade (0-1) em valor CSS de blur em pixels, proporcional à resolução */
export function effectBlurPx(intensity: number, referenceWidth: number): number {
  return Math.max(1, intensity * referenceWidth / 480);
}

// ─── Modelos de dados ─────────────────────────────────────────

/** Descrição do plano de edição para uma cena */
export interface EditingScene {
  /** Timestamp em segundos (corresponde ao timestamp da StudioScene) */
  timestamp: number;
  /** Prompt descritivo da cena (do roteiro) */
  prompt: string;
  /** Tipo de transição para entrar nesta cena */
  transition: TransitionType;
  /** Duração da transição em milissegundos (default: 500) */
  transitionDuration?: number;
  /** Legenda para esta cena (texto sobreposto) */
  subtitle?: string;
  /** Efeito visual aplicado à cena */
  effects?: VisualEffect[];
  /** Movimento de câmera durante a cena */
  camera?: CameraMovement;
  /** Override de duração (em segundos) se diferente do cálculo automático */
  durationOverride?: number;
  /** Posição da legenda na tela */
  subtitlePosition?: 'bottom' | 'center' | 'top';
  /** Overlay de título (intro, créditos, lower-third) */
  titleOverlay?: {
    text: string;
    style: TitleOverlayStyle;
  };
}

/** Plano de edição completo */
export type EditingPlan = EditingScene[];

// ─── Presets (Records construídos para cobrir os arrays) ──────

/** Presets de transição com configuração padrão */
export const TRANSITION_PRESETS: Record<TransitionType, { defaultDuration: number; description: string }> = {
  'fade': { defaultDuration: 500, description: 'Fade suave entre cenas' },
  'slide-left': { defaultDuration: 400, description: 'Desliza da direita para esquerda' },
  'slide-right': { defaultDuration: 400, description: 'Desliza da esquerda para direita' },
  'slide-up': { defaultDuration: 400, description: 'Desliza de baixo para cima' },
  'zoom': { defaultDuration: 600, description: 'Zoom in/out entre cenas' },
  'cut': { defaultDuration: 0, description: 'Corte direto sem transição' },
  'dissolve': { defaultDuration: 800, description: 'Dissolve cruzado longo' },
  'wipe': { defaultDuration: 500, description: 'Cortina horizontal' },
};

/** Movimentos de câmera com descrição e intensidade */
export const CAMERA_MOVEMENTS: Record<CameraMovement, { description: string; intensity: number }> = {
  'static': { description: 'Câmera parada', intensity: 0 },
  'pan-left': { description: 'Panorâmica para esquerda', intensity: 0.3 },
  'pan-right': { description: 'Panorâmica para direita', intensity: 0.3 },
  'tilt-up': { description: 'Inclinação para cima', intensity: 0.2 },
  'tilt-down': { description: 'Inclinação para baixo', intensity: 0.2 },
  'zoom-in': { description: 'Zoom in lento', intensity: 0.4 },
  'zoom-out': { description: 'Zoom out lento', intensity: 0.4 },
  'ken-burns': { description: 'Efeito Ken Burns (zoom + pan)', intensity: 0.5 },
};
