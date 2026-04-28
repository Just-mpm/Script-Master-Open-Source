const SITE_URL = 'https://scriptmaster.app';
const SITE_NAME = 'Script Master';
const DEFAULT_DESCRIPTION =
  'Transforme roteiros em áudio profissional com IA. Geração de voz, imagens e vídeos com inteligência artificial.';
const DEFAULT_IMAGE = `${SITE_URL}/logo-transparente.webp`;

interface SeoMeta {
  name?: string;
  property?: string;
  content: string;
}

interface SeoLink {
  rel: string;
  href: string;
}

/** Dados de SEO para o DocumentHead (hoisting nativo do React 19) */
export interface SeoData {
  title: string;
  meta: SeoMeta[];
  link: SeoLink[];
  /** Código do locale para o atributo lang (ex: 'pt-BR', 'en', 'es') */
  locale?: string;
}

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  /** Código do locale para og:locale e html lang (ex: 'pt-BR', 'en') */
  locale?: string;
}

/** Mapeia locale do app para formato og:locale do Open Graph */
const OG_LOCALE_MAP: Record<string, string> = {
  'pt-BR': 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
};

/** Gera dados padronizados de SEO para o <head> de cada página */
export function getPageSeo({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  locale,
}: SeoProps): SeoData {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const ogLocale = locale ? (OG_LOCALE_MAP[locale] ?? 'pt_BR') : 'pt_BR';

  return {
    title: fullTitle,
    locale,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: DEFAULT_IMAGE },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: ogLocale },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: DEFAULT_IMAGE },
      ...(publishedTime
        ? [{ property: 'article:published_time', content: publishedTime }]
        : []),
    ],
    link: [{ rel: 'canonical', href: url }],
  };
}

export { DEFAULT_DESCRIPTION };
