/**
 * Monkey patch para corrigir bug do @remotion/web-renderer 4.0.448.
 *
 * Durante a exportação de vídeo, o Remotion lê o computed style dos elementos
 * DOM (que resolve font-stretch: normal → "100%") e passa esse valor
 * diretamente para a Canvas API via `ctx.fontStretch = "100%"`.
 *
 * O problema: a Canvas API só aceita keywords ("normal", "condensed", etc.),
 * não percentuais. Isso gera centenas de warnings no console:
 *
 *   "The provided value '100%' is not a valid enum value of type CanvasFontStretch."
 *
 * Este patch intercepta o setter de `fontStretch` nos prototypes de ambos
 * CanvasRenderingContext2D e OffscreenCanvasRenderingContext2D (o Remotion usa
 * OffscreenCanvas no caminho de software compose) e converte percentuais
 * para as keywords válidas antes de repassar para a implementação nativa.
 *
 * Referência: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fontStretch
 *
 * Seguro: só afeta a propriedade `fontStretch`, não altera nenhum outro
 * comportamento da Canvas API. Idempotente — chamar múltiplas vezes
 * não causa efeitos colaterais.
 */

import { createLogger } from '../../../lib/logger';

const log = createLogger('canvasFontStretchPatch');

// ---------------------------------------------------------------------------
// Mapeamento
// ---------------------------------------------------------------------------

/** Mapeamento de percentuais CSS para keywords aceitas pela Canvas API */
const STRETCH_PERCENT_TO_KEYWORD: ReadonlyMap<string, string> = new Map([
  ['50%', 'ultra-condensed'],
  ['62.5%', 'extra-condensed'],
  ['75%', 'condensed'],
  ['87.5%', 'semi-condensed'],
  ['100%', 'normal'],
  ['112.5%', 'semi-expanded'],
  ['125%', 'expanded'],
  ['150%', 'extra-expanded'],
  ['200%', 'ultra-expanded'],
]);

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

/** Flags para evitar aplicar o patch mais de uma vez por prototype */
let patchedStandard = false;
let patchedOffscreen = false;

// ---------------------------------------------------------------------------
// Tradução
// ---------------------------------------------------------------------------

/**
 * Tradutor intermediário: converte valores percentuais de fontStretch
 * para keywords válidas antes de passar para a Canvas API nativa.
 *
 * Se o valor NÃO for percentual (ex: já é "normal", "condensed"),
 * repassa sem alteração.
 */
function translateFontStretch(value: string): string {
  if (STRETCH_PERCENT_TO_KEYWORD.has(value)) {
    return STRETCH_PERCENT_TO_KEYWORD.get(value)!;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Patch genérico
// ---------------------------------------------------------------------------

/**
 * Prototypes de contextos canvas que suportam fontStretch.
 * Union type para aceitar tanto o canvas regular quanto o offscreen.
 */
type CanvasPrototype =
  | typeof CanvasRenderingContext2D.prototype
  | typeof OffscreenCanvasRenderingContext2D.prototype;

/**
 * Aplica o monkey patch de fontStretch em um prototype específico.
 *
 * Retorna `true` se o patch foi aplicado com sucesso, `false` se o browser
 * não suporta fontStretch nesse prototype.
 */
function patchPrototype(proto: CanvasPrototype, label: string): boolean {
  // Salva o descriptor original (getter/setter nativo do browser)
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'fontStretch');

  if (!descriptor || !('set' in descriptor) || typeof descriptor.set !== 'function') {
    log.debug(`fontStretch não disponível no prototype de ${label} — ignorando`);
    return false;
  }

  const originalSetter = descriptor.set;

  // Redefine o setter com tradução intermediária
  Object.defineProperty(proto, 'fontStretch', {
    ...descriptor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prototype nativo não possui tipo unificado
    set(this: any, value: string) {
      const translated = translateFontStretch(value);
      originalSetter.call(this, translated);
    },
  });

  return true;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Aplica o monkey patch de fontStretch nos prototypes do canvas.
 *
 * Cobertura:
 * - `CanvasRenderingContext2D.prototype` — canvas regular do DOM
 * - `OffscreenCanvasRenderingContext2D.prototype` — usado pelo Remotion
 *   no caminho de software compose (fallback do drawElementImage)
 *
 * Deve ser chamado ANTES de renderMediaOnWeb().
 * É idempotente — chamadas subsequentes são no-op.
 */
export function patchCanvasFontStretch(): void {
  if (patchedStandard && patchedOffscreen) return;

  // --- CanvasRenderingContext2D (canvas regular) ---
  if (!patchedStandard) {
    if (typeof CanvasRenderingContext2D !== 'undefined') {
      patchedStandard = patchPrototype(CanvasRenderingContext2D.prototype, 'CanvasRenderingContext2D');
    } else {
      patchedStandard = true;
    }
  }

  // --- OffscreenCanvasRenderingContext2D (canvas offscreen) ---
  if (!patchedOffscreen) {
    if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
      patchedOffscreen = patchPrototype(OffscreenCanvasRenderingContext2D.prototype, 'OffscreenCanvasRenderingContext2D');
    } else {
      patchedOffscreen = true;
    }
  }

  if (patchedStandard || patchedOffscreen) {
    log.debug('fontStretch patch ativo', {
      standard: patchedStandard,
      offscreen: patchedOffscreen,
    });
  }
}
