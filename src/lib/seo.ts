import type { HelmetProps } from 'react-helmet-async';

const SITE_URL = 'https://scriptmaster.app';
const SITE_NAME = 'Script Master';
const DEFAULT_DESCRIPTION =
  'Transforme roteiros em áudio profissional com IA. Geração de voz, imagens e vídeos com inteligência artificial.';
const DEFAULT_IMAGE = `${SITE_URL}/images/og-image.png`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
}

/** Gera props padronizadas para o Helmet de cada página pública */
export function getPageSeo({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
}: SeoProps): HelmetProps {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: DEFAULT_IMAGE },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'pt_BR' },
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
