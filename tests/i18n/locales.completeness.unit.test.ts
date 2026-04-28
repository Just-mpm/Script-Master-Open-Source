import { describe, it, expect } from 'vitest';
import { dictionaries, SUPPORTED_LOCALES, LOCALE_CONFIGS, DEFAULT_LOCALE } from '../../src/features/i18n/locales';
import type { TranslationDictionary } from '../../src/features/i18n/types';
import { getNestedValue } from '../../src/features/i18n/utils';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Coleta todas as chaves de um dicionário recursivamente em dot notation.
 * Apenas chaves folha (strings) são incluídas.
 */
function collectLeafKeys(obj: TranslationDictionary, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      keys.push(...collectLeafKeys(value, fullKey));
    }
  }
  return keys;
}

// ── Testes ─────────────────────────────────────────────────────────────────

describe('dicionários — paridade estrutural entre locales', () => {
  const ptBRKeys = collectLeafKeys(dictionaries['pt-BR']);
  const enKeys = collectLeafKeys(dictionaries.en);
  const esKeys = collectLeafKeys(dictionaries.es);

  it('todos os 3 dicionários têm a mesma quantidade de chaves folha', () => {
    expect(ptBRKeys.length).toBe(enKeys.length);
    expect(ptBRKeys.length).toBe(esKeys.length);
  });

  it('en contém todas as chaves de pt-BR', () => {
    const missingInEn = ptBRKeys.filter((k) => !enKeys.includes(k));
    if (missingInEn.length > 0) {
      // Mostra até 10 chaves faltantes para facilitar o debug
      expect(missingInEn.slice(0, 10)).toEqual([]);
    }
    expect(missingInEn).toHaveLength(0);
  });

  it('es contém todas as chaves de pt-BR', () => {
    const missingInEs = ptBRKeys.filter((k) => !esKeys.includes(k));
    if (missingInEs.length > 0) {
      expect(missingInEs.slice(0, 10)).toEqual([]);
    }
    expect(missingInEs).toHaveLength(0);
  });

  it('pt-BR contém todas as chaves de en', () => {
    const missingInPtBR = enKeys.filter((k) => !ptBRKeys.includes(k));
    expect(missingInPtBR).toHaveLength(0);
  });

  it('pt-BR contém todas as chaves de es', () => {
    const missingInPtBR = esKeys.filter((k) => !ptBRKeys.includes(k));
    expect(missingInPtBR).toHaveLength(0);
  });
});

describe('dicionários — chaves obrigatórias por seção', () => {
  // Verifica que cada seção principal existe em todos os locales
  const requiredSections = [
    'common',
    'nav',
    'footer',
    'landing',
    'features',
    'pricing',
    'faq',
    'contact',
    'about',
    'status',
    'studio',
    'video',
    'assistant',
    'library',
    'speedPaint',
    'imageStudio',
    'onboarding',
    'seo',
    'faqItems',
    'pricingComparison',
    'featureItems',
    'landingShowcases',
    'errors',
    'imageStudioRatios',
    'assistantStrings',
    'localeSelector',
  ];

  for (const section of requiredSections) {
    it(`seção "${section}" existe em todos os locales`, () => {
      for (const locale of SUPPORTED_LOCALES) {
        const dict = dictionaries[locale] as Record<string, unknown>;
        expect(dict[section]).toBeDefined();
      }
    });
  }
});

describe('dicionários — chaves de navegação completas', () => {
  const navKeys = ['home', 'features', 'pricing', 'faq', 'about', 'contact', 'login', 'register'];

  for (const key of navKeys) {
    it(`nav.${key} existe em todos os locales`, () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(getNestedValue(dictionaries[locale], `nav.${key}`)).toBeDefined();
      }
    });
  }
});

describe('dicionários — chaves de páginas públicas', () => {
  const pages = ['landing', 'features', 'pricing', 'faq', 'contact', 'about', 'status'];

  for (const page of pages) {
    it(`${page}.hero.title existe em todos os locales`, () => {
      for (const locale of SUPPORTED_LOCALES) {
        expect(
          getNestedValue(dictionaries[locale], `${page}.hero.title`),
        ).toBeDefined();
      }
    });
  }
});

describe('dicionários — seções do estúdio', () => {
  const studioSections = ['header', 'actionBar', 'inspector', 'scriptEditor'];

  for (const section of studioSections) {
    it(`studio.${section} existe em todos os locales`, () => {
      for (const locale of SUPPORTED_LOCALES) {
        const dict = dictionaries[locale] as Record<string, unknown>;
        const studio = dict['studio'] as Record<string, unknown>;
        expect(studio[section]).toBeDefined();
      }
    });
  }
});

describe('dicionários — seções do assistente', () => {
  const assistantSections = ['header', 'messages', 'composer', 'history', 'memories', 'settings'];

  for (const section of assistantSections) {
    it(`assistant.${section} existe em todos os locales`, () => {
      for (const locale of SUPPORTED_LOCALES) {
        const dict = dictionaries[locale] as Record<string, unknown>;
        const assistant = dict['assistant'] as Record<string, unknown>;
        expect(assistant[section]).toBeDefined();
      }
    });
  }
});

describe('dicionários — valores são strings', () => {
  it('todas as folhas de pt-BR são strings', () => {
    const keys = collectLeafKeys(dictionaries['pt-BR']);
    for (const key of keys) {
      const value = getNestedValue(dictionaries['pt-BR'], key);
      expect(typeof value).toBe('string');
    }
  });

  it('todas as folhas de en são strings', () => {
    const keys = collectLeafKeys(dictionaries.en);
    for (const key of keys) {
      const value = getNestedValue(dictionaries.en, key);
      expect(typeof value).toBe('string');
    }
  });

  it('todas as folhas de es são strings', () => {
    const keys = collectLeafKeys(dictionaries.es);
    for (const key of keys) {
      const value = getNestedValue(dictionaries.es, key);
      expect(typeof value).toBe('string');
    }
  });

  it('priceSubtitle do plano team é vazio em todos os locales (intencional — "Sob demanda")', () => {
    // O plano "Equipe" não tem preço mensal definido, então priceSubtitle é ''
    for (const locale of SUPPORTED_LOCALES) {
      const value = getNestedValue(
        dictionaries[locale],
        'pricing.plans.team.priceSubtitle',
      );
      expect(value).toBe('');
    }
  });
});

describe('dicionários — chaves numéricas (FAQ items, feature items, etc.)', () => {
  it('faqItems.general possui items numerados em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let i = 0; i <= 5; i++) {
        expect(
          getNestedValue(dictionaries[locale], `faqItems.general.${i}.question`),
        ).toBeDefined();
        expect(
          getNestedValue(dictionaries[locale], `faqItems.general.${i}.answer`),
        ).toBeDefined();
      }
    }
  });

  it('faqItems.technical possui items numerados em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let i = 0; i <= 4; i++) {
        expect(
          getNestedValue(dictionaries[locale], `faqItems.technical.${i}.question`),
        ).toBeDefined();
        expect(
          getNestedValue(dictionaries[locale], `faqItems.technical.${i}.answer`),
        ).toBeDefined();
      }
    }
  });

  it('faqItems.account possui items numerados em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let i = 0; i <= 2; i++) {
        expect(
          getNestedValue(dictionaries[locale], `faqItems.account.${i}.question`),
        ).toBeDefined();
        expect(
          getNestedValue(dictionaries[locale], `faqItems.account.${i}.answer`),
        ).toBeDefined();
      }
    }
  });

  it('pricingComparison.features possui 9 items numerados em todos os locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let i = 0; i <= 8; i++) {
        expect(
          getNestedValue(dictionaries[locale], `pricingComparison.features.${i}.name`),
        ).toBeDefined();
      }
    }
  });

  it('featureItems possui seções audio, video, image, assistant, library, speedPaint', () => {
    const sections = ['audio', 'video', 'image', 'assistant', 'library', 'speedPaint'];
    for (const locale of SUPPORTED_LOCALES) {
      for (const section of sections) {
        for (let i = 0; i <= 2; i++) {
          expect(
            getNestedValue(
              dictionaries[locale],
              `featureItems.${section}.${i}.title`,
            ),
          ).toBeDefined();
          expect(
            getNestedValue(
              dictionaries[locale],
              `featureItems.${section}.${i}.description`,
            ),
          ).toBeDefined();
        }
      }
    }
  });
});

describe('LOCALE_CONFIGS', () => {
  it('possui exatamente 3 configs', () => {
    expect(LOCALE_CONFIGS).toHaveLength(3);
  });

  it('cada config tem code, label e flag', () => {
    for (const config of LOCALE_CONFIGS) {
      expect(config.code).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.flag).toBeTruthy();
      expect(config.direction).toBe('ltr');
    }
  });

  it('codes das configs correspondem aos SUPPORTED_LOCALES', () => {
    const configCodes = LOCALE_CONFIGS.map((c) => c.code);
    for (const locale of SUPPORTED_LOCALES) {
      expect(configCodes).toContain(locale);
    }
  });

  it('flags são emojis únicos', () => {
    const flags = LOCALE_CONFIGS.map((c) => c.flag);
    const uniqueFlags = new Set(flags);
    expect(uniqueFlags.size).toBe(flags.length);
  });

  it('labels são strings não vazias em idioma nativo', () => {
    const expectedLabels = ['Português', 'English', 'Español'];
    const actualLabels = LOCALE_CONFIGS.map((c) => c.label);
    for (const label of expectedLabels) {
      expect(actualLabels).toContain(label);
    }
  });
});

describe('DEFAULT_LOCALE e SUPPORTED_LOCALES', () => {
  it('DEFAULT_LOCALE é pt-BR', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR');
  });

  it('SUPPORTED_LOCALES contém pt-BR, en e es nessa ordem', () => {
    expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en', 'es']);
  });

  it('DEFAULT_LOCALE está em SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it('dictionaries tem entry para cada locale em SUPPORTED_LOCALES', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(dictionaries[locale]).toBeDefined();
      expect(typeof dictionaries[locale]).toBe('object');
    }
  });
});
