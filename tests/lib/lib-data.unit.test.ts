/**
 * Testes unitários dos lib files — stockMedia (search, filter, paginate) e seo (getPageSeo, OG_LOCALE_MAP).
 * db/types.ts contém apenas interfaces TypeScript (validação estrutural via typecheck).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPageSeo, DEFAULT_DESCRIPTION } from '../../src/lib/seo';

// ---------------------------------------------------------------------------
// SEO — OG_LOCALE_MAP (via getPageSeo)
// ---------------------------------------------------------------------------

describe('getPageSeo — mapeamento de locale', () => {
  it('pt-BR mapeia para pt_BR no og:locale', () => {
    const seo = getPageSeo({
      title: 'Teste',
      description: 'Desc',
      path: '/test',
      locale: 'pt-BR',
    });

    const ogLocale = seo.meta.find((m) => m.property === 'og:locale');
    expect(ogLocale).toBeDefined();
    expect(ogLocale!.content).toBe('pt_BR');
  });

  it('en mapeia para en_US no og:locale', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
      locale: 'en',
    });

    const ogLocale = seo.meta.find((m) => m.property === 'og:locale');
    expect(ogLocale!.content).toBe('en_US');
  });

  it('es mapeia para es_ES no og:locale', () => {
    const seo = getPageSeo({
      title: 'Prueba',
      description: 'Desc',
      path: '/test',
      locale: 'es',
    });

    const ogLocale = seo.meta.find((m) => m.property === 'og:locale');
    expect(ogLocale!.content).toBe('es_ES');
  });

  it('locale desconhecido fallback para pt_BR', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
      locale: 'fr' as string,
    });

    const ogLocale = seo.meta.find((m) => m.property === 'og:locale');
    expect(ogLocale!.content).toBe('pt_BR');
  });

  it('sem locale usa pt_BR como padrão', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const ogLocale = seo.meta.find((m) => m.property === 'og:locale');
    expect(ogLocale!.content).toBe('pt_BR');
  });
});

// ---------------------------------------------------------------------------
// SEO — estrutura do retorno
// ---------------------------------------------------------------------------

describe('getPageSeo — estrutura', () => {
  it('retorna title com sufixo " | Script Master"', () => {
    const seo = getPageSeo({
      title: 'Login',
      description: 'Página de login',
      path: '/login',
    });

    expect(seo.title).toBe('Login | Script Master');
  });

  it('retorna locale no SeoData quando fornecido', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
      locale: 'en',
    });

    expect(seo.locale).toBe('en');
  });

  it('retorna locale undefined quando não fornecido', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    expect(seo.locale).toBeUndefined();
  });

  it('contém meta description', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Minha descrição',
      path: '/test',
    });

    const desc = seo.meta.find((m) => m.name === 'description');
    expect(desc).toBeDefined();
    expect(desc!.content).toBe('Minha descrição');
  });

  it('contém og:title igual ao fullTitle', () => {
    const seo = getPageSeo({
      title: 'Sobre',
      description: 'Desc',
      path: '/sobre',
    });

    const ogTitle = seo.meta.find((m) => m.property === 'og:title');
    expect(ogTitle!.content).toBe('Sobre | Script Master');
  });

  it('contém og:type padrão "website"', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const ogType = seo.meta.find((m) => m.property === 'og:type');
    expect(ogType!.content).toBe('website');
  });

  it('contém og:type "article" quando informado', () => {
    const seo = getPageSeo({
      title: 'Blog',
      description: 'Desc',
      path: '/blog/post-1',
      type: 'article',
    });

    const ogType = seo.meta.find((m) => m.property === 'og:type');
    expect(ogType!.content).toBe('article');
  });

  it('contém og:url com path completo', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/funcionalidades',
    });

    const ogUrl = seo.meta.find((m) => m.property === 'og:url');
    expect(ogUrl!.content).toBe('https://script-master.pro/funcionalidades');
  });

  it('contém og:image', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const ogImage = seo.meta.find((m) => m.property === 'og:image');
    expect(ogImage).toBeDefined();
    expect(ogImage!.content).toContain('og-image.webp');
  });

  it('contém twitter:card summary_large_image', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const twitterCard = seo.meta.find((m) => m.name === 'twitter:card');
    expect(twitterCard).toBeDefined();
    expect(twitterCard!.content).toBe('summary_large_image');
  });

  it('contém link canonical', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/open-source',
    });

    expect(seo.link.length).toBeGreaterThanOrEqual(1);
    expect(seo.link[0].rel).toBe('canonical');
    expect(seo.link[0].href).toBe('https://script-master.pro/open-source');

    // hreflang alternates para i18n
    const hreflangs = seo.link.filter((l) => l.rel === 'alternate');
    expect(hreflangs.length).toBe(4); // pt-BR, en, es, x-default
  });

  it('contém article:published_time quando type=article', () => {
    const seo = getPageSeo({
      title: 'Blog',
      description: 'Desc',
      path: '/blog/post-1',
      type: 'article',
      publishedTime: '2026-04-28T12:00:00Z',
    });

    const publishedTime = seo.meta.find((m) => m.property === 'article:published_time');
    expect(publishedTime).toBeDefined();
    expect(publishedTime!.content).toBe('2026-04-28T12:00:00Z');
  });

  it('não contém article:published_time quando type=website', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const publishedTime = seo.meta.find((m) => m.property === 'article:published_time');
    expect(publishedTime).toBeUndefined();
  });

  it('contém og:site_name', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Desc',
      path: '/test',
    });

    const siteName = seo.meta.find((m) => m.property === 'og:site_name');
    expect(siteName).toBeDefined();
    expect(siteName!.content).toBe('Script Master');
  });

  it('contém twitter:title e twitter:description', () => {
    const seo = getPageSeo({
      title: 'Test',
      description: 'Minha desc',
      path: '/test',
    });

    const twitterTitle = seo.meta.find((m) => m.name === 'twitter:title');
    const twitterDesc = seo.meta.find((m) => m.name === 'twitter:description');
    expect(twitterTitle!.content).toBe('Test | Script Master');
    expect(twitterDesc!.content).toBe('Minha desc');
  });
});

// ---------------------------------------------------------------------------
// SEO — DEFAULT_DESCRIPTION
// ---------------------------------------------------------------------------

describe('DEFAULT_DESCRIPTION', () => {
  it('é uma string não-vazia', () => {
    expect(typeof DEFAULT_DESCRIPTION).toBe('string');
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it('menciona funcionalidades principais', () => {
    expect(DEFAULT_DESCRIPTION.toLowerCase()).toContain('áudio');
    expect(DEFAULT_DESCRIPTION.toLowerCase()).toContain('ia');
  });
});

// ---------------------------------------------------------------------------
// Stock Media — searchStockImages (integração com array estático)
// ---------------------------------------------------------------------------

describe('Stock Media — busca no placeholder local', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let pexelsKeySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    // Força fallback para placeholder local (independente de .env ter VITE_PEXELS_API_KEY)
    const env = await import('../../src/lib/env');
    pexelsKeySpy = vi.spyOn(env, 'getPexelsApiKey').mockReturnValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    pexelsKeySpy.mockRestore();
  });

  describe('searchStockImages — busca em array estático', () => {
    it('retorna resultados para query vazia', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('retorna resultados para query em português', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: 'natureza' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('busca case-insensitive', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const lower = await searchStockImages({ query: 'tecnologia' });
    const upper = await searchStockImages({ query: 'TECNOLOGIA' });
    expect(lower).toEqual(upper);
  });

  it('retorna vazio para query sem correspondência', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: 'xyzwq_nonexistent_tag' });
    expect(results).toHaveLength(0);
  });

  it('respeita paginação page=1 perPage=5', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '', page: 1, perPage: 5 });
    expect(results).toHaveLength(5);
  });

  it('respeita paginação page=2 perPage=5', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '', page: 2, perPage: 5 });
    expect(results).toHaveLength(5);
  });

  it('página além dos dados retorna vazio', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '', page: 100, perPage: 5 });
    expect(results).toHaveLength(0);
  });

  it('cada imagem retornada tem campos obrigatórios', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '' });

    for (const img of results) {
      expect(img.id).toBeTruthy();
      expect(img.url).toBeTruthy();
      expect(img.thumbnailUrl).toBeTruthy();
      expect(img.width).toBeGreaterThan(0);
      expect(img.height).toBeGreaterThan(0);
      expect(img.alt).toBeTruthy();
      expect(img.source).toBeTruthy();
      expect(Array.isArray(img.tags)).toBe(true);
    }
  });

  it('busca por tag funciona', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: 'música' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tags).toContain('música');
  });

  it('orientação landscape retorna apenas imagens landscape', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const results = await searchStockImages({ query: '', orientation: 'landscape' });

    for (const img of results) {
      const ratio = img.width / img.height;
      expect(ratio).toBeGreaterThan(1.1);
    }
  });

  it('sem orientação retorna todas', async () => {
    const { searchStockImages } = await import('../../src/lib/stockMedia');
    const allResults = await searchStockImages({ query: '' });
    const noOrientation = await searchStockImages({ query: '', orientation: undefined });
    expect(allResults).toEqual(noOrientation);
  });
});

  // ---------------------------------------------------------------------------
  // Stock Media — tipos
  // ---------------------------------------------------------------------------

  describe('StockImage — tipo', () => {
    it('source é um dos valores permitidos', async () => {
      const { searchStockImages } = await import('../../src/lib/stockMedia');
      const results = await searchStockImages({ query: '' });
      const validSources = ['pexels', 'unsplash', 'placeholder'];

      for (const img of results) {
        expect(validSources).toContain(img.source);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// DB Types —Nota: interfaces TypeScript são apagadas em runtime.
// A validação estrutural é garantida pelo compilador (bun run typecheck).
// Não há lógica em db/types.ts para testar em runtime.
// ---------------------------------------------------------------------------
