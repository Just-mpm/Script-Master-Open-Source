import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock do logger
const { errorSpy, warnSpy, debugSpy } = vi.hoisted(() => ({
  errorSpy: vi.fn(),
  warnSpy: vi.fn(),
  debugSpy: vi.fn(),
}));
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: warnSpy,
    error: errorSpy,
    debug: debugSpy,
  }),
  setLoggerUserId: vi.fn(),
}));

import { useVoicePreviews } from '../../src/hooks/useVoicePreviews';

// ─── Mocks controlados do HTMLAudioElement ────────────────────────────
//
// jsdom implementa `HTMLMediaElement` nativamente, então substituímos
// o `Audio` global por uma classe mock que implementa apenas a
// superfície usada pelo hook (`src`, `error`, `play()`, `pause()`,
// `load()`, `removeAttribute`, `setAttribute`, `preload`, `paused`).
class MockAudio {
  src: string;
  preload = '';
  paused = true;
  networkState = 0;
  error: MediaError | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onended: ((ev?: unknown) => void) | null = null;
  // Resolve/rejeita `play()` — capturado por spy para testes async.
  playResult: Promise<void> = Promise.resolve();

  constructor(public url: string) {
    this.src = url;
    MockAudio.last = this;
  }

  play(): Promise<void> {
    // Helper 1: rejeição imediata (consumida uma vez).
    // `pendingReject` é consumido no primeiro `play()` chamado.
    if (MockAudio.pendingReject !== null) {
      const err = MockAudio.pendingReject;
      MockAudio.pendingReject = null;
      return Promise.reject(err);
    }
    // Helper 2: rejeição controlada externamente.
    // `delayedRejection` expõe a função `reject` para o teste chamar
    // **depois** da troca de voz — necessário para exercitar o caminho
    // `isStale()` do callback `play().catch` (caminho coberto pelo
    // token de sessão). Sem controle externo, a rejeição acontece
    // antes do `playPreview` seguinte e o teste passa sem exercitar
    // o early return do `isStale()`.
    if (MockAudio.delayedRejection !== null) {
      const { promise } = MockAudio.delayedRejection;
      MockAudio.delayedRejection = null;
      return promise;
    }
    return this.playResult;
  }

  pause(): void {
    this.paused = true;
  }

  load(): void {
    this.error = null;
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }

  setAttribute(name: string, value: string): void {
    // noop — implementado para atender o contrato do hook, mas
    // os cenários atuais não precisam de configuração adicional.
    void name;
    void value;
  }

  // Helpers de teste
  triggerError(code = 4): void {
    this.error = { code, message: `code=${code}` } as unknown as MediaError;
    this.onerror?.();
  }
  triggerEnded(): void {
    this.onended?.();
  }
  static last: MockAudio | null = null;
  // Helper global: próxima chamada a `play()` rejeita com este valor.
  // Consumido uma vez após uso (similar a `expect.assertions`).
  static pendingReject: unknown = null;
  // Helper global: próxima chamada a `play()` retorna uma promise
  // controlada externamente. O teste armazena a referência da função
  // `reject` e chama quando quiser (após a troca de voz, para exercitar
  // o caminho `isStale()`). Consumido uma vez.
  static delayedRejection: { promise: Promise<void>; reject: (err: unknown) => void } | null = null;
}

let originalAudio: unknown;

beforeEach(() => {
  originalAudio = (globalThis as { Audio?: unknown }).Audio;
  (globalThis as unknown as { Audio: typeof MockAudio }).Audio = MockAudio;
});

afterEach(() => {
  MockAudio.last = null;
  if (originalAudio === undefined) {
    delete (globalThis as { Audio?: unknown }).Audio;
  } else {
    (globalThis as { Audio: unknown }).Audio = originalAudio;
  }
});

describe('useVoicePreviews', () => {
  beforeEach(() => {
    errorSpy.mockClear();
    warnSpy.mockClear();
    debugSpy.mockClear();
  });

  it('inicializa com playingId null e errorId null', () => {
    const { result } = renderHook(() => useVoicePreviews());
    expect(result.current.playingId).toBeNull();
    expect(result.current.errorId).toBeNull();
  });

  it('expõe playPreview e stop como funções', () => {
    const { result } = renderHook(() => useVoicePreviews());
    expect(typeof result.current.playPreview).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });

  it('REGISTRA erro quando MediaError.code = 4 com src válido (404 real)', () => {
    // Code 4 com src ainda apontando para o preview path = 404 HTTP real.
    // O hook loga `error` + popula `errorId` para preservar telemetria de
    // assets quebrados. (W-05 da auditoria v0.135.1 rodada 6 — restauração
    // do ramo condicional que o round 5 removeu.)
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;
    expect(audio?.src).toBe('/voice-previews/Aoede.wav'); // src válido
    expect(audio?.onerror).not.toBeNull();

    act(() => {
      audio?.triggerError(4);
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, payload] = errorSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('Não foi possível carregar o preview');
    expect(String(message)).toContain('Aoede');
    expect((payload as { code: number }).code).toBe(4);
    expect(result.current.errorId).toBe('Aoede');
  });

  it('NÃO registra erro quando MediaError.code = 4 com src vazio (cleanup) — caminho vacuous por design', () => {
    // Em produção, o caminho `code 4 + src vazio + listener ativo` é
    // INALCANCÁVEL: `stop()` e o cleanup de unmount zeram `onerror` ANTES
    // de chamar `removeAttribute('src')` (linhas 62-64 do hook). Logo, o
    // Chrome dispara `onerror` com code 4 (caso `src=''` + `load()`) somente
    // APÓS o listener ter sido zerado, e o `reportLoadError` nunca é chamado.
    //
    // Por design, o ramo `code === 4 && audio.src === ''` é defesa em
    // profundidade morta — não há caminho real que o exercite. O teste
    // abaixo valida o COMPORTAMENTO OBSERVÁVEL (após `stop()` com src
    // vazio, `triggerError(4)` no listener vazio não chama `errorSpy`),
    // não o ramo do hook. O ramo real exercitado é o de code 4 com src
    // válido (teste acima), que é o que importa em produção.
    //
    // (W-2 da auditoria v0.135.1 rodada 7: este teste é tautológico
    // por design — a guarda `code === 4 && audio.src === ''` do hook
    // não pode ser exercitada sem refatorar o mock para não zerar
    // listeners em `removeAttribute('src')`. A correção do design está
    // no hook; o teste documenta o contrato observável.)
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;
    expect(audio?.onerror).not.toBeNull();

    act(() => {
      result.current.stop();
    });
    // Após stop: src vazio, listener zerado. `triggerError(4)` no listener
    // vazio é no-op (handler = () => {}). Nenhum log de erro é esperado.
    audio?.triggerError(4);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('NÃO registra erro quando MediaError.code = 0 no áudio ATUAL (listener ativo)', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;
    expect(audio?.onerror).not.toBeNull();

    act(() => {
      audio?.triggerError(0);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();
    expect(result.current.errorId).toBeNull();
  });

  it('stop() remove listeners de erro do áudio (evita falsos positivos)', () => {
    // Garante o contrato: após `stop()`, o áudio anterior NÃO chama mais
    // `log.error`, mesmo quando o navegador dispara `onerror` por
    // mudança de `src` (código 4) ou abort (código 0).
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;

    act(() => {
      result.current.stop();
    });

    // Após `stop`, o `onerror` foi zerado, então `triggerError` é no-op.
    act(() => {
      audio?.triggerError(4);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(audio?.onerror).toBeNull();
  });

  it('registra erro de fato quando o código indica falha real (código 2)', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const aoedeAudio = MockAudio.last;
    act(() => {
      aoedeAudio?.triggerError(2);
    });

    expect(errorSpy).toHaveBeenCalled();
    const [message, payload] = errorSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('Não foi possível carregar o preview');
    expect(String(message)).toContain('Aoede');
    expect((payload as { code: number }).code).toBe(2);
    expect(result.current.errorId).toBe('Aoede');
  });

  it('stop() limpa o estado do áudio atual', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;

    act(() => {
      result.current.stop();
    });

    // Após `stop`, o áudio atual deve estar pausado e sem `src` definido.
    expect(audio?.paused).toBe(true);
    expect(audio?.src).toBe('');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('playPreview na mesma voz para o áudio atual', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const first = MockAudio.last;

    act(() => {
      result.current.playPreview('Aoede');
    });
    // Reaproveita o controle de pause — implementação não cria novo Audio.
    expect(first?.paused).toBe(true);
  });

  // ─── Cobertura do contrato de MediaError.code (HTML spec) ────────────
  //
  // O hook silencia codes 0/1/4 (aborto/cleanup/sem-erro) e loga erro
  // real apenas para codes 2 (network) e 3 (decode). Esses testes fixam
  // o contrato — regressão em qualquer um dos 5 codes dispara o teste.

  it('NÃO registra erro quando o áudio é abortado (código 1 = MEDIA_ERR_ABORTED)', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const audio = MockAudio.last;
    act(() => {
      audio?.triggerError(1);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(result.current.errorId).toBeNull();
  });

  it('registra erro quando o áudio falha ao decodificar (código 3 = MEDIA_ERR_DECODE)', () => {
    const { result } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Kore');
    });
    const audio = MockAudio.last;
    act(() => {
      audio?.triggerError(3);
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, payload] = errorSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('Não foi possível carregar o preview');
    expect(String(message)).toContain('Kore');
    expect(String(message)).toContain('code=3');
    expect((payload as { code: number }).code).toBe(3);
    expect(result.current.errorId).toBe('Kore');
  });

  it('cleanup de unmount zera listeners do áudio anterior (evita log pós-navegação)', () => {
    // Peça central da correção do falso positivo pós-navegação: quando o
    // componente é desmontado (ex: navegação de rota), o cleanup do useEffect
    // zera `onerror`/`onended` do áudio que estava tocando. Aqui validamos o
    // efeito observável — após o unmount, mesmo que o navegador dispare
    // `onerror` tardio no áudio antigo, ele é no-op (listener null) e o hook
    // não chama `log.error` nem `setState` em componente desmontado.
    //
    // A invalidação do token de sessão é coberta indiretamente no teste
    // "play().catch tardio no áudio anterior é descartado pelo isStale()"
    // abaixo — ali exercitamos o caminho onde `isStale()` retorna true.
    const { result, unmount } = renderHook(() => useVoicePreviews());

    act(() => {
      result.current.playPreview('Aoede');
    });
    const oldAudio = MockAudio.last;
    expect(oldAudio).not.toBeNull();

    unmount();

    // Após unmount: dispara `onerror` no áudio antigo (simulando race real
    // do Chrome — `onerror` pode chegar após o componente desmontar).
    // Como o listener foi zerado pelo cleanup, o handler é no-op.
    act(() => {
      oldAudio?.triggerError(2);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(oldAudio?.onerror).toBeNull();
    expect(oldAudio?.onended).toBeNull();
  });

  it('token de sessão: play().catch tardio no áudio anterior é descartado por isStale()', async () => {
    // Valida o segundo mecanismo da correção: `isStale()` no callback de
    // `play().catch`. Quando `playPreview(B)` é chamado enquanto o áudio A
    // ainda está com `play()` pendente, o token é incrementado → quando a
    // rejeição tardia de A.play() chegar, `isStale()` retorna true e o
    // callback early-returna sem logar warn de autoplay espúrio.
    //
    // Importante: usar `MockAudio.delayedRejection` (controlada externamente)
    // + `act` async para drenar microtasks. Sem isso, o teste passa
    // independentemente de `isStale()` existir (a rejeição imediata síncrona
    // não dá tempo de o token ser invalidado pela troca). Veja W3 da
    // auditoria v0.135.1 rodada 4.
    const { result } = renderHook(() => useVoicePreviews());

    // Configura `play()` com promise controlada externamente.
    let rejectPlay!: (err: unknown) => void;
    const promise = new Promise<void>((_, reject) => {
      rejectPlay = reject;
    });
    MockAudio.delayedRejection = { promise, reject: rejectPlay };

    act(() => {
      result.current.playPreview('Aoede');
    });
    const aoedeAudio = MockAudio.last;
    expect(aoedeAudio).not.toBeNull();
    // A promise está pendente — ainda não rejeitou.

    // Troca para Zephyr → incrementa token para 2. A promise de A.play()
    // continua pendente.
    act(() => {
      result.current.playPreview('Zephyr');
    });

    // Agora rejeita A.play() DEPOIS da troca — `isStale()` deve descartar.
    // `act` async drena as microtasks para o `.catch` rodar.
    await act(async () => {
      rejectPlay(new Error('NotAllowedError'));
      // Drenar microtasks
      await Promise.resolve();
      await Promise.resolve();
    });

    // O warn de autoplay NÃO deve ser chamado — `isStale()` invalidou o callback.
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('autoplay'),
    );
  });

  it('play() rejeitada sem troca loga warn de autoplay (controle positivo)', async () => {
    // Controle positivo: confirma que o caminho `play().catch` loga warn
    // de autoplay quando NÃO há troca de voz (token ainda válido). Garante
    // que a rejeição assíncrona do teste anterior está sendo processada
    // pelo callback (não silenciada por outro motivo).
    const { result } = renderHook(() => useVoicePreviews());

    let rejectPlay!: (err: unknown) => void;
    const promise = new Promise<void>((_, reject) => {
      rejectPlay = reject;
    });
    MockAudio.delayedRejection = { promise, reject: rejectPlay };

    act(() => {
      result.current.playPreview('Aoede');
    });

    await act(async () => {
      rejectPlay(new Error('NotAllowedError'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('autoplay'),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
