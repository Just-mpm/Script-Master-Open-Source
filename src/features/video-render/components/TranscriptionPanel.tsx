import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ClosedCaption from '@mui/icons-material/ClosedCaption';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Refresh from '@mui/icons-material/Refresh';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
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

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

import type { CaptionSource } from '../types';

interface TranscriptionPanelProps {
  /** URL do áudio — null desabilita o botão */
  audioUrl: string | null;
  /** Roteiro completo — necessário para fallback proporcional */
  script: string;
  /** Cenas com timestamps — necessário para segmentação */
  scenes: { timestamp: number; prompt?: string; imageUrl: string }[];
  /** Duração total em frames */
  durationInFrames: number;
  /** Frames por segundo */
  fps: number;
  /** Fonte da transcrição (null se ainda não transcreveu) */
  transcriptionSource: CaptionSource | null;
  /** Se está transcrevendo */
  isTranscribing: boolean;
  /** Progresso da transcrição (0-100) */
  transcriptionProgress: number;
  /** Texto descritivo do status */
  transcriptionStatusText: string;
  /** Erro da transcrição (null se não houver) */
  transcriptionError: string | null;
  /** Se o Whisper é suportado no browser */
  whisperSupported: boolean | null;
  /** Número de palavras capturadas */
  captionCount: number;
  /** Se o roteiro mudou desde a última geração de legendas */
  isStale?: boolean;
  /** Callback para iniciar transcrição */
  onTranscribe: () => void;
  /** Callback para cancelar transcrição */
  onCancel: () => void;
  /** Callback para limpar transcrição */
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const TranscriptionPanel = React.memo(function TranscriptionPanel({
  audioUrl,
  scenes,
  transcriptionSource,
  isTranscribing,
  transcriptionProgress,
  transcriptionStatusText,
  transcriptionError,
  whisperSupported,
  captionCount,
  isStale,
  onTranscribe,
  onCancel,
  onClear,
}: TranscriptionPanelProps) {
  // Só aparece quando há áudio e cenas para gerar legendas
  const hasContent = Boolean(audioUrl && scenes.length > 0);
  const canTranscribe = hasContent && !isTranscribing;

  // Indica se já temos uma transcrição concluída
  const hasCaptions = captionCount > 0 && !isTranscribing;

  // Indica se há erro ativo (não transcrevendo e erro presente)
  const hasError = Boolean(transcriptionError) && !isTranscribing;

  // Rótulo da fonte de transcrição para exibição
  const sourceLabel =
    transcriptionSource === 'segment-timing'
      ? 'Timing TTS'
      : transcriptionSource === 'whisper-aligned'
        ? 'Whisper Alinhado'
        : transcriptionSource === 'proportional'
          ? 'Proporcional'
          : transcriptionSource === 'manual'
            ? 'Manual'
            : null;

  return (
    <Collapse in={hasContent} unmountOnExit>
      <Box
        id="transcription-panel"
        sx={(theme): SystemStyleObject<Theme> => ({
          ...glassSurfaceSx(theme),
          p: { xs: 2.5, md: 3 },
          borderRadius: { xs: 3, md: 4 },
        })}
      >
        {/* Cabeçalho */}
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', mb: 2 }}>
          <ClosedCaption sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Legendas
          </Typography>
        </Stack>

        {/* ── Estado: sucesso (legendas geradas) ── */}
        {hasCaptions && (
          <>
            {/* Alerta de staleness: roteiro foi editado após geração */}
            {isStale && (
              <Alert
                severity="warning"
                icon={<WarningAmber sx={{ fontSize: 20 }} />}
                sx={{ mb: 1, borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
              >
                O roteiro foi editado desde a última geração de legendas. As legendas podem estar desalinhadas.
              </Alert>
            )}

            <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: GAP_MEDIUM, sm: GAP_DEFAULT }}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
              <CheckCircle sx={{ fontSize: 20, color: SUCCESS_MAIN }} />
              <Typography variant="body2" sx={{ color: SUCCESS_MAIN, fontWeight: 600 }}>
                {captionCount} palavras transcritas
              </Typography>
              {sourceLabel && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  ({sourceLabel})
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={GAP_DEFAULT}>
              <Button
                variant="text"
                size="small"
                onClick={onClear}
                startIcon={<DeleteOutline sx={{ fontSize: ICON_SIZE_MD }} />}
              >
                Limpar
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={onTranscribe}
                startIcon={<Refresh sx={{ fontSize: ICON_SIZE_MD }} />}
                sx={{
                  background: BRAND_GRADIENT,
                  boxShadow: BRAND_GLOW,
                  '&:hover': { background: BRAND_GRADIENT_HOVER },
                }}
              >
                Gerar novamente
              </Button>
            </Stack>
          </Stack>
          </>
        )}

        {/* ── Estado: transcrevendo ── */}
        {isTranscribing && (
          <Stack spacing={GAP_MEDIUM} role="status" aria-live="polite">
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }} noWrap>
                {transcriptionStatusText}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'JetBrains Mono, monospace' }}>
                {Math.round(transcriptionProgress)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={transcriptionProgress}
              aria-label="Progresso da transcrição"
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
              onClick={onCancel}
              startIcon={<StopCircleOutlined sx={{ fontSize: ICON_SIZE_MD }} />}
              sx={{ alignSelf: 'flex-end', mt: 0.5 }}
            >
              Cancelar
            </Button>
          </Stack>
        )}

        {/* ── Estado: erro ── */}
        {hasError && transcriptionError && (
          <Stack spacing={GAP_DEFAULT}>
            <Alert
              severity="error"
              sx={{ mb: 0, borderRadius: 2, bgcolor: ERROR_BG_SUBTLE }}
            >
              {transcriptionError}
            </Alert>
            <Button
              variant="contained"
              size="small"
              onClick={onTranscribe}
              startIcon={<Refresh sx={{ fontSize: ICON_SIZE_MD }} />}
              sx={{
                background: BRAND_GRADIENT,
                boxShadow: BRAND_GLOW,
                '&:hover': { background: BRAND_GRADIENT_HOVER },
              }}
            >
              Tentar novamente
            </Button>
          </Stack>
        )}

        {/* ── Estado: idle (sem legendas, sem erro, sem transcrição) ── */}
        {!hasCaptions && !isTranscribing && !hasError && (
          <Stack spacing={GAP_DEFAULT}>
            {/* Aviso: Whisper não suportado — usa fallback proporcional */}
            {whisperSupported === false && (
              <Alert
                severity="warning"
                icon={<WarningAmber sx={{ fontSize: 20 }} />}
                sx={{ borderRadius: 2, bgcolor: WARNING_BG_SUBTLE }}
              >
                Seu navegador não suporta Whisper. As legendas serão geradas por distribuição proporcional (menos precisas).
              </Alert>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: GAP_MEDIUM, sm: GAP_DEFAULT }}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {whisperSupported
                  ? 'Transcreve o áudio com Whisper para legendas palavra-a-palavra sincronizadas.'
                  : 'Distribui o roteiro proporcionalmente pelo tempo de áudio.'}
              </Typography>

              <Button
                variant="contained"
                size="small"
                disabled={!canTranscribe}
                onClick={onTranscribe}
                startIcon={<ClosedCaption sx={{ fontSize: ICON_SIZE_MD }} />}
                sx={{
                  ...(canTranscribe ? {
                    background: BRAND_GRADIENT,
                    boxShadow: BRAND_GLOW,
                    '&:hover': { background: BRAND_GRADIENT_HOVER },
                  } : {}),
                }}
              >
                Gerar legendas sincronizadas
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Collapse>
  );
});
