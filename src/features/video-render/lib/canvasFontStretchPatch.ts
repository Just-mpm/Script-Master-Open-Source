/**
 * Monkey patch para corrigir bug do @remotion/web-renderer 4.0.450.
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
 * Este patch intercepta o setter de `fontStretch` no prototype do
 * CanvasRenderingContext2D e converte percentuais para as keywords válidas
 * antes de repassar para a implementação nativa do browser.
 *
 * Referência: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fontStretch
 *
 * Seguro: só afeta a propriedade `fontStretch`, não altera nenhum outro
 * comportamento da Canvas API. Idempotente — chamar múltiplas vezes
 * não causa efeitos colaterais.
 */

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

/** Flag para evitar aplicar o patch mais de uma vez */
let patched = false;

/**
 * Tradutor intermediário: converte valores percentuais de fontStretch
 * para keywords válidas antes de passar para a Canvas API nativa.
 *
 * Se o valor NÃO for percentual (ex: já é "normal", "condensed"),
 * repassa sem alteração.
 */
function translateFontStretch(value: string): string {
  // Se já é keyword válida, repassa direto
  if (STRETCH_PERCENT_TO_KEYWORD.has(value)) {
    return STRETCH_PERCENT_TO_KEYWORD.get(value)!;
  }
  // Qualquer outro valor (keyword, global, etc.) → repassa sem tocar
  return value;
}

/**
 * Aplica o monkey patch no CanvasRenderingContext2D.prototype.fontStretch.
 *
 * Deve ser chamado ANTES de renderMediaOnWeb().
 * É idempotente — chamadas subsequentes são no-op.
 */
export function patchCanvasFontStretch(): void {
  if (patched) return;
  if (typeof CanvasRenderingContext2D === 'undefined') return;

  // Salva o descriptor original (getter/setter nativo do browser)
  const descriptor = Object.getOwnPropertyDescriptor(
    CanvasRenderingContext2D.prototype,
    'fontStretch',
  );

  if (!descriptor || !('set' in descriptor) || typeof descriptor.set !== 'function') {
    // Browser não suporta fontStretch no canvas — nada a fazer
    patched = true;
    return;
  }

  const originalSetter = descriptor.set;

  // Redefine o setter com tradução intermediária
  Object.defineProperty(
    CanvasRenderingContext2D.prototype,
    'fontStretch',
    {
      ...descriptor,
      set(this: CanvasRenderingContext2D, value: string) {
        const translated = translateFontStretch(value);
        originalSetter.call(this, translated);
      },
    },
  );

  patched = true;
}
