import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import type { TransitionType, CameraMovement, VisualEffect } from '../lib/editingPlan';

interface SceneSequenceProps {
  /** URL da imagem da cena */
  imageUrl: string;
  /** Duração da cena em frames */
  durationInFrames: number;
  /** Tipo de transição de entrada (default: fade) */
  transition?: TransitionType;
  /** Duração da transição em frames (derivado de transitionDuration em ms) */
  transitionDurationFrames?: number;
  /** Movimento de câmera durante a cena (default: static) */
  camera?: CameraMovement;
  /** Efeitos visuais aplicados à cena */
  effects?: VisualEffect[];
}

/** Frames de fade in/out padrão para transição fade */
const FADE_FRAMES = 12;

/**
 * Renderiza uma cena individual com imagem em tela cheia.
 * Suporta transições variadas, movimentos de câmera e efeitos visuais.
 * Usa `<Img>` do Remotion que aguarda o carregamento antes de renderizar.
 */
export function SceneSequence({
  imageUrl,
  durationInFrames,
  transition = 'fade',
  transitionDurationFrames,
  camera = 'static',
  effects = [],
}: SceneSequenceProps) {
  const frame = useCurrentFrame();

  // Usa a duração de transição informada ou fallback para FADE_FRAMES
  const tFrames = transitionDurationFrames ?? FADE_FRAMES;

  // Clampa para não exceder metade da duração da cena
  const safeTransitionFrames = Math.min(tFrames, Math.floor(durationInFrames / 2));

  // ── 1. Cálculo da transição de entrada ──
  const { opacity, translateX, translateY, scale, clipPath } = buildTransition(
    transition,
    frame,
    safeTransitionFrames,
    durationInFrames,
  );

  // ── 2. Cálculo do movimento de câmera ──
  const cameraTransform = buildCameraMovement(camera, frame, durationInFrames);

  // ── 3. Compõe todos os transforms em uma única string ──
  const composedTransform = [
    `translateX(${(translateX + cameraTransform.translateX)}%)`,
    `translateY(${(translateY + cameraTransform.translateY)}%)`,
    `scale(${scale * cameraTransform.scale})`,
  ].join(' ');

  // ── 4. Compõe filtros CSS para efeitos visuais ──
  const filterString = buildEffectsFilter(effects);

  // ── 5. Box-shadow para efeito vignette ──
  const vignetteShadow = effects.includes('vignette')
    ? 'inset 0 0 120px 40px rgba(0, 0, 0, 0.6)'
    : 'none';

  return (
    <AbsoluteFill style={{ opacity, clipPath: clipPath ?? undefined }}>
      <Img
        src={imageUrl}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: composedTransform,
          filter: filterString || undefined,
          boxShadow: vignetteShadow !== 'none' ? vignetteShadow : undefined,
        }}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Helpers de transição
// ---------------------------------------------------------------------------

/**
 * Interpolação reutilizável de fade-out: opacidade 1 → 1 → 0 nos frames finais.
 * Usada por slide-left, slide-right, slide-up e wipe para manter DRY.
 */
function fadeOutOpacity(frame: number, tFrames: number, durationInFrames: number): number {
  return interpolate(
    frame,
    [0, tFrames, durationInFrames - tFrames, durationInFrames],
    [1, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
}

interface TransitionResult {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  clipPath?: string;
}

function buildTransition(
  type: TransitionType,
  frame: number,
  tFrames: number,
  durationInFrames: number,
): TransitionResult {
  switch (type) {
    case 'cut':
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };

    case 'fade': {
      const opacity = interpolate(
        frame,
        [0, tFrames, durationInFrames - tFrames, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY: 0, scale: 1 };
    }

    case 'dissolve': {
      // Dissolve usa 2x a duração do fade para ser mais longo
      const dissolveFrames = Math.min(tFrames * 2, Math.floor(durationInFrames / 2));
      const opacity = interpolate(
        frame,
        [0, dissolveFrames, durationInFrames - dissolveFrames, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY: 0, scale: 1 };
    }

    case 'slide-left': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames);
      const translateX = interpolate(
        frame,
        [0, tFrames],
        [100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-right': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames);
      const translateX = interpolate(
        frame,
        [0, tFrames],
        [-100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-up': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames);
      const translateY = interpolate(
        frame,
        [0, tFrames],
        [100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY, scale: 1 };
    }

    case 'zoom': {
      const opacity = interpolate(
        frame,
        [0, tFrames, durationInFrames - tFrames, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      const scale = interpolate(
        frame,
        [0, tFrames],
        [1.2, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY: 0, scale };
    }

    case 'wipe': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames);
      // Cortina horizontal: inset(0 X% 0 0) revela da esquerda para direita
      const insetRight = interpolate(
        frame,
        [0, tFrames],
        [100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return {
        opacity,
        translateX: 0,
        translateY: 0,
        scale: 1,
        clipPath: `inset(0 ${insetRight}% 0 0)`,
      };
    }

    default:
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
  }
}

// ---------------------------------------------------------------------------
// Helpers de movimento de câmera
// ---------------------------------------------------------------------------

interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

function buildCameraMovement(
  type: CameraMovement,
  frame: number,
  durationInFrames: number,
): CameraTransform {
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;

  switch (type) {
    case 'pan-left':
      return {
        scale: 1,
        translateX: interpolate(progress, [0, 1], [5, -5]),
        translateY: 0,
      };

    case 'pan-right':
      return {
        scale: 1,
        translateX: interpolate(progress, [0, 1], [-5, 5]),
        translateY: 0,
      };

    case 'tilt-up': {
      const translateY = interpolate(progress, [0, 1], [5, -5]);
      return { scale: 1, translateX: 0, translateY };
    }

    case 'tilt-down': {
      const translateY = interpolate(progress, [0, 1], [-5, 5]);
      return { scale: 1, translateX: 0, translateY };
    }

    case 'zoom-in':
      return {
        scale: interpolate(progress, [0, 1], [1, 1.15]),
        translateX: 0,
        translateY: 0,
      };

    case 'zoom-out':
      return {
        scale: interpolate(progress, [0, 1], [1.15, 1]),
        translateX: 0,
        translateY: 0,
      };

    case 'ken-burns':
      return {
        scale: interpolate(progress, [0, 1], [1, 1.1]),
        translateX: interpolate(progress, [0, 1], [-2, 2]),
        translateY: 0,
      };

    case 'static':
    default:
      return { scale: 1, translateX: 0, translateY: 0 };
  }
}

// ---------------------------------------------------------------------------
// Helpers de efeitos visuais (CSS filter)
// ---------------------------------------------------------------------------

function buildEffectsFilter(effects: VisualEffect[]): string {
  const filters: string[] = [];

  for (const effect of effects) {
    switch (effect) {
      case 'grayscale':
        filters.push('grayscale(100%)');
        break;
      case 'sepia':
        filters.push('sepia(80%)');
        break;
      case 'blur':
        filters.push('blur(2px)');
        break;
      case 'brightness-up':
        filters.push('brightness(1.2)');
        break;
      case 'contrast-up':
        filters.push('contrast(1.3)');
        break;
      case 'saturate':
        filters.push('saturate(1.4)');
        break;
      // 'vignette' e 'none' não usam CSS filter — vignette usa box-shadow
      case 'vignette':
      case 'none':
        break;
    }
  }

  return filters.join(' ');
}
