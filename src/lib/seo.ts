import logos from '../assets/logos';

const SITE_URL = 'https://script-master.pro';
const SITE_NAME = 'Script Master';
const DEFAULT_DESCRIPTION =
  'Transforme roteiros em áudio profissional com IA. Geração de voz, imagens e vídeos com inteligência artificial.';
const OG_IMAGE_URL = `${SITE_URL}${logos.ogImage}`;

interface SeoMeta {
  name?: string;
  property?: string;
  content: string;
}

interface SeoLink {
  rel: string;
  href: string;
  hrefLang?: string;
}

/** Dados de SEO para o DocumentHead (hoisting nativo do React 19) */
export interface SeoData {
  title: string;
  meta: SeoMeta[];
  link: SeoLink[];
  /** Código do locale para o atributo lang (ex: 'pt-BR', 'en', 'es') */
  locale?: string;
  /** JSON-LD schema(s) para structured data. String JSON pronta para <script type="application/ld+json"> */
  jsonLd?: string;
}

/** Tipos de JSON-LD disponíveis por página */
export type JsonLdType = 'software' | 'software-with-offers' | 'webpage';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  /** Código do locale para og:locale e html lang (ex: 'pt-BR', 'en') */
  locale?: string;
  /** Tipo de JSON-LD para a página. Omitir = sem JSON-LD */
  jsonLdType?: JsonLdType;
}

/** Mapeia locale do app para formato og:locale do Open Graph */
const OG_LOCALE_MAP: Record<string, string> = {
  'pt-BR': 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
};

/** Todos os locales alternativos (excluindo o locale principal) */
const ALTERNATE_LOCALES = ['en_US', 'es_ES'];

// ── JSON-LD Builders ──────────────────────────────────────────────────

/** Schema BreadcrumbList para navegação estruturada */
function buildBreadcrumbSchema(path: string, title: string): string {
  const url = `${SITE_URL}${path}`;
  const cleanTitle = title.replace(` | ${SITE_NAME}`, '').trim();

  const segments = path.split('/').filter(Boolean);
  const items = [
    { name: 'Home', url: SITE_URL },
  ];

  if (segments.length > 0) {
    items.push({ name: cleanTitle, url });
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return JSON.stringify(schema);
}

/** Schema SoftwareApplication para landing, funcionalidades e preços */
function buildSoftwareAppSchema(description: string, withOffers: boolean): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Script Master',
    url: SITE_URL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description,
    offers: withOffers
      ? {
          '@type': 'Offer',
          name: 'Beta Aberto',
          price: '0',
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
        }
      : {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
        },
  };

  return JSON.stringify(schema);
}

/** Schema WebPage genérico para páginas informativas */
function buildWebPageSchema(path: string, title: string, description: string): string {
  const url = `${SITE_URL}${path}`;
  const cleanTitle = title.replace(` | ${SITE_NAME}`, '').trim();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: cleanTitle,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return JSON.stringify(schema);
}

/** Gera JSON-LD composto (schema principal + BreadcrumbList) para uma página */
function buildJsonLd(type: JsonLdType, path: string, title: string, description: string): string {
  const schemas: unknown[] = [];

  switch (type) {
    case 'software':
      schemas.push(JSON.parse(buildSoftwareAppSchema(description, false)));
      break;
    case 'software-with-offers':
      schemas.push(JSON.parse(buildSoftwareAppSchema(description, true)));
      break;
    case 'webpage':
      schemas.push(JSON.parse(buildWebPageSchema(path, title, description)));
      break;
  }

  schemas.push(JSON.parse(buildBreadcrumbSchema(path, title)));

  // Se há múltiplos schemas, wrap em @graph
  if (schemas.length > 1) {
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemas,
    });
  }

  return JSON.stringify(schemas[0]);
}

// ── SEO Principal ─────────────────────────────────────────────────────

/** Evita repetir o nome do produto quando a chamada já inclui a marca no título */
function buildSeoTitle(title: string): string {
  const normalizedTitle = title.trim();
  const siteSuffix = `| ${SITE_NAME}`;

  return normalizedTitle.endsWith(siteSuffix)
    ? normalizedTitle
    : `${normalizedTitle} ${siteSuffix}`;
}

/** Gera dados padronizados de SEO para o <head> de cada página */
export function getPageSeo({
  title,
  description,
  path,
  type = 'website',
  publishedTime,
  locale,
  jsonLdType,
}: SeoProps): SeoData {
  const fullTitle = buildSeoTitle(title);
  const url = `${SITE_URL}${path}`;
  const ogLocale = locale ? (OG_LOCALE_MAP[locale] ?? 'pt_BR') : 'pt_BR';

  // Filtra alternate locales (excluindo o locale da própria página)
  const alternateLocales = ALTERNATE_LOCALES.filter(loc => loc !== ogLocale);

  return {
    title: fullTitle,
    locale,
    jsonLd: jsonLdType ? buildJsonLd(jsonLdType, path, fullTitle, description) : undefined,
    meta: [
      { name: 'description', content: description },
      { name: 'language', content: locale ?? 'pt-BR' },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url },
      { property: 'og:image', content: OG_IMAGE_URL },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: description },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: ogLocale },
      ...alternateLocales.map(loc => ({ property: 'og:locale:alternate', content: loc })),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: OG_IMAGE_URL },
      ...(publishedTime
        ? [{ property: 'article:published_time', content: publishedTime }]
        : []),
    ],
    link: [
      { rel: 'canonical', href: url },
      // hreflang alternates para i18n
      { rel: 'alternate', hrefLang: 'pt-BR', href: url },
      { rel: 'alternate', hrefLang: 'en', href: url },
      { rel: 'alternate', hrefLang: 'es', href: url },
      { rel: 'alternate', hrefLang: 'x-default', href: url },
    ],
  };
}

export { DEFAULT_DESCRIPTION };
