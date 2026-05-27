import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STORAGE_KEYS,
  saveStudioDefaults,
  clearStudioDefaults,
  getStoredEmotion,
  getStoredImageTextLanguage,
  getInitialStudioConfig,
  buildGenerateOptions,
} from '../../src/features/studio/store/studio.utils';

// ---------------------------------------------------------------------------
// Testes de persistência de padrões — saveStudioDefaults, clearStudioDefaults
// e funções de leitura de emoção, idioma e config inicial
// ---------------------------------------------------------------------------

describe('studio.utils — persistência de padrões', () => {
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

  // ---------------------------------------------------------------------------
  // getStoredEmotion
  // ---------------------------------------------------------------------------

  describe('getStoredEmotion', () => {
    it('retorna "neutral" quando não há valor armazenado', () => {
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna emoção armazenada quando válida', () => {
      store.set(STORAGE_KEYS.emotion, 'happy');
      expect(getStoredEmotion()).toBe('happy');
    });

    it('retorna "neutral" quando valor armazenado é inválido', () => {
      store.set(STORAGE_KEYS.emotion, 'excited');
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" quando valor armazenado é null', () => {
      store.set(STORAGE_KEYS.emotion, 'null');
      expect(getStoredEmotion()).toBe('neutral');
    });

    it('retorna "neutral" quando localStorage lança erro', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      expect(getStoredEmotion()).toBe('neutral');
    });
  });

  // ---------------------------------------------------------------------------
  // getStoredImageTextLanguage
  // ---------------------------------------------------------------------------

  describe('getStoredImageTextLanguage', () => {
    it('retorna "pt-BR" quando não há valor armazenado', () => {
      expect(getStoredImageTextLanguage()).toBe('pt-BR');
    });

    it('retorna locale armazenado quando válido', () => {
      store.set(STORAGE_KEYS.imageTextLanguage, 'en');
      expect(getStoredImageTextLanguage()).toBe('en');
    });

    it('retorna "pt-BR" quando locale armazenado é inválido', () => {
      store.set(STORAGE_KEYS.imageTextLanguage, 'fr');
      expect(getStoredImageTextLanguage()).toBe('pt-BR');
    });

    it('retorna "pt-BR" quando localStorage lança erro', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      expect(getStoredImageTextLanguage()).toBe('pt-BR');
    });
  });

  // ---------------------------------------------------------------------------
  // getInitialStudioConfig
  // ---------------------------------------------------------------------------

  describe('getInitialStudioConfig', () => {
    it('retorna config com todos os campos obrigatórios', () => {
      const config = getInitialStudioConfig();
      expect(config).toHaveProperty('script');
      expect(config).toHaveProperty('isMultiSpeaker');
      expect(config).toHaveProperty('speakerAName');
      expect(config).toHaveProperty('selectedVoice');
      expect(config).toHaveProperty('speakerBName');
      expect(config).toHaveProperty('speakerBVoice');
      expect(config).toHaveProperty('audioProfile');
      expect(config).toHaveProperty('scene');
      expect(config).toHaveProperty('styleNotes');
      expect(config).toHaveProperty('pace');
      expect(config).toHaveProperty('generateScenes');
      expect(config).toHaveProperty('sceneDensity');
      expect(config).toHaveProperty('sceneRatio');
      expect(config).toHaveProperty('visualFramework');
      expect(config).toHaveProperty('referenceImage');
      expect(config).toHaveProperty('emotion');
      expect(config).toHaveProperty('emotionIntensity');
      expect(config).toHaveProperty('imageTextLanguage');
    });

    it('retorna valores padrão quando localStorage está vazio', () => {
      const config = getInitialStudioConfig();
      expect(config.isMultiSpeaker).toBe(false);
      expect(config.pace).toBe('normal');
      expect(config.generateScenes).toBe(false);
      expect(config.sceneDensity).toBe(15);
      expect(config.sceneRatio).toBe('16:9');
      expect(config.visualFramework).toBe('general');
      expect(config.referenceImage).toBeNull();
      expect(config.emotion).toBe('neutral');
      expect(config.emotionIntensity).toBe(0.5);
      expect(config.imageTextLanguage).toBe('pt-BR');
    });

    it('lê valores salvos do localStorage', () => {
      store.set(STORAGE_KEYS.isMultiSpeaker, 'true');
      store.set(STORAGE_KEYS.pace, 'slow');
      store.set(STORAGE_KEYS.sceneDensity, '30');
      store.set(STORAGE_KEYS.emotion, 'dramatic');
      store.set(STORAGE_KEYS.imageTextLanguage, 'es');

      const config = getInitialStudioConfig();
      expect(config.isMultiSpeaker).toBe(true);
      expect(config.pace).toBe('slow');
      expect(config.sceneDensity).toBe(30);
      expect(config.emotion).toBe('dramatic');
      expect(config.imageTextLanguage).toBe('es');
    });

    it('referenceImage é sempre null (session-only, nunca persistido)', () => {
      store.set('s2a_referenceImage', 'data:image/png;base64,abc');
      const config = getInitialStudioConfig();
      expect(config.referenceImage).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // saveStudioDefaults
  // ---------------------------------------------------------------------------

  describe('saveStudioDefaults', () => {
    it('salva valores booleanos como string "true"/"false"', () => {
      saveStudioDefaults({ isMultiSpeaker: true, generateScenes: false });
      expect(store.get(STORAGE_KEYS.isMultiSpeaker)).toBe('true');
      expect(store.get(STORAGE_KEYS.generateScenes)).toBe('false');
    });

    it('salva valores numéricos como string', () => {
      saveStudioDefaults({ sceneDensity: 60, emotionIntensity: 0.8 });
      expect(store.get(STORAGE_KEYS.sceneDensity)).toBe('60');
      expect(store.get(STORAGE_KEYS.emotionIntensity)).toBe('0.8');
    });

    it('salva strings diretamente', () => {
      saveStudioDefaults({
        speakerAName: 'Apresentador',
        pace: 'slow',
        sceneRatio: '9:16',
        emotion: 'happy',
        imageTextLanguage: 'en',
      });
      expect(store.get(STORAGE_KEYS.speakerAName)).toBe('Apresentador');
      expect(store.get(STORAGE_KEYS.pace)).toBe('slow');
      expect(store.get(STORAGE_KEYS.sceneRatio)).toBe('9:16');
      expect(store.get(STORAGE_KEYS.emotion)).toBe('happy');
      expect(store.get(STORAGE_KEYS.imageTextLanguage)).toBe('en');
    });

    it('salva apenas campos fornecidos (patch parcial)', () => {
      saveStudioDefaults({ speakerAName: 'Novo Nome' });
      expect(store.get(STORAGE_KEYS.speakerAName)).toBe('Novo Nome');
      // Campos não fornecidos não são tocados
      expect(store.has(STORAGE_KEYS.pace)).toBe(false);
      expect(store.has(STORAGE_KEYS.sceneDensity)).toBe(false);
    });

    it('salva objeto vazio sem modificar localStorage', () => {
      saveStudioDefaults({});
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('não salva campos com valor undefined explicitamente', () => {
      saveStudioDefaults({ speakerAName: undefined });
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('salva todas as 16 chaves de settings de uma vez', () => {
      const patch = {
        isMultiSpeaker: true,
        speakerAName: 'A',
        selectedVoice: 'Aoede',
        speakerBName: 'B',
        speakerBVoice: 'Zephyr',
        audioProfile: 'podcast',
        scene: 'Estúdio',
        styleNotes: 'Profissional',
        pace: 'fast',
        generateScenes: true,
        sceneDensity: 30,
        sceneRatio: '1:1' as const,
        visualFramework: 'whiteboard',
        emotion: 'calm' as const,
        emotionIntensity: 0.7,
        imageTextLanguage: 'en' as const,
      };
      saveStudioDefaults(patch);
      expect(localStorage.setItem).toHaveBeenCalledTimes(16);
    });

    it('não lança erro quando localStorage.setItem falha', () => {
      (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() => saveStudioDefaults({ speakerAName: 'Nome' })).not.toThrow();
    });

    it('não inclui "script" nas chaves salvas (excluído de DEFAULTS_KEYS)', () => {
      saveStudioDefaults({ speakerAName: 'Teste' });
      // Verifica que s2a_script nunca foi passada ao setItem
      const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      const keys = calls.map((call: string[]) => call[0]);
      expect(keys).not.toContain(STORAGE_KEYS.script);
    });

    it('não inclui "referenceImage" nas chaves salvas (session-only)', () => {
      saveStudioDefaults({ speakerAName: 'Teste' });
      const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      const keys = calls.map((call: string[]) => call[0]);
      expect(keys).not.toContain('s2a_referenceImage');
    });
  });

  // ---------------------------------------------------------------------------
  // clearStudioDefaults
  // ---------------------------------------------------------------------------

  describe('clearStudioDefaults', () => {
    it('remove todas as 16 chaves de settings do localStorage', () => {
      // Preenche todas as chaves primeiro
      store.set(STORAGE_KEYS.isMultiSpeaker, 'true');
      store.set(STORAGE_KEYS.speakerAName, 'A');
      store.set(STORAGE_KEYS.selectedVoice, 'Aoede');
      store.set(STORAGE_KEYS.speakerBName, 'B');
      store.set(STORAGE_KEYS.speakerBVoice, 'Zephyr');
      store.set(STORAGE_KEYS.audioProfile, 'podcast');
      store.set(STORAGE_KEYS.scene, 'Estúdio');
      store.set(STORAGE_KEYS.styleNotes, 'Notas');
      store.set(STORAGE_KEYS.pace, 'fast');
      store.set(STORAGE_KEYS.generateScenes, 'true');
      store.set(STORAGE_KEYS.sceneDensity, '30');
      store.set(STORAGE_KEYS.sceneRatio, '9:16');
      store.set(STORAGE_KEYS.visualFramework, 'whiteboard');
      store.set(STORAGE_KEYS.emotion, 'happy');
      store.set(STORAGE_KEYS.emotionIntensity, '0.8');
      store.set(STORAGE_KEYS.imageTextLanguage, 'en');

      clearStudioDefaults();

      // Verifica que removeItem foi chamado 16 vezes (DEFAULTS_KEYS)
      expect(localStorage.removeItem).toHaveBeenCalledTimes(16);

      // Verifica que todas as chaves foram removidas do store
      expect(store.has(STORAGE_KEYS.isMultiSpeaker)).toBe(false);
      expect(store.has(STORAGE_KEYS.speakerAName)).toBe(false);
      expect(store.has(STORAGE_KEYS.selectedVoice)).toBe(false);
      expect(store.has(STORAGE_KEYS.speakerBName)).toBe(false);
      expect(store.has(STORAGE_KEYS.speakerBVoice)).toBe(false);
      expect(store.has(STORAGE_KEYS.audioProfile)).toBe(false);
      expect(store.has(STORAGE_KEYS.scene)).toBe(false);
      expect(store.has(STORAGE_KEYS.styleNotes)).toBe(false);
      expect(store.has(STORAGE_KEYS.pace)).toBe(false);
      expect(store.has(STORAGE_KEYS.generateScenes)).toBe(false);
      expect(store.has(STORAGE_KEYS.sceneDensity)).toBe(false);
      expect(store.has(STORAGE_KEYS.sceneRatio)).toBe(false);
      expect(store.has(STORAGE_KEYS.visualFramework)).toBe(false);
      expect(store.has(STORAGE_KEYS.emotion)).toBe(false);
      expect(store.has(STORAGE_KEYS.emotionIntensity)).toBe(false);
      expect(store.has(STORAGE_KEYS.imageTextLanguage)).toBe(false);
    });

    it('não remove "script" (excluído de DEFAULTS_KEYS)', () => {
      store.set(STORAGE_KEYS.script, 'meu roteiro');
      clearStudioDefaults();

      const calls = (localStorage.removeItem as ReturnType<typeof vi.fn>).mock.calls;
      const keys = calls.map((call: string[]) => call[0]);
      expect(keys).not.toContain(STORAGE_KEYS.script);

      // Script deve permanecer no store
      expect(store.has(STORAGE_KEYS.script)).toBe(true);
    });

    it('não lança erro quando localStorage.removeItem falha', () => {
      (localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      expect(() => clearStudioDefaults()).not.toThrow();
    });

    it('funciona corretamente com localStorage vazio', () => {
      expect(() => clearStudioDefaults()).not.toThrow();
      expect(localStorage.removeItem).toHaveBeenCalledTimes(16);
    });
  });

  // ---------------------------------------------------------------------------
  // buildGenerateOptions
  // ---------------------------------------------------------------------------

  describe('buildGenerateOptions', () => {
    const baseState = {
      script: 'Roteiro de teste',
      selectedVoice: 'Aoede',
      isMultiSpeaker: false,
      audioProfile: 'podcast',
      scene: 'Estúdio',
      pace: 'normal',
      styleNotes: '',
      generateScenes: true,
      sceneRatio: '16:9' as const,
      sceneDensity: 15,
      visualFramework: 'general',
      referenceImage: null as string | null,
      emotion: 'neutral' as const,
      emotionIntensity: 0.5,
      imageTextLanguage: 'pt-BR' as const,
      speakerAName: 'Voz A',
      speakerBVoice: 'Zephyr',
      speakerBName: 'Voz B',
    };

    it('retorna objeto com userId e projectName', () => {
      const result = buildGenerateOptions('user-123', baseState);
      expect(result.userId).toBe('user-123');
      expect(result.projectName).toContain('Projeto');
    });

    it('propaga locale a partir de imageTextLanguage', () => {
      const result = buildGenerateOptions('user-123', baseState);
      expect(result.locale).toBe('pt-BR');
    });

    it('propaga locale como "en" quando imageTextLanguage é "en"', () => {
      const state = { ...baseState, imageTextLanguage: 'en' as const };
      const result = buildGenerateOptions('user-123', state);
      expect(result.locale).toBe('en');
    });

    it('aceita userId undefined', () => {
      const result = buildGenerateOptions(undefined, baseState);
      expect(result.userId).toBeUndefined();
    });

    it('spread completo do state — todos os campos estão presentes', () => {
      const result = buildGenerateOptions('user-123', baseState);
      expect(result.script).toBe('Roteiro de teste');
      expect(result.selectedVoice).toBe('Aoede');
      expect(result.isMultiSpeaker).toBe(false);
      expect(result.audioProfile).toBe('podcast');
      expect(result.scene).toBe('Estúdio');
      expect(result.pace).toBe('normal');
      expect(result.styleNotes).toBe('');
      expect(result.generateScenes).toBe(true);
      expect(result.sceneRatio).toBe('16:9');
      expect(result.sceneDensity).toBe(15);
      expect(result.visualFramework).toBe('general');
      expect(result.referenceImage).toBeNull();
      expect(result.emotion).toBe('neutral');
      expect(result.emotionIntensity).toBe(0.5);
      expect(result.imageTextLanguage).toBe('pt-BR');
      expect(result.speakerAName).toBe('Voz A');
      expect(result.speakerBVoice).toBe('Zephyr');
      expect(result.speakerBName).toBe('Voz B');
    });

    it('projectName contém data atual', () => {
      const result = buildGenerateOptions('user-123', baseState);
      const today = new Date().toLocaleDateString();
      expect(result.projectName).toContain(today);
    });
  });

  // ---------------------------------------------------------------------------
  // Integração save → getInitialStudioConfig
  // ---------------------------------------------------------------------------

  describe('integração save → getInitialStudioConfig', () => {
    it('valores salvos são lidos por getInitialStudioConfig', () => {
      saveStudioDefaults({
        speakerAName: 'Apresentador',
        pace: 'slow',
        sceneDensity: 60,
        emotion: 'dramatic',
        imageTextLanguage: 'es',
        isMultiSpeaker: true,
        generateScenes: true,
        sceneRatio: '9:16',
        visualFramework: 'whiteboard',
        audioProfile: 'podcast',
        emotionIntensity: 0.9,
      });

      const config = getInitialStudioConfig();
      expect(config.speakerAName).toBe('Apresentador');
      expect(config.pace).toBe('slow');
      expect(config.sceneDensity).toBe(60);
      expect(config.emotion).toBe('dramatic');
      expect(config.imageTextLanguage).toBe('es');
      expect(config.isMultiSpeaker).toBe(true);
      expect(config.generateScenes).toBe(true);
      expect(config.sceneRatio).toBe('9:16');
      expect(config.visualFramework).toBe('whiteboard');
      expect(config.audioProfile).toBe('podcast');
      expect(config.emotionIntensity).toBe(0.9);
    });

    it('clearStudioDefaults restaura os valores padrão', () => {
      // Primeiro salva valores customizados
      saveStudioDefaults({
        speakerAName: 'Custom',
        pace: 'fast',
        emotion: 'angry',
      });

      // Confirma que estão salvos
      let config = getInitialStudioConfig();
      expect(config.speakerAName).toBe('Custom');
      expect(config.pace).toBe('fast');
      expect(config.emotion).toBe('angry');

      // Limpa tudo
      clearStudioDefaults();

      // Confirma que voltou aos padrões
      config = getInitialStudioConfig();
      expect(config.speakerAName).toBe('Voz A');
      expect(config.pace).toBe('normal');
      expect(config.emotion).toBe('neutral');
    });
  });
});
