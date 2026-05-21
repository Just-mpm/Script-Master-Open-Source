import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import WorkspacePremium from '@mui/icons-material/WorkspacePremium';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { useCredits } from '../hooks/useCredits';
import { useLocale } from '../features/i18n';

/**
 * Badge compacto de créditos para o Header da área logada.
 * Exibe o saldo disponível com breakdown no tooltip.
 */
export function CreditIndicator() {
  const { availableCredits, baseCredits, bonusCredits, usedCredits, unlimitedCredits, canEnforceBalance, loading, error } = useCredits();
  const { t } = useLocale();

  if (loading) {
    return (
      <Skeleton
        variant="rectangular"
        width={80}
        height={24}
        sx={{ borderRadius: 3, bgcolor: 'action.hover' }}
        aria-label={t('studio.header.credits.loading')}
      />
    );
  }

  const unlimitedLabel = t('billing.usage.unlimited');

  if (unlimitedCredits) {
    return (
      <Tooltip title={unlimitedLabel}>
        <Chip
          icon={<WorkspacePremium sx={{ fontSize: 14 }} />}
          label={unlimitedLabel}
          size="small"
          aria-label={t('studio.header.credits.ariaLabel', { credits: unlimitedLabel })}
          sx={{
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            color: 'info.light',
            border: '1px solid rgba(59, 130, 246, 0.28)',
            '& .MuiChip-label': { px: 1 },
            '& .MuiChip-icon': {
              color: 'info.light',
              ml: 0.5,
            },
          }}
        />
      </Tooltip>
    );
  }

  if (!canEnforceBalance) {
    return (
      <Tooltip title={t('studio.header.credits.syncing')}>
        <Chip
          icon={<WarningAmber sx={{ fontSize: 14 }} />}
          size="small"
          aria-label={t('studio.header.credits.syncing')}
          sx={{
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            color: 'warning.light',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            '& .MuiChip-label': { px: 1 },
            '& .MuiChip-icon': { color: 'warning.light', ml: 0.5 },
          }}
        />
      </Tooltip>
    );
  }

  if (error) {
    return (
      <Tooltip title={error}>
        <Chip
          icon={<WarningAmber sx={{ fontSize: 14 }} />}
          size="small"
          aria-label={t('studio.header.credits.error')}
          sx={{
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: '0.04em',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: 'error.light',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            '& .MuiChip-label': { px: 1 },
            '& .MuiChip-icon': { color: 'error.light', ml: 0.5 },
          }}
        />
      </Tooltip>
    );
  }

  const breakdown = t('studio.header.credits.breakdown', {
    base: String(baseCredits),
    bonus: String(bonusCredits),
    used: String(usedCredits),
  });

  const hasCredits = availableCredits > 0;
  const lowCredits = availableCredits > 0 && availableCredits <= 100;

  return (
    <Tooltip title={breakdown}>
      <Chip
        icon={<WorkspacePremium sx={{ fontSize: 14 }} />}
        label={String(availableCredits)}
        size="small"
        aria-label={t('studio.header.credits.ariaLabel', { credits: String(availableCredits) })}
        sx={{
          fontWeight: 600,
          fontSize: '0.7rem',
          letterSpacing: '0.04em',
          backgroundColor: hasCredits
            ? lowCredits
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(16, 185, 129, 0.12)'
            : 'rgba(239, 68, 68, 0.12)',
          color: hasCredits
            ? lowCredits
              ? 'warning.light'
              : 'success.light'
            : 'error.light',
          border: hasCredits
            ? lowCredits
              ? '1px solid rgba(245, 158, 11, 0.28)'
              : '1px solid rgba(16, 185, 129, 0.28)'
            : '1px solid rgba(239, 68, 68, 0.28)',
          '& .MuiChip-label': { px: 1 },
          '& .MuiChip-icon': {
            color: hasCredits
              ? lowCredits
                ? 'warning.light'
                : 'success.light'
              : 'error.light',
            ml: 0.5,
          },
        }}
      />
    </Tooltip>
  );
}
