/**
 * Variantes reutilizaveis do Motion (ex-framer-motion) para animacoes de viewport.
 *
 * Todas usam `viewport: { once: true, margin: '-50px' }` para animar apenas
 * na primeira vez que o elemento entra no viewport (com 50px de margem antecipada).
 */
import type { Variants } from 'motion/react';

// ── Viewport config global ──────────────────────────────────────────────

/** Animacao acontece apenas na primeira vez, com 50px de antecipacao */
export const VIEWPORT_ONCE = {
  once: true,
  margin: '-50px',
} as const;

// ── Transicao base ─────────────────────────────────────────────────────

/** Spring suave e rapido — bom para cards e elementos de conteudo */
export const SPRING_SMOOTH = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
};

/** Spring mais lento — bom para hero e elementos pesados */
export const SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
};

// ── Variantes de entrada ───────────────────────────────────────────────

/** Fade in de baixo para cima — padrao para cards e blocos */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_SMOOTH,
  },
};

/** Fade in puro — para barras, badges e elementos simples */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

/** Scale in — para icones circulares, badges e numeros */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING_SMOOTH,
  },
};

// ── Variantes de container (stagger) ───────────────────────────────────

/**
 * Container com stagger de filhos.
 * Usa `delayChildren` com `stagger()` para revelar itens progressivamente.
 *
 * Uso: wrap um Grid/Stack com motion.div usando estas variantes.
 * Cada filho deve usar `fadeInUp` e herda o estado do pai.
 */
export const staggerContainer = (staggerDelay = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      delayChildren: staggerDelay,
      staggerChildren: staggerDelay,
    },
  },
});

// ── Variantes para FAQ ────────────────────────────────────────────────

/** Container do FAQ accordion com stagger */
export const faqContainer: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      when: 'beforeChildren',
      delayChildren: 0.08,
    },
  },
};

// ── Variantes para Roadmap ────────────────────────────────────────────

/** Item individual do roadmap com delay baseado no index */
export const roadmapItem = (index: number): Variants => ({
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      ...SPRING_GENTLE,
      delay: index * 0.1,
    },
  },
});
