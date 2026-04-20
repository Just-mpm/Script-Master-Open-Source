import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CAMERA_MOVEMENTS, DEFAULT_EFFECT_INTENSITY, effectBlurPx } from '../lib/editingPlan';
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
  /** Se é a última cena — remove fade-out para permanecer visível até o final */
  isLastScene?: boolean;
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
  isLastScene = false,
}: SceneSequenceProps) {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Usa a duração de transição informada ou fallback para FADE_FRAMES
  const tFrames = transitionDurationFrames ?? FADE_FRAMES;

  // Garante que o inputRange [0, t, dur-t, dur] seja estritamente crescente:
  // precisa t >= 1 e 2*t < durationInFrames, ou seja t <= floor((dur-1)/2)
  const maxAllowed = durationInFrames >= 3 ? Math.floor((durationInFrames - 1) / 2) : 0;
  const safeTransitionFrames = Math.min(Math.max(1, tFrames), maxAllowed);

  // ── 1. Cálculo da transição de entrada ──
  const { opacity, translateX, translateY, scale, clipPath } = buildTransition(
    transition,
    frame,
    safeTransitionFrames,
    durationInFrames,
    isLastScene,
  );

  // ── 2. Cálculo do movimento de câmera ──
  const cameraTransform = buildCameraMovement(camera, frame, durationInFrames);

  // ── 3. Compõe todos os transforms em uma única string ──
  const composedTransform = [
    `translateX(${(translateX + cameraTransform.translateX)}%)`,
    `translateY(${(translateY + cameraTransform.translateY)}%)`,
    `scale(${scale * cameraTransform.scale})`,
  ].join(' ');

  // ── 4. Compõe filtros CSS para efeitos visuais (blur proporcional à resolução) ──
  const filterString = buildEffectsFilter(effects, width);

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
 * Se isLastScene, retorna 1 (sem fade-out) pois não há cena seguinte.
 * Usada por slide-left, slide-right, slide-up e wipe para manter DRY.
 */
function fadeOutOpacity(
  frame: number,
  tFrames: number,
  durationInFrames: number,
  isLastScene?: boolean,
): number {
  if (isLastScene || tFrames <= 0) return 1;
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
  isLastScene?: boolean,
): TransitionResult {
  // Cenas muito curtas (< 3 frames) não têm espaço para transição de 4 valores
  if (tFrames <= 0 || durationInFrames < 2) {
    return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
  }

  switch (type) {
    case 'cut':
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };

    case 'fade': {
      if (isLastScene) {
        // Última cena: só fade-in, permanece visível até o final
        const opacity = interpolate(
          frame,
          [0, tFrames],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        return { opacity, translateX: 0, translateY: 0, scale: 1 };
      }
      const opacity = interpolate(
        frame,
        [0, tFrames, durationInFrames - tFrames, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY: 0, scale: 1 };
    }

    case 'dissolve': {
      const dissolveFrames = Math.min(tFrames * 2, Math.floor(durationInFrames / 2));
      if (isLastScene) {
        const opacity = interpolate(
          frame,
          [0, dissolveFrames],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        return { opacity, translateX: 0, translateY: 0, scale: 1 };
      }
      const opacity = interpolate(
        frame,
        [0, dissolveFrames, durationInFrames - dissolveFrames, durationInFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY: 0, scale: 1 };
    }

    case 'slide-left': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames, isLastScene);
      const translateX = interpolate(
        frame,
        [0, tFrames],
        [100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-right': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames, isLastScene);
      const translateX = interpolate(
        frame,
        [0, tFrames],
        [-100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-up': {
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames, isLastScene);
      const translateY = interpolate(
        frame,
        [0, tFrames],
        [100, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      );
      return { opacity, translateX: 0, translateY, scale: 1 };
    }

    case 'zoom': {
      if (isLastScene) {
        const opacity = interpolate(
          frame,
          [0, tFrames],
          [0, 1],
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
      const opacity = fadeOutOpacity(frame, tFrames, durationInFrames, isLastScene);
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
  const preset = CAMERA_MOVEMENTS[type];
  const intensity = preset?.intensity ?? 0;

  // Sem intensidade ou câmera estática = sem movimento
  if (intensity === 0 || type === 'static') {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;

  // Multiplicadores base: intensidade 0.5 = movimento máximo visível
  const maxPan = intensity * 15;   // % de translate (0.5 → 7.5%)
  const maxScale = 1 + intensity * 0.4; // scale final (0.5 → 1.2)

  switch (type) {
    case 'pan-left':
      return {
        scale: 1,
        translateX: interpolate(progress, [0, 1], [maxPan, -maxPan]),
        translateY: 0,
      };

    case 'pan-right':
      return {
        scale: 1,
        translateX: interpolate(progress, [0, 1], [-maxPan, maxPan]),
        translateY: 0,
      };

    case 'tilt-up':
      return {
        scale: 1,
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [maxPan, -maxPan]),
      };

    case 'tilt-down':
      return {
        scale: 1,
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [-maxPan, maxPan]),
      };

    case 'zoom-in':
      return {
        scale: interpolate(progress, [0, 1], [1, maxScale]),
        translateX: 0,
        translateY: 0,
      };

    case 'zoom-out':
      return {
        scale: interpolate(progress, [0, 1], [maxScale, 1]),
        translateX: 0,
        translateY: 0,
      };

    case 'ken-burns':
      return {
        scale: interpolate(progress, [0, 1], [1, 1 + intensity * 0.25]),
        translateX: interpolate(progress, [0, 1], [-maxPan * 0.4, maxPan * 0.4]),
        translateY: 0,
      };

    default:
      return { scale: 1, translateX: 0, translateY: 0 };
  }
}

// ---------------------------------------------------------------------------
// Helpers de efeitos visuais (CSS filter)
// ---------------------------------------------------------------------------

function buildEffectsFilter(effects: VisualEffect[], resolutionWidth?: number): string {
  const filters: string[] = [];
  const refWidth = resolutionWidth ?? 1920;

  for (const effect of effects) {
    switch (effect) {
      case 'grayscale':
        filters.push('grayscale(100%)');
        break;
      case 'sepia':
        filters.push('sepia(80%)');
        break;
      case 'blur':
        // Blur proporcional à resolução via effectBlurPx()
        filters.push(`blur(${effectBlurPx(DEFAULT_EFFECT_INTENSITY, refWidth)}px)`);
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
