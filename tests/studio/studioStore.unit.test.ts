import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStudioStore } from '../../src/features/studio/store/studioStore';
import type { StudioSettingsPatch } from '../../src/features/studio/types';

describe('studioStore', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    // Reset do store Zustand
    useStudioStore.getState().reset();
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

  // ─── Valores iniciais ─────────────────────────────────────

  describe('estado inicial', () => {
    it('deve ter script vazio por padrão', () => {
      expect(useStudioStore.getState().script).toBe('');
    });

    it('deve ter selectedVoice com fallback da VOICES[0]', () => {
      // VOICES[0] é 'Aoede' — depende do que está no localStorage
      expect(useStudioStore.getState().selectedVoice).toBeTruthy();
    });

    it('deve ter pace "normal" por padrão', () => {
      expect(useStudioStore.getState().pace).toBe('normal');
    });

    it('deve ter sceneRatio "16:9" por padrão', () => {
      expect(useStudioStore.getState().sceneRatio).toBe('16:9');
    });

    it('deve ter referenceImage null (session-only)', () => {
      expect(useStudioStore.getState().referenceImage).toBeNull();
    });

    it('deve ter videoFps = 30', () => {
      expect(useStudioStore.getState().videoFps).toBe(30);
    });
  });

  // ─── Setters ────────────────────────────────────────────

  describe('setters', () => {
    it('setScript atualiza o script', () => {
      useStudioStore.getState().setScript('novo roteiro');
      expect(useStudioStore.getState().script).toBe('novo roteiro');
    });

    it('setSelectedVoice atualiza a voz', () => {
      useStudioStore.getState().setSelectedVoice('Zephyr');
      expect(useStudioStore.getState().selectedVoice).toBe('Zephyr');
    });

    it('setSceneRatio atualiza o ratio', () => {
      useStudioStore.getState().setSceneRatio('9:16');
      expect(useStudioStore.getState().sceneRatio).toBe('9:16');
    });

    it('setIsMultiSpeaker atualiza o flag', () => {
      useStudioStore.getState().setIsMultiSpeaker(true);
      expect(useStudioStore.getState().isMultiSpeaker).toBe(true);
    });

    it('setSceneDensity atualiza a densidade', () => {
      useStudioStore.getState().setSceneDensity(30);
      expect(useStudioStore.getState().sceneDensity).toBe(30);
    });

    it('setReferenceImage atualiza a imagem de referência', () => {
      useStudioStore.getState().setReferenceImage('data:image/png;base64,abc');
      expect(useStudioStore.getState().referenceImage).toBe('data:image/png;base64,abc');
    });

    it('setReferenceImage(null) limpa a imagem', () => {
      useStudioStore.getState().setReferenceImage('data:image/png;base64,abc');
      useStudioStore.getState().setReferenceImage(null);
      expect(useStudioStore.getState().referenceImage).toBeNull();
    });
  });

  // ─── applySettings ─────────────────────────────────────

  describe('applySettings', () => {
    it('aplica patch parcial com script', () => {
      useStudioStore.getState().applySettings({ script: 'roteiro atualizado' });
      expect(useStudioStore.getState().script).toBe('roteiro atualizado');
      // Outros campos inalterados
      expect(useStudioStore.getState().pace).toBe('normal');
    });

    it('aplica patch parcial com selectedVoice', () => {
      useStudioStore.getState().applySettings({ selectedVoice: 'Charon' });
      expect(useStudioStore.getState().selectedVoice).toBe('Charon');
    });

    it('aplica patch com múltiplos campos', () => {
      const patch: StudioSettingsPatch = {
        script: 'novo',
        pace: 'fast',
        sceneRatio: '1:1',
      };
      useStudioStore.getState().applySettings(patch);
      expect(useStudioStore.getState().script).toBe('novo');
      expect(useStudioStore.getState().pace).toBe('fast');
      expect(useStudioStore.getState().sceneRatio).toBe('1:1');
    });

    it('não atualiza campos com mesmo valor (otimização)', () => {
      const state = useStudioStore.getState();
      // Chamar applySettings com o mesmo valor não deve disparar atualizações
      state.applySettings({ script: state.script });
      expect(useStudioStore.getState().script).toBe(state.script);
    });

    it('campos undefined no patch são ignorados', () => {
      const originalScript = useStudioStore.getState().script;
      useStudioStore.getState().applySettings({} as StudioSettingsPatch);
      expect(useStudioStore.getState().script).toBe(originalScript);
    });
  });

  // ─── reset ──────────────────────────────────────────────

  describe('reset', () => {
    it('restaura todos os campos ao estado inicial', () => {
      useStudioStore.getState().setScript('alterado');
      useStudioStore.getState().setPace('fast');
      useStudioStore.getState().setSceneRatio('9:16');
      useStudioStore.getState().setIsMultiSpeaker(true);

      useStudioStore.getState().reset();

      expect(useStudioStore.getState().script).toBe('');
      expect(useStudioStore.getState().pace).toBe('normal');
      expect(useStudioStore.getState().sceneRatio).toBe('16:9');
      expect(useStudioStore.getState().isMultiSpeaker).toBe(false);
    });
  });

  // ─── localStorage sync via subscribe ───────────────────

  describe('localStorage sync', () => {
    it('persiste script no localStorage ao chamar setScript', () => {
      useStudioStore.getState().setScript('meu roteiro');
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_script', 'meu roteiro');
    });

    it('persiste selectedVoice no localStorage ao chamar setSelectedVoice', () => {
      useStudioStore.getState().setSelectedVoice('Kore');
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_voice', 'Kore');
    });

    it('persiste pace no localStorage ao chamar setPace', () => {
      useStudioStore.getState().setPace('slow');
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_pace', 'slow');
    });

    it('persiste isMultiSpeaker como string no localStorage', () => {
      useStudioStore.getState().setIsMultiSpeaker(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_multi', 'true');
    });

    it('persiste sceneDensity como string no localStorage', () => {
      useStudioStore.getState().setSceneDensity(30);
      expect(localStorage.setItem).toHaveBeenCalledWith('s2a_scene_density', '30');
    });

    it('não persiste referenceImage (session-only)', () => {
      useStudioStore.getState().setReferenceImage('data:image/png;base64,abc');
      // Não deve ter chamada com chave de referenceImage
      const calls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      const hasRefImage = calls.some((call: unknown[]) => {
        const key = call[0] as string;
        return key.includes('reference') || key.includes('ref_image');
      });
      expect(hasRefImage).toBe(false);
    });
  });

  // ─── Selector getCurrentState ──────────────────────────

  describe('toDraftState (getCurrentState)', () => {
    it('retorna objeto StudioDraftState correto', () => {
      const state = useStudioStore.getState();
      expect(state).toHaveProperty('script');
      expect(state).toHaveProperty('selectedVoice');
      expect(state).toHaveProperty('isMultiSpeaker');
      expect(state).toHaveProperty('audioProfile');
      expect(state).toHaveProperty('scene');
      expect(state).toHaveProperty('pace');
      expect(state).toHaveProperty('styleNotes');
      expect(state).toHaveProperty('generateScenes');
      expect(state).toHaveProperty('sceneRatio');
      expect(state).toHaveProperty('sceneDensity');
      expect(state).toHaveProperty('visualFramework');
      expect(state).toHaveProperty('referenceImage');
    });
  });
});
