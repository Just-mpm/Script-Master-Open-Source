import { useEffect } from 'react';
import type { SeoData } from '../lib/seo';

/**
 * Renderiza tags de SEO no <head> usando hoisting nativo do React 19.
 * Atualiza o atributo lang do <html> quando locale é fornecido.
 */
export function DocumentHead({ title, meta = [], link = [], locale }: SeoData) {
  useEffect(() => {
    if (locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <>
      <title>{title}</title>
      {meta.map((m, i) => (
        <meta key={i} name={m.name} property={m.property} content={m.content} />
      ))}
      {link.map((l, i) => (
        <link key={i} {...l} />
      ))}
    </>
  );
}
