/**
 * Tooltip/Popper ancorado para cada passo do tour de onboarding.
 *
 * Usa Popper do MUI para posicionar o card sem bloquear scroll.
 * Passos sem targetId são exibidos centralizados via Box fixo.
 */

import { useEffect, useMemo, useState } from 'react';
import type { OnboardingStep, TooltipPlacement } from '../types';
import Popper from '@mui/material/Popper';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { useLocale } from '../../../features/i18n';
import { glassPanelSx } from '../../../theme/surfaces';
import { BRAND_GRADIENT, WHITE_08, BRAND_PRIMARY_GLOW } from '../../../theme/tokens';

interface TourTooltipProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onAction?: () => void;
}

/** Indicador de progresso textual: "Passo 2 de 5" */
function StepIndicator({ current, total, label }: { current: number; total: number; label: string }) {
  const progress = ((current + 1) / total) * 100;

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 3,
          borderRadius: 2,
          backgroundColor: WHITE_08,
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            background: BRAND_GRADIENT,
          },
        }}
      />
    </Stack>
  );
}

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onAction,
}: TourTooltipProps) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const hasTarget = step.targetId !== undefined;

  // Resolve o elemento DOM alvo quando o passo tem targetId
  useEffect(() => {
    if (!step.targetId) {
      setAnchorEl(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    setAnchorEl(el);
  }, [step.targetId]);

  // Rolar o elemento alvo para a viewport quando ancorado
  useEffect(() => {
    if (anchorEl) {
      anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [anchorEl]);

  const placement = useMemo(
    (): TooltipPlacement => step.placement ?? 'bottom',
    [step.placement],
  );

  /** Indicador de progresso textual: "Passo 2 de 5" */
  const stepLabel = t('onboarding.tooltip.stepOf', { current: stepIndex + 1, total: totalSteps });

  const tooltipContent = (
    <Paper
      elevation={12}
      sx={(theme) => ({
        ...glassPanelSx(theme),
        p: 2.5,
        minWidth: { xs: 260, sm: 320 },
        maxWidth: { xs: 'calc(100vw - 2rem)', sm: 400 },
        boxShadow: `0 24px 80px rgba(2, 6, 23, 0.6), ${BRAND_PRIMARY_GLOW}`,
        zIndex: 13000,
      })}
    >
      <Stack spacing={2}>
        {/* Cabeçalho: indicador + botão fechar */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <StepIndicator current={stepIndex} total={totalSteps} label={stepLabel} />
          <IconButton
            onClick={onSkip}
            size="small"
            aria-label={t('onboarding.tooltip.closeTour')}
            sx={{ color: 'text.secondary', mt: -0.5 }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>

        {/* Título */}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
          {step.title}
        </Typography>

        {/* Conteúdo */}
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {step.content}
        </Typography>

        {/* Ação customizada (ex: "Ver Templates") */}
        {step.action && onAction && (
          <Button
            onClick={onAction}
            variant={step.action.type === 'primary' ? 'contained' : 'outlined'}
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          >
            {step.action.label}
          </Button>
        )}

        {/* Navegação */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
          <Button
            onClick={onPrev}
            disabled={isFirst}
            startIcon={<ArrowBack />}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            {t('onboarding.tooltip.previous')}
          </Button>

          <Button
            onClick={onNext}
            variant="contained"
            endIcon={isLast ? undefined : <ArrowForward />}
            size="small"
            sx={{
              fontWeight: 600,
              ...(isLast
                ? {
                    background: BRAND_GRADIENT,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
                    },
                  }
                : {}),
            }}
          >
            {isLast ? t('onboarding.tooltip.finish') : t('onboarding.tooltip.next')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );

  // Passo sem alvo — exibe centralizado na viewport
  if (!hasTarget) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 12000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        {tooltipContent}
      </Box>
    );
  }

  // Passo com alvo — usa Popper ancorado
  return (
    <Popper
      open={anchorEl !== null}
      anchorEl={anchorEl}
      placement={placement}
      disablePortal={false}
      modifiers={[
        {
          name: 'offset',
          options: {
            offset: [0, 12],
          },
        },
        {
          name: 'preventOverflow',
          options: {
            padding: 16,
          },
        },
      ]}
      sx={{ zIndex: 13000 }}
    >
      {tooltipContent}
    </Popper>
  );
}
