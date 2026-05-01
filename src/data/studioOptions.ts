import type { SceneRatio } from '../features/studio/types';

/**
 * Opcoes compartilhadas entre Inspector e Configuracoes.
 * Centraliza os arrays de pace, visual framework, scene ratio e scene density
 * para evitar duplicacao e manter consistencia.
 */

export interface StudioOption<T extends string | number> {
  value: T;
  label: string;
}

export type PaceOption = StudioOption<string>;
export type VisualFrameworkOption = StudioOption<string>;
export type SceneRatioOption = StudioOption<SceneRatio>;
export type DensityOption = StudioOption<number>;

/** Cria opcoes de pace com labels i18n */
export function createPaceOptions(t: (key: string) => string): PaceOption[] {
  return [
    { value: 'very_slow', label: t('studio.inspector.paceOptions.very_slow') },
    { value: 'slow', label: t('studio.inspector.paceOptions.slow') },
    { value: 'normal', label: t('studio.inspector.paceOptions.normal') },
    { value: 'fast', label: t('studio.inspector.paceOptions.fast') },
    { value: 'very_fast', label: t('studio.inspector.paceOptions.very_fast') },
  ];
}

/** Cria opcoes de framework visual com labels i18n */
export function createVisualFrameworkOptions(t: (key: string) => string): VisualFrameworkOption[] {
  return [
    { value: 'general', label: t('studio.inspector.visualFramework.general') },
    { value: 'whiteboard', label: t('studio.inspector.visualFramework.whiteboard') },
  ];
}

/** Cria opcoes de proporcao de cena com labels i18n */
export function createSceneRatioOptions(t: (key: string) => string): SceneRatioOption[] {
  return [
    { value: '16:9', label: t('studio.inspector.sceneRatio.16:9') },
    { value: '9:16', label: t('studio.inspector.sceneRatio.9:16') },
    { value: '1:1', label: t('studio.inspector.sceneRatio.1:1') },
  ];
}

/** Cria opcoes de densidade de cenas com labels i18n */
export function createDensityOptions(t: (key: string) => string): DensityOption[] {
  return [
    { value: 15, label: t('studio.inspector.sceneDensity.15') },
    { value: 30, label: t('studio.inspector.sceneDensity.30') },
    { value: 60, label: t('studio.inspector.sceneDensity.60') },
    { value: 120, label: t('studio.inspector.sceneDensity.120') },
  ];
}
