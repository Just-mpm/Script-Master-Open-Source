/** Idiomas suportados pelo Script Master */
export type Locale = 'pt-BR' | 'en' | 'es';

/** Configuração visual e de exibição de um idioma */
export interface LocaleConfig {
  code: Locale;
  /** Rótulo nativo: "Português", "English", "Español" */
  label: string;
  /** Emoji da bandeira */
  flag: string;
  /** Direção do texto (futuro RTL para árabe, hebraico, etc.) */
  direction: 'ltr';
}

/**
 * Dicionário de tradução.
 * Suporta chaves aninhadas via dot notation: `t('landing.hero.title')`.
 */
export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

/** Valor retornado pelo context de i18n */
export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Traduz uma chave com dot notation, suportando interpolação de parâmetros */
  t: (key: string, params?: Record<string, string | number>) => string;
}
