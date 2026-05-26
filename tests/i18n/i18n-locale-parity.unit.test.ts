import { describe, expect, it } from 'vitest';
import { dictionaries, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../src/features/i18n/locales';
import type { Locale, TranslationDictionary } from '../../src/features/i18n/types';

interface LocaleDiff {
  locale: Locale;
  missingKeys: string[];
  extraKeys: string[];
}

function collectLeafKeys(dictionary: TranslationDictionary, prefix = ''): string[] {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      return [path];
    }

    return collectLeafKeys(value, path);
  });
}

function getLocaleDiff(locale: Locale, baseKeys: string[]): LocaleDiff {
  const localeKeys = collectLeafKeys(dictionaries[locale]);
  const localeKeySet = new Set(localeKeys);
  const baseKeySet = new Set(baseKeys);

  return {
    locale,
    missingKeys: baseKeys.filter((key) => !localeKeySet.has(key)),
    extraKeys: localeKeys.filter((key) => !baseKeySet.has(key)),
  };
}

function formatLocaleDiff(diff: LocaleDiff): string {
  const missing = diff.missingKeys.map((key) => `  - ${key}`).join('\n');
  const extra = diff.extraKeys.map((key) => `  - ${key}`).join('\n');

  return [
    `Locale ${diff.locale}`,
    diff.missingKeys.length > 0 ? `Missing keys:\n${missing}` : null,
    diff.extraKeys.length > 0 ? `Extra keys:\n${extra}` : null,
  ].filter((line): line is string => line !== null).join('\n');
}

describe('i18n locale parity', () => {
  it('mantém todos os locales com as mesmas chaves folha do locale base', () => {
    const baseKeys = collectLeafKeys(dictionaries[DEFAULT_LOCALE]).sort();

    const diffs = SUPPORTED_LOCALES
      .map((locale) => getLocaleDiff(locale, baseKeys))
      .filter((diff) => diff.missingKeys.length > 0 || diff.extraKeys.length > 0);

    expect(
      diffs.map(formatLocaleDiff).join('\n\n'),
    ).toBe('');
  });
});
