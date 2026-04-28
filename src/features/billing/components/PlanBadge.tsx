import Chip from '@mui/material/Chip';
import type { PlanId } from '../types';
import { PLANS } from '../plans';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PlanBadgeProps {
  planId: PlanId;
}

// ---------------------------------------------------------------------------
// Mapa de cores por plano
// ---------------------------------------------------------------------------

const PLAN_COLORS: Record<PlanId, { bg: string; text: string }> = {
  free: { bg: 'rgba(148, 163, 184, 0.15)', text: 'rgba(148, 163, 184, 1)' },
  pro: { bg: 'rgba(46, 117, 182, 0.15)', text: 'rgba(91, 163, 208, 1)' },
  business: { bg: 'rgba(247, 148, 30, 0.15)', text: 'rgba(255, 183, 77, 1)' },
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Badge compacto do plano atual — para uso no Header ou perfil do usuário.
 */
export function PlanBadge({ planId }: PlanBadgeProps) {
  const plan = PLANS[planId];
  const colors = PLAN_COLORS[planId];

  return (
    <Chip
      label={plan.name}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        letterSpacing: '0.04em',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.text}`,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
}
