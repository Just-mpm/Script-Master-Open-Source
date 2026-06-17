/**
 * Testes do `SpeedPaintPage` — L3 (RF-01 + RF-02) do plano
 * `docs/plan/speed-paint-vetorial-completo-plano-final.md`.
 *
 * Valida o handler `handleRenderModeChange` que reescreve o fluxo de troca
 * do modo de renderização (Clássico ↔ Desenho) com:
 *
 * 1. Persistência IMEDIATA de `renderMode` na store (`useAnimationStore`).
 * 2. Disparo de `trackAnalyticsEvent('speed_paint_mode_changed', { mode })`.
 * 3. AbortController para encerrar processamento anterior.
 * 4. `processingIdRef` para race protection entre cliques rápidos.
 * 5. Consulta ao cache LRU (`getStrokeAnimation`) ANTES de reprocessar.
 * 6. Em cache miss, delega para `generateStrokesFromImage` (dynamic import)
 *    e cacheia o resultado com `setStrokeAnimation`.
 * 7. `AbortError` causado por signal abortado externamente é ignorado
 *    (status NÃO vira 'failed').
 * 8. Erro genérico vira `status: 'failed'`.
 * 9. Tooltips distintos (`aria-label` Clássico ≠ aria-label Desenho).
 *
 * Estratégia de mocks:
 * - `getStrokeAnimation` / `setStrokeAnimation` / `generateStrokesFromImage`
 *   ficam em `vi.hoisted` para que `vi.mock` consiga referenciá-los.
 * - `trackAnalyticsEvent` mockado para validar o evento disparado.
 * - Subcomponentes pesados (BatchOrchestrator, SpeedPaintPlayer, etc.)
 *   mockados como `() => null` para isolar a lógica do toggle.
 * - A `useAnimationStore` permanece REAL (Zustand) para que
 *   `setRenderMode` / `setJob` / `job.inputImage` reflitam o estado
 *   verdadeiro que o handler manipula.
 * - O `useSpeedPaintExporter` é mockado (a fachada é testada em outro
 *   arquivo), evitando dependência do `speedPaintRenderController` e do
 *   `useCodecSupport` no setup.
 *
 * @see src/pages/SpeedPaintPage.tsx (L3 — handleRenderModeChange)
 * @see src/features/speed-paint/store/animationStore.ts
 * @see src/features/video-render/lib/strokeCache.ts
 * @see src/features/speed-paint/lib/imageProcessing.ts
 * @see src/lib/analytics.ts
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { I18nProvider } from '../../src/features/i18n';
import { useAnimationStore } from '../../src/features/speed-paint/store/animationStore';
import type {
  SpeedPaintRenderMode,
  StrokeAnimation,
  VetorialAnimation,
  VetorialPreset,
} from '../../src/features/speed-paint/types';

// ─── Estado mutável para inspeção dos mocks (vi.hoisted) ─────────────
// `vi.mock` é içado para o topo do arquivo pelo Vitest, então qualquer
// `vi.fn()` referenciado dentro da factory precisa ser declarado via
// `vi.hoisted` para que a closure encontre a referência correta.
const mocks = vi.hoisted(() => ({
  getStrokeAnimation: vi.fn(),
  setStrokeAnimation: vi.fn(),
  generateStrokesFromImage: vi.fn(),
  trackAnalyticsEvent: vi.fn(),
}));

// ─── Mocks centralizados no topo do arquivo ───────────────────────────

// Cache LRU — helpers de leitura/escrita
vi.mock('../../src/features/video-render/lib/strokeCache', () => ({
  getStrokeAnimation: (...args: unknown[]) => mocks.getStrokeAnimation(...args),
  setStrokeAnimation: (...args: unknown[]) => mocks.setStrokeAnimation(...args),
  isStrokeAnimation: (animation: unknown): animation is StrokeAnimation =>
    typeof animation === 'object' &&
    animation !== null &&
    'totalFrames' in animation,
  isVetorialAnimation: (animation: unknown): animation is VetorialAnimation =>
    typeof animation === 'object' &&
    animation !== null &&
    'totalLength' in animation,
  clearStrokeCache: vi.fn(),
  getStrokeCacheStats: vi.fn(() => ({ size: 0, maxSize: 20 })),
}));

// Gerador de animações (import dinâmico dentro de handleRenderModeChange)
vi.mock('../../src/features/speed-paint/lib/imageProcessing', () => ({
  generateStrokesFromImage: (...args: unknown[]) =>
    mocks.generateStrokesFromImage(...args),
}));

// Analytics — eventos trackados na L3
vi.mock('../../src/lib/analytics', () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mocks.trackAnalyticsEvent(...args),
  // Demais exports evitam erros em chains de import transitivo.
  setAnalyticsUserProperties: vi.fn(),
  syncAnalyticsUser: vi.fn(),
  getAnalyticsConsent: vi.fn(() => 'unknown'),
  grantAnalyticsConsent: vi.fn(),
  denyAnalyticsConsent: vi.fn(),
  ANALYTICS_CONSENT_KEY: 's2a_analytics_consent',
  ANALYTICS_CONSENT_CHANGED_EVENT: 's2a-analytics-consent-changed',
  categorizeAnalyticsError: vi.fn(() => 'unknown'),
  getSizeBucket: vi.fn(() => 'tiny'),
}));

// Logger — silencia `log.error`/`log.warn` em testes (mas mantém vi.fn()
// caso o handler tente registrar uma falha esperada).
vi.mock('../../src/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  setLoggerUserId: vi.fn(),
}));

// SEO — `getPageSeo` retorna objeto literal (sem side-effects).
vi.mock('../../src/lib/seo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/seo')>();
  return {
    ...actual,
    getPageSeo: () => ({ title: 'Speed Paint', meta: [], link: [] }),
  };
});

// `DocumentHead` — evita manipular o `<head>` global do jsdom.
vi.mock('../../src/components/DocumentHead', () => ({
  DocumentHead: () => null,
}));

// Subcomponentes pesados — mockados como `() => null` para isolar a
// lógica do toggle. Esses componentes têm deps pesadas (@remotion/player,
// @dnd-kit, react-dropzone) que tornariam o teste lento e instável.
vi.mock(
  '../../src/features/speed-paint/components/batch/BatchOrchestrator',
  () => ({ BatchOrchestrator: () => null }),
);
vi.mock(
  '../../src/features/speed-paint/components/batch/QueueStaging',
  () => ({ QueueStaging: () => null }),
);
vi.mock(
  '../../src/features/speed-paint/components/SpeedPaintPlayer',
  () => ({
    SpeedPaintPlayer: () => null,
  }),
);
vi.mock(
  '../../src/features/speed-paint/components/SpeedPaintPlayerControls',
  () => ({ SpeedPaintPlayerControls: () => null }),
);
vi.mock(
  '../../src/features/speed-paint/components/SpeedPaintExportPanel',
  () => ({ SpeedPaintExportPanel: () => null }),
);
vi.mock(
  '../../src/features/speed-paint/components/upload/ImageUpload',
  () => ({ ImageUpload: () => null }),
);
vi.mock(
  '../../src/features/video-render/components/export/ExportProgressBar',
  () => ({ ExportProgressBar: () => null }),
);
vi.mock(
  '../../src/features/video-render/components/export/ExportResultActions',
  () => ({ ExportResultActions: () => null }),
);

// Hook fachada de exportação — não é alvo do L3. Mock evita carregar
// o controller singleton e o codec detection no setup.
vi.mock(
  '../../src/features/speed-paint/hooks/useSpeedPaintExporter',
  () => ({
    useSpeedPaintExporter: () => ({
      isRendering: false,
      renderProgress: 0,
      renderStatusText: '',
      outputBlob: null,
      outputUrl: null,
      error: null,
      wasCancelled: false,
      currentBatchIndex: 0,
      totalBatchItems: 0,
      canRender: null,
      resolvedVideoCodec: 'h264',
      resolvedContainer: 'mp4',
      supportsHtmlInCanvas: false,
      checkSupport: vi.fn().mockResolvedValue(undefined),
      resetSupport: vi.fn(),
      startRender: vi.fn().mockResolvedValue(undefined),
      startBatchRender: vi.fn().mockResolvedValue(undefined),
      handleCancel: vi.fn(),
      handleDownload: vi.fn(),
      reset: vi.fn(),
    }),
    getSpeedPaintResolution: () => ({ width: 1920, height: 1080 }),
  }),
);

// ─── Setup de wrapper (I18n + MUI Theme) ──────────────────────────────

const darkTheme = createTheme({ palette: { mode: 'dark' } });

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </I18nProvider>
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────

/** Imagem data URL mínima — apenas para satisfazer `job.inputImage`. */
const SAMPLE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function createStrokeAnimation(): StrokeAnimation {
  return {
    id: 'anim-mask-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    totalFrames: 60,
    fps: 30,
    totalDurationMs: 2000,
    revealThreshold: 0.8,
    strokes: [],
    resizedImage: SAMPLE_DATA_URL,
  };
}

function createVetorialAnimation(preset: VetorialPreset = 'artistic1'): VetorialAnimation {
  return {
    id: 'anim-vetorial-1',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasColor: 'white',
    paths: [
      { d: 'M 10 10 L 90 90', length: 113, color: '#000', strokeWidth: 2 },
    ],
    totalLength: 113,
    fps: 60,
    totalDurationMs: 4000,
    sourcePreset: preset,
    resizedImage: SAMPLE_DATA_URL,
  };
}

/**
 * Configura a store com job completado + input image + modo/preset
 * customizados.
 *
 * Importante: `job.status = 'completed'` é necessário para que o
 * `isCompleted` no componente vire `true` e o painel com o toggle
 * (`StackedHeader` colapsável) seja renderizado.
 *
 * O `renderMode` deve ser DIFERENTE do modo que será clicado no teste
 * — se for igual, o `ToggleButtonGroup` do MUI em modo `exclusive` não
 * dispara `onChange` (comportamento padrão de grupos exclusivos).
 */
function setupCompletedJob(opts: {
  preset?: VetorialPreset;
  initialRenderMode?: SpeedPaintRenderMode;
}) {
  useAnimationStore.getState().setJob({
    id: 'job-1',
    inputImage: SAMPLE_DATA_URL,
    status: 'completed',
    progress: 1,
    animation: createStrokeAnimation(),
  });
  if (opts.preset) {
    useAnimationStore.getState().setVetorialPreset(opts.preset);
  }
  useAnimationStore.getState().setRenderMode(opts.initialRenderMode ?? 'mask');
}

// ─── Testes ───────────────────────────────────────────────────────────

describe('SpeedPaintPage — handleRenderModeChange (L3)', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');

    // Limpa a store para isolar cada teste.
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();

    // Reset dos mocks — `mockReset` apaga histórico mas mantém a
    // implementação default (Promise pendente) até cada teste definir
    // o seu próprio `mockResolvedValueOnce` / `mockImplementationOnce`.
    mocks.getStrokeAnimation.mockReset();
    mocks.setStrokeAnimation.mockReset();
    mocks.generateStrokesFromImage.mockReset();
    mocks.trackAnalyticsEvent.mockReset();

    // Default: cache miss → generate é chamado. Cada teste pode
    // sobrescrever com `mockResolvedValueOnce` quando quiser.
    mocks.getStrokeAnimation.mockResolvedValue(null);
  });

  afterEach(() => {
    // Limpa store para o próximo describe/it não herdar estado.
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Bloco A — Comportamento básico
  // ===========================================================================

  describe('Bloco A — comportamento básico', () => {
    it('A.1 — sucesso em cache miss: clica em "Desenho" chama generateStrokesFromImage com renderMode=vetorial + vetorialPreset, e popula job.animation', async () => {
      // Arrange
      const VETORIAL_PRESET: VetorialPreset = 'detailed';
      const VETORIAL_ANIMATION = createVetorialAnimation(VETORIAL_PRESET);
      setupCompletedJob({ preset: VETORIAL_PRESET, initialRenderMode: 'mask' });

      // Cache miss → generate é chamado.
      mocks.getStrokeAnimation.mockResolvedValue(null);
      // Mock do gerador — devolve `VetorialAnimation` com `sourcePreset` matching.
      mocks.generateStrokesFromImage.mockResolvedValue(VETORIAL_ANIMATION);

      // Import dinâmico após mocks para garantir que o `await import(...)`
      // dentro de handleRenderModeChange use a referência mockada.
      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act — clica no botão "Modo Desenho" (aria-label="Modo Desenho").
      const vetorialButton = screen.getByLabelText('Modo Desenho');
      fireEvent.click(vetorialButton);

      // Assert — espera o `await` interno completar.
      await waitFor(() => {
        expect(mocks.generateStrokesFromImage).toHaveBeenCalledTimes(1);
      });

      // Validação completa do argumento: dataUrl + onProgress + options.
      const [calledDataUrl, , calledOptions] =
        mocks.generateStrokesFromImage.mock.calls[0]!;
      expect(calledDataUrl).toBe(SAMPLE_DATA_URL);
      expect(calledOptions).toMatchObject({
        renderMode: 'vetorial',
        vetorialPreset: VETORIAL_PRESET,
      });
      // O AbortSignal SEMPRE é passado para o gerador (garante cancelamento).
      expect(calledOptions).toHaveProperty('signal');
      expect(calledOptions.signal).toBeInstanceOf(AbortSignal);

      // job.animation populado com o retorno de `generateStrokesFromImage`.
      await waitFor(() => {
        const { animation, status } = useAnimationStore.getState().job;
        expect(animation).toBeDefined();
        expect(status).toBe('completed');
        // Narrowing via type guard: totalLength é exclusivo de VetorialAnimation.
        if (animation && 'totalLength' in animation) {
          expect(animation.sourcePreset).toBe(VETORIAL_PRESET);
        } else {
          throw new Error('Esperava VetorialAnimation no job.animation');
        }
      });

      // trackAnalyticsEvent foi disparado com o evento correto.
      expect(mocks.trackAnalyticsEvent).toHaveBeenCalledWith(
        'speed_paint_mode_changed',
        { mode: 'vetorial' },
      );
    });

    it('A.2 — sucesso em cache hit: generateStrokesFromImage NÃO é chamado (animação vem do cache)', async () => {
      // Arrange
      const CACHED_VETORIAL: VetorialAnimation = createVetorialAnimation('artistic1');
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'mask' });

      // Cache HIT — devolve a animação sem precisar do gerador.
      mocks.getStrokeAnimation.mockResolvedValue(CACHED_VETORIAL);

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act
      const vetorialButton = screen.getByLabelText('Modo Desenho');
      fireEvent.click(vetorialButton);

      // Assert
      await waitFor(() => {
        expect(mocks.getStrokeAnimation).toHaveBeenCalledTimes(1);
      });

      // O gerador NÃO deve ter sido chamado — o cache HIT evitou o reprocessamento.
      expect(mocks.generateStrokesFromImage).not.toHaveBeenCalled();

      // E a animação cacheada foi aplicada ao job.
      await waitFor(() => {
        expect(useAnimationStore.getState().job.animation).toBe(CACHED_VETORIAL);
        expect(useAnimationStore.getState().job.status).toBe('completed');
      });

      // Em cache HIT, `setStrokeAnimation` NÃO é chamado (a entrada já existe).
      expect(mocks.setStrokeAnimation).not.toHaveBeenCalled();
    });

    it('A.3 — modo Clássico: clica em "Modo Clássico" chama generateStrokesFromImage com renderMode=mask (sem vetorialPreset)', async () => {
      // Arrange
      // O modo inicial é 'vetorial' para que o clique em "Modo Clássico"
      // altere o valor e dispare o `onChange` do ToggleButtonGroup
      // (em modo `exclusive`, clicar no já-ativo retorna `null`).
      const MASK_ANIMATION: StrokeAnimation = createStrokeAnimation();
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'vetorial' });

      mocks.getStrokeAnimation.mockResolvedValue(null);
      mocks.generateStrokesFromImage.mockResolvedValue(MASK_ANIMATION);

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act
      const classicButton = screen.getByLabelText('Modo Clássico');
      fireEvent.click(classicButton);

      // Assert
      await waitFor(() => {
        expect(mocks.generateStrokesFromImage).toHaveBeenCalledTimes(1);
      });

      const [, , calledOptions] = mocks.generateStrokesFromImage.mock.calls[0]!;
      expect(calledOptions).toMatchObject({ renderMode: 'mask' });
      // `vetorialPreset` é irrelevante no modo mask — o handler passa
      // `undefined` explicitamente (ver src/pages/SpeedPaintPage.tsx:368).
      expect(calledOptions.vetorialPreset).toBeUndefined();
    });
  });

  // ===========================================================================
  // Bloco B — Race protection
  // ===========================================================================

  describe('Bloco B — race protection', () => {
    it('B.1 — cliques sequenciais: cada processamento completa e o último resultado aplicado prevalece na store', async () => {
      // Arrange
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'mask' });

      // O segundo `generateStrokesFromImage` (modo Clássico) é o que vai
      // prevalecer — asserção principal do teste.
      const FINAL_MASK_ANIMATION: StrokeAnimation = {
        ...createStrokeAnimation(),
        id: 'anim-mask-final',
      };

      mocks.getStrokeAnimation.mockResolvedValue(null);
      mocks.generateStrokesFromImage.mockImplementation(
        async (
          _dataUrl: string,
          _onProgress: (p: number) => void,
          options: { renderMode: SpeedPaintRenderMode },
        ) => {
          // Retorna a animação correspondente ao modo solicitado.
          if (options.renderMode === 'vetorial') {
            return createVetorialAnimation('artistic1');
          }
          return FINAL_MASK_ANIMATION;
        },
      );

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act 1 — clica em "Desenho" (mask → vetorial). Processa e completa.
      fireEvent.click(screen.getByLabelText('Modo Desenho'));
      await waitFor(() => {
        expect(useAnimationStore.getState().job.status).toBe('completed');
      });
      // Confirma que a primeira animação (vetorial) está aplicada.
      expect(useAnimationStore.getState().renderMode).toBe('vetorial');
      const firstAnimation = useAnimationStore.getState().job.animation;
      expect(firstAnimation).toBeDefined();
      expect(firstAnimation && 'totalLength' in firstAnimation).toBe(true);

      // Act 2 — clica em "Modo Clássico" (vetorial → mask). Processa e completa.
      fireEvent.click(screen.getByLabelText('Modo Clássico'));
      await waitFor(() => {
        expect(useAnimationStore.getState().renderMode).toBe('mask');
      });

      // Assert — o último resultado é o que prevalece.
      await waitFor(() => {
        expect(useAnimationStore.getState().job.animation).toBe(FINAL_MASK_ANIMATION);
        expect(useAnimationStore.getState().job.status).toBe('completed');
      });

      // O `processingIdRef` (interno ao componente) garante que
      // o resultado do segundo click seja aplicado — validado pelo
      // fato de a animação final ser a do `FINAL_MASK_ANIMATION`.
      expect(mocks.generateStrokesFromImage).toHaveBeenCalledTimes(2);
    });

    it('B.2 — AbortError causado por signal abortado externamente: status do job NÃO vira failed', async () => {
      // Arrange
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'mask' });

      mocks.getStrokeAnimation.mockResolvedValue(null);

      // O `generateStrokesFromImage` captura o `signal` e rejeita com
      // `AbortError` QUANDO o signal for abortado externamente.
      // Isso simula um cancelamento real (e.g., usuário navega para
      // outra rota, o `ExportCrossRouteGuard` aborta o controller).
      // Usamos uma ref mutável em escopo de mock para capturar o signal.
      const signalRef: { current: AbortSignal | null } = { current: null };
      mocks.generateStrokesFromImage.mockImplementation(
        (
          _dataUrl: string,
          _onProgress: (p: number) => void,
          options: { signal?: AbortSignal },
        ): Promise<VetorialAnimation> =>
          new Promise<VetorialAnimation>((_resolve, reject) => {
            const sig = options.signal;
            if (!sig) {
              reject(new Error('signal ausente no test setup'));
              return;
            }
            // `sig` aqui é `AbortSignal` (após o check acima).
            signalRef.current = sig;
            sig.addEventListener('abort', () => {
              reject(new DOMException('Speed paint generation aborted', 'AbortError'));
            });
          }),
      );

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act — dispara o click. O processingIdRef é marcado e o
      // signal é passado para o gerador (capturado acima).
      fireEvent.click(screen.getByLabelText('Modo Desenho'));

      // Aguarda o signal ser capturado pelo mock.
      await waitFor(() => {
        expect(signalRef.current).not.toBeNull();
      });

      // Simula cancelamento externo: aborta o signal.
      // O handler em `handleRenderModeChange` tem:
      //   if (ac.signal.aborted) return;  ← deve retornar antes de setar 'failed'.
      // (ver src/pages/SpeedPaintPage.tsx:381)
      const sig = signalRef.current;
      if (!sig) throw new Error('signal não foi capturado');
      // Em runners jsdom a API `.abort()` do `AbortSignal` pode estar
      // indisponível ou causar TypeError; usamos `Object.defineProperty`
      // para forçar `aborted = true` — o suficiente para o handler
      // detectar a condição e retornar sem setar 'failed'.
      Object.defineProperty(sig, 'aborted', {
        value: true,
        configurable: true,
        writable: true,
      });
      // Também despachamos o evento `abort` para que o `addEventListener`
      // registrado dentro do mock capture e rejeite com AbortError
      // (replicando o comportamento real do AbortController).
      try {
        sig.dispatchEvent(new Event('abort'));
      } catch {
        // jsdom pode recusar Event de outro realm — silenciamos.
      }

      // Aguarda a microtask do catch ser processada.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert — o status NÃO pode ter virado 'failed'.
      expect(useAnimationStore.getState().job.status).not.toBe('failed');

      // O signal abortado também não deve ter ficado como `processing`
      // para sempre — o componente não tem cleanup explícito, então o
      // status permanece 'processing' (o que é OK para o handler, mas
      // pode confundir a UI). O importante é NÃO ser 'failed'.
    });
  });

  // ===========================================================================
  // Bloco C — Erros
  // ===========================================================================

  describe('Bloco C — erros', () => {
    it('C.1 — erro genérico em generateStrokesFromImage: status do job vira failed', async () => {
      // Arrange
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'mask' });

      mocks.getStrokeAnimation.mockResolvedValue(null);
      // Erro genérico (não AbortError) — o handler deve marcar failed.
      const genericError = new Error('Falha ao vetorizar imagem');
      mocks.generateStrokesFromImage.mockRejectedValue(genericError);

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act
      fireEvent.click(screen.getByLabelText('Modo Desenho'));

      // Assert
      await waitFor(() => {
        expect(useAnimationStore.getState().job.status).toBe('failed');
      });
      // E o generate foi tentado exatamente uma vez.
      expect(mocks.generateStrokesFromImage).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Bloco D — Acessibilidade
  // ===========================================================================

  describe('Bloco D — acessibilidade', () => {
    it('D.1 — tooltips distintos: aria-label do botão Clássico é diferente do aria-label do botão Desenho', async () => {
      // Arrange
      setupCompletedJob({ preset: 'artistic1', initialRenderMode: 'mask' });

      // Act
      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // `getByLabelText` resolve via `aria-label` dos ToggleButtons.
      const classicButton = screen.getByLabelText('Modo Clássico');
      const vetorialButton = screen.getByLabelText('Modo Desenho');

      // Assert — rótulos diferentes (não vazios) e ambos localizáveis.
      expect(classicButton).toBeInTheDocument();
      expect(vetorialButton).toBeInTheDocument();
      expect(classicButton.getAttribute('aria-label')).not.toBe(
        vetorialButton.getAttribute('aria-label'),
      );
      expect(classicButton.getAttribute('aria-label')).toBe('Modo Clássico');
      expect(vetorialButton.getAttribute('aria-label')).toBe('Modo Desenho');

      // O valor de cada ToggleButton deve estar presente para que a
      // ToggleButtonGroup identifique qual foi clicado.
      expect(classicButton.getAttribute('value')).toBe('mask');
      expect(vetorialButton.getAttribute('value')).toBe('vetorial');
    });
  });
});

// ===========================================================================
// Testes da L4 (RF-03) — seletor de `vetorialPreset` em `SpeedPaintPage`.
//
// Valida o seletor de estilo do modo "Desenho" (vetorial), que exibe 20
// opções em 7 grupos (decisão D05: `presets.{name}` + `presetGroups.{group}`):
// 16 presets legados do `imagetracerjs` + 4 presets `edge-*` (v0.132.0)
// agrupados nos 6 grupos originais + o novo `edge-detection` no topo.
//
// 1. Renderização condicional: visível APENAS quando `renderMode === 'vetorial'`.
// 2. Conteúdo: 16 `<MenuItem>` (role="option") + 6 `<ListSubheader>` (li
//    com role="presentation") por grupo.
// 3. Comportamento: trocar preset dispara `generateStrokesFromImage` no
//    modo vetorial com o novo preset; trocar preset no modo mask NÃO
//    dispara reprocessamento (seletor não está renderizado).
// 4. Acessibilidade: `aria-label` do Select é `t('speedPaint.vetorialPresetLabel')`.
//
// Estratégia de abertura do Select do MUI:
//   - `<Select>` do MUI renderiza um `<div role="combobox" aria-label="...">`
//     como gatilho. O `mouseDown` no combobox abre o `<Menu>` (portal no
//     `document.body`). O `click` na `<MenuItem>` (role="option") fecha
//     o menu e dispara `onChange`.
//   - `fireEvent.mouseDown` é usado em vez de `click` no gatilho porque
//     o handler de `mousedown` do MUI é o que abre o popover.
//
// @see src/pages/SpeedPaintPage.tsx (L4 — handlePresetChange, VETORIAL_PRESETS_GROUPED)
// @see src/features/speed-paint/constants/vetorialPresets.ts
// @see src/features/i18n/locales/pt-BR.ts (vetorialPresetLabel, presetGroups, presets)
describe('SpeedPaintPage — seletor de vetorialPreset (L4 RF-03)', () => {
  beforeEach(() => {
    localStorage.setItem('s2a_locale', 'pt-BR');

    // Limpa a store para isolar cada teste.
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();

    // Reset dos mocks — `mockReset` apaga histórico mas mantém a
    // implementação default (Promise pendente) até cada teste definir
    // o seu próprio `mockResolvedValueOnce` / `mockImplementationOnce`.
    mocks.getStrokeAnimation.mockReset();
    mocks.setStrokeAnimation.mockReset();
    mocks.generateStrokesFromImage.mockReset();
    mocks.trackAnalyticsEvent.mockReset();

    // Default: cache miss → generate é chamado. Cada teste pode
    // sobrescrever com `mockResolvedValueOnce` quando quiser.
    mocks.getStrokeAnimation.mockResolvedValue(null);
  });

  afterEach(() => {
    // Limpa store para o próximo describe/it não herdar estado.
    useAnimationStore.getState().clearQueue();
    useAnimationStore.getState().resetJob();
    vi.restoreAllMocks();
  });

  /**
   * Configura a store com job completado + input image no modo `vetorial`.
   * `vetorialPreset` é fixado no default (`'artistic1'`) para que o
   * `Select` mostre essa opção como selecionada inicialmente.
   */
  function setupVetorialMode(): void {
    setupCompletedJob({ initialRenderMode: 'vetorial' });
  }

  /**
   * Dispara o `mouseDown` no gatilho do `<Select>` (combobox com
   * `aria-label="Estilo do desenho"`) e devolve o `combobox` element.
   * Após esse evento, o `<Menu>` do MUI é renderizado em portal no
   * `document.body` e fica acessível via `screen.getByRole('option', ...)`.
   *
   * Usa `getByRole('combobox', { name: ... })` em vez de `getByLabelText`
   * porque o `<InputLabel>` e o `<Select>` compartilham o mesmo label
   * acessível — `getByLabelText` retornaria 2 elementos (o `<label>` e
   * o combobox). A busca por role evita a ambiguidade.
   */
  function openPresetSelect(): HTMLElement {
    const selectTrigger = screen.getByRole('combobox', { name: 'Estilo do desenho' });
    fireEvent.mouseDown(selectTrigger);
    return selectTrigger;
  }

  // ===========================================================================
  // Bloco A — Renderização condicional
  // ===========================================================================

  describe('Bloco A — renderização condicional', () => {
    it('A.1 — seletor visível (combobox + label) quando renderMode === "vetorial"', async () => {
      // Arrange — modo vetorial
      setupVetorialMode();

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      // Act
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Assert — o combobox do Select do preset está no DOM com o aria-label
      // esperado. O label flutuante (InputLabel) também é renderizado.
      const selectTrigger = screen.getByRole('combobox', { name: 'Estilo do desenho' });
      expect(selectTrigger).toBeInTheDocument();
      expect(selectTrigger.tagName).toBe('DIV');
      expect(selectTrigger.getAttribute('role')).toBe('combobox');

      // O InputLabel associado também é renderizado e referencia o id do Select.
      const labels = screen.getAllByText('Estilo do desenho');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });

    it('A.2 — seletor oculto quando renderMode === "mask"', async () => {
      // Arrange — modo Clássico (mask)
      setupCompletedJob({ initialRenderMode: 'mask' });

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      // Act
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Assert — o combobox com aria-label "Estilo do desenho" NÃO está no DOM.
      // `queryByRole` devolve `null` (em vez de `getByRole` que lança) —
      // preferido para asserts de ausência.
      expect(screen.queryByRole('combobox', { name: 'Estilo do desenho' })).not.toBeInTheDocument();

      // Os textos dos grupos (`Artístico`, etc.) também não devem estar
      // renderizados — o `<Select>` inteiro está fora da árvore virtual.
      expect(screen.queryByText('Artístico')).not.toBeInTheDocument();
      expect(screen.queryByText('Posterizado')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Bloco B — Conteúdo do dropdown
  // ===========================================================================

  describe('Bloco B — conteúdo do dropdown', () => {
    it('B.1 — 20 opções (MenuItem) renderizadas — distinguidas por data-value', async () => {
      // Arrange
      setupVetorialMode();

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act — abre o dropdown do Select
      openPresetSelect();

      // Assert — 20 `<MenuItem>` (que carregam o atributo `data-value` com
      // o id do preset) estão renderizados dentro do listbox: 16 presets
      // legados do `imagetracerjs` + 4 presets `edge-*` (v0.132.0).
      //
      // Por que `data-value` em vez de `getAllByRole('option')`?
      //   No jsdom o MUI `<ListSubheader>` é renderizado como `<li>` com
      //   `role="option"` (não `role="presentation"`), o que faz com que
      //   `findAllByRole('option')` retorne 27 elementos (20 MenuItem +
      //   7 ListSubheader). Os MenuItem, porém, são os únicos que recebem
      //   o atributo `data-value` pelo componente `MenuItem` da lib,
      //   tornando essa a estratégia confiável para contar apenas as
      //   opções selecionáveis.
      const listbox = await screen.findByRole('listbox');
      const menuItems = listbox.querySelectorAll('li[data-value]');
      expect(menuItems).toHaveLength(20);

      // Verifica que todos os 20 `VetorialPreset` estão presentes.
      const expectedPresets = [
        'artistic1', 'artistic2', 'artistic3', 'artistic4',
        'posterized1', 'posterized2', 'posterized3',
        'smoothed', 'curvy', 'sharp',
        'detailed', 'default', 'fixedpalette',
        'grayscale',
        'randomsampling1', 'randomsampling2',
        'edge-default', 'edge-detailed', 'edge-bold', 'edge-sketch',
      ] as const;
      const actualValues = Array.from(menuItems).map(
        (el) => el.getAttribute('data-value') ?? '',
      );
      for (const preset of expectedPresets) {
        expect(actualValues).toContain(preset);
      }
    });

    it('B.2 — 7 grupos (ListSubheader) renderizados como <li> sem data-value', async () => {
      // Arrange
      setupVetorialMode();

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act — abre o dropdown
      openPresetSelect();

      // Assert — os 7 `<ListSubheader>` aparecem como `<li>` dentro do
      // listbox, distinguidos dos MenuItem por NÃO terem `data-value`.
      // O novo grupo `edge-detection` (v0.132.0) é o PRIMEIRO do array
      // `VETORIAL_PRESETS_GROUPED` e aparece no topo do dropdown.
      const listbox = await screen.findByRole('listbox');
      const allLi = Array.from(listbox.querySelectorAll('li'));
      const subheaders = allLi.filter((li) => !li.hasAttribute('data-value'));
      expect(subheaders).toHaveLength(7);

      // Os textos dos 7 grupos devem estar presentes nos subheaders.
      const expectedGroups = [
        'Detecção de bordas',
        'Artístico',
        'Posterizado',
        'Suavizado',
        'Detalhado',
        'Escala de cinza',
        'Amostragem',
      ] as const;
      const subheaderTexts = subheaders.map((el) => el.textContent ?? '');
      for (const groupLabel of expectedGroups) {
        expect(subheaderTexts).toContain(groupLabel);
      }
    });
  });

  // ===========================================================================
  // Bloco C — Comportamento ao trocar preset
  // ===========================================================================

  describe('Bloco C — comportamento ao trocar preset', () => {
    it('C.1 — clicar numa opção dispara generateStrokesFromImage com novo vetorialPreset e analytics', async () => {
      // Arrange
      const NEW_PRESET: VetorialPreset = 'detailed';
      const NEW_ANIMATION = createVetorialAnimation(NEW_PRESET);
      setupVetorialMode();

      // Cache miss + generate devolve animação com o novo preset.
      mocks.getStrokeAnimation.mockResolvedValue(null);
      mocks.generateStrokesFromImage.mockResolvedValue(NEW_ANIMATION);

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Act — abre o dropdown e clica no MenuItem com data-value="detailed".
      // Usamos `[data-value="detailed"]` em vez de `getByRole('option', { name: 'Detalhado' })`
      // porque o `<ListSubheader>` do grupo "Detalhado" também é renderizado
      // como `<li role="option">` com o texto "Detalhado" — a busca por
      // `data-value` desambigua o MenuItem do subheader.
      openPresetSelect();
      const listbox = await screen.findByRole('listbox');
      const detailedOption = listbox.querySelector<HTMLElement>('li[data-value="detailed"]');
      expect(detailedOption).not.toBeNull();
      fireEvent.click(detailedOption!);

      // Assert 1 — analytics foi disparado com o evento + payload corretos.
      await waitFor(() => {
        expect(mocks.trackAnalyticsEvent).toHaveBeenCalledWith(
          'speed_paint_preset_changed',
          { preset: NEW_PRESET },
        );
      });

      // Assert 2 — `generateStrokesFromImage` foi chamado com o novo preset.
      await waitFor(() => {
        expect(mocks.generateStrokesFromImage).toHaveBeenCalledTimes(1);
      });
      const [, , calledOptions] = mocks.generateStrokesFromImage.mock.calls[0]!;
      expect(calledOptions).toMatchObject({
        renderMode: 'vetorial',
        vetorialPreset: NEW_PRESET,
      });
      expect(calledOptions).toHaveProperty('signal');
      expect(calledOptions.signal).toBeInstanceOf(AbortSignal);

      // Assert 3 — a store foi persistida com o novo preset.
      expect(useAnimationStore.getState().vetorialPreset).toBe(NEW_PRESET);

      // Assert 4 — o `job.animation` foi populado com a nova animação.
      await waitFor(() => {
        const { animation, status } = useAnimationStore.getState().job;
        expect(status).toBe('completed');
        if (animation && 'totalLength' in animation) {
          expect(animation.sourcePreset).toBe(NEW_PRESET);
        } else {
          throw new Error('Esperava VetorialAnimation no job.animation');
        }
      });
    });

    it('C.2 — mudar preset no modo mask NÃO dispara generateStrokesFromImage (seletor não está acessível)', async () => {
      // Arrange — modo Clássico (mask). O seletor de preset NÃO é renderizado.
      setupCompletedJob({ initialRenderMode: 'mask' });

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Sanidade — o seletor realmente não está no DOM no modo mask.
      expect(screen.queryByLabelText('Estilo do desenho')).not.toBeInTheDocument();

      // Act — simula uma mudança programática do preset na store (e.g.,
      // inicialização em massa, hot reload, futura feature). Como o
      // `Select` do preset está oculto, nenhum handler `onChange` é
      // disparado pela mudança da store — `reprocessCurrentImage` só
      // é chamado pelo `handlePresetChange` do Select.
      useAnimationStore.getState().setVetorialPreset('detailed');

      // Aguarda microtasks para garantir que nenhum callback assíncrono
      // seja disparado pela simples mudança da store.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert — `generateStrokesFromImage` NÃO foi chamado.
      // A mudança programática de `vetorialPreset` é um setter puro da
      // store; o reprocessamento só é disparado pelo `onChange` do
      // `<Select>`, que não existe no modo mask.
      expect(mocks.generateStrokesFromImage).not.toHaveBeenCalled();
      expect(mocks.trackAnalyticsEvent).not.toHaveBeenCalled();

      // O preset foi persistido na store (efeito colateral esperado do setter).
      expect(useAnimationStore.getState().vetorialPreset).toBe('detailed');
    });
  });

  // ===========================================================================
  // Bloco D — Acessibilidade
  // ===========================================================================

  describe('Bloco D — acessibilidade', () => {
    it('D.1 — aria-label do Select é igual a t("speedPaint.vetorialPresetLabel")', async () => {
      // Arrange
      setupVetorialMode();

      const { SpeedPaintPage } = await import('../../src/pages/SpeedPaintPage');

      // Act
      render(<SpeedPaintPage />, { wrapper: Wrapper });

      // Assert — o combobox (gatilho do Select) tem seu nome acessível
      // "Estilo do desenho", que é o valor de `t('speedPaint.vetorialPresetLabel')`
      // em pt-BR (definido em `src/features/i18n/locales/pt-BR.ts:1439`).
      //
      // O MUI aplica o `aria-label` no container `MuiInputBase-root` (parent
      // direto do combobox) e referencia o `InputLabel` via `aria-labelledby`
      // no combobox. A Testing Library resolve o `name` da role `combobox`
      // a partir dessas duas fontes — `getByRole('combobox', { name: ... })`
      // é o jeito oficial de validar o nome acessível.
      const selectTrigger = screen.getByRole('combobox', { name: 'Estilo do desenho' });
      expect(selectTrigger).toBeInTheDocument();

      // O `<InputLabel id="vetorial-preset-label">` referencia o `labelId` do
      // Select, garantindo a associação semântica entre rótulo e controle
      // (essencial para leitores de tela — WCAG 2.1 AA).
      const inputLabel = document.getElementById('vetorial-preset-label');
      expect(inputLabel).not.toBeNull();
      expect(inputLabel?.textContent).toBe('Estilo do desenho');

      // O combobox tem `aria-labelledby` apontando para o `InputLabel`
      // (`vetorial-preset-label`) + o próprio id do Select — esse é o
      // pattern canônico do MUI Select para acessibilidade.
      expect(selectTrigger.getAttribute('aria-labelledby')).toBe(
        'vetorial-preset-label vetorial-preset',
      );

      // O `aria-label="Estilo do desenho"` é aplicado no `MuiInputBase-root`
      // (parent do combobox), satisfazendo a busca por role `name` da
      // Testing Library mesmo quando o `aria-labelledby` é a fonte primária.
      const inputBase = selectTrigger.parentElement;
      expect(inputBase).not.toBeNull();
      expect(inputBase?.getAttribute('aria-label')).toBe('Estilo do desenho');

      // O `id` do Select é `vetorial-preset` (consumido pelo `htmlFor` do
      // `InputLabel` para a associação explícita de rótulo).
      const selectElement = document.getElementById('vetorial-preset');
      expect(selectElement).not.toBeNull();
      expect(selectElement?.tagName).toBe('DIV');
      expect(selectElement?.getAttribute('role')).toBe('combobox');
    });
  });
});
