import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { alpha } from '@mui/material/styles';
import {
  GAP_COMPACT,
  GAP_DEFAULT,
  ICON_SIZE_MD,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_PRIMARY_LIGHT,
  WHITE_14, RADIUS_XS } from '../../../theme/tokens';
import { useLocale } from '../../../features/i18n';

export const SPEED_PAINT_DURATION_OPTIONS = [10, 15, 30, 60] as const;

export type SpeedPaintDurationOption = typeof SPEED_PAINT_DURATION_OPTIONS[number];

interface AnimationDurationSelectorProps {
  duration: number;
  onDurationChange: (duration: SpeedPaintDurationOption) => void;
  helperText?: string;
}

export const AnimationDurationSelector = React.memo(function AnimationDurationSelector({
  duration,
  onDurationChange,
  helperText,
}: AnimationDurationSelectorProps) {
  const { t } = useLocale();
  const handleChange = (_event: React.MouseEvent<HTMLElement>, value: number | null) => {
    if (value == null) return;
    onDurationChange(value as SpeedPaintDurationOption);
  };

  return (
    <Stack spacing={GAP_DEFAULT}>
      <Stack spacing={GAP_COMPACT}>
        <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
          <TimerOutlinedIcon sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.18em' }}>
            {t('speedPaint.durationTitle')}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {helperText ?? t('speedPaint.durationHelper')}
        </Typography>
      </Stack>

      <Box>
        <ToggleButtonGroup
          value={duration}
          exclusive
          onChange={handleChange}
          aria-label={t('speedPaint.durationGroupAria')}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: RADIUS_XS,
              border: `1px solid ${WHITE_14}`,
              px: 1.75,
              py: 0.85,
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-selected': {
                color: BRAND_PRIMARY_LIGHT,
                borderColor: alpha(BRAND_PRIMARY, 0.6),
                backgroundColor: alpha(BRAND_PRIMARY, 0.12),
                boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
              },
              '&.Mui-selected:hover': {
                backgroundColor: alpha(BRAND_PRIMARY, 0.16),
              },
            },
          }}
        >
          {SPEED_PAINT_DURATION_OPTIONS.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              aria-label={t('speedPaint.durationOptionAria', { seconds: option })}
            >
              {option}s
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Stack>
  );
});
