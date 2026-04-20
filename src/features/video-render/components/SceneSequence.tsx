import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CAMERA_MOVEMENTS, DEFAULT_EFFECT_INTENSITY, effectBlurPx } from '../lib/editingPlan';
import type { TransitionType, CameraMovement, VisualEffect } from '../lib/editingPlan';

// ─── Configurações spring por categoria de animação ───────────────

/**
 * Spring para transições de cena (fade, slide, wipe, zoom).
 * damping > stiffness = superamortecido → sem oscilação, sem overshoot.
 * A curva natural de spring dá aceleração suave na entrada e desaceleração na saída.
 */
const SPRING_TRANSICAO = {
  damping: 26,
  stiffness: 100,
  mass: 1,
} as const;

/**
 * Spring para movimentos de câmera (pan, tilt, zoom, ken-burns).
 * damping muito alto = extremamente suave, sem qualquer oscilação visível.
 * overshootClamping impede que a câmera passe do ponto final e "volte".
 */
const SPRING_CAMERA = {
  damping: 200,
  stiffness: 40,
  mass: 1,
  overshootClamping: true,
} as const;

// ─── Props (interface preservada — consumida por VideoComposition) ──

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

/** Frames de transição padrão quando não informado */
const FADE_FRAMES = 12;

// ─── Componente principal ─────────────────────────────────────────

/**
 * Renderiza uma cena individual com imagem em tela cheia.
 * Suporta transições variadas, movimentos de câmera e efeitos visuais.
 * Usa `<Img>` do Remotion que aguarda o carregamento antes de renderizar.
 *
 * Todas as animações usam spring() do Remotion para timing physics-based:
 * - Transições (fade, slide, wipe, zoom) → curva de entrada/saída natural
 * - Câmeras (pan, tilt, zoom) → movimento suave com aceleração/desaceleração
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
  const { width, fps } = useVideoConfig();

  // Usa a duração de transição informada ou fallback para FADE_FRAMES
  const tFrames = transitionDurationFrames ?? FADE_FRAMES;

  // Garante que o inputRange seja estritamente crescente:
  // precisa t >= 1 e 2*t < durationInFrames, ou seja t <= floor((dur-1)/2)
  const maxAllowed = durationInFrames >= 3 ? Math.floor((durationInFrames - 1) / 2) : 0;
  const safeTransitionFrames = Math.min(Math.max(1, tFrames), maxAllowed);

  // ── 1. Cálculo da transição com spring ──
  const { opacity, translateX, translateY, scale, clipPath } = buildTransition(
    transition,
    frame,
    fps,
    safeTransitionFrames,
    durationInFrames,
    isLastScene,
  );

  // ── 2. Cálculo do movimento de câmera com spring ──
  const cameraTransform = buildCameraMovement(camera, frame, fps, durationInFrames);

  // ── 3. Compõe todos os transforms em uma única string ──
  const composedTransform = [
    `translateX(${translateX + cameraTransform.translateX}%)`,
    `translateY(${translateY + cameraTransform.translateY}%)`,
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
// Helpers de transição com spring (physics-based timing)
// ---------------------------------------------------------------------------

/**
 * Gera progresso de fade-in com spring (0→1) ao longo de fadeFrames.
 * Substitui interpolate linear por curva de spring com aceleração/desaceleração.
 */
function springFadeIn(
  frame: number,
  fps: number,
  fadeFrames: number,
): number {
  return spring({
    frame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  });
}

/**
 * Gera opacidade de fade-out com spring (1→0) começando em fadeStartFrame.
 * Se isLastScene, retorna 1 (sem fade-out) pois não há cena seguinte.
 * Reusado por slide-left, slide-right, slide-up e wipe para manter DRY.
 */
function springFadeOut(
  frame: number,
  fps: number,
  fadeStartFrame: number,
  fadeFrames: number,
  isLastScene?: boolean,
): number {
  if (isLastScene || fadeFrames <= 0) return 1;
  // Offset do frame para que o spring comece em fadeStartFrame
  const localFrame = frame - fadeStartFrame;
  // Inverte o spring (0→1 vira 1→0) e impede valores negativos
  return Math.max(0, 1 - spring({
    frame: localFrame,
    fps,
    config: SPRING_TRANSICAO,
    durationInFrames: fadeFrames,
  }));
}

interface TransitionResult {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  clipPath?: string;
}

/**
 * Constrói a transformação de transição usando spring para todas as animações.
 * Cada tipo de transição usa spring() para gerar curvas de entrada/saída naturais
 * ao invés de interpolação linear.
 */
function buildTransition(
  type: TransitionType,
  frame: number,
  fps: number,
  tFrames: number,
  durationInFrames: number,
  isLastScene?: boolean,
): TransitionResult {
  // Cenas muito curtas (< 2 frames) não têm espaço para transição
  if (tFrames <= 0 || durationInFrames < 2) {
    return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };
  }

  switch (type) {
    case 'cut':
      return { opacity: 1, translateX: 0, translateY: 0, scale: 1 };

    case 'fade': {
      if (isLastScene) {
        // Última cena: só fade-in com spring, permanece visível até o final
        const opacity = springFadeIn(frame, fps, tFrames);
        return { opacity, translateX: 0, translateY: 0, scale: 1 };
      }
      const fadeIn = springFadeIn(frame, fps, tFrames);
      const fadeOut = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames);
      // min(fadeIn, fadeOut) cria a curva de entrada platô saída
      return { opacity: Math.min(fadeIn, fadeOut), translateX: 0, translateY: 0, scale: 1 };
    }

    case 'dissolve': {
      // Dissolve = fade mais longo (2x os frames de transição)
      const dissolveFrames = Math.min(tFrames * 2, Math.floor(durationInFrames / 2));
      if (isLastScene) {
        const opacity = springFadeIn(frame, fps, dissolveFrames);
        return { opacity, translateX: 0, translateY: 0, scale: 1 };
      }
      const fadeIn = springFadeIn(frame, fps, dissolveFrames);
      const fadeOut = springFadeOut(frame, fps, durationInFrames - dissolveFrames, dissolveFrames);
      return { opacity: Math.min(fadeIn, fadeOut), translateX: 0, translateY: 0, scale: 1 };
    }

    case 'slide-left': {
      const opacity = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames, isLastScene);
      // Spring-driven slide: desliza de 100% para 0% com física natural
      const slideSpring = springFadeIn(frame, fps, tFrames);
      const translateX = interpolate(slideSpring, [0, 1], [100, 0]);
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-right': {
      const opacity = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames, isLastScene);
      const slideSpring = springFadeIn(frame, fps, tFrames);
      const translateX = interpolate(slideSpring, [0, 1], [-100, 0]);
      return { opacity, translateX, translateY: 0, scale: 1 };
    }

    case 'slide-up': {
      const opacity = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames, isLastScene);
      const slideSpring = springFadeIn(frame, fps, tFrames);
      const translateY = interpolate(slideSpring, [0, 1], [100, 0]);
      return { opacity, translateX: 0, translateY, scale: 1 };
    }

    case 'zoom': {
      // Zoom: opacidade + escala com spring sincronizado
      const zoomSpring = springFadeIn(frame, fps, tFrames);
      if (isLastScene) {
        return {
          opacity: zoomSpring,
          translateX: 0,
          translateY: 0,
          scale: interpolate(zoomSpring, [0, 1], [1.2, 1]),
        };
      }
      const fadeOut = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames);
      return {
        opacity: Math.min(zoomSpring, fadeOut),
        translateX: 0,
        translateY: 0,
        scale: interpolate(zoomSpring, [0, 1], [1.2, 1]),
      };
    }

    case 'wipe': {
      const opacity = springFadeOut(frame, fps, durationInFrames - tFrames, tFrames, isLastScene);
      // Cortina horizontal com spring: inset revela da esquerda para direita
      const wipeSpring = springFadeIn(frame, fps, tFrames);
      const insetRight = interpolate(wipeSpring, [0, 1], [100, 0]);
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
// Helpers de movimento de câmera com spring
// ---------------------------------------------------------------------------

interface CameraTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Constrói movimento de câmera usando spring() ao invés de progresso linear.
 *
 * Antes: progress = frame / durationInFrames (velocidade constante)
 * Agora: spring() gera curva 0→1 com aceleração/desaceleração natural.
 *
 * O damping alto (200) garante movimento extremamente suave sem oscilação,
 * e overshootClamping impede que a câmera passe do ponto final.
 */
function buildCameraMovement(
  type: CameraMovement,
  frame: number,
  fps: number,
  durationInFrames: number,
): CameraTransform {
  const preset = CAMERA_MOVEMENTS[type];
  const intensity = preset?.intensity ?? 0;

  // Sem intensidade ou câmera estática = sem movimento
  if (intensity === 0 || type === 'static') {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  // Progresso baseado em spring: suave no início e fim, sem overshoot
  const progress = spring({
    frame,
    fps,
    config: SPRING_CAMERA,
    durationInFrames,
  });

  // Multiplicadores base: intensidade 0.5 = movimento máximo visível
  const maxPan = intensity * 15;    // % de translate (0.5 → 7.5%)
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
// Helpers de efeitos visuais (CSS filter — inalterados)
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
