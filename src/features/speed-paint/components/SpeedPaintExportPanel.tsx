/**
 * Painel de exportação dedicado para speed paint.
 * Sem áudio, sem legenda, sem toggle de animação — sempre anima.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Close from '@mui/icons-material/Close';
import VideoFile from '@mui/icons-material/VideoFile';
import WarningAmber from '@mui/icons-material/WarningAmber';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { StrokeAnimation } from '../types';
import type { VideoExportQuality } from '../../video-render/types';
import { estimateFileSize, DEFAULT_EXPORT_QUALITY } from '../../video-render/lib/videoUtils';
import { ExportQualitySelector } from '../../video-render/components/export/ExportQualitySelector';
import { ExportProgressBar } from '../../video-render/components/export/ExportProgressBar';
import { ExportResultActions } from '../../video-render/components/export/ExportResultActions';
import type { SpeedPaintExporter, SpeedPaintExportOptions } from '../hooks/useSpeedPaintExporter';
import { getSpeedPaintResolution } from '../hooks/useSpeedPaintExporter';
import { AnimationDurationSelector } from './AnimationDurationSelector';
import { useLocale } from '../../i18n';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_DEFAULT,
  GAP_MEDIUM,
  ICON_SIZE_MD,
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  WHITE_14,
  WARNING_BG_SUBTLE,
  ERROR_BG_SUBTLE,
} from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Opções de qualidade para speed paint (sem 4K — single image não justifica) */
const SPEED_PAINT_QUALITY_OPTIONS: { value: VideoExportQuality; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
];

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SpeedPaintExportPanelProps {
  /** Dados da animação de speed paint */
  animation: StrokeAnimation;
  /** URL da imagem de origem */
  imageSource: string;
  /** Duração escolhida para a animação (em segundos) */
  animationDuration: number;
  /** Callback quando a duração muda */
  onAnimationDurationChange: (duration: 10 | 15 | 30 | 60) => void;
  /** Se deve exibir o lápis/pincel animado */
  showDrawTool: boolean;
  /** FPS da animação (default: animation.fps) */
  fps?: number;
  /** Hook do exportador de speed paint (elevado do componente pai) */
  exporter: SpeedPaintExporter;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const SpeedPaintExportPanel = React.memo(function SpeedPaintExportPanel({
  animation,
  imageSource,
  animationDuration,
  onAnimationDurationChange,
  showDrawTool,
  fps: fpsProp,
  exporter,
}: SpeedPaintExportPanelProps) {
  // --- State local de opções de exportação ---
  const [quality, setQuality] = useState<VideoExportQuality>(DEFAULT_EXPORT_QUALITY);
  const [fileName, setFileName] = useState('');
  const { t } = useLocale();

  const resolvedFps = fpsProp ?? animation.fps;
  const resolution = useMemo(
    () => getSpeedPaintResolution(animation.canvasWidth, animation.canvasHeight, quality),
    [animation.canvasWidth, animation.canvasHeight, quality],
  );
  const checkSupportRef = useRef(exporter.checkSupport);

  // Estimativa de tamanho do arquivo (sem áudio — bitrate menor)
  const estimatedSizeBytes = useMemo(() => {
    if (animationDuration <= 0) return 0;
    const bytes = estimateFileSize(
      animationDuration,
      resolution.width,
      resolution.height,
      exporter.resolvedVideoCodec,
    );
    // Speed paint sem áudio: reduz estimativa em ~20%
    return Math.round(bytes * 0.8);
  }, [animationDuration, resolution.width, resolution.height, exporter.resolvedVideoCodec]);

  // Sincroniza ref com a função estável do hook
  useEffect(() => {
    checkSupportRef.current = exporter.checkSupport;
  }, [exporter.checkSupport]);

  // Verifica suporte do browser ao montar
  useEffect(() => {
    void checkSupportRef.current(resolution.width, resolution.height);
  }, [resolution.width, resolution.height]);

  const isExportable = Boolean(imageSource) && exporter.canRender === true;

  const handleStartExport = () => {
    // Duração consistente com o preview (animationDuration × FPS)
    // — NÃO usar animation.totalFrames (contagem de strokes, não frames de vídeo)
    const exportDurationInFrames = Math.max(1, Math.round(animationDuration * resolvedFps));
    const options: SpeedPaintExportOptions = {
      animation,
      imageSource,
      fps: resolvedFps,
      durationInFrames: exportDurationInFrames,
      quality,
      showDrawTool,
      fileName: fileName || undefined,
    };
    void exporter.startRender(options);
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
    setFileName(sanitized);
  };

  return (
    <Box
      id="speed-paint-export-panel"
      sx={(theme): SystemStyleObject<Theme> => ({
        ...glassSurfaceSx(theme),
        p: { xs: 2.5, md: 3 },
        borderRadius: { xs: 3, md: 4 },
      })}
    >
      {/* Cabeçalho */}
      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', mb: exporter.isRendering || exporter.outputUrl ? 2 : 0 }}>
        <VideoFile sx={{ fontSize: 22, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('speedPaint.exportTitle')}
        </Typography>
      </Stack>

      {/* Alerta: navegador não suportado */}
      {exporter.canRender === false && (
        <Alert
          severity="warning"
          icon={<WarningAmber sx={{ fontSize: 20 }} />}
          sx={{ mb: 2, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
        >
          {exporter.error || t('speedPaint.exportBrowserWarning')}
        </Alert>
      )}

      {/* Alerta: erro de renderização */}
      {exporter.error && exporter.canRender !== false && (
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={exporter.reset} aria-label={t('speedPaint.exportDismissError')}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          }
          sx={{ mb: 2, borderRadius: 2, bgcolor: ERROR_BG_SUBTLE }}
        >
          {exporter.error}
        </Alert>
      )}

      {/* Painel de configuração antes de exportar */}
      {!exporter.isRendering && !exporter.outputUrl && (
        <Stack spacing={GAP_MEDIUM}>
          {/* Info de resolução + estimativa */}
           <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
             {t('speedPaint.exportInfo', { width: resolution.width, height: resolution.height, fps: resolvedFps })}
           </Typography>

          {/* Aviso: browser sem suporte a HTML-in-canvas para Speed Paint */}
          {!exporter.supportsHtmlInCanvas && (
            <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
              <Typography variant="caption" sx={{ lineHeight: 1.6 }}>
                {t('speedPaint.htmlInCanvasWarning')}
              </Typography>
            </Alert>
          )}

          <AnimationDurationSelector
            duration={animationDuration}
            onDurationChange={onAnimationDurationChange}
            helperText={t('speedPaint.durationExportHelper')}
          />

          {/* Seletor de qualidade (sem 4K) */}
          <ExportQualitySelector
            quality={quality}
            onQualityChange={setQuality}
            qualities={SPEED_PAINT_QUALITY_OPTIONS}
            estimatedSizeBytes={estimatedSizeBytes}
            ariaLabel={t('speedPaint.exportQualityAria')}
          />

          {/* Campo de nome do arquivo */}
          <TextField
            label={t('speedPaint.exportFileName')}
            placeholder={t('speedPaint.fileNamePlaceholder')}
            variant="outlined"
            size="small"
            value={fileName ?? ''}
            onChange={handleFileNameChange}
            fullWidth
            slotProps={{
              htmlInput: {
                'aria-label': t('speedPaint.exportFileNameAria'),
                maxLength: 100,
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: BRAND_PRIMARY_LIGHT,
                  boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: WHITE_14,
                },
              },
              '& .MuiInputLabel-root': {
                '&.Mui-focused': {
                  color: BRAND_PRIMARY_LIGHT,
                },
              },
            }}
          />

          {/* Botão exportar */}
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
                '&:active': { transform: 'scale(0.97)' },
              } : {}),
            }}
          >
            {t('speedPaint.exportButton')} vídeo
          </Button>
        </Stack>
      )}

      {/* Barra de progresso durante renderização */}
      {exporter.isRendering && (
        <ExportProgressBar
          progress={exporter.renderProgress}
          statusText={exporter.renderStatusText}
          isRendering={exporter.isRendering}
          onCancel={exporter.handleCancel}
          cancelLabel={t('speedPaint.exportCancel')}
          progressAriaLabel={t('speedPaint.exportProgressAria')}
        />
      )}

      {/* Resultado: exportação concluída */}
      {!exporter.isRendering && exporter.outputUrl && (
        <ExportResultActions
          hasOutput={true}
          onDownload={exporter.handleDownload}
          onReset={exporter.reset}
          statusText={exporter.renderStatusText}
          blobSizeBytes={exporter.outputBlob?.size}
          labelRetry={t('speedPaint.exportAgain')}
          labelClear={t('speedPaint.exportClear')}
          labelDownload={t('speedPaint.exportDownload')}
        />
      )}
    </Box>
  );
});
