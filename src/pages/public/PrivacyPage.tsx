import type { ReactNode } from 'react';
import { DocumentHead } from '../../components/DocumentHead';
import { getPageSeo } from '../../lib/seo';
import { LegalPageTemplate } from '../../components/public/LegalPageTemplate';
import { PRIVACY_DATA } from './legalData';
import { useLocale } from '../../features/i18n';

export default function PrivacyPage(): ReactNode {
  const { locale } = useLocale();
  const data = PRIVACY_DATA[locale];

  const seo = getPageSeo({
    title: data.title,
    description: data.description,
    path: '/privacidade',
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
