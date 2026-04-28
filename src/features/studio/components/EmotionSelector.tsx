/**
 * Seletor de emoção para TTS — chips de emoção + slider de intensidade.
 * Usado no Inspector na seção de voz.
 */
import React, { useCallback } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import MoodBad from '@mui/icons-material/MoodBad';
import SentimentSatisfied from '@mui/icons-material/SentimentSatisfied';
import { useLocale } from '../../../features/i18n';
import { EMOTION_OPTIONS } from '../types';
import type { EmotionType } from '../types';
import { GAP_COMPACT, GAP_DEFAULT, RADIUS_XS } from '../../../theme/tokens';

interface EmotionSelectorProps {
  value: EmotionType;
  intensity: number;
  onChange: (emotion: EmotionType, intensity: number) => void;
  disabled?: boolean;
}

/** Ícones por emoção — mapeamento simples para SVGs do MUI */
const EMOTION_ICONS: Record<EmotionType, React.ElementType> = {
  neutral: SentimentSatisfied,
  happy: SentimentSatisfied,
  sad: MoodBad,
  angry: MoodBad,
  calm: SentimentSatisfied,
  energetic: SentimentSatisfied,
  dramatic: MoodBad,
  friendly: SentimentSatisfied,
};

export const EmotionSelector = React.memo(function EmotionSelector({
  value,
  intensity,
  onChange,
  disabled = false,
}: EmotionSelectorProps) {
  const theme = useTheme();
  const { t } = useLocale();

  const handleEmotionClick = useCallback(
    (emotion: EmotionType) => {
      // Se clicar na mesma emoção, volta para neutro (toggle)
      const next = value === emotion && emotion !== 'neutral' ? 'neutral' as EmotionType : emotion;
      onChange(next, next === 'neutral' ? 0.5 : intensity);
    },
    [value, intensity, onChange],
  );

  const handleIntensityChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const next = Array.isArray(newValue) ? newValue[0] : newValue;
      onChange(value, next);
    },
    [value, onChange],
  );

  const showIntensity = value !== 'neutral';

  return (
    <Stack spacing={GAP_DEFAULT}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {t('studio.emotion.label')}
      </Typography>

      <Stack
        direction="row"
        spacing={GAP_COMPACT}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
        role="radiogroup"
        aria-label={t('studio.emotion.ariaLabel')}
      >
        {EMOTION_OPTIONS.map((option) => {
          const isActive = value === option.value;
          const Icon = EMOTION_ICONS[option.value];

          return (
            <Chip
              key={option.value}
              icon={<Icon sx={{ fontSize: 14 }} aria-hidden="true" />}
              label={option.label}
              size="small"
              variant={isActive ? 'filled' : 'outlined'}
              color={isActive ? 'primary' : 'default'}
              onClick={() => handleEmotionClick(option.value)}
              disabled={disabled}
              role="radio"
              aria-checked={isActive}
              sx={(currentTheme): SystemStyleObject<Theme> => ({
                borderRadius: RADIUS_XS,
                minHeight: 32,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(isActive
                  ? {
                    borderColor: alpha(currentTheme.palette.primary.main, 0.6),
                    boxShadow: `0 0 0 1px ${alpha(currentTheme.palette.primary.main, 0.3)}`,
                  }
                  : {
                    borderColor: alpha(currentTheme.palette.common.white, 0.08),
                    '&:hover': {
                      borderColor: alpha(currentTheme.palette.common.white, 0.2),
                      backgroundColor: alpha(currentTheme.palette.action.hover, 0.4),
                    },
                  }),
              })}
            />
          );
        })}
      </Stack>

      {showIntensity && (
        <Box sx={{ px: 0.5 }}>
          <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('studio.emotion.intensity')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {(intensity * 100).toFixed(0)}%
            </Typography>
          </Stack>
          <Slider
            value={intensity}
            onChange={handleIntensityChange}
            min={0.1}
            max={1}
            step={0.1}
            disabled={disabled}
            aria-label={t('studio.emotion.intensityAriaLabel')}
            size="small"
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
                transition: 'transform 0.15s ease',
                '&:hover, &.Mui-focusVisible': {
                  transform: 'scale(1.2)',
                },
              },
              '& .MuiSlider-rail': {
                backgroundColor: alpha(theme.palette.common.white, 0.08),
              },
            }}
          />
        </Box>
      )}
    </Stack>
  );
});
