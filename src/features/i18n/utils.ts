import type { Locale, TranslationDictionary } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales';

/**
 * Obtém um valor de um dicionário usando dot notation.
 * Ex: getNestedValue(obj, 'landing.hero.title')
 */
export function getNestedValue(
  obj: TranslationDictionary,
  path: string,
): string | undefined {
  const keys = path.split('.');
  let current: string | TranslationDictionary | undefined = obj;

  for (const key of keys) {
    if (typeof current === 'object' && current !== null && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpola parâmetros em um template de string.
 * Ex: interpolate('Olá, {name}!', { name: 'Matheus' }) → 'Olá, Matheus!'
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Detecta o locale preferido do navegador.
 * Retorna o locale suportado mais próximo, ou o DEFAULT_LOCALE.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const browserLangs = navigator.languages ?? [navigator.language ?? ''];

  for (const lang of browserLangs) {
    const normalized = lang.split('-')[0];

    // Mapeamento: pt-* → pt-BR, en-* → en, es-* → es
    if (normalized === 'pt') return 'pt-BR';
    if (normalized === 'en') return 'en';
    if (normalized === 'es') return 'es';
  }

  return DEFAULT_LOCALE;
}

/**
 * Verifica se um código de idioma é suportado.
 * Type guard que permite narrowing para Locale.
 */
export function isValidLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/** Chave usada para persistir o locale no localStorage */
export const LOCALE_STORAGE_KEY = 's2a_locale';

/**
 * Retorna a chave de pluralização correta com base na quantidade.
 * Convenção: `baseKey_one` para 1, `baseKey_other` para != 1.
 * Ex: pluralKey('speedPaint.queueDescription', 3) → 'speedPaint.queueDescription_other'
 */
export function pluralKey(baseKey: string, count: number): string {
  return count === 1 ? `${baseKey}_one` : `${baseKey}_other`;
}
