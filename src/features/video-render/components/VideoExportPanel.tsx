import { useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import Download from '@mui/icons-material/Download';
import Replay from '@mui/icons-material/Replay';
import VideoFile from '@mui/icons-material/VideoFile';
import WarningAmber from '@mui/icons-material/WarningAmber';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { VideoExportOptions, VideoExporter } from '../hooks/useVideoExporter';
import { getResolutionFromQuality, estimateFileSize, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
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

/**
 * Formata bytes em string legível (KB / MB / GB).
 * Retorna `null` para valores não positivos.
 */
function formatFileSize(bytes: number): string | null {
  if (bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

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
  /** Qualidade selecionada para exportação */
  quality?: VideoExportQuality;
  /** Callback quando qualidade muda */
  onQualityChange?: (quality: VideoExportQuality) => void;
  /** Duração total em segundos (para estimativa de tamanho) */
  durationInSeconds?: number;
  /** Nome do arquivo customizado */
  fileName?: string;
  /** Callback quando nome do arquivo muda */
  onFileNameChange?: (name: string) => void;
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
  projectId,
  userId,
  exporter,
  captions,
  subtitleStyle,
  includeSubtitles = true,
  onIncludeSubtitlesChange,
  quality = DEFAULT_EXPORT_QUALITY,
  onQualityChange,
  durationInSeconds,
  fileName,
  onFileNameChange,
}: VideoExportPanelProps) {
  const resolution = useMemo(() => getResolutionFromQuality(ratio, quality), [ratio, quality]);
  const checkSupportRef = useRef(exporter.checkSupport);

  // Estimativa de tamanho do arquivo
  const estimatedSize = useMemo(() => {
    if (durationInSeconds == null || durationInSeconds <= 0) return null;
    const bytes = estimateFileSize(
      durationInSeconds,
      resolution.width,
      resolution.height,
      exporter.resolvedVideoCodec,
    );
    return formatFileSize(bytes);
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
    };
    void exporter.startRender(options);
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
    onFileNameChange?.(sanitized);
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

        {/* Painel de configuração antes de exportar */}
        {!exporter.isRendering && !exporter.outputUrl && (
          <Stack spacing={GAP_MEDIUM}>
            {/* Info de resolução, codec e estimativa */}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Resolução: {resolution.width}x{resolution.height} | FPS: {fps} | Codec: {exporter.resolvedVideoCodec.toUpperCase()}{estimatedSize ? ` | ~${estimatedSize}` : ''}
            </Typography>

            {/* Seletor de qualidade */}
            <ToggleButtonGroup
              value={quality}
              exclusive
              onChange={(_, value: VideoExportQuality | null) => {
                if (value) onQualityChange?.(value);
              }}
              size="small"
              aria-label="Qualidade de exportação"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.4,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    background: BRAND_GRADIENT,
                    color: '#fff',
                    borderColor: 'transparent',
                    boxShadow: BRAND_GLOW,
                    '&:hover': { background: BRAND_GRADIENT_HOVER },
                  },
                },
              }}
            >
              {QUALITY_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

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
                variant="outlined"
                size="small"
                onClick={exporter.reset}
                startIcon={<Replay sx={{ fontSize: ICON_SIZE_MD }} />}
              >
                Exportar novamente
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={exporter.reset}
                startIcon={<Close sx={{ fontSize: ICON_SIZE_MD }} />}
              >
                Limpar
              </Button>
              <Tooltip title={`Baixar ${exporter.resolvedContainer.toUpperCase()}`}>
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
                  Baixar {exporter.resolvedContainer.toUpperCase()}
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
            sx={{ mt: 1.5, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
          >
            {exporter.saveWarning}
          </Alert>
        )}
      </Box>
    </Collapse>
  );
}
