import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { useLocale } from '../../features/i18n';
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
  type AnalyticsConsent,
} from '../../lib/analytics';
import { StackedHeader } from '../ui';
import {
  APP_BORDER_STRONG,
  APP_SURFACE,
  RADIUS_SM,
  SHADOW_DEEP,
} from '../../theme/tokens';

export const OPEN_ANALYTICS_CONSENT_EVENT = 's2a-open-analytics-consent';

export function openAnalyticsConsentDialog(): void {
  window.dispatchEvent(new Event(OPEN_ANALYTICS_CONSENT_EVENT));
}

export function AnalyticsConsentPrompt() {
  const { t } = useLocale();
  const [consent, setConsent] = useState<AnalyticsConsent>(getAnalyticsConsent);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const handleConsentChanged = (event: Event) => {
      setConsent((event as CustomEvent<AnalyticsConsent>).detail);
    };
    const handleOpenDialog = () => setDialogOpen(true);
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChanged);
    window.addEventListener(OPEN_ANALYTICS_CONSENT_EVENT, handleOpenDialog);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleConsentChanged);
      window.removeEventListener(OPEN_ANALYTICS_CONSENT_EVENT, handleOpenDialog);
    };
  }, []);

  const accept = useCallback(() => {
    void grantAnalyticsConsent();
    setConsent('granted');
    setDialogOpen(false);
  }, []);

  const reject = useCallback(() => {
    void denyAnalyticsConsent();
    setConsent('denied');
    setDialogOpen(false);
  }, []);

  return (
    <>
      <Snackbar open={consent === 'unknown'} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {/* GAP-06 (Onda 1): Paper + Stack + Typography manuais substituídos por
            StackedHeader variant="glass". Preserva:
            - <Link> no description via ReactNode
            - 2 botões no slot action (accept/reject)
            - a11y (role="region" + aria-labelledby) via slotProps.root
            - sizing/coloring custom do Paper original (border, bgcolor, shadow) */}
        <StackedHeader
          variant="glass"
          role="region"
          slotProps={{
            root: {
              sx: {
                width: 'calc(100vw - 32px)',
                maxWidth: 920,
                p: { xs: 1.5, sm: 1.75 },
                border: `1px solid ${APP_BORDER_STRONG}`,
                bgcolor: alpha(APP_SURFACE, 0.94),
                boxShadow: `0 12px 32px ${alpha(SHADOW_DEEP, 0.42)}`,
              },
            },
            title: { sx: { fontSize: 'subtitle2' } },
          }}
          title={t('analyticsConsent.title')}
          description={
            <>
              {t('analyticsConsent.description')}{' '}
              <Link component={RouterLink} to="/cookies">{t('analyticsConsent.details')}</Link>
            </>
          }
          action={
            <>
              <Button size="small" color="inherit" onClick={reject}>{t('analyticsConsent.reject')}</Button>
              <Button size="small" variant="contained" onClick={accept}>{t('analyticsConsent.accept')}</Button>
            </>
          }
        />
      </Snackbar>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="analytics-consent-dialog-title"
        aria-describedby="analytics-consent-dialog-description"
        slotProps={{ paper: { sx: { borderRadius: RADIUS_SM } } }}
      >
        <DialogTitle id="analytics-consent-dialog-title" sx={{ pb: 1 }}>
          {t('analyticsConsent.manageTitle')}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography
            id="analytics-consent-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6 }}
          >
            {t('analyticsConsent.manageDescription')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={reject}>{t('analyticsConsent.disable')}</Button>
          <Button variant="contained" onClick={accept}>{t('analyticsConsent.enable')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
