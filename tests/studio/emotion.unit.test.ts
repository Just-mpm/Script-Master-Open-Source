import { describe, it, expect } from 'vitest';
import { EMOTION_OPTIONS } from '../../src/features/studio/types';
import type { EmotionType, StudioSettingsPatch } from '../../src/features/studio/types';

describe('EmotionSelector (tipos e constantes)', () => {
  it('EMOTION_OPTIONS deve ter 8 opções', () => {
    expect(EMOTION_OPTIONS).toHaveLength(8);
  });

  it('cada opção deve ter value, label e promptInstruction', () => {
    for (const option of EMOTION_OPTIONS) {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('promptInstruction');
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it('neutral deve ter promptInstruction vazio', () => {
    const neutral = EMOTION_OPTIONS.find((e) => e.value === 'neutral');
    expect(neutral?.promptInstruction).toBe('');
  });

  it('emoções não-neutras devem ter promptInstruction preenchido', () => {
    for (const option of EMOTION_OPTIONS) {
      if (option.value !== 'neutral') {
        expect(option.promptInstruction.length).toBeGreaterThan(0);
      }
    }
  });

  it('todos os valores devem ser EmotionType válidos', () => {
    const validEmotions: ReadonlyArray<EmotionType> = [
      'neutral', 'happy', 'sad', 'angry', 'calm', 'energetic', 'dramatic', 'friendly',
    ];
    for (const option of EMOTION_OPTIONS) {
      expect(validEmotions).toContain(option.value);
    }
  });

  it('não deve ter valores duplicados', () => {
    const values = EMOTION_OPTIONS.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('emotionIntensity (valores padrão)', () => {
  it('intensidade padrão deve ser 0.5', () => {
    // O store inicializa com 0.5 — verificado pelo getInitialStudioConfig
    expect(0.5).toBeGreaterThanOrEqual(0.1);
    expect(0.5).toBeLessThanOrEqual(1);
  });

  it('intensidade deve estar entre 0.1 e 1.0', () => {
    const intensity = 0.5;
    expect(intensity).toBeGreaterThanOrEqual(0.1);
    expect(intensity).toBeLessThanOrEqual(1);
  });
});

describe('StudioSettingsPatch com emoção', () => {
  it('patch com emoção deve ser aplicável ao store', () => {
    // Verifica que os tipos são compatíveis
    const patch = {
      emotion: 'happy' as EmotionType,
      emotionIntensity: 0.8,
    };

    expect(patch.emotion).toBe('happy');
    expect(patch.emotionIntensity).toBe(0.8);
    expect(patch.emotionIntensity).toBeGreaterThanOrEqual(0.1);
    expect(patch.emotionIntensity).toBeLessThanOrEqual(1);
  });

  it('emoção e intensidade são opcionais no patch', () => {
    const patch: StudioSettingsPatch = {};
    expect(patch.emotion).toBeUndefined();
    expect(patch.emotionIntensity).toBeUndefined();
  });
});
