import type { Locale, LocaleConfig, TranslationDictionary } from '../types';
import { ptBR } from './pt-BR';
import { en } from './en';
import { es } from './es';

/** Idioma padrão do Script Master */
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/** Lista de idiomas suportados (ordem de preferência) */
export const SUPPORTED_LOCALES: readonly Locale[] = ['pt-BR', 'en', 'es'] as const;

/** Mapa de dicionários por locale */
export const dictionaries: Record<Locale, TranslationDictionary> = {
  'pt-BR': ptBR,
  en,
  es,
};

/** Configurações visuais de cada locale */
export const LOCALE_CONFIGS: readonly LocaleConfig[] = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷', direction: 'ltr' },
  { code: 'en', label: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', direction: 'ltr' },
] as const;
