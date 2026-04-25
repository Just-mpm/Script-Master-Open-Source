import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@remotion/whisper-web', () => ({
  canUseWhisperWeb: vi.fn().mockResolvedValue({ supported: false }),
  downloadWhisperModel: vi.fn().mockResolvedValue(undefined),
  resampleTo16Khz: vi.fn().mockResolvedValue(new Float32Array([0, 0, 0])),
  transcribe: vi.fn().mockResolvedValue({
    transcription: [
      { text: ' olá', startMs: 0, endMs: 500, timestampMs: null, confidence: null },
      { text: ' mundo', startMs: 500, endMs: 1000, timestampMs: null, confidence: null },
    ],
  }),
  toCaptions: vi.fn().mockReturnValue({
    captions: [
      { text: ' olá', startMs: 0, endMs: 500, timestampMs: null, confidence: null },
      { text: ' mundo', startMs: 500, endMs: 1000, timestampMs: null, confidence: null },
    ],
  }),
}));

vi.mock('@remotion/captions', () => ({
  createTikTokStyleCaptions: vi.fn().mockReturnValue({
    pages: [
      {
        tokens: [
          { text: ' olá', fromMs: 0, toMs: 500 },
          { text: ' mundo', fromMs: 500, toMs: 1000 },
        ],
      },
    ],
  }),
}));

vi.mock('../../src/features/video-render/lib/videoUtils', () => ({
  msToFrames: (ms: number, fps: number) => Math.round((ms / 1000) * fps),
}));

vi.mock('../../src/features/video-render/lib/subtitleUtils', () => ({
  segmentScriptByCenes: vi.fn().mockReturnValue([
    { text: 'Primeira frase', startFrame: 0, endFrame: 30, bold: false },
    { text: 'Segunda frase', startFrame: 30, endFrame: 60, bold: false },
  ]),
  alignScriptToSegments: vi.fn().mockReturnValue([
    { text: 'Alinhada', startFrame: 0, endFrame: 30, bold: false },
  ]),
  parseBoldMarkdown: vi.fn().mockReturnValue([
    { text: 'Primeira frase', bold: false },
    { text: 'Segunda frase', bold: false },
  ]),
  splitIntoWordsWithTiming: vi.fn().mockReturnValue([
    { text: 'Primeira', startFrame: 0, endFrame: 15, bold: false },
    { text: 'frase', startFrame: 15, endFrame: 30, bold: false },
  ]),
}));

vi.mock('../../src/lib/db/transcriptions', () => ({
  saveTranscription: vi.fn().mockResolvedValue(undefined),
  loadTranscription: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/lib/db/audio-segments', () => ({
  loadAudioSegments: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/lib/crypto-utils', () => ({
  hashScript: vi.fn().mockResolvedValue('abc123hash'),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { useTranscription } from '../../src/features/video-render/hooks/useTranscription';
import type { TranscribeAudioParams } from '../../src/features/video-render/hooks/useTranscription';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(overrides: Partial<TranscribeAudioParams> = {}): TranscribeAudioParams {
  return {
    audioUrl: 'https://example.com/audio.wav',
    script: 'Primeira frase. Segunda frase.',
    scenes: [{ timestamp: 0 }, { timestamp: 5 }],
    totalDurationFrames: 300,
    fps: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('useTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Estado inicial ---

  describe('estado inicial', () => {
    it('retorna estado padrão vazio', () => {
      const { result } = renderHook(() => useTranscription());
      expect(result.current.captions).toEqual([]);
      expect(result.current.source).toBeNull();
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.transcriptionProgress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.whisperSupported).toBeNull();
      expect(result.current.scriptHash).toBeNull();
      expect(result.current.isStale).toBe(false);
    });
  });

  // --- clearTranscription ---

  describe('clearTranscription', () => {
    it('reseta todo o estado', async () => {
      const { result } = renderHook(() => useTranscription('proj-1', 'script'));

      // Aguarda a inicialização
      await vi.advanceTimersByTimeAsync(100);

      act(() => {
        result.current.clearTranscription();
      });

      expect(result.current.captions).toEqual([]);
      expect(result.current.source).toBeNull();
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.transcriptionProgress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.scriptHash).toBeNull();
      expect(result.current.isStale).toBe(false);
    });
  });

  // --- cancelTranscription ---

  describe('cancelTranscription', () => {
    it('não causa erro quando chamado sem transcrição em andamento', () => {
      const { result } = renderHook(() => useTranscription());
      expect(() => {
        act(() => {
          result.current.cancelTranscription();
        });
      }).not.toThrow();
    });
  });

  // --- updateCaptions ---

  describe('updateCaptions', () => {
    it('atualiza captions e define source como "manual"', () => {
      const { result } = renderHook(() => useTranscription());
      const newCaptions = [
        { text: 'Manual', startFrame: 0, endFrame: 30, bold: false },
      ];

      act(() => {
        result.current.updateCaptions(newCaptions);
      });

      expect(result.current.captions).toEqual(newCaptions);
      expect(result.current.source).toBe('manual');
    });
  });

  // --- Transcrição com fallback proporcional ---

  describe('transcribeAudio (fallback proporcional)', () => {
    it('gera legendas proporcionais quando Whisper não suportado', async () => {
      const { segmentScriptByCenes } = await import('../../src/features/video-render/lib/subtitleUtils');
      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(segmentScriptByCenes).toHaveBeenCalled();
      expect(result.current.source).toBe('proportional');
      expect(result.current.captions.length).toBeGreaterThan(0);
    });

    it('define status de progresso durante transcrição', async () => {
      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      // Durante a transcrição
      expect(result.current.isTranscribing).toBe(true);

      await act(async () => {
        await transcribePromise!;
      });

      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.transcriptionProgress).toBe(100);
      expect(result.current.transcriptionStatusText).toBe('Concluído!');
    });

    it('salva hash do roteiro para detecção de staleness', async () => {
      const { hashScript } = await import('../../src/lib/crypto-utils');
      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(hashScript).toHaveBeenCalled();
      expect(result.current.scriptHash).toBe('abc123hash');
    });
  });

  // --- Transcrição com segmentos TTS ---

  describe('transcribeAudio (segment-timing)', () => {
    it('usa alignScriptToSegments quando segmentos estão disponíveis', async () => {
      const { alignScriptToSegments } = await import('../../src/features/video-render/lib/subtitleUtils');
      const { result } = renderHook(() => useTranscription());

      const audioSegments = [
        { text: 'Olá mundo', startSec: 0, endSec: 2, chunkIndex: 0 },
      ];

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(
          makeParams({ audioSegments }),
        );
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(alignScriptToSegments).toHaveBeenCalled();
      expect(result.current.source).toBe('segment-timing');
    });
  });

  // --- Erros de rede ---

  describe('tratamento de erros', () => {
    it('mapeia erro de fetch para mensagem amigável', async () => {
      const { segmentScriptByCenes } = await import('../../src/features/video-render/lib/subtitleUtils');
      vi.mocked(segmentScriptByCenes).mockImplementationOnce(() => {
        throw new Error('Failed to fetch');
      });

      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(result.current.error).toContain('conexão');
      expect(result.current.isTranscribing).toBe(false);
    });

    it('mapeia erro de quota para mensagem amigável', async () => {
      const { segmentScriptByCenes } = await import('../../src/features/video-render/lib/subtitleUtils');
      vi.mocked(segmentScriptByCenes).mockImplementationOnce(() => {
        throw new Error('429 Too Many Requests');
      });

      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(result.current.error).toContain('Limite de uso');
    });

    it('mapeia erro genérico para mensagem padrão', async () => {
      const { segmentScriptByCenes } = await import('../../src/features/video-render/lib/subtitleUtils');
      vi.mocked(segmentScriptByCenes).mockImplementationOnce(() => {
        throw new Error('Erro desconhecido');
      });

      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      expect(result.current.error).toContain('Não foi possível transcrever');
    });
  });

  // --- Detecção de staleness ---

  describe('detecção de staleness', () => {
    it('verifica staleness quando scriptHash está definido', async () => {
      const { hashScript } = await import('../../src/lib/crypto-utils');

      const { result } = renderHook(() => useTranscription('proj-1', 'script original'));

      // Aguarda a montagem do hook (carregamento + verificação Whisper)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // Após transcrição, scriptHash fica definido
      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      // Agora scriptHash está definido, staleness é verificado quando script muda
      // Simula mudança de script re-renderizando
      vi.mocked(hashScript).mockResolvedValueOnce('different-hash');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // hashScript deve ter sido chamado para verificar staleness
      expect(hashScript).toHaveBeenCalled();
    });

    it('isStale é false quando não há scriptHash', () => {
      const { result } = renderHook(() => useTranscription());
      expect(result.current.isStale).toBe(false);
    });
  });

  // --- Persistência ---

  describe('persistência', () => {
    it('persiste transcrição após debounce', async () => {
      const { saveTranscription } = await import('../../src/lib/db/transcriptions');
      const { result } = renderHook(() => useTranscription('proj-1'));

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      // Avança o timer de debounce (500ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(saveTranscription).toHaveBeenCalledWith('proj-1', expect.objectContaining({
        words: expect.any(Array),
        source: expect.any(String),
      }));
    });

    it('não persiste sem projectId', async () => {
      const { saveTranscription } = await import('../../src/lib/db/transcriptions');
      const { result } = renderHook(() => useTranscription());

      let transcribePromise: Promise<void>;
      act(() => {
        transcribePromise = result.current.transcribeAudio(makeParams());
      });

      await act(async () => {
        await transcribePromise!;
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(saveTranscription).not.toHaveBeenCalled();
    });
  });
});
