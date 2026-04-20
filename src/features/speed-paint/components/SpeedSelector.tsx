import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

type SpeedSelectorVariant = 'inline' | 'panel';

interface SpeedSelectorProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  variant?: SpeedSelectorVariant;
}

/**
 * Seletor de velocidade compartilhado entre AnimationControls e QueueStaging.
 * 'inline' para controles compactos (vertical), 'panel' para a fila (horizontal).
 */
export function SpeedSelector({
  label,
  value,
  onChange,
  disabled,
  variant = 'inline',
}: SpeedSelectorProps) {
  const isInline = variant === 'inline';

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: isInline ? 'flex-end' : 'space-between',
        gap: isInline ? 1 : 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          ...(isInline
            ? { width: 32, textAlign: 'right', display: { xs: 'none', sm: 'block' } }
            : { minWidth: 48 }),
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        role="group"
        aria-label={`Velocidade de ${label.toLowerCase()}, ${value}x selecionado`}
        sx={(theme) => ({
          bgcolor: alpha(theme.palette.background.default, 0.5),
          borderRadius: 1.5,
          p: 0.5,
          border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
        })}
      >
        {SPEEDS.map((s) => (
          <Button
            key={s}
            onClick={() => onChange(s)}
            disabled={disabled}
            aria-pressed={value === s}
            aria-label={`${s}x`}
            sx={(theme) => ({
              minWidth: 'auto',
              px: isInline ? 0.75 : 1,
              py: 0.25,
              fontSize: isInline ? '0.625rem' : '0.75rem',
              fontWeight: 500,
              borderRadius: 1,
              color: value === s ? 'text.primary' : 'text.secondary',
              bgcolor: value === s
                ? alpha(theme.palette.primary.main, 0.15)
                : 'transparent',
              '&:hover': {
                bgcolor: value === s
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.common.white, 0.05),
                color: 'text.primary',
              },
            })}
          >
            {s}x
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
