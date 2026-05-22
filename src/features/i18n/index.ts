// ── Tipos ──────────────────────────────────────────────────────────────
export type { Locale, LocaleConfig, TranslationDictionary, I18nContextValue } from './types';

// ── Context & Hook ─────────────────────────────────────────────────────
export { I18nProvider, useLocale, useLocaleSafe, I18nContext } from './context';

// ── Utilitários ────────────────────────────────────────────────────────
export {
  getNestedValue,
  interpolate,
  detectBrowserLocale,
  isValidLocale,
  LOCALE_STORAGE_KEY,
  pluralKey,
} from './utils';

// ── Locales ────────────────────────────────────────────────────────────
export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  dictionaries,
  LOCALE_CONFIGS,
} from './locales';

// ── Componentes ────────────────────────────────────────────────────────
export { LocaleSelector } from './components/LocaleSelector';
