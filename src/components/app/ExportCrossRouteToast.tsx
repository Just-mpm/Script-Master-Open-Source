/**
 * Snackbar MUI global para progresso de exportação cross-route.
 *
 * Este componente vive no `App.tsx` (sempre montado) e mostra o status
 * de renderização em qualquer rota **exceto** `/app/video` e
 * `/app/pintura-rapida` (lá o painel de exportação já mostra tudo).
 *
 * **Estados:**
 * - `rendering` — spinner + progresso inteiro + botões "Ver Vídeo" / "Cancelar"
 * - `completed` — ícone verde + "Vídeo pronto!" + "Ver Vídeo" / "Baixar" / "Fechar"
 * - `failed` — ícone vermelho + mensagem de erro + "Ver detalhes" / "Fechar"
 * - `idle` — não aparece
 *
 * **Posicionamento:** top-center (consistente com o `<Toaster>` do react-hot-toast
 * no `App.tsx:160-179`).
 *
 * **Não-auto-dismiss:** o usuário decide quando fechar (clicar "Fechar" ou
 * aguardar ação automática após "Baixar").
 *
 * **Acessibilidade:** `role="alert"` para leitores de tela anunciarem o
 * progresso. `aria-live="polite"` herdado do `Alert` MUI.
 *
 * @see useCrossRouteRenderGuard contract — `docs/plan/video-render-survive-navigation-architecture.md §3 M6`
 * @see gap-finder LAC-006 — substitui o Snackbar antigo em `ToastProvider.tsx:52-94`
 */
import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from 'zustand';
import type { SxProps, Theme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import type { SnackbarOrigin } from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
import { useVideoRenderController, getCurrentExportFileName } from '../../features/video-render/store/videoRenderController';
import {
  useSpeedPaintRenderController,
  getCurrentExportFileName as getSpeedPaintExportFileName,
} from '../../features/speed-paint/store/speedPaintRenderController';
import { downloadFile } from '../../lib/download';
import { useLocale } from '../../features/i18n';
import { trackAnalyticsEvent } from '../../lib/analytics';

// ---------------------------------------------------------------------------
// Constantes de módulo — evitam recriar objetos a cada render (hot path 30×/s)
// ---------------------------------------------------------------------------

/** Posição fixa do toast — top-center */
const TOAST_ANCHOR_ORIGIN: SnackbarOrigin = { vertical: 'top', horizontal: 'center' };

/** Props de acessibilidade — estáticas */
const TOAST_SLOT_PROPS = { content: { role: 'alert' } } as const;

/** Estilo do Alert — responsivo e fixo */
const ALERT_SX: SxProps<Theme> = { minWidth: { xs: 'min(92vw, 360px)', sm: 420 }, alignItems: 'center' };

/** Estilo da Stack de progresso */
const PROGRESS_STACK_SX: SxProps<Theme> = { alignItems: 'center' };

/** Estilo do Typography de título */
const TITLE_SX: SxProps<Theme> = { fontWeight: 600 };

/** Estilo do Typography de progresso */
const MONO_SX: SxProps<Theme> = { fontFamily: 'JetBrains Mono, monospace' };

type ToastKind = 'rendering' | 'completed' | 'failed' | null;

/**
 * Snackbar global que reflete o estado de renderização em qualquer rota.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <Toaster />
 *       <ExportCrossRouteToast />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export function ExportCrossRouteToast(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();

  // ── 1. Seletores primitivos do controller de vídeo ────────────────
  // Cada `useStore` com seletor primitivo re-renderiza APENAS quando aquela
  // slice muda — evita re-render 30×/s.
  const videoIsRendering = useStore(useVideoRenderController, (s) => s.isRendering);
  const videoStatus = useStore(useVideoRenderController, (s) => s.status);
  const videoProgress = useStore(useVideoRenderController, (s) => s.renderProgress);
  const videoError = useStore(useVideoRenderController, (s) => s.error);
  const videoStatusText = useStore(useVideoRenderController, (s) => s.renderStatusText);

  // ── 2. Seletores primitivos do controller de speed paint ───────────────
  const spIsRendering = useStore(useSpeedPaintRenderController, (s) => s.isRendering);
  const spStatus = useStore(useSpeedPaintRenderController, (s) => s.status);
  const spProgress = useStore(useSpeedPaintRenderController, (s) => s.renderProgress);
  const spError = useStore(useSpeedPaintRenderController, (s) => s.error);
  const spStatusText = useStore(useSpeedPaintRenderController, (s) => s.renderStatusText);

  // ── 3. Determina se deve mostrar ──────────────────────────────────
  // Não aparece em /app/video (lá tem painel próprio) nem em /app/pintura-rapida.
  const isVideoPage = location.pathname === '/app/video';
  const isSpeedPaintPage = location.pathname === '/app/pintura-rapida';

  const isActive = videoIsRendering || spIsRendering;
  const showInThisRoute = isActive && !isVideoPage && !isSpeedPaintPage;

  // ── 4. Determina o "kind" do toast (rendering/completed/failed) ───
  const toastKind: ToastKind = useMemo(() => {
    if (videoIsRendering || spIsRendering) return 'rendering';
    if (videoStatus === 'completed' || spStatus === 'completed') return 'completed';
    if (videoStatus === 'failed' || spStatus === 'failed') return 'failed';
    return null;
  }, [videoIsRendering, spIsRendering, videoStatus, spStatus]);

  // ── 5. Progresso consolidado (vídeo OU speed paint) ───────────────
  const progress = videoIsRendering ? videoProgress : spProgress;

  // ── 6. Handlers — useCallback para estabilizar referências (hot path 30×/s) ──

  const handleViewVideo = useCallback((): void => {
    // Speed paint navega para a própria página; vídeo navega para /app/video
    const target = spIsRendering || spStatus === 'completed' || spStatus === 'failed'
      ? '/app/pintura-rapida'
      : '/app/video';
    navigate(target);
  }, [navigate, spIsRendering, spStatus]);

  const handleCancel = useCallback((): void => {
    if (videoIsRendering) {
      useVideoRenderController.getState().cancelRender();
    } else if (spIsRendering) {
      useSpeedPaintRenderController.getState().cancelRender();
    }
  }, [videoIsRendering, spIsRendering]);

  const handleDownload = useCallback((): void => {
    // Speed paint tem precedência: o usuário está vendo o toast por causa dele
    if (spIsRendering || spStatus === 'completed') {
      const state = useSpeedPaintRenderController.getState();
      const url = state.outputUrl;
      if (!url) return;
      const ext = state.container === 'webm' ? 'webm' : 'mp4';
      const name = getSpeedPaintExportFileName() || `speed-paint-${Date.now()}`;
      void downloadFile(url, `${name}.${ext}`);
      trackAnalyticsEvent('speed_paint_downloaded', {
        codec: state.codec,
        container: state.container,
      });
      // Reset para fechar o toast após download
      state.reset();
      return;
    }
    // Fluxo de vídeo (legado)
    const state = useVideoRenderController.getState();
    const url = state.outputUrl;
    if (!url) return;
    const ext = state.container === 'webm' ? 'webm' : 'mp4';
    const name = getCurrentExportFileName() || `video-export-${Date.now()}`;
    void downloadFile(url, `${name}.${ext}`);
    trackAnalyticsEvent('video_downloaded', {
      codec: state.codec,
      container: state.container,
    });
    // Reset para fechar o toast após download
    state.reset();
  }, [spIsRendering, spStatus]);

  const handleCloseCompleted = useCallback((): void => {
    if (spStatus === 'completed') {
      useSpeedPaintRenderController.getState().reset();
    } else {
      useVideoRenderController.getState().reset();
    }
  }, [spStatus]);

  /**
   * Fecha APENAS o estado de falha (limpa `error` e volta a 'idle' no controller)
   * sem resetar `outputBlob`/`outputUrl` nem revogar blob URLs. Importante:
   * usar `reset()` aqui perderia o erro antes do usuário clicar "Ver detalhes"
   * (decisão documentada em GAP-06 do relatório de auditoria).
   */
  const handleCloseFailed = useCallback((): void => {
    if (spStatus === 'failed') {
      useSpeedPaintRenderController.setState({ status: 'idle', error: null });
    } else {
      useVideoRenderController.setState({ status: 'idle', error: null });
    }
  }, [spStatus]);

  // ── 7. Renderização do Snackbar ───────────────────────────────────
  const isOpen = showInThisRoute || toastKind === 'completed' || toastKind === 'failed';

  return (
    <Snackbar
      open={isOpen}
      anchorOrigin={TOAST_ANCHOR_ORIGIN}
      autoHideDuration={null}
      slotProps={TOAST_SLOT_PROPS}
    >
      <Alert
        severity={
          toastKind === 'failed'
            ? 'error'
            : toastKind === 'completed'
              ? 'success'
              : 'info'
        }
        variant="filled"
        icon={
          toastKind === 'rendering' ? (
            <CircularProgress size={20} color="inherit" />
          ) : toastKind === 'completed' ? (
            <CheckCircle />
          ) : toastKind === 'failed' ? (
            <ErrorOutlined />
          ) : undefined
        }
        sx={ALERT_SX}
        action={
          <Stack direction="row" spacing={1}>
            {toastKind === 'rendering' && (
              <>
                <Button size="small" color="inherit" onClick={handleViewVideo}>
                  {t('exportCrossRoute.actionViewVideo')}
                </Button>
                <Button size="small" color="inherit" onClick={handleCancel}>
                  {t('exportCrossRoute.actionCancel')}
                </Button>
              </>
            )}
            {toastKind === 'completed' && (
              <>
                <Button size="small" color="inherit" onClick={handleViewVideo}>
                  {t('exportCrossRoute.actionViewVideo')}
                </Button>
                <Button size="small" color="inherit" onClick={handleDownload}>
                  {t('exportCrossRoute.actionDownload')}
                </Button>
                <Button size="small" color="inherit" onClick={handleCloseCompleted}>
                  {t('exportCrossRoute.actionClose')}
                </Button>
              </>
            )}
            {toastKind === 'failed' && (
              <>
                <Button size="small" color="inherit" onClick={handleViewVideo}>
                  {t('exportCrossRoute.actionSeeDetails')}
                </Button>
                <Button size="small" color="inherit" onClick={handleCloseFailed}>
                  {t('exportCrossRoute.actionClose')}
                </Button>
              </>
            )}
          </Stack>
        }
      >
        {toastKind === 'rendering' && (
          <Stack direction="row" spacing={1.5} sx={PROGRESS_STACK_SX}>
            <Typography variant="body2" sx={TITLE_SX}>
              {t('exportCrossRoute.renderingTitle')}
            </Typography>
            <Typography
              variant="body2"
              sx={MONO_SX}
            >
              {videoIsRendering
                ? videoStatusText
                : spIsRendering
                  ? spStatusText
                  : `${progress}%`}
            </Typography>
          </Stack>
        )}
        {toastKind === 'completed' && (
          <Typography variant="body2" sx={TITLE_SX}>
            {t('exportCrossRoute.completedTitle')}
          </Typography>
        )}
        {toastKind === 'failed' && (
          <Typography variant="body2" sx={TITLE_SX}>
            {t('exportCrossRoute.failedTitle')}:{' '}
            {(videoStatus === 'failed' ? videoError : spError) ?? t('common.error')}
          </Typography>
        )}
      </Alert>
    </Snackbar>
  );
}
