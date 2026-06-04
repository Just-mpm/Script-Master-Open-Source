import React from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Pause from '@mui/icons-material/Pause';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { ICON_SIZE_SM, GAP_COMPACT, GAP_DEFAULT, RADIUS_SM, RADIUS_XS, BRAND_PRIMARY_GLOW_SOFT } from '../theme/tokens';
import type { Voice } from '../lib/types';
import { useLocale } from '../features/i18n';

// ─── Props ────────────────────────────────────────────────────────

export interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  onSelect: (voiceId: string) => void;
  isPlaying: boolean;
  hasError: boolean;
  onPlayPreview: (voiceId: string) => void;
  /** Label para o botao de preview (aria-label e tooltip) */
  previewVoiceLabel: string;
  /** Label para erro de preview */
  previewErrorLabel: string;
  /** Desabilita interacao */
  disabled?: boolean;
}

// ─── Componente ──────────────────────────────────────────────────

export const VoiceCard = React.memo(function VoiceCard({
  voice,
  isSelected,
  onSelect,
  isPlaying,
  hasError,
  onPlayPreview,
  previewVoiceLabel,
  previewErrorLabel,
  disabled = false,
}: VoiceCardProps) {
  const theme = useTheme();
  const { t } = useLocale();

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={(ct: Theme): SystemStyleObject<Theme> => ({
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        borderRadius: RADIUS_SM,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderColor: isSelected ? alpha(ct.palette.primary.main, 0.55) : alpha(ct.palette.common.white, 0.08),
        backgroundColor: isSelected ? alpha(ct.palette.primary.main, 0.12) : alpha(ct.palette.background.default, 0.28),
        boxShadow: isSelected ? `0 0 0 1px ${alpha(ct.palette.primary.main, 0.35)}, 0 18px 45px ${alpha(ct.palette.primary.main, 0.16)}` : 'none',
        transform: 'translateY(0)',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: isSelected ? alpha(ct.palette.primary.main, 0.65) : alpha(ct.palette.common.white, 0.14),
          backgroundColor: isSelected ? alpha(ct.palette.primary.main, 0.16) : alpha(ct.palette.background.default, 0.38),
          boxShadow: isSelected
            ? `0 0 0 1px ${alpha(ct.palette.primary.main, 0.45)}, 0 22px 54px ${alpha(ct.palette.primary.main, 0.22)}`
            : `0 0 0 1px ${alpha(ct.palette.common.white, 0.06)}, 0 8px 24px rgba(0, 0, 0, 0.2)`,
        },
      })}
    >
      <ButtonBase
        onClick={() => onSelect(voice.id)}
        disabled={disabled}
        role="option"
        aria-selected={isSelected}
        sx={{
          width: '100%',
          height: '100%',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          textAlign: 'left',
          px: 1.75,
          py: 1.5,
          pr: 6,
        }}
      >
        <Stack spacing={GAP_COMPACT} sx={{ width: '100%' }}>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" component="p" color={isSelected ? 'primary.main' : 'text.primary'}>
              {voice.name}
            </Typography>
            {isSelected && <CheckCircle sx={{ fontSize: ICON_SIZE_SM, color: theme.palette.primary.main }} aria-hidden="true" />}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t(`common.voiceStyles.${voice.styleKey}`)}
          </Typography>
        </Stack>
      </ButtonBase>

      <Tooltip title={hasError ? previewErrorLabel : previewVoiceLabel }>
        <span>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPreview(voice.id);
            }}
            disabled={disabled}
            aria-label={hasError ? previewErrorLabel : previewVoiceLabel }
            sx={(ct: Theme) => ({
              position: 'absolute',
              right: 8,
              bottom: 8,
              borderRadius: RADIUS_XS,
              border: `1px solid ${hasError ? alpha(ct.palette.error.main, 0.4) : alpha(ct.palette.common.white, 0.08)}`,
              backgroundColor: isPlaying ? ct.palette.primary.main : hasError ? alpha(ct.palette.error.main, 0.12) : alpha(ct.palette.background.paper, 0.6),
              color: isPlaying ? ct.palette.primary.contrastText : hasError ? ct.palette.error.main : ct.palette.text.secondary,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: isPlaying ? ct.palette.primary.dark : hasError ? alpha(ct.palette.error.main, 0.2) : alpha(ct.palette.primary.main, 0.16),
                boxShadow: !isPlaying && !hasError ? `0 6px 20px ${BRAND_PRIMARY_GLOW_SOFT}` : 'none',
              },
            })}
          >
            {isPlaying
              ? <Pause sx={{ fontSize: ICON_SIZE_SM }} />
              : hasError
                ? <ErrorOutlineOutlined sx={{ fontSize: ICON_SIZE_SM }} />
                : <PlayArrow sx={{ fontSize: ICON_SIZE_SM }} />}
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
});
