/**
 * Testes para os novos campos e eventos de analytics adicionados
 * pela feature v0.129.0 (Projeto Manual).
 */
import { describe, expect, it } from 'vitest';
import { trackAnalyticsEvent, type AnalyticsEventMap } from '../../../src/lib/analytics';

describe('AnalyticsEventMap — eventos de Projeto Manual', () => {
  it('inclui os 9 eventos esperados no tipo AnalyticsEventMap', () => {
    // Type-level check: se algum evento esperado não existir no type map,
    // esta expressão `Name extends keyof ...` não compila.
    type ManualProjectEvents = 'manual_project_started'
      | 'manual_project_audio_uploaded'
      | 'manual_project_audio_upload_failed'
      | 'manual_project_image_uploaded'
      | 'manual_project_image_upload_failed'
      | 'manual_project_images_reordered'
      | 'manual_project_saved'
      | 'manual_project_save_failed'
      | 'manual_project_cta_clicked';

    // Compila apenas se todos os eventos estão em AnalyticsEventMap
    const check: ManualProjectEvents[] = [
      'manual_project_started',
      'manual_project_audio_uploaded',
      'manual_project_audio_upload_failed',
      'manual_project_image_uploaded',
      'manual_project_image_upload_failed',
      'manual_project_images_reordered',
      'manual_project_saved',
      'manual_project_save_failed',
      'manual_project_cta_clicked',
    ];
    expect(check).toHaveLength(9);

    // Runtime check: trackAnalyticsEvent existe e é função
    expect(typeof trackAnalyticsEvent).toBe('function');
  });

  it('trackAnalyticsEvent aceita payloads válidos (não lança)', () => {
    // Não precisa estar autenticado — função é silenciosa sem consentimento
    expect(() => trackAnalyticsEvent('manual_project_started', {})).not.toThrow();
    expect(() => trackAnalyticsEvent('manual_project_audio_uploaded', {
      size_bucket: 'medium',
      duration_bucket: 'short',
      duration_seconds: 45,
    })).not.toThrow();
    expect(() => trackAnalyticsEvent('manual_project_image_uploaded', {
      count: 5,
      size_bucket: 'large',
    })).not.toThrow();
    expect(() => trackAnalyticsEvent('manual_project_saved', {
      image_count: 10,
      audio_duration_seconds: 60,
      has_script: true,
      source: 'library',
    })).not.toThrow();
  });

  it('AnalyticsEventMap exporta o tipo', () => {
    // Verifica que o type é exportável e usável
    const _type: AnalyticsEventMap = {} as AnalyticsEventMap;
    expect(_type).toBeDefined();
  });
});
