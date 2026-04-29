import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNestedValue, interpolate, isValidLocale } from '../../src/features/i18n/utils';
import type { TranslationDictionary } from '../../src/features/i18n/types';
import { dictionaries, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/features/i18n/locales';

// ── getNestedValue ──────────────────────────────────────────────────────

describe('getNestedValue', () => {
  const dict: TranslationDictionary = {
    common: {
      skipToContent: 'Pular para o conteúdo',
      nested: {
        deep: {
          value: 'profundo',
        },
      },
    },
    landing: {
      title: 'Transforme roteiros',
    },
  };

  it('retorna valor para path simples', () => {
    expect(getNestedValue(dict, 'landing.title')).toBe('Transforme roteiros');
  });

  it('retorna valor para path aninhado de 2 níveis', () => {
    expect(getNestedValue(dict, 'common.skipToContent')).toBe('Pular para o conteúdo');
  });

  it('retorna valor para path aninhado de 3 níveis', () => {
    expect(getNestedValue(dict, 'common.nested.deep.value')).toBe('profundo');
  });

  it('retorna undefined para path inexistente', () => {
    expect(getNestedValue(dict, 'common.inexistente')).toBeUndefined();
  });

  it('retorna undefined para path parcial', () => {
    expect(getNestedValue(dict, 'common.nested.inexistente')).toBeUndefined();
  });

  it('retorna undefined para path que aponta para objeto (não string)', () => {
    expect(getNestedValue(dict, 'common.nested')).toBeUndefined();
  });

  it('retorna undefined para dicionário vazio', () => {
    expect(getNestedValue({}, 'any.key')).toBeUndefined();
  });
});

// ── interpolate ─────────────────────────────────────────────────────────

describe('interpolate', () => {
  it('substitui parâmetro simples', () => {
    expect(interpolate('Olá, {name}!', { name: 'Matheus' })).toBe('Olá, Matheus!');
  });

  it('substitui múltiplos parâmetros', () => {
    expect(interpolate('{greeting}, {name}!', { greeting: 'Oi', name: 'Ana' })).toBe(
      'Oi, Ana!',
    );
  });

  it('substitui parâmetro numérico', () => {
    expect(interpolate('{count} itens', { count: 5 })).toBe('5 itens');
  });

  it('mantém placeholder quando parâmetro ausente', () => {
    expect(interpolate('Olá, {name}!', {})).toBe('Olá, {name}!');
  });

  it('mantém placeholder quando parâmetro é undefined', () => {
    expect(interpolate('Olá, {name}!', { name: undefined as unknown as string })).toBe(
      'Olá, {name}!',
    );
  });

  it('retorna string original sem parâmetros', () => {
    expect(interpolate('Texto simples', { name: 'Test' })).toBe('Texto simples');
  });

  it('retorna string original quando params é undefined', () => {
    expect(interpolate('Texto {placeholder}')).toBe('Texto {placeholder}');
  });

  it('lida com string vazia', () => {
    expect(interpolate('')).toBe('');
  });
});

// ── isValidLocale ───────────────────────────────────────────────────────

describe('isValidLocale', () => {
  it('retorna true para pt-BR', () => {
    expect(isValidLocale('pt-BR')).toBe(true);
  });

  it('retorna true para en', () => {
    expect(isValidLocale('en')).toBe(true);
  });

  it('retorna true para es', () => {
    expect(isValidLocale('es')).toBe(true);
  });

  it('retorna false para locale não suportado', () => {
    expect(isValidLocale('fr')).toBe(false);
  });

  it('retorna false para string vazia', () => {
    expect(isValidLocale('')).toBe(false);
  });

  it('retorna false para pt (sem BR)', () => {
    expect(isValidLocale('pt')).toBe(false);
  });

  it('retorna false para case diferente', () => {
    expect(isValidLocale('EN')).toBe(false);
    expect(isValidLocale('Pt-BR')).toBe(false);
  });
});

// ── Dicionários ────────────────────────────────────────────────────────

describe('dicionários', () => {
  it('possui entry para cada locale suportado', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(dictionaries[locale]).toBeDefined();
    }
  });

  it('todos os dicionários possuem as mesmas chaves de nível 1', () => {
    const ptBRKeys = Object.keys(dictionaries['pt-BR']);
    const enKeys = Object.keys(dictionaries.en);
    const esKeys = Object.keys(dictionaries.es);

    expect(enKeys).toEqual(ptBRKeys);
    expect(esKeys).toEqual(ptBRKeys);
  });

  it('pt-BR possui a chave common', () => {
    expect(getNestedValue(dictionaries['pt-BR'], 'common.skipToContent')).toBe(
      'Pular para o conteúdo',
    );
  });

  it('en possui a chave common traduzida', () => {
    expect(getNestedValue(dictionaries.en, 'common.skipToContent')).toBe('Skip to content');
  });

  it('es possui a chave common traduzida', () => {
    expect(getNestedValue(dictionaries.es, 'common.skipToContent')).toBe('Saltar al contenido');
  });

  it('possui chaves de landing page em pt-BR', () => {
    expect(getNestedValue(dictionaries['pt-BR'], 'landing.hero.title')).toBe(
      'Transforme roteiros em arte com IA',
    );
  });

  it('possui chaves de landing page em en', () => {
    expect(getNestedValue(dictionaries.en, 'landing.hero.title')).toBe(
      'Turn scripts into art with AI',
    );
  });

  it('possui chaves de landing page em es', () => {
    expect(getNestedValue(dictionaries.es, 'landing.hero.title')).toBe(
      'Convierte guiones en arte con IA',
    );
  });

  it('possui chaves de navegação em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getNestedValue(dictionaries[locale], 'nav.features')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'nav.pricing')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'nav.faq')).toBeDefined();
    }
  });

  it('possui chaves de footer em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getNestedValue(dictionaries[locale], 'footer.productGroup')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'footer.companyGroup')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'footer.legalGroup')).toBeDefined();
    }
  });

  it('possui chaves de pricing em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getNestedValue(dictionaries[locale], 'pricing.plans.free.name')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'pricing.plans.pro.name')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'pricing.plans.business.name')).toBeDefined();
    }
  });

  it('possui chaves de about em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(getNestedValue(dictionaries[locale], 'about.mission.title')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'about.vision.title')).toBeDefined();
      expect(getNestedValue(dictionaries[locale], 'about.values.creativity.title')).toBeDefined();
    }
  });

  it('possui chaves de status em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(
        getNestedValue(dictionaries[locale], 'status.statusLabels.operational'),
      ).toBeDefined();
    }
  });

  it('DEFAULT_LOCALE é pt-BR', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR');
  });

  it('SUPPORTED_LOCALES contém exatamente 3 idiomas', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(3);
  });
});
