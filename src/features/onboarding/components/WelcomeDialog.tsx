/**
 * Dialog de boas-vindas exibido na primeira visita ao estúdio.
 *
 * Segue o padrão de Dialog com glassPanelSx do projeto.
 * Mobile: fullscreen em telas pequenas.
 */

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import RocketLaunch from '@mui/icons-material/RocketLaunch';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import { useLocale } from '../../../features/i18n';
import { glassPanelSx } from '../../../theme/surfaces';
import { BRAND_GRADIENT } from '../../../theme/tokens';

interface WelcomeDialogProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeDialog({ open, onStart, onSkip }: WelcomeDialogProps) {
  const theme = useTheme();
  const { t } = useLocale();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: (t) => ({
            ...glassPanelSx(t),
            p: { xs: 3, sm: 4 },
          }),
        },
        backdrop: {
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.72)' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1,
          typography: { xs: 'h5', sm: 'h4' },
          fontWeight: 700,
          background: BRAND_GRADIENT,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        <RocketLaunch sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
        {t('onboarding.welcome.title')}
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        <Stack spacing={2.5}>
          <DialogContentText
            sx={{
              color: 'text.secondary',
              lineHeight: 1.7,
              typography: 'body1',
            }}
          >
            {t('onboarding.welcome.description')}
          </DialogContentText>

          <Stack
            direction="row"
            spacing={2}
            sx={{ flexWrap: 'wrap' }}
          >
            {[
              { icon: '🎵', label: t('onboarding.welcome.featureTTS') },
              { icon: '🎬', label: t('onboarding.welcome.featureScenes') },
              { icon: '🎥', label: t('onboarding.welcome.featureVideo') },
            ].map((item) => (
              <Stack
                key={item.label}
                direction="row"
                spacing={0.75}
                sx={{
                  alignItems: 'center',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <Typography sx={{ fontSize: 20 }}>{item.icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <AutoAwesome sx={{ fontSize: 14, color: theme.palette.primary.main }} />
            {t('onboarding.welcome.tourHint')}
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 }, pt: 1 }}>
        <Button
          onClick={onSkip}
          size="large"
          sx={{ color: 'text.secondary', mr: 'auto' }}
        >
          {t('onboarding.welcome.skip')}
        </Button>
        <Button
          onClick={onStart}
          variant="contained"
          size="large"
          startIcon={<RocketLaunch />}
          sx={{
            background: BRAND_GRADIENT,
            px: 3,
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
            },
          }}
        >
          {t('onboarding.welcome.startTour')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
