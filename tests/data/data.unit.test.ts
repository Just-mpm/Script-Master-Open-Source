/**
 * Testes unitários dos arquivos de dados localizados — metrics, testimonials, useCases,
 * authBenefits, pricingFaq.
 *
 * Testa: estrutura, getters locale-aware, fallback, consistência entre idiomas.
 */

import { describe, it, expect } from 'vitest';
import type { Locale } from '../../src/features/i18n/types';
import { getLocalizedMetrics, METRICS } from '../../src/data/metrics';
import { getLocalizedTestimonials, TESTIMONIALS } from '../../src/data/testimonials';
import { getLocalizedUseCases, USE_CASES } from '../../src/data/useCases';
import { getLocalizedAuthBenefits, AUTH_BENEFITS } from '../../src/data/authBenefits';
import { getLocalizedPricingFaq, PRICING_FAQ_ITEMS } from '../../src/data/pricingFaq';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

describe('Metrics — dados localizados', () => {
  it('METRICS padrão (pt-BR) tem exatamente 4 itens', () => {
    expect(METRICS).toHaveLength(4);
  });

  it('cada métrica tem label, value, description não-vazios', () => {
    for (const metric of METRICS) {
      expect(metric.label).toBeTruthy();
      expect(metric.value).toBeTruthy();
      expect(metric.description).toBeTruthy();
    }
  });

  it('getLocalizedMetrics retorna 4 itens para pt-BR', () => {
    const result = getLocalizedMetrics('pt-BR');
    expect(result).toHaveLength(4);
  });

  it('getLocalizedMetrics retorna 4 itens para en', () => {
    const result = getLocalizedMetrics('en');
    expect(result).toHaveLength(4);
  });

  it('getLocalizedMetrics retorna 4 itens para es', () => {
    const result = getLocalizedMetrics('es');
    expect(result).toHaveLength(4);
  });

  it('valores numéricos são consistentes entre idiomas', () => {
    const pt = getLocalizedMetrics('pt-BR');
    const en = getLocalizedMetrics('en');
    const es = getLocalizedMetrics('es');

    for (let i = 0; i < pt.length; i++) {
      expect(pt[i].value).toBe(en[i].value);
      expect(pt[i].value).toBe(es[i].value);
      expect(pt[i].suffix).toBe(en[i].suffix);
      expect(pt[i].suffix).toBe(es[i].suffix);
    }
  });

  it('labels diferem entre pt-BR e en', () => {
    const pt = getLocalizedMetrics('pt-BR');
    const en = getLocalizedMetrics('en');

    const hasDifference = pt.some((m, i) => m.label !== en[i].label);
    expect(hasDifference).toBe(true);
  });

  it('descriptions diferem entre pt-BR e en', () => {
    const pt = getLocalizedMetrics('pt-BR');
    const en = getLocalizedMetrics('en');

    const hasDifference = pt.some((m, i) => m.description !== en[i].description);
    expect(hasDifference).toBe(true);
  });

  it('sufixos são consistentes (K+ ou /5)', () => {
    for (const metric of METRICS) {
      if (metric.suffix) {
        expect(['K+', '/5']).toContain(metric.suffix);
      }
    }
  });

  it('satisfação tem value "4.8" e suffix "/5"', () => {
    const satisfaction = METRICS[3];
    expect(satisfaction.value).toBe('4.8');
    expect(satisfaction.suffix).toBe('/5');
  });
});

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

describe('Testimonials — dados localizados', () => {
  it('TESTIMONIALS padrão tem 6 itens', () => {
    expect(TESTIMONIALS).toHaveLength(6);
  });

  it('cada testimonial tem campos obrigatórios', () => {
    for (const t of TESTIMONIALS) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.role).toBeTruthy();
      expect(t.company).toBeTruthy();
      expect(t.text).toBeTruthy();
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
      expect(t.useCase).toBeTruthy();
    }
  });

  it('todos os IDs são únicos', () => {
    const ids = TESTIMONIALS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('getLocalizedTestimonials retorna 6 itens para todos os idiomas', () => {
    const locales: Locale[] = ['pt-BR', 'en', 'es'];
    for (const locale of locales) {
      expect(getLocalizedTestimonials(locale)).toHaveLength(6);
    }
  });

  it('nomes são consistentes entre idiomas (não traduzidos)', () => {
    const pt = getLocalizedTestimonials('pt-BR');
    const en = getLocalizedTestimonials('en');

    for (let i = 0; i < pt.length; i++) {
      expect(pt[i].name).toBe(en[i].name);
      expect(pt[i].role).toBe(en[i].role);
      expect(pt[i].company).toBe(en[i].company);
      expect(pt[i].rating).toBe(en[i].rating);
    }
  });

  it('textos diferem entre pt-BR e en', () => {
    const pt = getLocalizedTestimonials('pt-BR');
    const en = getLocalizedTestimonials('en');

    const hasDifference = pt.some((t, i) => t.text !== en[i].text);
    expect(hasDifference).toBe(true);
  });

  it('ratings são 4 ou 5', () => {
    for (const t of TESTIMONIALS) {
      expect([4, 5]).toContain(t.rating);
    }
  });
});

// ---------------------------------------------------------------------------
// Use Cases
// ---------------------------------------------------------------------------

describe('UseCases — dados localizados', () => {
  it('USE_CASES padrão tem 6 itens', () => {
    expect(USE_CASES).toHaveLength(6);
  });

  it('cada use case tem título, descrição, anchor e icon', () => {
    for (const uc of USE_CASES) {
      expect(uc.title).toBeTruthy();
      expect(uc.description).toBeTruthy();
      expect(uc.anchor).toBeTruthy();
      expect(uc.icon).toBeDefined();
    }
  });

  it('getLocalizedUseCases retorna 6 itens para todos os idiomas', () => {
    const locales: Locale[] = ['pt-BR', 'en', 'es'];
    for (const locale of locales) {
      expect(getLocalizedUseCases(locale)).toHaveLength(6);
    }
  });

  it('anchors são válidos (rotas do app)', () => {
    const validAnchors = ['audio', 'assistant', 'video', 'images'];
    for (const uc of USE_CASES) {
      expect(validAnchors).toContain(uc.anchor);
    }
  });

  it('títulos diferem entre pt-BR e en', () => {
    const pt = getLocalizedUseCases('pt-BR');
    const en = getLocalizedUseCases('en');

    const hasDifference = pt.some((uc, i) => uc.title !== en[i].title);
    expect(hasDifference).toBe(true);
  });

  it('descrições diferem entre pt-BR e es', () => {
    const pt = getLocalizedUseCases('pt-BR');
    const es = getLocalizedUseCases('es');

    const hasDifference = pt.some((uc, i) => uc.description !== es[i].description);
    expect(hasDifference).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auth Benefits
// ---------------------------------------------------------------------------

describe('AuthBenefits — dados localizados', () => {
  it('AUTH_BENEFITS padrão tem 4 itens', () => {
    expect(AUTH_BENEFITS).toHaveLength(4);
  });

  it('cada benefício tem title, description e icon', () => {
    for (const b of AUTH_BENEFITS) {
      expect(b.title).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.icon).toBeDefined();
    }
  });

  it('getLocalizedAuthBenefits retorna 4 itens para todos os idiomas', () => {
    const locales: Locale[] = ['pt-BR', 'en', 'es'];
    for (const locale of locales) {
      expect(getLocalizedAuthBenefits(locale)).toHaveLength(4);
    }
  });

  it('títulos diferem entre pt-BR e en', () => {
    const pt = getLocalizedAuthBenefits('pt-BR');
    const en = getLocalizedAuthBenefits('en');

    const hasDifference = pt.some((b, i) => b.title !== en[i].title);
    expect(hasDifference).toBe(true);
  });

  it('descrições diferem entre pt-BR e es', () => {
    const pt = getLocalizedAuthBenefits('pt-BR');
    const es = getLocalizedAuthBenefits('es');

    const hasDifference = pt.some((b, i) => b.description !== es[i].description);
    expect(hasDifference).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pricing FAQ
// ---------------------------------------------------------------------------

describe('PricingFaq — dados localizados', () => {
  it('PRICING_FAQ_ITEMS padrão tem 6 itens', () => {
    expect(PRICING_FAQ_ITEMS).toHaveLength(6);
  });

  it('cada FAQ tem question e answer não-vazios', () => {
    for (const faq of PRICING_FAQ_ITEMS) {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
    }
  });

  it('getLocalizedPricingFaq retorna 6 itens para todos os idiomas', () => {
    const locales: Locale[] = ['pt-BR', 'en', 'es'];
    for (const locale of locales) {
      expect(getLocalizedPricingFaq(locale)).toHaveLength(6);
    }
  });

  it('perguntas diferem entre pt-BR e en', () => {
    const pt = getLocalizedPricingFaq('pt-BR');
    const en = getLocalizedPricingFaq('en');

    const hasDifference = pt.some((faq, i) => faq.question !== en[i].question);
    expect(hasDifference).toBe(true);
  });

  it('respostas diferem entre pt-BR e es', () => {
    const pt = getLocalizedPricingFaq('pt-BR');
    const es = getLocalizedPricingFaq('es');

    const hasDifference = pt.some((faq, i) => faq.answer !== es[i].answer);
    expect(hasDifference).toBe(true);
  });

  it('perguntas são strings com comprimento razoável', () => {
    for (const faq of PRICING_FAQ_ITEMS) {
      expect(faq.question.length).toBeGreaterThan(5);
      expect(faq.question.length).toBeLessThan(200);
    }
  });
});

// ---------------------------------------------------------------------------
// Fallback de locale — teste com locale inválido
// ---------------------------------------------------------------------------

describe('Fallback de locale para pt-BR', () => {
  it('getLocalizedMetrics com locale inválido retorna pt-BR', () => {
    const result = getLocalizedMetrics('fr' as Locale);
    const ptBr = getLocalizedMetrics('pt-BR');
    expect(result).toEqual(ptBr);
  });

  it('getLocalizedTestimonials com locale inválido retorna pt-BR', () => {
    const result = getLocalizedTestimonials('ja' as Locale);
    const ptBr = getLocalizedTestimonials('pt-BR');
    expect(result).toEqual(ptBr);
  });

  it('getLocalizedPricingFaq com locale inválido retorna pt-BR', () => {
    const result = getLocalizedPricingFaq('de' as Locale);
    const ptBr = getLocalizedPricingFaq('pt-BR');
    expect(result).toEqual(ptBr);
  });
});
