/**
 * Conversor entre `VetorialEasingType` (string da store) e `EasingFunction`
 * (curva de easing do Remotion).
 *
 * O `WhiteboardScene` consome `easing?: EasingFunction` (tipo do Remotion
 * para usar em `interpolate()`), mas o `useAnimationStore.easing` é
 * `VetorialEasingType` (literal serializável) — esta função resolve a
 * conversão no boundary entre as duas representações.
 *
 * ## Por que separar (e não importar Remotion no store)
 *
 * O `useAnimationStore` é Zustand puro e não importa Remotion (mantém o
 * store leve e testável sem mockar Remotion). Manter o conversor aqui
 * garante que o tipo `EasingFunction` (Remotion) só entre no boundary
 * do componente de composição, nunca no estado serializado.
 *
 * ## v0.135.2 (F3 da auditoria)
 *
 * Antes desta versão, o seletor "Linear / Smooth / Bounce" do Speed Paint
 * atualizava a store mas não chegava ao `WhiteboardScene` — controle
 * morto. Este helper + propagação (SpeedPaintPage → exporter → controller
 * → compositions) fecha o gap.
 *
 * @see `src/features/speed-paint/types/vetorial.ts` — `VetorialEasingType`
 * @see `src/features/video-render/components/WhiteboardScene.tsx` — consumidor
 */

import { Easing, type EasingFunction } from 'remotion';
import type { VetorialEasingType } from '../../speed-paint/types/vetorial';

// ---------------------------------------------------------------------------
// v0.135.3 (S4+S6 da auditoria): hoisting das funções de easing para o escopo
// do módulo. `Easing.inOut(Easing.ease)` e `Easing.out(Easing.bounce)` alocam
// uma nova closure a cada chamada. Como `getRemotionEasing` é invocado pelo
// React render de cada `WhiteboardScene` (múltiplas cenas em batch), alocar
// por chamada desperdiça trabalho e cria instâncias inconsistentes que o
// React vê como refs novas em `React.memo`. A tabela de lookup resolve em
// O(1) com referência estável por toda a vida do módulo.
// ---------------------------------------------------------------------------

/** `Easing.linear` é uma função estática (sem closure interna). Referência estável. */
const LINEAR_EASING: EasingFunction = Easing.linear;
/** `Easing.out(Easing.bounce)` — alocada 1x no carregamento do módulo. */
const BOUNCE_EASING: EasingFunction = Easing.out(Easing.bounce);
/** `Easing.inOut(Easing.ease)` — alocada 1x no carregamento do módulo. Default da store. */
const SMOOTH_EASING: EasingFunction = Easing.inOut(Easing.ease);

/**
 * Tabela de lookup por tipo. Construída 1x no carregamento do módulo.
 *
 * Omitido `'smooth'` do objeto para forçar fallback explícito no caller
 * (cobre o caso `undefined` e o caso `type === 'smooth'`).
 */
const EASING_TABLE = {
  linear: LINEAR_EASING,
  bounce: BOUNCE_EASING,
} as const satisfies Partial<Record<VetorialEasingType, EasingFunction>>;

/**
 * Converte o tipo da store em `EasingFunction` do Remotion.
 *
 * v0.135.3 (S4+S6): lookup O(1) em tabela pré-construída — sem alocação
 * por chamada, referência estável para `React.memo` e `useEffect` deps.
 *
 * @param type - Tipo de easing da store. `undefined` retorna o default
 *   `'smooth'` (consistente com o `DEFAULT_EASING` em `animationStore.ts`
 *   e com o default interno de `WhiteboardScene`).
 * @returns Função de easing pronta para `interpolate()` do Remotion.
 *   **Sempre a mesma referência para o mesmo `type`** — útil para
 *   comparações de igualdade em `React.memo`/deps de hooks.
 */
export function getRemotionEasing(type: VetorialEasingType | undefined): EasingFunction {
  if (type === 'linear' || type === 'bounce') {
    return EASING_TABLE[type];
  }
  // Cobre: `type === 'smooth'`, `type === undefined`, valores futuros não
  // conhecidos (extensibilidade via `VetorialEasingType`).
  return SMOOTH_EASING;
}
