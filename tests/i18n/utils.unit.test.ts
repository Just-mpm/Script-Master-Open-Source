import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectBrowserLocale, isValidLocale, LOCALE_STORAGE_KEY } from '../../src/features/i18n/utils';

// ── detectBrowserLocale ───────────────────────────────────────────────────

describe('detectBrowserLocale', () => {
  const originalLanguages = navigator.languages;
  const originalLanguage = navigator.language;

  afterEach(() => {
    // Restaura navigator.languages e navigator.language
    Object.defineProperty(navigator, 'languages', {
      value: originalLanguages,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      writable: true,
      configurable: true,
    });
  });

  it('retorna pt-BR quando navigator.languages contém pt-BR', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['pt-BR', 'en'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('retorna pt-BR quando navigator.languages contém pt (sem BR)', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['pt', 'en-US'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('retorna pt-BR quando navigator.languages contém pt-PT', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['pt-PT', 'en-US'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('retorna en quando navigator.languages contém en-US', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['en-US', 'pt-BR'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('en');
  });

  it('retorna en quando navigator.languages contém en-GB', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['en-GB'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('en');
  });

  it('retorna es quando navigator.languages contém es-ES', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['es-ES', 'en'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('es');
  });

  it('retorna es quando navigator.languages contém es-MX', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['es-MX'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('es');
  });

  it('retorna DEFAULT_LOCALE (pt-BR) quando navigator.languages contém idioma não suportado', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['fr-FR', 'de-DE'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('retorna DEFAULT_LOCALE quando navigator.languages é array vazio', () => {
    Object.defineProperty(navigator, 'languages', {
      value: [],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('retorna DEFAULT_LOCALE quando navigator.languages é undefined (usa navigator.language)', () => {
    Object.defineProperty(navigator, 'languages', {
      value: undefined as unknown as readonly string[],
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'language', {
      value: 'it-IT',
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('pt-BR');
  });

  it('usa navigator.language quando navigator.languages é undefined e contém idioma suportado', () => {
    Object.defineProperty(navigator, 'languages', {
      value: undefined as unknown as readonly string[],
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'language', {
      value: 'es',
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('es');
  });

  it('prioriza o primeiro idioma de navigator.languages', () => {
    Object.defineProperty(navigator, 'languages', {
      value: ['es-AR', 'pt-BR', 'en-US'],
      writable: true,
      configurable: true,
    });
    expect(detectBrowserLocale()).toBe('es');
  });
});

// ── LOCALE_STORAGE_KEY ────────────────────────────────────────────────────

describe('LOCALE_STORAGE_KEY', () => {
  it('é uma string não vazia', () => {
    expect(LOCALE_STORAGE_KEY).toBeTruthy();
    expect(typeof LOCALE_STORAGE_KEY).toBe('string');
  });

  it('segue a convenção de prefixo s2a_', () => {
    expect(LOCALE_STORAGE_KEY).toMatch(/^s2a_/);
  });

  it('contém "locale" no nome', () => {
    expect(LOCALE_STORAGE_KEY.toLowerCase()).toContain('locale');
  });
});

// ── isValidLocale — casos adicionais ──────────────────────────────────────

describe('isValidLocale — edge cases', () => {
  it('retorna false para null (via type guard)', () => {
    expect(isValidLocale(null as unknown as string)).toBe(false);
  });

  it('retorna false para undefined (via type guard)', () => {
    expect(isValidLocale(undefined as unknown as string)).toBe(false);
  });

  it('retorna false para número (via type guard)', () => {
    expect(isValidLocale(42 as unknown as string)).toBe(false);
  });

  it('retorna false para pt_BR (underscore)', () => {
    expect(isValidLocale('pt_BR')).toBe(false);
  });

  it('retorna false para en-US (completo)', () => {
    expect(isValidLocale('en-US')).toBe(false);
  });

  it('retorna false para espaços', () => {
    expect(isValidLocale(' pt-BR')).toBe(false);
    expect(isValidLocale('pt-BR ')).toBe(false);
  });
});
