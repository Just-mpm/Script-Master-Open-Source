import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { I18nContextValue, Locale } from './types';
import { dictionaries, DEFAULT_LOCALE } from './locales';
import { getNestedValue, interpolate, detectBrowserLocale, isValidLocale, LOCALE_STORAGE_KEY } from './utils';
import { createLogger } from '../../lib/logger';

const log = createLogger('i18n');

/** Contexto de internacionalização — null fora do Provider */
const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Recupera o locale salvo no localStorage.
 * Fallback: locale do navegador → DEFAULT_LOCALE.
 */
function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isValidLocale(stored)) return stored;
  } catch {
    // localStorage indisponível (SSR, iframe restrito, etc.)
  }

  return detectBrowserLocale();
}

/** Provider de internacionalização — envolve a aplicação */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  /** Atualiza o locale e persiste no localStorage */
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      log.warn('Falha ao persistir locale no localStorage');
    }

    // Atualiza o atributo lang do <html> para acessibilidade
    const htmlLang = newLocale === 'pt-BR' ? 'pt-BR' : newLocale;
    document.documentElement.lang = htmlLang;
  }, []);

  /**
   * Traduz uma chave com dot notation.
   * Fallback: locale atual → pt-BR → chave bruta.
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Tenta no locale atual
      let value = getNestedValue(dictionaries[locale], key);

      // 2. Fallback para pt-BR
      if (value === undefined && locale !== DEFAULT_LOCALE) {
        value = getNestedValue(dictionaries[DEFAULT_LOCALE], key);
      }

      // 3. Fallback para a própria chave (evita UI quebrada)
      if (value === undefined) {
        log.warn(`Chave de tradução não encontrada: "${key}"`);
        value = key;
      }

      return interpolate(value, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook para acessar o contexto de i18n — deve ser usado dentro de I18nProvider */
export function useLocale(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useLocale deve ser usado dentro de <I18nProvider>');
  }
  return ctx;
}
