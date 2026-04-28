import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { publicCompatRedirects, appCompatRedirects } from '../../src/router/Redirects';

interface RouteProps {
  path?: string;
  element?: ReactElement;
}

/** Extrai dados de um elemento <Route> com <Navigate> interno */
function extractRedirect(element: ReactElement): { key: string; from: string; to: string; replace: boolean } {
  const props = element.props as RouteProps;
  const innerProps = props.element?.props as { to: string; replace: boolean };
  return {
    key: element.key as string,
    from: props.path as string,
    to: innerProps.to,
    replace: innerProps.replace,
  };
}

// ─── Public redirects ─────────────────────────────────────────

describe('publicCompatRedirects', () => {
  it('deve conter exatamente 8 redirects públicos', () => {
    expect(publicCompatRedirects).toHaveLength(8);
  });

  it('todos devem usar replace=true (preserva SEO)', () => {
    const redirects = publicCompatRedirects.map(extractRedirect);
    for (const r of redirects) {
      expect(r.replace).toBe(true);
    }
  });

  it('todos devem ter keys únicos', () => {
    const keys = publicCompatRedirects.map((el) => el.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it.each([
    { key: 'r-features', from: '/features', to: '/funcionalidades' },
    { key: 'r-pricing', from: '/pricing', to: '/precos' },
    { key: 'r-faq', from: '/faq', to: '/perguntas-frequentes' },
    { key: 'r-contact', from: '/contact', to: '/contato' },
    { key: 'r-about', from: '/about', to: '/sobre' },
    { key: 'r-register', from: '/register', to: '/cadastro' },
    { key: 'r-terms', from: '/terms', to: '/termos' },
    { key: 'r-privacy', from: '/privacy', to: '/privacidade' },
  ])('deve redirecionar $from → $to (key=$key)', ({ key, from, to }) => {
    const redirect = publicCompatRedirects.find((r) => r.key === key);
    expect(redirect).toBeDefined();
    const info = extractRedirect(redirect!);
    expect(info.from).toBe(from);
    expect(info.to).toBe(to);
  });
});

// ─── App redirects ────────────────────────────────────────────

describe('appCompatRedirects', () => {
  it('deve conter exatamente 4 redirects do app', () => {
    expect(appCompatRedirects).toHaveLength(4);
  });

  it('todos devem usar replace=true', () => {
    const redirects = appCompatRedirects.map(extractRedirect);
    for (const r of redirects) {
      expect(r.replace).toBe(true);
    }
  });

  it('todos devem ter keys únicos', () => {
    const keys = appCompatRedirects.map((el) => el.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it.each([
    { key: 'r-image', from: '/app/image', to: '/app/imagens' },
    { key: 'r-assistant', from: '/app/assistant', to: '/app/assistente' },
    { key: 'r-library', from: '/app/library', to: '/app/biblioteca' },
    { key: 'r-speed-paint', from: '/app/speed-paint', to: '/app/pintura-rapida' },
  ])('deve redirecionar $from → $to (key=$key)', ({ key, from, to }) => {
    const redirect = appCompatRedirects.find((r) => r.key === key);
    expect(redirect).toBeDefined();
    const info = extractRedirect(redirect!);
    expect(info.from).toBe(from);
    expect(info.to).toBe(to);
  });

  it('todos os paths de destino devem começar com /app/', () => {
    const redirects = appCompatRedirects.map(extractRedirect);
    for (const r of redirects) {
      expect(r.to).toMatch(/^\/app\//);
    }
  });
});
