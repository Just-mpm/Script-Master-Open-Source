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
import type { PanInfo, Variants } from 'motion/react';

/** Seletores CSS de elementos interativos que devem ignorar swipe */
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

/** Threshold de distancia (px) para considerar swipe valido */
const SWIPE_DISTANCE_THRESHOLD = 50;

/** Threshold de velocidade (px/s) para swipe rapido */
const SWIPE_VELOCITY_THRESHOLD = 300;

/** Elasticidade do drag (0-1, quanto o conteudo "estica" alem do limite) */
const DRAG_ELASTIC = 0.2;

/** Variants de animacao para transicao entre abas (slide + fade + blur) */
const SWIPE_VARIANTS: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '50%' : '-50%',
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 400, damping: 35 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '50%' : '-50%',
    opacity: 0,
    filter: 'blur(4px)',
    transition: { type: 'spring', stiffness: 400, damping: 35 },
  }),
};

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

export function useSwipeTabs({
  activeTab,
  tabCount,
  setActiveTab,
}: UseSwipeTabsOptions): UseSwipeTabsReturn {
  const constraintRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Verifica se o gesto comecou em um elemento interativo
      const target = event.target as HTMLElement;
      if (target?.closest?.(INTERACTIVE_SELECTORS)) {
        return;
      }

      const isSwipeLeft = offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD;
      const isSwipeRight = offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD;

      if (isSwipeLeft && activeTab < tabCount - 1) {
        setActiveTab(activeTab + 1);
      } else if (isSwipeRight && activeTab > 0) {
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
