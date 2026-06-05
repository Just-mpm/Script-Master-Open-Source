/**
 * Testes unitários para os helpers do wizard de Projeto Manual.
 *
 * Cobre: validateProjectName, buildProjectFromDraft, buildProjectImages,
 * computeUniformTimestamps, DEFAULT_MANUAL_PROJECT_SETTINGS.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MANUAL_PROJECT_SETTINGS,
  buildAudioSource,
  buildProjectFromDraft,
  buildProjectImages,
  buildVideoScenes,
  computeUniformTimestamps,
  generateLocalId,
} from '../../../src/features/manual-project/lib/manualProjectHelpers';
import { validateProjectName } from '../../../src/features/manual-project/lib/manualProjectValidation';
import { INITIAL_DRAFT } from '../../../src/features/manual-project/hooks/useManualProjectReducer';
import type { AudioUploadItem, ImageUploadItem } from '../../../src/features/manual-project/types';

function makeImage(overrides: Partial<ImageUploadItem> = {}): ImageUploadItem {
  return {
    localId: 'img_1',
    file: new File([new Uint8Array([1, 2, 3])], 'scene.png', { type: 'image/png' }),
    previewUrl: 'blob:http://localhost/img_1',
    width: 1920,
    height: 1080,
    mimeType: 'image/png',
    sizeBytes: 1024,
    ...overrides,
  };
}

function makeAudio(overrides: Partial<AudioUploadItem> = {}): AudioUploadItem {
  return {
    localId: 'aud_1',
    file: new File([new Uint8Array([1, 2, 3, 4, 5])], 'audio.wav', { type: 'audio/wav' }),
    previewUrl: 'blob:http://localhost/aud_1',
    durationSec: 60,
    mimeType: 'audio/wav',
    sizeBytes: 2048,
    ...overrides,
  };
}

describe('validateProjectName', () => {
  it('rejeita nome com menos de 3 caracteres', () => {
    const result = validateProjectName('ab');
    expect(result.ok).toBe(false);
    expect(result.errorKind).toBe('empty_file');
  });

  it('rejeita nome com mais de 100 caracteres', () => {
    const longName = 'a'.repeat(101);
    const result = validateProjectName(longName);
    expect(result.ok).toBe(false);
    expect(result.errorKind).toBe('too_large');
  });

  it('rejeita nome com caracteres de controle', () => {
    const result = validateProjectName('Test\x00Name');
    expect(result.ok).toBe(false);
    expect(result.errorKind).toBe('invalid_mime');
  });

  it('aceita nome válido', () => {
    const result = validateProjectName('Meu Podcast Piloto');
    expect(result.ok).toBe(true);
  });

  it('faz trim antes de validar comprimento', () => {
    const result = validateProjectName('   abc   ');
    expect(result.ok).toBe(true);
  });
});

describe('computeUniformTimestamps', () => {
  it('retorna [0] para 1 cena', () => {
    expect(computeUniformTimestamps(1, 60)).toEqual([0]);
  });

  it('retorna [0] para 0 cenas', () => {
    expect(computeUniformTimestamps(0, 60)).toEqual([0]);
  });

  it('distribui timestamps uniformemente', () => {
    const result = computeUniformTimestamps(4, 60);
    expect(result).toEqual([0, 15, 30, 45]);
  });

  it('arredonda para 1 casa decimal', () => {
    const result = computeUniformTimestamps(3, 10);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(3.3, 1);
    expect(result[2]).toBeCloseTo(6.7, 1);
  });
});

describe('buildProjectFromDraft', () => {
  it('cria Project com nome e script trimados', () => {
    const draft = {
      ...INITIAL_DRAFT,
      name: '  Meu Projeto  ',
      script: '  Roteiro de teste  ',
    };
    const project = buildProjectFromDraft(draft, 'proj_123');
    expect(project.id).toBe('proj_123');
    expect(project.name).toBe('Meu Projeto');
    expect(project.script).toBe('Roteiro de teste');
    expect(project.settings).toEqual(DEFAULT_MANUAL_PROJECT_SETTINGS);
  });

  it('usa defaults fixos (não herda do studioStore)', () => {
    const draft = { ...INITIAL_DRAFT, name: 'Teste' };
    const project = buildProjectFromDraft(draft, 'p1');
    expect(project.settings.scene).toBe('general');
    expect(project.settings.sceneRatio).toBe('16:9');
    expect(project.settings.audioProfile).toBe('narrative');
  });

  it('atribui createdAt como Date.now()', () => {
    const before = Date.now();
    const draft = { ...INITIAL_DRAFT, name: 'Teste' };
    const project = buildProjectFromDraft(draft, 'p1');
    const after = Date.now();
    expect(project.createdAt).toBeGreaterThanOrEqual(before);
    expect(project.createdAt).toBeLessThanOrEqual(after);
  });
});

describe('buildAudioSource', () => {
  it('lança erro se draft.audio for null', () => {
    const draft = { ...INITIAL_DRAFT, name: 'Test' };
    expect(() => buildAudioSource(draft, 'p1', 'a1')).toThrow();
  });

  it('cria AudioSource com projectId e id fornecidos', () => {
    const audio = makeAudio();
    const draft = { ...INITIAL_DRAFT, name: 'Test', audio };
    const source = buildAudioSource(draft, 'proj_xyz', 'aud_abc');
    expect(source.id).toBe('aud_abc');
    expect(source.projectId).toBe('proj_xyz');
    expect(source.audioBlob).toBe(audio.file);
    expect(source.audioUrl).toBe(audio.previewUrl);
    // audioSegments deve ser undefined (vazio é responsabilidade do Transcription)
    expect(source.audioSegments).toBeUndefined();
  });
});

describe('buildProjectImages', () => {
  it('retorna [] se draft.images está vazio', () => {
    const draft = { ...INITIAL_DRAFT, name: 'Test' };
    const result = buildProjectImages(draft, 'p1', 60);
    expect(result).toEqual([]);
  });

  it('cria ProjectImage com timestamps uniformes', () => {
    const images = [makeImage({ localId: 'a' }), makeImage({ localId: 'b' }), makeImage({ localId: 'c' })];
    const draft = { ...INITIAL_DRAFT, name: 'Test', images };
    const result = buildProjectImages(draft, 'proj_1', 30);
    expect(result).toHaveLength(3);
    expect(result[0]?.timestamp).toBe(0);
    expect(result[1]?.timestamp).toBe(10);
    expect(result[2]?.timestamp).toBe(20);
  });

  it('associa imageBlob a file', () => {
    const images = [makeImage()];
    const draft = { ...INITIAL_DRAFT, name: 'Test', images };
    const result = buildProjectImages(draft, 'p1', 30);
    expect(result[0]?.imageBlob).toBe(images[0]?.file);
  });

  it('prompt é vazio (gerado fora da plataforma)', () => {
    const images = [makeImage()];
    const draft = { ...INITIAL_DRAFT, name: 'Test', images };
    const result = buildProjectImages(draft, 'p1', 30);
    expect(result[0]?.prompt).toBe('');
  });
});

describe('buildVideoScenes', () => {
  it('ordena por timestamp', () => {
    const images = [
      { id: '1', projectId: 'p', imageUrl: 'b', prompt: '', timestamp: 20, createdAt: 0 } as never,
      { id: '2', projectId: 'p', imageUrl: 'a', prompt: '', timestamp: 10, createdAt: 0 } as never,
      { id: '3', projectId: 'p', imageUrl: 'c', prompt: '', timestamp: 30, createdAt: 0 } as never,
    ];
    const result = buildVideoScenes(images);
    expect(result.map((s) => s.imageUrl)).toEqual(['a', 'b', 'c']);
  });
});

describe('generateLocalId', () => {
  it('gera IDs únicos', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      ids.add(generateLocalId());
    }
    expect(ids.size).toBe(100);
  });

  it('começa com "local_"', () => {
    expect(generateLocalId()).toMatch(/^local_/);
  });
});
