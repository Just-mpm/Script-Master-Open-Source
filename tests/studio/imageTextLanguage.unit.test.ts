import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStudioStore } from '../../src/features/studio/store/studioStore';
import type { Locale } from '../../src/features/i18n/types';

// ---------------------------------------------------------------------------
// Testes da feature imageTextLanguage
//
// Valida o fluxo completo: locale selecionado pelo usuario no Inspector
// propagando-se pelo store -> buildGenerateOptions -> generateScenePrompts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. generateScenePrompts — propagacao do locale no prompt enviado ao Gemini
// ---------------------------------------------------------------------------

describe('imageTextLanguage — generateScenePrompts propaga locale', () => {
  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGenerateContent = vi.fn();
    vi.resetModules();

    vi.doMock('../../src/lib/env', () => ({
      getGeminiApiKey: vi.fn(() => 'test-api-key'),
    }));
    vi.doMock('../../src/lib/logger', () => ({
      createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    }));
    // GoogleGenAI precisa ser uma classe construtivel (usada com `new`)
    vi.doMock('@google/genai', () => {
      return {
        GoogleGenAI: class {
          models = { generateContent: mockGenerateContent };
        },
        Type: { ARRAY: 'ARRAY', OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER' },
      };
    });
  });

  afterEach(() => {
    vi.doUnmock('../../src/lib/env');
    vi.doUnmock('../../src/lib/logger');
    vi.doUnmock('@google/genai');
    vi.resetModules();
  });

  it('usa "portugues brasileiro" quando locale e pt-BR', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    await generateScenePrompts('roteiro de teste', 30, 'cinematic', 15, 'general', 'pt-BR');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    expect(systemPrompt).toContain('português brasileiro');
  });

  it('usa "ingles" quando locale e en', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    await generateScenePrompts('test script', 30, 'cinematic', 15, 'general', 'en');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    expect(systemPrompt).toContain('inglês');
  });

  it('usa "espanhol" quando locale e es', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    await generateScenePrompts('guion de prueba', 30, 'cinematic', 15, 'general', 'es');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    expect(systemPrompt).toContain('espanhol');
  });

  it('default e pt-BR quando locale nao informado', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    // Nao passa locale — usa default 'pt-BR'
    await generateScenePrompts('roteiro', 30, 'cinematic');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    expect(systemPrompt).toContain('português brasileiro');
  });

  it('o prompt contem instrucao CRITICA sobre idioma dos textos nas imagens', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    await generateScenePrompts('roteiro', 30, 'cinematic', 15, 'general', 'en');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    // Deve conter a instrucao critica sobre idioma dos textos nas imagens
    expect(systemPrompt).toContain('IDIOMA DOS TEXTOS NAS IMAGENS');
    expect(systemPrompt).toContain('inglês');
    expect(systemPrompt).toContain('NUNCA traduza esses textos para inglês');
  });

  it('o prompt com locale es instrui a manter texto em espanhol', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify([{ timestamp: 0, prompt: 'test prompt' }]),
    });

    await generateScenePrompts('guion', 30, 'cinematic', 15, 'general', 'es');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const systemPrompt = callArgs.contents[0].parts[0].text;
    expect(systemPrompt).toContain('espanhol');
    expect(systemPrompt).toContain('NUNCA traduza esses textos para inglês');
  });

  it('retorna fallback com isFallback=true quando API falha', async () => {
    const { generateScenePrompts } = await import('../../src/lib/gemini');

    mockGenerateContent.mockRejectedValue(new Error('API error'));

    const result = await generateScenePrompts('roteiro', 30, 'cinematic', 15, 'general', 'en');

    expect(result.isFallback).toBe(true);
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].timestamp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. buildGenerateOptions — mapeia imageTextLanguage -> locale
// ---------------------------------------------------------------------------

describe('imageTextLanguage — buildGenerateOptions propaga locale', () => {
  it('mapeia imageTextLanguage para locale no resultado', async () => {
    const { buildGenerateOptions } = await import('../../src/features/studio/store/studio.utils');

    const state = {
      script: 'meu roteiro',
      selectedVoice: 'Aoede',
      isMultiSpeaker: false,
      audioProfile: '',
      scene: '',
      pace: 'normal',
      styleNotes: '',
      generateScenes: true,
      sceneRatio: '16:9' as const,
      sceneDensity: 15,
      visualFramework: 'general',
      referenceImage: null,
      emotion: 'neutral' as const,
      emotionIntensity: 0.5,
      imageTextLanguage: 'en' as const,
      speakerAName: 'Voz A',
      speakerBVoice: 'Puck',
      speakerBName: 'Voz B',
    };

    const result = buildGenerateOptions('user-123', state);
    expect(result.locale).toBe('en');
  });

  it('locale padrao e pt-BR quando imageTextLanguage e pt-BR', async () => {
    const { buildGenerateOptions } = await import('../../src/features/studio/store/studio.utils');

    const state = {
      script: '',
      selectedVoice: 'Aoede',
      isMultiSpeaker: false,
      audioProfile: '',
      scene: '',
      pace: 'normal',
      styleNotes: '',
      generateScenes: false,
      sceneRatio: '16:9' as const,
      sceneDensity: 15,
      visualFramework: 'general',
      referenceImage: null,
      emotion: 'neutral' as const,
      emotionIntensity: 0.5,
      imageTextLanguage: 'pt-BR' as const,
      speakerAName: 'Voz A',
      speakerBVoice: 'Puck',
      speakerBName: 'Voz B',
    };

    const result = buildGenerateOptions(undefined, state);
    expect(result.locale).toBe('pt-BR');
  });

  it('locale e es quando imageTextLanguage e es', async () => {
    const { buildGenerateOptions } = await import('../../src/features/studio/store/studio.utils');

    const state = {
      script: '',
      selectedVoice: 'Aoede',
      isMultiSpeaker: false,
      audioProfile: '',
      scene: '',
      pace: 'normal',
      styleNotes: '',
      generateScenes: false,
      sceneRatio: '16:9' as const,
      sceneDensity: 15,
      visualFramework: 'general',
      referenceImage: null,
      emotion: 'neutral' as const,
      emotionIntensity: 0.5,
      imageTextLanguage: 'es' as const,
      speakerAName: 'Voz A',
      speakerBVoice: 'Puck',
      speakerBName: 'Voz B',
    };

    const result = buildGenerateOptions('user-456', state);
    expect(result.locale).toBe('es');
  });

  it('userId e propagado corretamente no resultado', async () => {
    const { buildGenerateOptions } = await import('../../src/features/studio/store/studio.utils');

    const state = {
      script: '',
      selectedVoice: 'Aoede',
      isMultiSpeaker: false,
      audioProfile: '',
      scene: '',
      pace: 'normal',
      styleNotes: '',
      generateScenes: false,
      sceneRatio: '16:9' as const,
      sceneDensity: 15,
      visualFramework: 'general',
      referenceImage: null,
      emotion: 'neutral' as const,
      emotionIntensity: 0.5,
      imageTextLanguage: 'pt-BR' as const,
      speakerAName: 'Voz A',
      speakerBVoice: 'Puck',
      speakerBName: 'Voz B',
    };

    const result = buildGenerateOptions('user-789', state);
    expect(result.userId).toBe('user-789');
  });

  it('state completo e espalhado no resultado junto com locale', async () => {
    const { buildGenerateOptions } = await import('../../src/features/studio/store/studio.utils');

    const state = {
      script: 'roteiro teste',
      selectedVoice: 'Aoede',
      isMultiSpeaker: true,
      audioProfile: 'narrador',
      scene: 'floresta',
      pace: 'slow',
      styleNotes: 'tom misterioso',
      generateScenes: true,
      sceneRatio: '9:16' as const,
      sceneDensity: 30,
      visualFramework: 'whiteboard',
      referenceImage: null,
      emotion: 'dramatic' as const,
      emotionIntensity: 0.8,
      imageTextLanguage: 'es' as const,
      speakerAName: 'Ana',
      speakerBVoice: 'Puck',
      speakerBName: 'Carlos',
    };

    const result = buildGenerateOptions('user-abc', state);
    expect(result.locale).toBe('es');
    expect(result.script).toBe('roteiro teste');
    expect(result.selectedVoice).toBe('Aoede');
    expect(result.isMultiSpeaker).toBe(true);
    expect(result.emotion).toBe('dramatic');
  });
});

// ---------------------------------------------------------------------------
// 3. STORAGE_KEYS.imageTextLanguage e getStoredImageTextLanguage
// ---------------------------------------------------------------------------

describe('imageTextLanguage — localStorage helpers', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
      removeItem: vi.fn((key: string) => { store.delete(key); }),
      clear: vi.fn(() => { store.clear(); }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('STORAGE_KEYS.imageTextLanguage existe com valor "s2a_image_text_lang"', async () => {
    const { STORAGE_KEYS } = await import('../../src/features/studio/store/studio.utils');
    expect(STORAGE_KEYS.imageTextLanguage).toBe('s2a_image_text_lang');
  });

  it('getStoredImageTextLanguage retorna pt-BR por padrao (sem valor no storage)', async () => {
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna valor armazenado quando valido (en)', async () => {
    store.set('s2a_image_text_lang', 'en');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('en');
  });

  it('getStoredImageTextLanguage retorna valor armazenado quando valido (es)', async () => {
    store.set('s2a_image_text_lang', 'es');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('es');
  });

  it('getStoredImageTextLanguage retorna pt-BR para valor invalido no storage', async () => {
    store.set('s2a_image_text_lang', 'fr');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR quando localStorage lanca erro', async () => {
    const { getItem } = localStorage as unknown as { getItem: ReturnType<typeof vi.fn> };
    getItem.mockImplementationOnce(() => { throw new DOMException('SecurityError'); });
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR para string vazia no storage', async () => {
    store.set('s2a_image_text_lang', '');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR para string com espacos', async () => {
    store.set('s2a_image_text_lang', ' en ');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR para valor case-diferenciado "EN"', async () => {
    store.set('s2a_image_text_lang', 'EN');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR para variante "PT-BR" (maiusculas)', async () => {
    store.set('s2a_image_text_lang', 'PT-BR');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage aceita exatamente os 3 locales validos', async () => {
    const { getStoredImageTextLanguage, STORAGE_KEYS } = await import('../../src/features/studio/store/studio.utils');
    const validLocales: Locale[] = ['pt-BR', 'en', 'es'];

    for (const locale of validLocales) {
      store.set(STORAGE_KEYS.imageTextLanguage, locale);
      expect(getStoredImageTextLanguage()).toBe(locale);
    }
  });

  it('getStoredImageTextLanguage rejeita variante com underscore "pt_BR"', async () => {
    store.set('s2a_image_text_lang', 'pt_BR');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getStoredImageTextLanguage retorna pt-BR para valor numerico "123"', async () => {
    store.set('s2a_image_text_lang', '123');
    const { getStoredImageTextLanguage } = await import('../../src/features/studio/store/studio.utils');
    expect(getStoredImageTextLanguage()).toBe('pt-BR');
  });

  it('getInitialStudioConfig inclui imageTextLanguage com valor padrao pt-BR', async () => {
    const { getInitialStudioConfig } = await import('../../src/features/studio/store/studio.utils');
    const config = getInitialStudioConfig();
    expect(config).toHaveProperty('imageTextLanguage');
    expect(config.imageTextLanguage).toBe('pt-BR');
  });

  it('getInitialStudioConfig le imageTextLanguage do localStorage quando valido', async () => {
    store.set('s2a_image_text_lang', 'en');
    const { getInitialStudioConfig } = await import('../../src/features/studio/store/studio.utils');
    const config = getInitialStudioConfig();
    expect(config.imageTextLanguage).toBe('en');
  });

  it('getInitialStudioConfig usa fallback pt-BR quando localStorage tem valor invalido', async () => {
    store.set('s2a_image_text_lang', 'invalid');
    const { getInitialStudioConfig } = await import('../../src/features/studio/store/studio.utils');
    const config = getInitialStudioConfig();
    expect(config.imageTextLanguage).toBe('pt-BR');
  });
});

// ---------------------------------------------------------------------------
// 4. studioStore — campo imageTextLanguage e setImageTextLanguage
// ---------------------------------------------------------------------------

describe('imageTextLanguage — studioStore', () => {
  const lsStore = new Map<string, string>();

  beforeEach(() => {
    useStudioStore.getState().reset();
    lsStore.clear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => lsStore.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { lsStore.set(key, value); }),
      removeItem: vi.fn((key: string) => { lsStore.delete(key); }),
      clear: vi.fn(() => { lsStore.clear(); }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imageTextLanguage padrao e pt-BR', () => {
    expect(useStudioStore.getState().imageTextLanguage).toBe('pt-BR');
  });

  it('setImageTextLanguage atualiza para en', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    expect(useStudioStore.getState().imageTextLanguage).toBe('en');
  });

  it('setImageTextLanguage atualiza para es', () => {
    useStudioStore.getState().setImageTextLanguage('es');
    expect(useStudioStore.getState().imageTextLanguage).toBe('es');
  });

  it('setImageTextLanguage volta para pt-BR', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    useStudioStore.getState().setImageTextLanguage('pt-BR');
    expect(useStudioStore.getState().imageTextLanguage).toBe('pt-BR');
  });

  it('imageTextLanguage e incluido no toDraftState', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    const state = useStudioStore.getState();
    expect(state.imageTextLanguage).toBe('en');
  });

  it('applySettings aceita imageTextLanguage no patch', () => {
    useStudioStore.getState().applySettings({ imageTextLanguage: 'es' });
    expect(useStudioStore.getState().imageTextLanguage).toBe('es');
  });

  it('persiste imageTextLanguage no localStorage ao chamar setImageTextLanguage', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    expect(localStorage.setItem).toHaveBeenCalledWith('s2a_image_text_lang', 'en');
  });

  it('persiste imageTextLanguage "es" no localStorage', () => {
    useStudioStore.getState().setImageTextLanguage('es');
    expect(localStorage.setItem).toHaveBeenCalledWith('s2a_image_text_lang', 'es');
  });

  it('reset restaura imageTextLanguage para pt-BR', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    useStudioStore.getState().reset();
    expect(useStudioStore.getState().imageTextLanguage).toBe('pt-BR');
  });

  it('applySettings com imageTextLanguage undefined nao altera o campo', () => {
    useStudioStore.getState().setImageTextLanguage('en');
    useStudioStore.getState().applySettings({});
    expect(useStudioStore.getState().imageTextLanguage).toBe('en');
  });

  it('nao persiste quando imageTextLanguage nao muda (otimizacao do subscribe)', () => {
    useStudioStore.getState().setImageTextLanguage('pt-BR');
    // O valor padrao ja e pt-BR — nao deve disparar persistencia
    const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
    const hasImageTextLang = calls.some((call: unknown[]) => call[0] === 's2a_image_text_lang');
    expect(hasImageTextLang).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Locale files — existencia e estrutura de imageTextLanguage
//    Os arquivos exportam named exports: ptBR, en, es (nao default)
// ---------------------------------------------------------------------------

describe('imageTextLanguage — locale files', () => {
  it('pt-BR tem a chave imageTextLanguage com label e 3 opcoes', async () => {
    const { ptBR } = await import('../../src/features/i18n/locales/pt-BR');
    const studio = ptBR.studio as Record<string, unknown> | undefined;
    const inspector = studio?.inspector as Record<string, unknown> | undefined;
    const sceneFields = inspector?.sceneFields as Record<string, unknown> | undefined;

    expect(sceneFields).toBeDefined();
    expect(sceneFields!.imageTextLanguage).toBeDefined();

    const lang = sceneFields!.imageTextLanguage as Record<string, string>;
    expect(lang.label).toBe('Idioma dos textos nas imagens');
    expect(lang['pt-BR']).toBe('Português (Brasil)');
    expect(lang.en).toBe('Inglês');
    expect(lang.es).toBe('Espanhol');
  });

  it('en tem a chave imageTextLanguage com label e 3 opcoes', async () => {
    const { en } = await import('../../src/features/i18n/locales/en');
    const studio = en.studio as Record<string, unknown> | undefined;
    const inspector = studio?.inspector as Record<string, unknown> | undefined;
    const sceneFields = inspector?.sceneFields as Record<string, unknown> | undefined;

    expect(sceneFields).toBeDefined();
    expect(sceneFields!.imageTextLanguage).toBeDefined();

    const lang = sceneFields!.imageTextLanguage as Record<string, string>;
    expect(lang.label).toBe('Image text language');
    expect(lang['pt-BR']).toBe('Portuguese (Brazil)');
    expect(lang.en).toBe('English');
    expect(lang.es).toBe('Spanish');
  });

  it('es tem a chave imageTextLanguage com label e 3 opcoes', async () => {
    const { es } = await import('../../src/features/i18n/locales/es');
    const studio = es.studio as Record<string, unknown> | undefined;
    const inspector = studio?.inspector as Record<string, unknown> | undefined;
    const sceneFields = inspector?.sceneFields as Record<string, unknown> | undefined;

    expect(sceneFields).toBeDefined();
    expect(sceneFields!.imageTextLanguage).toBeDefined();

    const lang = sceneFields!.imageTextLanguage as Record<string, string>;
    expect(lang.label).toBe('Idioma de los textos en las imágenes');
    expect(lang['pt-BR']).toBe('Portugués (Brasil)');
    expect(lang.en).toBe('Inglés');
    expect(lang.es).toBe('Español');
  });
});
