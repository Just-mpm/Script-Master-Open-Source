import { useEffect } from 'react';
import type { SeoData } from '../lib/seo';

/**
 * Renderiza tags de SEO no <head> usando hoisting nativo do React 19.
 * Atualiza o atributo lang do <html> quando locale é fornecido.
 * Renderiza JSON-LD para structured data quando fornecido.
 * Dispara evento 'prerender-ready' para ferramentas de pre-render.
 */
export function DocumentHead({ title, meta = [], link = [], locale, jsonLd }: SeoData) {
  useEffect(() => {
    if (locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    // Sinaliza para o pre-render que a página está completamente renderizada.
    // O script scripts/prerender.mjs espera por window.__PRERENDER_READY === true.
    // Em produção normal, esta flag é ignorada.
    (window as unknown as Record<string, boolean>).__PRERENDER_READY = true;
  }, []);

  return (
    <>
      <title>{title}</title>
      {meta.map((m, i) => (
        <meta key={i} name={m.name} property={m.property} content={m.content} />
      ))}
      {link.map((l, i) => (
        <link key={i} {...l} />
      ))}
      {jsonLd && (
        <script type="application/ld+json">{jsonLd}</script>
      )}
    </>
  );
}
