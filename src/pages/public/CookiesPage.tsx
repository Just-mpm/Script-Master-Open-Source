import type { ReactNode } from 'react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { LegalPageTemplate } from '../../components/public/LegalPageTemplate';
import { COOKIES_DATA } from './legalData';
import { useLocale } from '../../features/i18n';

export default function CookiesPage(): ReactNode {
  const { locale } = useLocale();
  const data = COOKIES_DATA[locale];

  const seo = getPageSeo({
    title: data.title,
    description: data.description,
    path: '/cookies',
    locale,
  });

  return (
    <>
      <DocumentHead {...seo} />
      <LegalPageTemplate
        title={data.title}
        lastUpdated={data.lastUpdated}
        sections={data.sections}
        tocAriaLabel={data.tocAriaLabel}
      />
    </>
  );
}
