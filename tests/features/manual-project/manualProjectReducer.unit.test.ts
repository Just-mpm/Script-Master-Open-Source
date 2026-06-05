/**
 * Testes do reducer puro do wizard de Projeto Manual.
 *
 * Cobre: 10 ações do reducer, transições de estado, cleanup de blob URLs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INITIAL_DRAFT,
  manualProjectReducer,
} from '../../../src/features/manual-project/hooks/useManualProjectReducer';
import type {
  AudioUploadItem,
  ImageUploadItem,
  ManualProjectAction,
  ValidationState,
} from '../../../src/features/manual-project/types';

function makeAudio(): AudioUploadItem {
  return {
    localId: 'aud_1',
    file: new File([new Uint8Array([1])], 'a.wav', { type: 'audio/wav' }),
    previewUrl: 'blob:http://localhost/aud_1',
    durationSec: 60,
    mimeType: 'audio/wav',
    sizeBytes: 100,
  };
}

function makeImage(localId: string): ImageUploadItem {
  return {
    localId,
    file: new File([new Uint8Array([1])], `${localId}.png`, { type: 'image/png' }),
    previewUrl: `blob:http://localhost/${localId}`,
    width: 100,
    height: 100,
    mimeType: 'image/png',
    sizeBytes: 100,
  };
}

describe('INITIAL_DRAFT', () => {
  it('tem valores iniciais esperados', () => {
    expect(INITIAL_DRAFT.name).toBe('');
    expect(INITIAL_DRAFT.script).toBe('');
    expect(INITIAL_DRAFT.audio).toBeNull();
    expect(INITIAL_DRAFT.images).toEqual([]);
    expect(INITIAL_DRAFT.audioValidation).toEqual({ kind: 'idle' });
    expect(INITIAL_DRAFT.imageValidations).toEqual({});
  });
});

describe('SET_NAME / SET_SCRIPT', () => {
  it('SET_NAME atualiza o nome', () => {
    const next = manualProjectReducer(INITIAL_DRAFT, { type: 'SET_NAME', name: 'Novo nome' });
    expect(next.name).toBe('Novo nome');
  });

  it('SET_SCRIPT atualiza o script', () => {
    const next = manualProjectReducer(INITIAL_DRAFT, { type: 'SET_SCRIPT', script: 'Olá' });
    expect(next.script).toBe('Olá');
  });
});

describe('SET_AUDIO_VALIDATION', () => {
  it('atualiza o estado de validação', () => {
    const state: ValidationState = { kind: 'valid' };
    const next = manualProjectReducer(INITIAL_DRAFT, { type: 'SET_AUDIO_VALIDATION', state });
    expect(next.audioValidation).toEqual({ kind: 'valid' });
  });

  it('suporta transição para invalid com erro', () => {
    const state: ValidationState = { kind: 'invalid', error: 'too_large', message: 'Erro' };
    const next = manualProjectReducer(INITIAL_DRAFT, { type: 'SET_AUDIO_VALIDATION', state });
    expect(next.audioValidation.kind).toBe('invalid');
  });
});

describe('SET_IMAGE_VALIDATION', () => {
  it('adiciona validação para localId', () => {
    const state: ValidationState = { kind: 'valid' };
    const next = manualProjectReducer(INITIAL_DRAFT, {
      type: 'SET_IMAGE_VALIDATION',
      localId: 'img_1',
      state,
    });
    expect(next.imageValidations['img_1']).toEqual({ kind: 'valid' });
  });

  it('remove entrada quando state.kind === "idle"', () => {
    const start: ManualProjectAction = {
      type: 'SET_IMAGE_VALIDATION',
      localId: 'img_1',
      state: { kind: 'valid' },
    };
    const stateWithValid = manualProjectReducer(INITIAL_DRAFT, start);
    const next = manualProjectReducer(stateWithValid, {
      type: 'SET_IMAGE_VALIDATION',
      localId: 'img_1',
      state: { kind: 'idle' },
    });
    expect(next.imageValidations['img_1']).toBeUndefined();
  });
});

describe('ADD_AUDIO / REMOVE_AUDIO', () => {
  it('ADD_AUDIO substitui o áudio anterior', () => {
    const audio1 = makeAudio();
    const stateWithAudio1 = manualProjectReducer(INITIAL_DRAFT, { type: 'ADD_AUDIO', item: audio1 });
    expect(stateWithAudio1.audio).toBe(audio1);

    const audio2: AudioUploadItem = { ...makeAudio(), localId: 'aud_2' };
    const next = manualProjectReducer(stateWithAudio1, { type: 'ADD_AUDIO', item: audio2 });
    expect(next.audio).toBe(audio2);
  });

  it('ADD_AUDIO revoga blob URL do áudio anterior', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const audio1 = makeAudio();
    const stateWithAudio1 = manualProjectReducer(INITIAL_DRAFT, { type: 'ADD_AUDIO', item: audio1 });
    revokeSpy.mockClear();

    const audio2: AudioUploadItem = { ...makeAudio(), localId: 'aud_2' };
    manualProjectReducer(stateWithAudio1, { type: 'ADD_AUDIO', item: audio2 });
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/aud_1');
    revokeSpy.mockRestore();
  });

  it('REMOVE_AUDIO limpa o áudio', () => {
    const audio = makeAudio();
    const stateWithAudio = manualProjectReducer(INITIAL_DRAFT, { type: 'ADD_AUDIO', item: audio });
    const next = manualProjectReducer(stateWithAudio, { type: 'REMOVE_AUDIO' });
    expect(next.audio).toBeNull();
    expect(next.audioValidation).toEqual({ kind: 'idle' });
  });
});

describe('ADD_IMAGES / REMOVE_IMAGE', () => {
  it('ADD_IMAGES adiciona múltiplas imagens', () => {
    const images = [makeImage('a'), makeImage('b')];
    const next = manualProjectReducer(INITIAL_DRAFT, { type: 'ADD_IMAGES', items: images });
    expect(next.images).toHaveLength(2);
    expect(next.imageValidations['a']).toEqual({ kind: 'valid' });
    expect(next.imageValidations['b']).toEqual({ kind: 'valid' });
  });

  it('REMOVE_IMAGE remove pelo localId', () => {
    const start = manualProjectReducer(INITIAL_DRAFT, {
      type: 'ADD_IMAGES',
      items: [makeImage('a'), makeImage('b')],
    });
    const next = manualProjectReducer(start, { type: 'REMOVE_IMAGE', localId: 'a' });
    expect(next.images).toHaveLength(1);
    expect(next.images[0]?.localId).toBe('b');
    expect(next.imageValidations['a']).toBeUndefined();
  });
});

describe('MOVE_IMAGE', () => {
  it('move imagem de uma posição para outra', () => {
    const start = manualProjectReducer(INITIAL_DRAFT, {
      type: 'ADD_IMAGES',
      items: [makeImage('a'), makeImage('b'), makeImage('c')],
    });
    const next = manualProjectReducer(start, { type: 'MOVE_IMAGE', fromIndex: 0, toIndex: 2 });
    expect(next.images.map((i) => i.localId)).toEqual(['b', 'c', 'a']);
  });

  it('no-op quando from === to', () => {
    const start = manualProjectReducer(INITIAL_DRAFT, {
      type: 'ADD_IMAGES',
      items: [makeImage('a'), makeImage('b')],
    });
    const next = manualProjectReducer(start, { type: 'MOVE_IMAGE', fromIndex: 0, toIndex: 0 });
    expect(next.images.map((i) => i.localId)).toEqual(['a', 'b']);
  });

  it('no-op quando índice inválido', () => {
    const start = manualProjectReducer(INITIAL_DRAFT, {
      type: 'ADD_IMAGES',
      items: [makeImage('a')],
    });
    const next = manualProjectReducer(start, { type: 'MOVE_IMAGE', fromIndex: 5, toIndex: 0 });
    expect(next.images).toBe(start.images);
  });
});

describe('RESET', () => {
  let revokeSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
  });
  afterEach(() => {
    revokeSpy.mockRestore();
  });

  it('volta ao INITIAL_DRAFT e revoga todos os blob URLs', () => {
    const stateWithData = manualProjectReducer(INITIAL_DRAFT, {
      type: 'ADD_IMAGES',
      items: [makeImage('a'), makeImage('b')],
    });
    const stateWithAudio = manualProjectReducer(stateWithData, { type: 'ADD_AUDIO', item: makeAudio() });
    revokeSpy.mockClear();

    const next = manualProjectReducer(stateWithAudio, { type: 'RESET' });
    expect(next).toEqual(INITIAL_DRAFT);
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/aud_1');
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/a');
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/b');
  });
});
