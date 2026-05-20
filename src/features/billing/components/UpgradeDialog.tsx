// ---------------------------------------------------------------------------
// UpgradeDialog — modal de upgrade de plano via Stripe Checkout
// ---------------------------------------------------------------------------
//
// Exibe os planos disponíveis e redireciona para o Stripe Checkout.
// Só aparece se o Stripe estiver configurado (VITE_STRIPE_PUBLISHABLE_KEY).
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Star from '@mui/icons-material/Star';
import Business from '@mui/icons-material/Business';
import { useLocale } from '../../i18n';
import { PLANS, formatPrice } from '../plans';
import { useBillingStore } from '../store/useBillingStore';
import { redirectToCheckout } from '../../../lib/stripe';
import { createLogger } from '../../../lib/logger';
import { auth } from '../../../lib/firebase';
import type { PlanId } from '../types';

const log = createLogger('UpgradeDialog');

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Plano recomendado para upgrade (ex: 'pro' quando excede limites do free) */
  recommendedPlan?: PlanId;
}

/** Price IDs do Stripe — devem ser configurados no Stripe Dashboard */
const STRIPE_PRICE_IDS: Partial<Record<PlanId, Record<string, string>>> = {
  pro: {
    monthly: 'price_pro_monthly',
    yearly: 'price_pro_yearly',
  },
  business: {
    monthly: 'price_business_monthly',
    yearly: 'price_business_yearly',
  },
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function UpgradeDialog({ open, onClose, recommendedPlan }: UpgradeDialogProps) {
  const { t } = useLocale();
  const planId = useBillingStore((s) => s.planId);
  const stripeAvailable = useBillingStore((s) => s.stripeAvailable);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Plano atual do usuário
  const currentPlan = PLANS[planId];

  // Planos disponíveis para upgrade
  const upgradePlans = Object.values(PLANS).filter((plan) => plan.id !== 'free' && plan.id !== planId);

  const handleUpgrade = useCallback(async (selectedPlanId: PlanId) => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(selectedPlanId);
    setError(null);

    try {
      const firebaseToken = await user.getIdToken();
      const priceIds = STRIPE_PRICE_IDS[selectedPlanId];

      if (!priceIds) {
        setError(t('billing.priceNotConfigured'));
        return;
      }

      const locale = t('_locale') as string;
      const priceId = priceIds[billingCycle];

      await redirectToCheckout({
        priceId,
        userId: user.uid,
        locale,
        firebaseToken,
      });

      // Se chegou aqui, o redirecionamento falhou
      log.warn('redirectToCheckout não redirecionou');
    } catch (err) {
      log.error('Erro ao iniciar checkout', { err });
      setError('Erro ao iniciar o checkout. Tente novamente.');
    } finally {
      setLoading(null);
    }
  }, [billingCycle, t]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="upgrade-dialog-title"
      slotProps={{
        paper: { sx: { borderRadius: 3 } },
      }}
    >
      <DialogTitle id="upgrade-dialog-title" sx={{ pb: 1 }}>
        {t('billing.upgrade.title')}
      </DialogTitle>

      <DialogContent>
        {/* Toggle de ciclo de pagamento */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mb: 3 }}>
          <Button
            variant={billingCycle === 'monthly' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setBillingCycle('monthly')}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('billing.upgrade.monthly')}
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setBillingCycle('yearly')}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('billing.upgrade.yearly')}
            <Chip
              label={t('billing.upgrade.yearlyDiscount')}
              size="small"
              color="success"
              sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
            />
          </Button>
        </Stack>

        {/* Plano atual */}
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary">
            {t('billing.upgrade.currentPlan')}: <strong>{currentPlan.name}</strong>
          </Typography>
        </Box>

        {/* Planos disponíveis */}
        <Stack spacing={2}>
          {upgradePlans.map((plan) => {
            const isRecommended = plan.id === recommendedPlan;
            const isLoading = loading === plan.id;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const isBusiness = plan.id === 'business';

            return (
              <Card
                key={plan.id}
                variant={isRecommended ? 'elevation' : 'outlined'}
                elevation={isRecommended ? 4 : 0}
                sx={{
                  borderRadius: 2,
                  border: isRecommended ? '2px solid' : undefined,
                  borderColor: isRecommended ? 'secondary.main' : undefined,
                }}
              >
                <CardActionArea
                  onClick={() => stripeAvailable && handleUpgrade(plan.id)}
                  disabled={!stripeAvailable || isLoading}
                  sx={{ p: 2 }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {isBusiness
                        ? <Business color="warning" />
                        : <Star color="primary" />
                      }
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {plan.name}
                      </Typography>
                      {isRecommended && (
                        <Chip
                          label={t('billing.upgrade.recommended')}
                          size="small"
                          color="secondary"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>

                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {formatPrice(price)}
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        /{billingCycle === 'monthly' ? t('billing.upgrade.month') : t('billing.upgrade.year')}
                      </Typography>
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {plan.features.map((feature) => (
                        <Stack key={feature} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <CheckCircleOutlined sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            {feature}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>

                    {isLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>

        {/* Erro */}
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {!stripeAvailable && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            {t('billing.upgrade.notAvailable')}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
