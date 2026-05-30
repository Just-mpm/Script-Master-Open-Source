/**
 * useSwipeTabs — hook para swipe horizontal com feedback visual em tempo real.
 *
 * Detecta gestos de swipe usando drag="x" do Motion e fornece:
 * - Variants de animacao para AnimatePresence (slide + fade + blur)
 * - Handler de onDragEnd para decidir se troca de aba
 * - ConstraintRef para limitar arrasto
 *
 * Seguranca: ignora gestos originados em elementos interativos.
 */

import { useRef, useCallback } from 'react';
import type { PanInfo, Variants, Transition } from 'motion/react';

// ── Thresholds de gesto ──────────────────────────────────────────────

/** Distancia minima (px) para considerar swipe valido */
const DISTANCE_THRESHOLD = 50;

/** Velocidade minima (px/s) para considerar swipe rapido */
const VELOCITY_THRESHOLD = 300;

/** Elasticidade do drag (0-1) */
const DRAG_ELASTIC = 0.2;

// ── Animacao ─────────────────────────────────────────────────────────

const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
};

const BLUR_INVISIBLE = 'blur(4px)';
const BLUR_VISIBLE = 'blur(0px)';

const SWIPE_VARIANTS: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '50%' : '-50%',
    opacity: 0,
    filter: BLUR_INVISIBLE,
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: BLUR_VISIBLE,
    transition: SPRING_TRANSITION,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '50%' : '-50%',
    opacity: 0,
    filter: BLUR_INVISIBLE,
    transition: SPRING_TRANSITION,
  }),
};

// ── Elementos interativos ────────────────────────────────────────────

const INTERACTIVE_SELECTORS = [
  'input',
  'select',
  'textarea',
  'button',
  '[role="tab"]',
  '[role="slider"]',
  '.MuiSlider-root',
  '.MuiTabs-root',
  '.MuiSelect-root',
  '[contenteditable="true"]',
].join(', ');

/** Verifica se o alvo do gesto e um elemento interativo (input, slider, etc.) */
function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return element?.closest?.(INTERACTIVE_SELECTORS) != null;
}

// ── Tipos da API publica ─────────────────────────────────────────────

interface UseSwipeTabsOptions {
  /** Indice da aba ativa */
  activeTab: number;
  /** Total de abas */
  tabCount: number;
  /** Callback para trocar de aba */
  setActiveTab: (index: number) => void;
}

interface UseSwipeTabsReturn {
  /** Ref para o container de constraints do drag */
  constraintRef: React.RefObject<HTMLDivElement | null>;
  /** Variants para AnimatePresence (slide + fade + blur) */
  swipeVariants: Variants;
  /** Handler para onDragEnd do motion.div */
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  /** Elasticidade do drag */
  dragElastic: number;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useSwipeTabs({
  activeTab,
  tabCount,
  setActiveTab,
}: UseSwipeTabsOptions): UseSwipeTabsReturn {
  const constraintRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isInteractiveTarget(event.target)) return;

      const { offset, velocity } = info;
      const swipeLeft = offset.x < -DISTANCE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;
      const swipeRight = offset.x > DISTANCE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;

      if (swipeLeft && activeTab < tabCount - 1) {
        setActiveTab(activeTab + 1);
      } else if (swipeRight && activeTab > 0) {
        setActiveTab(activeTab - 1);
      }
    },
    [activeTab, tabCount, setActiveTab],
  );

  return {
    constraintRef,
    swipeVariants: SWIPE_VARIANTS,
    handleDragEnd,
    dragElastic: DRAG_ELASTIC,
  };
}
