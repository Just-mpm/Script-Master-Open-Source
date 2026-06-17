import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { alpha } from '@mui/material/styles';
import Close from '@mui/icons-material/Close';
import VideoFile from '@mui/icons-material/VideoFile';
import WarningAmber from '@mui/icons-material/WarningAmber';
import FormatPaintOutlined from '@mui/icons-material/FormatPaintOutlined';
import GestureOutlined from '@mui/icons-material/GestureOutlined';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import type { VideoExportOptions, VideoExporter } from '../hooks/useVideoExporter';
import { getResolutionFromQuality, estimateFileSize, DEFAULT_EXPORT_QUALITY } from '../lib/videoUtils';
import { ExportQualitySelector } from './export/ExportQualitySelector';
import { ExportProgressBar } from './export/ExportProgressBar';
import { ExportResultActions } from './export/ExportResultActions';
import { glassSurfaceSx } from '../../../theme/surfaces';
import {
  GAP_COMPACT,
  GAP_DEFAULT,
  GAP_MEDIUM,
  ICON_SIZE_MD,
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_GLOW,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  WHITE_14,
  WARNING_BG_SUBTLE,
  ERROR_BG_SUBTLE, RADIUS_XS } from '../../../theme/tokens';
import type { SceneRatio } from '../../studio/types';
import type { CaptionWord, SubtitleStyle, VideoExportQuality } from '../types';
import type { SpeedPaintRenderMode } from '../../speed-paint/types/vetorial';
import { useLocale } from '../../i18n';
import { StackedHeader } from '../../../components/ui';
import { useVideoRenderBridge } from '../store/videoRenderBridge';

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
  /** Animar cenas com Speed Paint — controlado pela VideoPage (preview + exportação) */
  animateScenes?: boolean;
  /** Callback quando o toggle de speed paint muda */
  onAnimateScenesChange?: (value: boolean) => void;
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
  animateScenes: animateScenesProp = true,
  onAnimateScenesChange,
}: VideoExportPanelProps) {
  const { t } = useLocale();

  // --- Bridge store: modo de renderização (L7 — RF-06) ---
  // `renderMode` é override local da VideoPage (sincronizado da
  // `useAnimationStore` no mount via `useEffect` na VideoPage). A escrita
  // é feita pela action `syncRenderMode(mode, preset)` que atualiza o
  // bridge sem propagar para a `SpeedPaintPage` (escopo de sessão).
  // Seletores primitivos evitam re-render em cascata durante progresso.
  const renderMode = useVideoRenderBridge((s) => s.renderMode);
  const vetorialPreset = useVideoRenderBridge((s) => s.vetorialPreset);

  // Handler do ToggleButtonGroup. `null` indica que o usuário clicou no
  // botão já ativo (MUI ToggleButton deseleciona ao re-clicar). Ignoramos
  // para não desabilitar o toggle por acidente. Preserva o `vetorialPreset`
  // vigente (não troca junto — preset tem UI dedicada em L4).
  const handleRenderModeChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, next: SpeedPaintRenderMode | null) => {
      if (next == null) return;
      useVideoRenderBridge.getState().syncRenderMode(next, vetorialPreset);
    },
    [vetorialPreset],
  );

  // --- State local de opções de exportação (elimina re-renders em cascata no pai) ---
  const [quality, setQuality] = useState<VideoExportQuality>(DEFAULT_EXPORT_QUALITY);
  const [fileName, setFileName] = useState('');

  // Speed paint: prop controlada pela VideoPage (compartilhado com preview)
  const animateScenes = animateScenesProp;
  const setAnimateScenes = onAnimateScenesChange ?? (() => {});

  const resolution = useMemo(() => getResolutionFromQuality(ratio, quality), [ratio, quality]);
  const checkSupportRef = useRef(exporter.checkSupport);
  const isDurationReady = durationInFrames > 0;
  const durationPendingMessage = 'Aguardando a duração do áudio para liberar a exportação do vídeo.';

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
  const isExportable = hasContent && isDurationReady && exporter.canRender === true;
  const hasCaptions = captions != null && captions.length > 0;

  const handleStartExport = () => {
    if (!isDurationReady) return;

    // L7 (RF-06): propaga o `renderMode`/`vetorialPreset` vigentes na bridge
    // para o pipeline. Lê o estado atual do bridge (não o capturado em
    // render) para evitar closure stale quando o usuário troca o modo
    // entre o clique no botão e o dispatch.
    const bridgeState = useVideoRenderBridge.getState();
    const activeRenderMode: SpeedPaintRenderMode = bridgeState.renderMode;
    const activeVetorialPreset = bridgeState.vetorialPreset;

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
      renderMode: activeRenderMode,
      vetorialPreset: activeVetorialPreset,
    };
    void exporter.startRender(options);
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
    setFileName(sanitized);
  };

  if (!hasContent) {
    return null;
  }

  return (
    <StackedHeader
      id="video-export-panel"
      variant="glass"
      icon={<VideoFile sx={{ fontSize: 22, color: 'primary.main' }} />}
      title={t('video.exportButton')}
      titleVariant="subtitle2"
      density="compact"
      sx={(theme): SystemStyleObject<Theme> => ({
        ...glassSurfaceSx(theme),
        borderRadius: { xs: 3, md: 4 },
      })}
    >
      <Box>

        {/* Alerta: navegador não suportado */}
        {exporter.canRender === false && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            sx={{ mb: 2, borderRadius: RADIUS_XS, bgcolor: WARNING_BG_SUBTLE }}
          >
            {exporter.error || t('video.exportNotSupported')}
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
            sx={{ mb: 2, borderRadius: RADIUS_XS, bgcolor: ERROR_BG_SUBTLE }}
          >
            {exporter.error}
          </Alert>
        )}

        {hasContent && !isDurationReady && (
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: RADIUS_XS }}
          >
            {durationPendingMessage}
          </Alert>
        )}

        {/* Alerta: cenas com speed paint que falharam */}
        {exporter.speedPaintWarnings.length > 0 && (
          <Alert
            severity="warning"
            icon={<WarningAmber sx={{ fontSize: 20 }} />}
            sx={{ mb: 2, borderRadius: RADIUS_XS, bgcolor: WARNING_BG_SUBTLE }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('video.speedPaintWarningsTitle')}
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
              {t('video.exportInfo', { width: resolution.width, height: resolution.height, fps })}
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
                  title={t('video.animateScenesTooltip')}
                  placement="top"
                  arrow
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'help' }}>
                    {t('video.animateScenesLabel')}
                  </Typography>
                </Tooltip>
              }
              sx={{ mr: 0 }}
            />

            {/* L7 (RF-06): seletor de modo (Clássico | Desenho) — aparece APENAS
                quando a animação com Speed Paint está ligada (CT-F37). Override
                local da sessão — NÃO propaga para a `SpeedPaintPage` (cada rota
                tem contexto próprio). Reutiliza as chaves `speedPaint.*`
                existentes nos 3 locales para evitar duplicação. */}
            {animateScenes === true && (
              <Stack spacing={GAP_COMPACT}>
                <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                  <Typography
                    id="video-export-mode-label"
                    variant="overline"
                    sx={{ fontWeight: 700, letterSpacing: '0.18em', color: 'text.secondary' }}
                  >
                    {t('speedPaint.modeLabel')}
                  </Typography>
                  <Typography
                    id="video-export-mode-description"
                    variant="caption"
                    sx={{ color: 'text.secondary', lineHeight: 1.5 }}
                  >
                    {t('speedPaint.modeDescription')}
                  </Typography>
                </Stack>
                <ToggleButtonGroup
                  value={renderMode}
                  exclusive
                  size="small"
                  onChange={handleRenderModeChange}
                  aria-labelledby="video-export-mode-label"
                  aria-describedby="video-export-mode-description"
                  data-testid="video-export-mode-toggle"
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    '& .MuiToggleButtonGroup-grouped': {
                      borderRadius: RADIUS_XS,
                      border: `1px solid ${WHITE_14}`,
                      px: 1.5,
                      py: 0.75,
                      fontWeight: 700,
                      textTransform: 'none',
                      color: 'text.secondary',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        borderColor: alpha(BRAND_PRIMARY, 0.4),
                        backgroundColor: alpha(BRAND_PRIMARY, 0.04),
                      },
                      '&.Mui-selected': {
                        color: BRAND_PRIMARY_LIGHT,
                        borderColor: alpha(BRAND_PRIMARY, 0.6),
                        backgroundColor: alpha(BRAND_PRIMARY, 0.12),
                        boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}, inset 0 0 0 1px ${alpha(BRAND_PRIMARY, 0.3)}`,
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: alpha(BRAND_PRIMARY, 0.18),
                        borderColor: BRAND_PRIMARY,
                      },
                      '&.Mui-focusVisible': {
                        outline: `2px solid ${BRAND_PRIMARY_LIGHT}`,
                        outlineOffset: 2,
                      },
                    },
                  }}
                >
                  <Tooltip
                    title={t('speedPaint.modeClassicTooltip')}
                    describeChild
                    placement="top"
                    arrow
                  >
                    <ToggleButton
                      value="mask"
                      aria-label={t('speedPaint.modeClassic')}
                      data-testid="video-export-mode-mask"
                    >
                      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                        <FormatPaintOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                        <span>{t('speedPaint.modeClassic')}</span>
                      </Stack>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip
                    title={t('speedPaint.modeVetorialTooltip')}
                    describeChild
                    placement="top"
                    arrow
                  >
                    <ToggleButton
                      value="vetorial"
                      aria-label={t('speedPaint.modeVetorial')}
                      data-testid="video-export-mode-vetorial"
                    >
                      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                        <GestureOutlined sx={{ fontSize: ICON_SIZE_MD }} />
                        <span>{t('speedPaint.modeVetorial')}</span>
                      </Stack>
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>
              </Stack>
            )}

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
              label={t('video.fileNameLabel')}
              placeholder={t('video.fileNamePlaceholder')}
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
                      {t('video.subtitleLabel')}
                    </Typography>
                  }
                  sx={{ mr: 0 }}
                />
              )}

              <Button
                variant="contained"
                size="small"
                disabled={!isExportable }
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
                {t('video.exportButton')}
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
            cancelLabel={t('common.cancel')}
            progressAriaLabel="Progresso da exportação de vídeo"
          />
        )}

        {/* Resultado: exportação concluída */}
        {!exporter.isRendering && exporter.outputUrl && (
          <ExportResultActions
            hasOutput={true}
            onDownload={exporter.handleDownload}
            onReset={exporter.reset}
            statusText={exporter.renderStatusText}
            blobSizeBytes={exporter.outputBlob?.size }
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
            sx={{ mt: 1.5, borderRadius: RADIUS_XS, bgcolor: WARNING_BG_SUBTLE }}
          >
            {exporter.saveWarning}
          </Alert>
        )}
      </Box>
    </StackedHeader>
  );
});
