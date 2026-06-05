/**
 * Reducer puro do wizard de Projeto Manual.
 *
 * Estado imutável, ações tipadas — testável isoladamente.
 *
 * Cleanup de blob URLs é responsabilidade do hook (useManualProject),
 * não do reducer — o reducer não tem acesso a side effects.
 */

import type {
  AudioUploadItem,
  ImageUploadItem,
  ManualProjectAction,
  ManualProjectDraft,
  ValidationState,
} from '../types';

export const INITIAL_DRAFT: ManualProjectDraft = {
  name: '',
  script: '',
  audio: null,
  images: [],
  audioValidation: { kind: 'idle' },
  imageValidations: {},
};

/** Revoga o blob URL de um item de upload (helper usado pelo reducer) */
function revokeBlobUrl(url: string | null | undefined): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/** Revoga blob URLs de múltiplos itens */
function revokeAudioBlob(item: AudioUploadItem | null): void {
  if (item) revokeBlobUrl(item.previewUrl);
}

function revokeImageBlobs(items: ImageUploadItem[]): void {
  for (const item of items) {
    revokeBlobUrl(item.previewUrl);
  }
}

export function manualProjectReducer(
  state: ManualProjectDraft,
  action: ManualProjectAction,
): ManualProjectDraft {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name };

    case 'SET_SCRIPT':
      return { ...state, script: action.script };

    case 'SET_AUDIO_VALIDATION':
      return { ...state, audioValidation: action.state };

    case 'SET_IMAGE_VALIDATION': {
      const next: Record<string, ValidationState> = { ...state.imageValidations };
      if (action.state.kind === 'idle') {
        delete next[action.localId];
      } else {
        next[action.localId] = action.state;
      }
      return { ...state, imageValidations: next };
    }

    case 'ADD_AUDIO': {
      // Revoga blob URL do áudio anterior (substituição)
      revokeAudioBlob(state.audio);
      return { ...state, audio: action.item, audioValidation: { kind: 'valid' } };
    }

    case 'REMOVE_AUDIO': {
      revokeAudioBlob(state.audio);
      return { ...state, audio: null, audioValidation: { kind: 'idle' } };
    }

    case 'ADD_IMAGES': {
      // Não revoga blob URLs dos novos itens — eles ainda estão em uso
      const newValidations: Record<string, ValidationState> = { ...state.imageValidations };
      for (const item of action.items) {
        newValidations[item.localId] = { kind: 'valid' };
      }
      return {
        ...state,
        images: [...state.images, ...action.items],
        imageValidations: newValidations,
      };
    }

    case 'REMOVE_IMAGE': {
      const target = state.images.find((img) => img.localId === action.localId);
      revokeBlobUrl(target?.previewUrl);
      const remainingValidations = { ...state.imageValidations };
      delete remainingValidations[action.localId];
      return {
        ...state,
        images: state.images.filter((img) => img.localId !== action.localId),
        imageValidations: remainingValidations,
      };
    }

    case 'MOVE_IMAGE': {
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex) return state;
      if (fromIndex < 0 || fromIndex >= state.images.length) return state;
      if (toIndex < 0 || toIndex >= state.images.length) return state;

      const next = state.images.slice();
      const [moved] = next.splice(fromIndex, 1);
      if (moved) {
        next.splice(toIndex, 0, moved);
      }
      return { ...state, images: next };
    }

    case 'RESET':
      // Revoga todos os blob URLs ao resetar
      revokeAudioBlob(state.audio);
      revokeImageBlobs(state.images);
      return INITIAL_DRAFT;

    default: {
      // Exhaustive check
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
