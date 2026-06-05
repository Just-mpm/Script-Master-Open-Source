/**
 * Testes do hook `useManualProject` (state machine + side effects).
 *
 * Cobre: canAdvance (3 estados), addAudio (sucesso/falha MIME), addImages
 * (limite 30), cleanup no unmount, save (sequência), reset, analytics.
 *
 * NOTA: como o hook depende de Web Audio API, AudioContext.decodeAudioData é
 * mockado globalmente no `tests/__mocks__/web-audio.mock.ts` (ou inline).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// Mocks globais para Web Audio API (antes de importar o hook)
class MockAudioContext {
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 60,
    getChannelData: () => new Float32Array(1024),
    sampleRate: 44100,
  });
  close = vi.fn().mockResolvedValue(undefined);
}
(globalThis as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;

// Mock do Image
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1920;
  naturalHeight = 1080;
  crossOrigin = '';
  decode = vi.fn().mockResolvedValue(undefined);
  set src(_value: string) {
    // Simula carregamento síncrono
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}
(globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;

// Mock do trackAnalyticsEvent (no-op)
vi.mock('../../../src/lib/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
  categorizeAnalyticsError: vi.fn(() => 'unknown'),
}));

// Mock do useAudioGeneratorStore — `vi.hoisted` mantém referência estável
// do `vi.fn()` entre o mock (hoisted) e o código de teste, permitindo que
// testes inspecionem `mock.calls` do `loadProjectData` chamado pelo hook.
const { mockLoadProjectData } = vi.hoisted(() => ({
  mockLoadProjectData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/features/studio/store/audioGeneratorStore', () => ({
  useAudioGeneratorStore: {
    getState: () => ({
      loadProjectData: mockLoadProjectData,
    }),
  },
}));

// Mock do saveProject/saveAudioToProject/saveImageToProject
vi.mock('../../../src/lib/db/projects', () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
  saveAudioToProject: vi.fn().mockResolvedValue('https://example.com/audio.wav'),
  saveImageToProject: vi.fn().mockResolvedValue('https://example.com/image.png'),
}));

import { useManualProject } from '../../../src/features/manual-project/hooks/useManualProject';
import { trackAnalyticsEvent } from '../../../src/lib/analytics';
import { saveProject, saveAudioToProject, saveImageToProject } from '../../../src/lib/db/projects';
import { useAudioGeneratorStore } from '../../../src/features/studio/store/audioGeneratorStore';

function makeFile(name: string, type: string, size: number): File {
  // Cria um Blob com bytes aleatórios
  const bytes = new Uint8Array(Math.min(size, 1024));
  return new File([bytes], name, { type });
}

describe('useManualProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispara manual_project_started no mount', () => {
    renderHook(() => useManualProject());
    expect(trackAnalyticsEvent).toHaveBeenCalledWith('manual_project_started', {});
  });

  it('canAdvance começa false (sem nome, áudio ou imagens)', () => {
    const { result } = renderHook(() => useManualProject());
    expect(result.current.canAdvance).toBe(false);
  });

  it('canAdvance fica true quando nome + áudio + 1 imagem estão presentes', async () => {
    const { result } = renderHook(() => useManualProject());

    act(() => {
      result.current.setName('Meu Projeto');
    });

    await act(async () => {
      await result.current.addAudio(makeFile('audio.wav', 'audio/wav', 2048));
    });

    await act(async () => {
      await result.current.addImages([makeFile('img.png', 'image/png', 1024)]);
    });

    await waitFor(() => {
      expect(result.current.canAdvance).toBe(true);
    });
  });

  it('addAudio rejeita MIME inválido', async () => {
    const { result } = renderHook(() => useManualProject());

    await act(async () => {
      await result.current.addAudio(makeFile('virus.exe', 'application/octet-stream', 100));
    });

    expect(result.current.draft.audio).toBeNull();
    expect(result.current.draft.audioValidation.kind).toBe('invalid');
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'manual_project_audio_upload_failed',
      expect.objectContaining({ size_bucket: expect.any(String) }),
    );
  });

  it('addImages respeita limite MAX_IMAGES (trunca)', async () => {
    const { result } = renderHook(() => useManualProject());

    const files = Array.from({ length: 35 }, (_, i) =>
      makeFile(`img${i}.png`, 'image/png', 1024),
    );

    await act(async () => {
      await result.current.addImages(files);
    });

    // MAX_IMAGES = 30
    expect(result.current.draft.images.length).toBe(30);
  });

  it('removeImage remove o item', async () => {
    const { result } = renderHook(() => useManualProject());

    await act(async () => {
      await result.current.addImages([makeFile('a.png', 'image/png', 1024)]);
    });

    const localId = result.current.draft.images[0]?.localId;
    if (!localId) throw new Error('localId undefined');

    act(() => {
      result.current.removeImage(localId);
    });

    expect(result.current.draft.images).toHaveLength(0);
  });

  it('moveImage reordena', async () => {
    const { result } = renderHook(() => useManualProject());

    await act(async () => {
      await result.current.addImages([
        makeFile('a.png', 'image/png', 100),
        makeFile('b.png', 'image/png', 100),
        makeFile('c.png', 'image/png', 100),
      ]);
    });

    const before = result.current.draft.images.map((i) => i.localId);

    act(() => {
      result.current.moveImage(0, 2, 3);
    });

    const after = result.current.draft.images.map((i) => i.localId);
    expect(after[2]).toBe(before[0]);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith('manual_project_images_reordered', {
      count: 3,
      from_index: 0,
      to_index: 2,
    });
  });

  it('save chama saveProject → saveAudioToProject → saveImageToProject em sequência', async () => {
    const { result } = renderHook(() => useManualProject());

    act(() => {
      result.current.setName('Test Project');
    });

    await act(async () => {
      await result.current.addAudio(makeFile('a.wav', 'audio/wav', 2048));
    });

    await act(async () => {
      await result.current.addImages([
        makeFile('a.png', 'image/png', 1024),
        makeFile('b.png', 'image/png', 1024),
      ]);
    });

    let saveResult: { ok: boolean; projectId?: string } | undefined;
    await act(async () => {
      saveResult = await result.current.save('user_123');
    });

    expect(saveResult?.ok).toBe(true);
    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(saveAudioToProject).toHaveBeenCalledTimes(1);
    expect(saveImageToProject).toHaveBeenCalledTimes(2);
  });

  it('save sem canAdvance retorna erro', async () => {
    const { result } = renderHook(() => useManualProject());

    let saveResult: { ok: boolean; errorKind?: string } | undefined;
    await act(async () => {
      saveResult = await result.current.save('user_123');
    });

    expect(saveResult?.ok).toBe(false);
    expect(saveResult?.errorKind).toBe('project_save_failed');
    expect(saveProject).not.toHaveBeenCalled();
  });

  it('save sem userId retorna erro de autenticação', async () => {
    const { result } = renderHook(() => useManualProject());

    act(() => {
      result.current.setName('Test');
    });
    await act(async () => {
      await result.current.addAudio(makeFile('a.wav', 'audio/wav', 2048));
    });
    await act(async () => {
      await result.current.addImages([makeFile('a.png', 'image/png', 100)]);
    });

    let saveResult: { ok: boolean; errorKind?: string } | undefined;
    await act(async () => {
      saveResult = await result.current.save('');
    });

    expect(saveResult?.ok).toBe(false);
    expect(saveResult?.errorKind).toBe('unauthenticated');
  });

  it('reset volta ao INITIAL_DRAFT', async () => {
    const { result } = renderHook(() => useManualProject());

    act(() => {
      result.current.setName('Test');
      result.current.setScript('Script');
    });
    await act(async () => {
      await result.current.addAudio(makeFile('a.wav', 'audio/wav', 2048));
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.draft.name).toBe('');
    expect(result.current.draft.script).toBe('');
    expect(result.current.draft.audio).toBeNull();
  });

  it('cleanup de blob URLs no unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const { result, unmount } = renderHook(() => useManualProject());

    await act(async () => {
      await result.current.addAudio(makeFile('a.wav', 'audio/wav', 2048));
    });

    const blobUrlBefore = result.current.draft.audio?.previewUrl;
    expect(blobUrlBefore).toMatch(/^blob:/);

    revokeSpy.mockClear();
    unmount();

    // Após unmount, o cleanup do useEffect deve revogar o blob URL
    // (a NÃO ser que tenha sido transferido para o audioGeneratorStore, caso em que NÃO revoga)
    // Para o áudio, ele foi transferido — então não revoga aqui. Mas o cleanup é global.
    // Apenas verificamos que o cleanup não quebrou.
    expect(revokeSpy).toHaveBeenCalled();
  });

  // Guarda contra regressão do bug C1: `buildVideoScenesFromDraft` usava
  // `img.previewUrl` (registrado no `blobUrlsRef` e revogado no cleanup do
  // useEffect), quebrando o player cross-route quando o usuário navegava
  // para /app/video. O fix cria NOVO blob URL fora do ref.
  it('save() transfere audioUrl + scenes para audioGeneratorStore que NÃO são revogados no unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const { result, unmount } = renderHook(() => useManualProject());

    // Adicionar áudio e imagens (cria previewUrl no blobUrlsRef)
    await act(async () => {
      result.current.setName('Test Project');
      await result.current.addAudio(makeFile('audio.wav', 'audio/wav', 2048));
      await result.current.addImages([
        makeFile('img1.jpg', 'image/jpeg', 1024),
        makeFile('img2.jpg', 'image/jpeg', 1024),
      ]);
    });

    // Chamar save() — transfere audioUrl + scenes para o audioGeneratorStore
    await act(async () => {
      await result.current.save('user_test_123');
    });

    // Captura os URLs transferidos via mock do loadProjectData
    expect(mockLoadProjectData).toHaveBeenCalledTimes(1);
    const callArgs = mockLoadProjectData.mock.calls[0];
    if (!callArgs) throw new Error('loadProjectData não foi chamado');
    const transferredAudioUrl = callArgs[0];
    const transferredScenes = callArgs[1];

    // Sanidade: URLs transferidos são blob URLs recém-criados (de
    // buildVideoScenesFromDraft e `URL.createObjectURL(draft.audio.file)`),
    // não os previewUrl registrados no blobUrlsRef do wizard.
    expect(transferredAudioUrl).toMatch(/^blob:/);
    expect(transferredScenes).toHaveLength(2);
    for (const scene of transferredScenes) {
      expect(scene.imageUrl).toMatch(/^blob:/);
    }

    // Limpar spy antes do unmount para isolar a fase de cleanup
    revokeSpy.mockClear();

    // Desmontar — deve revogar APENAS as URLs do wizard (previewUrl do
    // áudio e das imagens registradas no blobUrlsRef). NÃO deve revogar
    // as URLs transferidas para o store (ciclo de vida gerenciado por ele).
    unmount();

    // Validação principal: URLs transferidos para o store NÃO estão em revokeSpy.
    // Sem o fix C1 (que troca previewUrl por `URL.createObjectURL(img.file)`),
    // os imageUrls transferidos seriam os mesmos previewUrl do ref e seriam
    // revogados aqui — quebrando o Remotion player em /app/video.
    expect(revokeSpy).not.toHaveBeenCalledWith(transferredAudioUrl);
    for (const scene of transferredScenes) {
      expect(revokeSpy).not.toHaveBeenCalledWith(scene.imageUrl);
    }
  });
});
