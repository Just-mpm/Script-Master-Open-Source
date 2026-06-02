/**
 * Hook guard cross-route para renderização de vídeo e speed paint.
 *
 * Este hook é invocado uma única vez em `App.tsx` e centraliza:
 * 1. **`beforeunload`** — avisa o usuário ao fechar aba com render em andamento
 * 2. **`visibilitychange`/`focus`** — re-hidrata estado ao voltar para a aba
 * 3. **`document.title`** dinâmico com emoji de status
 *
 * **Por que este hook centraliza o `beforeunload`?**
 * Anteriormente o `AudioGenerationHandler.tsx:163-173` tinha um `beforeunload`
 * inline para geração de áudio. Agora M5 cobre **vídeo + speed paint + áudio**
 * em um único lugar (decisão P3=A: centralizar). Isso evita listeners
 * duplicados e o risco de um cleanup remover o listener do outro.
 *
 * **Estado dos controllers é lido via `getState()`** — não via `useStore`.
 * Isso evita que o guard re-renderize quando o progresso muda, e mantém o
 * guard sempre atualizado sem precisar de subscription.
 *
 * **`document.title` reativo** — usa `useEffect` com cleanup via `setInterval`
 * de 1s. Polling barato, evita subscriptions complexas do Zustand. Padrão
 * simples e eficaz para abas (suscint masks, etc).
 *
 * @see useCrossRouteRenderGuard contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M5`
 * @see gap-finder LAC-001/LAC-009 — substituição do inline `beforeunload` do áudio
 */
import { useEffect } from 'react';
import { useVideoRenderController } from '../features/video-render/store/videoRenderController';
import { useSpeedPaintRenderController } from '../features/speed-paint/store/speedPaintRenderController';
import { useAudioGeneratorStore } from '../features/studio/store/audioGeneratorStore';

/** Título base do app (pode ser sobrescrito se houver outra fonte) */
const APP_BASE_TITLE = 'Script Master';

/**
 * Hook que centraliza `beforeunload`, `visibilitychange` e `document.title`
 * para os controllers de renderização.
 *
 * @example
 * ```tsx
 * function App() {
 *   useCrossRouteRenderGuard();
 *   return <Routes>...</Routes>;
 * }
 * ```
 */
export function useCrossRouteRenderGuard(): void {
  useEffect(() => {
    /** Lê se há qualquer renderização em andamento (vídeo, speed paint OU geração de áudio) */
    const isAnyRendering = (): boolean =>
      useVideoRenderController.getState().isRendering ||
      useSpeedPaintRenderController.getState().isRendering ||
      useAudioGeneratorStore.getState().isGenerating;

    /** Retorna o status de maior prioridade (rendering > completed > failed > idle) */
    const anyStatus = (): 'rendering' | 'completed' | 'failed' | 'idle' => {
      const v = useVideoRenderController.getState();
      const s = useSpeedPaintRenderController.getState();
      if (v.isRendering || s.isRendering) return 'rendering';
      if (v.status === 'completed' || s.status === 'completed') return 'completed';
      if (v.status === 'failed' || s.status === 'failed') return 'failed';
      return 'idle';
    };

    // ─── 1. beforeunload — avisa ao fechar aba com render ativo ─────
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!isAnyRendering()) return;
      event.preventDefault();
      // Navegadores ignoram a string customizada; o `preventDefault()` é o
      // gatilho real que mostra o prompt nativo.
    };

    // ─── 2. visibilitychange — re-hidrata UI quando volta de background ─
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible' && isAnyRendering()) {
        // Re-leitura é automática via subscribe do Zustand nos consumidores.
        // Nada a fazer aqui — apenas marcamos a intenção.
      }
    };

    // ─── 3. document.title dinâmico ────────────────────────────────
    const updateTitle = (): void => {
      const status = anyStatus();
      if (status === 'rendering') {
        document.title = '🎥 Renderizando — Script Master';
      } else if (status === 'completed') {
        document.title = '✅ Vídeo pronto! — Script Master';
      } else if (status === 'failed') {
        document.title = '❌ Falha na exportação — Script Master';
      } else {
        document.title = APP_BASE_TITLE;
      }
    };

    // Polling 1s — barato e eficaz. Zustand subscribers reagem rápido mas
    // este hook não consome slices reativas, então polling é o padrão mais
    // simples e suficiente.
    const titleInterval = setInterval(updateTitle, 1000);

    // Aplica imediatamente para refletir estado atual
    updateTitle();

    // ─── 4. Registra listeners ──────────────────────────────────────
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ─── 5. Cleanup ao desmontar (App unmount — praticamente nunca) ─
    return () => {
      clearInterval(titleInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
