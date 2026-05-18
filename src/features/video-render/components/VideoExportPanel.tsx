import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Close from '@mui/icons-material/Close';
import VideoFile from '@mui/icons-material/VideoFile';
import WarningAmber from '@mui/icons-material/WarningAmber';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { VideoExportOptions, VideoExporter } from '../hooks/useVideoExporter';
import { getResolutionFromQuality, estimateFileSize, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
import { ExportQualitySelector } from './export/ExportQualitySelector';
import { ExportProgressBar } from './export/ExportProgressBar';
import { ExportResultActions } from './export/ExportResultActions';
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
import type { SceneRatio } from '../../studio/types';
import type { CaptionWord, SubtitleStyle, VideoExportQuality } from '../types';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const QUALITY_OPTIONS: { value: VideoExportQuality; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '1440p', label: '1440p' },
  { value: '4k', label: '4K' },
];

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
  /** ID do projeto para salvar o vídeo */
  projectId?: string;
  /** ID do usuário autenticado */
  userId?: string;
  /** Hook do exportador de vídeo (elevado do App.tsx) */
  exporter: VideoExporter;
  /** Legendas palavra-a-palavra para karaoke */
  captions?: CaptionWord[];
  /** Estilo personalizável das legendas */
  subtitleStyle?: SubtitleStyle;
  /** Incluir legenda no vídeo exportado (default: true) */
  includeSubtitles?: boolean;
  /** Callback quando o toggle de legenda muda */
  onIncludeSubtitlesChange?: (value: boolean) => void;
  /** Duração total em segundos (para estimativa de tamanho) */
  durationInSeconds?: number;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const VideoExportPanel = React.memo(function VideoExportPanel({
  scenes,
  audioUrl,
  fps,
  durationInFrames,
  ratio,
  projectId,
  userId,
  exporter,
  captions,
  subtitleStyle,
  includeSubtitles = true,
  onIncludeSubtitlesChange,
  durationInSeconds,
}: VideoExportPanelProps) {
  // --- State local de opções de exportação (elimina re-renders em cascata no pai) ---
  const [quality, setQuality] = useState<VideoExportQuality>(DEFAULT_EXPORT_QUALITY);
  const [fileName, setFileName] = useState('');
  const [animateScenes, setAnimateScenes] = useState(true);

  const resolution = useMemo(() => getResolutionFromQuality(ratio, quality), [ratio, quality]);
  const checkSupportRef = useRef(exporter.checkSupport);

  // Estimativa de tamanho do arquivo
  const estimatedSizeBytes = useMemo(() => {
    if (durationInSeconds == null || durationInSeconds <= 0) return 0;
    return estimateFileSize(
      durationInSeconds,
      resolution.width,
      resolution.height,
      exporter.resolvedVideoCodec,
    );
  }, [durationInSeconds, resolution.width, resolution.height, exporter.resolvedVideoCodec]);

  // Sincroniza ref com a função estável do hook
  useEffect(() => {
    checkSupportRef.current = exporter.checkSupport;
  }, [exporter.checkSupport]);

  // Verifica suporte do browser ao montar (quando há conteúdo para exportar)
  useEffect(() => {
    if (audioUrl && scenes.length > 0) {
      void checkSupportRef.current(resolution.width, resolution.height);
    }
  }, [audioUrl, scenes.length, resolution.width, resolution.height]);

  // Se não há conteúdo, não renderiza nada
  const hasContent = Boolean(audioUrl && scenes.length > 0);
  const isExportable = hasContent && exporter.canRender === true;
  const hasCaptions = captions != null && captions.length > 0;

  const handleStartExport = () => {
    const options: VideoExportOptions = {
      scenes,
      audioUrl: audioUrl!,
      fps,
      durationInFrames,
      ratio,
      captions: includeSubtitles ? captions : undefined,
      subtitleStyle: includeSubtitles ? subtitleStyle : undefined,
      projectId,
      userId,
      quality,
      fileName: fileName || undefined,
      animateScenes,
      showDrawTool: true,
    };
    void exporter.startRender(options);
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
    setFileName(sanitized);
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            Exportar vídeo
          </Typography>
        </Stack>

        {/* Alerta: navegador não suportado */}
        {exporter.canRender === false && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            sx={{ mb: 2, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
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
            sx={{ mb: 2, borderRadius: 2, bgcolor: ERROR_BG_SUBTLE }}
          >
            {exporter.error}
          </Alert>
        )}

        {/* Alerta: cenas com speed paint que falharam */}
        {exporter.speedPaintWarnings.length > 0 && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            sx={{ mb: 2, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Algumas cenas não puderam ser animadas:
            </Typography>
            <Typography variant="caption" component="ul" sx={{ pl: 2, mt: 0.5 }}>
              {exporter.speedPaintWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </Typography>
          </Alert>
        )}

        {/* Painel de configuração antes de exportar */}
        {!exporter.isRendering && !exporter.outputUrl && (
          <Stack spacing={GAP_MEDIUM}>
            {/* Info de resolução, codec e estimativa */}
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              Resolução: {resolution.width}x{resolution.height} | FPS: {fps} | Codec: {exporter.resolvedVideoCodec.toUpperCase()}
            </Typography>

            {/* Toggle: animar cenas com Speed Paint */}
            <FormControlLabel
              control={
                <Switch
                  checked={animateScenes}
                  onChange={(e) => setAnimateScenes(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Tooltip
                  title="Adiciona animação de pintura a cada cena. Pode aumentar o tempo de exportação consideravelmente."
                  placement="top"
                  arrow
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'help' }}>
                    Animar cenas (Speed Paint)
                  </Typography>
                </Tooltip>
              }
              sx={{ mr: 0 }}
            />

            {/* Seletor de qualidade */}
            <ExportQualitySelector
              quality={quality}
              onQualityChange={setQuality}
              qualities={QUALITY_OPTIONS}
              estimatedSizeBytes={estimatedSizeBytes}
              ariaLabel="Qualidade de exportação"
            />

            {/* Campo de nome do arquivo */}
            <TextField
              label="Nome do arquivo"
              placeholder="video-export"
              variant="outlined"
              size="small"
              value={fileName ?? ''}
              onChange={handleFileNameChange}
              fullWidth
              slotProps={{
                htmlInput: {
                  'aria-label': 'Nome do arquivo de exportação',
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

            {/* Ações: toggle legenda + botão exportar */}
            <Stack
              direction="row"
              spacing={GAP_DEFAULT}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              {hasCaptions && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeSubtitles}
                      onChange={(e) => onIncludeSubtitlesChange?.(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Legenda
                    </Typography>
                  }
                  sx={{ mr: 0 }}
                />
              )}

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
                Exportar {exporter.resolvedContainer.toUpperCase()}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* Barra de progresso durante renderização */}
        {exporter.isRendering && (
          <ExportProgressBar
            progress={exporter.renderProgress}
            statusText={exporter.renderStatusText}
            isRendering={exporter.isRendering}
            onCancel={exporter.handleCancel}
            cancelLabel="Cancelar"
            progressAriaLabel="Progresso da exportação de vídeo"
          />
        )}

        {/* Resultado: exportação concluída */}
        {!exporter.isRendering && exporter.outputUrl && (
          <ExportResultActions
            hasOutput={true}
            container={exporter.resolvedContainer}
            onDownload={exporter.handleDownload}
            onReset={exporter.reset}
            statusText={exporter.renderStatusText}
            blobSizeBytes={exporter.outputBlob?.size}
          />
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
            sx={{ mt: 1.5, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
          >
            {exporter.saveWarning}
          </Alert>
        )}
      </Box>
    </Collapse>
  );
});
