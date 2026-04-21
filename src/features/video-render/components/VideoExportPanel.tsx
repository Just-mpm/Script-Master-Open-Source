import { useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import Download from '@mui/icons-material/Download';
import VideoFile from '@mui/icons-material/VideoFile';
import WarningAmber from '@mui/icons-material/WarningAmber';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { VideoExportOptions, VideoExporter } from '../hooks/useVideoExporter';
import type { EditingScene } from '../lib/editingPlan';
import { getResolutionFromRatio } from '../lib/videoUtils';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_COMPACT,
  GAP_DEFAULT,
  GAP_MEDIUM,
  RADIUS_CHIP,
  ICON_SIZE_MD,
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  WHITE_08,
  SUCCESS_MAIN,
} from '../../../theme/tokens';
import type { SceneRatio } from '../../studio/types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface VideoExportPanelProps {
  /** Dados necessários para exportar */
  scenes: { imageUrl: string; timestamp: number }[];
  audioUrl: string | null;
  fps: number;
  durationInFrames: number;
  ratio: SceneRatio;
  /** Plano de edição com transições e legendas */
  editingPlan?: EditingScene[];
  /** ID do projeto para salvar o vídeo */
  projectId?: string;
  /** ID do usuário autenticado */
  userId?: string;
  /** Hook do exportador de vídeo (elevado do App.tsx) */
  exporter: VideoExporter;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function VideoExportPanel({
  scenes,
  audioUrl,
  fps,
  durationInFrames,
  ratio,
  editingPlan,
  projectId,
  userId,
  exporter,
}: VideoExportPanelProps) {
  const resolution = useMemo(() => getResolutionFromRatio(ratio), [ratio]);
  const checkSupportRef = useRef(exporter.checkSupport);

  // Sincroniza ref com a função estável do hook
  useEffect(() => {
    checkSupportRef.current = exporter.checkSupport;
  });

  // Verifica suporte do browser ao montar (quando há conteúdo para exportar)
  useEffect(() => {
    if (audioUrl && scenes.length > 0) {
      void checkSupportRef.current(resolution.width, resolution.height);
    }
  }, [audioUrl, scenes.length, resolution.width, resolution.height]);

  // Se não há conteúdo, não renderiza nada
  const hasContent = Boolean(audioUrl && scenes.length > 0);
  const isExportable = hasContent && exporter.canRender === true;

  const handleStartExport = () => {
    const options: VideoExportOptions = {
      scenes,
      audioUrl: audioUrl!,
      fps,
      durationInFrames,
      ratio,
      editingPlan,
      projectId,
      userId,
    };
    void exporter.startRender(options);
  };

  return (
    <Collapse in={hasContent} unmountOnExit>
      <Box
        id="video-export-panel"
        sx={(theme): SystemStyleObject<Theme> => ({
          ...glassSurfaceSx(theme),
          p: { xs: 2.5, md: 3 },
          borderRadius: { xs: 3, md: 4 },
        })}
      >
        {/* Cabeçalho */}
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', mb: exporter.isRendering || exporter.outputUrl ? 2 : 0 }}>
          <VideoFile sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Exportar vídeo
          </Typography>
        </Stack>

        {/* Alerta: navegador não suportado */}
        {exporter.canRender === false && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.08)' }}
          >
            {exporter.error || 'Navegador não suporta exportação de vídeo. Use Chrome 94+ ou Firefox 130+.'}
          </Alert>
        )}

        {/* Alerta: erro de renderização */}
        {exporter.error && exporter.canRender !== false && (
          <Alert
            severity="error"
            action={
              <IconButton size="small" onClick={exporter.reset} aria-label="Dispensar erro">
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            }
            sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.08)' }}
          >
            {exporter.error}
          </Alert>
        )}

        {/* Info de resolução e codec */}
        {!exporter.isRendering && !exporter.outputUrl && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: GAP_MEDIUM, sm: GAP_DEFAULT }}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Resolução: {resolution.width}x{resolution.height} | FPS: {fps} | Codec: {exporter.resolvedVideoCodec.toUpperCase()}
            </Typography>

            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                disabled={!isExportable}
                onClick={handleStartExport}
                startIcon={<VideoFile sx={{ fontSize: ICON_SIZE_MD }} />}
                sx={{
                  ...(isExportable ? {
                    background: BRAND_GRADIENT,
                    boxShadow: BRAND_GLOW,
                    '&:hover': { background: BRAND_GRADIENT_HOVER },
                  } : {}),
                }}
              >
                Exportar MP4
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Barra de progresso durante renderização */}
        {exporter.isRendering && (
          <Stack spacing={GAP_MEDIUM} role="status" aria-live="polite">
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }} noWrap>
                {exporter.renderStatusText}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                {exporter.renderProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={exporter.renderProgress}
              aria-label="Progresso da exportação de vídeo"
              sx={{
                height: 8,
                borderRadius: RADIUS_CHIP,
                bgcolor: WHITE_08,
                '& .MuiLinearProgress-bar': {
                  borderRadius: RADIUS_CHIP,
                  background: BRAND_GRADIENT,
                },
              }}
            />
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={exporter.handleCancel}
              sx={{ alignSelf: 'flex-end', mt: 0.5 }}
            >
              Cancelar
            </Button>
          </Stack>
        )}

        {/* Resultado: exportação concluída */}
        {!exporter.isRendering && exporter.outputUrl && (
          <Stack
            direction="row"
            spacing={GAP_DEFAULT}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
              <CheckCircle sx={{ fontSize: 20, color: SUCCESS_MAIN }} />
              <Typography variant="body2" sx={{ color: SUCCESS_MAIN, fontWeight: 600 }}>
                {exporter.renderStatusText}
              </Typography>
              {exporter.outputBlob && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ({(exporter.outputBlob.size / (1024 * 1024)).toFixed(1)} MB)
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={GAP_DEFAULT}>
              <Button
                variant="text"
                size="small"
                onClick={exporter.reset}
                startIcon={<Close sx={{ fontSize: ICON_SIZE_MD }} />}
              >
                Limpar
              </Button>
              <Tooltip title="Baixar MP4">
                <Button
                  variant="contained"
                  size="small"
                  onClick={exporter.handleDownload}
                  startIcon={<Download sx={{ fontSize: ICON_SIZE_MD }} />}
                  sx={{
                    background: BRAND_GRADIENT,
                    boxShadow: BRAND_GLOW,
                    '&:hover': { background: BRAND_GRADIENT_HOVER },
                  }}
                >
                  Baixar MP4
                </Button>
              </Tooltip>
            </Stack>
          </Stack>
        )}

        {/* Aviso: salvamento no projeto falhou */}
        {exporter.saveWarning && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            action={
              <IconButton size="small" onClick={exporter.dismissSaveWarning} aria-label="Dispensar aviso">
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            }
            sx={{ mt: 1.5, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.08)' }}
          >
            {exporter.saveWarning}
          </Alert>
        )}
      </Box>
    </Collapse>
  );
}
