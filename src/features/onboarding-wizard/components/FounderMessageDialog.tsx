/**
 * Dialog com mensagem pessoal do criador do Script Master.
 *
 * Exibido UMA vez apos o onboarding ser concluido — antes de redirecionar
 * o usuario para o estudio. Flag `s2a_founder_message_seen` no localStorage
 * garante que so aparece no primeiro acesso.
 */

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import ArrowForward from '@mui/icons-material/ArrowForward';
import {
  BRAND_GRADIENT,
  BRAND_GRADIENT_HOVER,
  BRAND_SECONDARY,
  BRAND_SECONDARY_GLOW_SOFT,
  WHITE_06,
} from '../../../theme/tokens';
import { useLocale } from '../../i18n';

const SEEN_KEY = 's2a_founder_message_seen';

/** Verifica se o dialog ja foi visto (para pular exibicao) */
export function isFounderMessageSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Marca o dialog como ja visto */
function markFounderMessageSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, 'true');
  } catch {
    // localStorage indisponivel — dialog aparecera novamente, o que é OK
  }
}

interface FounderMessageDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FounderMessageDialog({ open, onClose }: FounderMessageDialogProps) {
  const { t } = useLocale();

  const handleClose = () => {
    markFounderMessageSeen();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="founder-message-title"
      slotProps={{
        paper: {
          sx: {
            backgroundImage: 'none',
            bgcolor: 'background.paper',
            border: `1px solid ${WHITE_06}`,
            borderRadius: 4,
            boxShadow: `0 0 40px rgba(247, 148, 30, 0.06), 0 24px 48px rgba(0,0,0,0.4)`,
            position: 'relative',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Brilho quente sutil no topo — sensacao de acolhimento */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 240,
          height: 80,
          background: `radial-gradient(ellipse, ${BRAND_SECONDARY_GLOW_SOFT} 0%, transparent 70%)`,
          filter: 'blur(24px)',
          pointerEvents: 'none',
          opacity: 0.7,
        }}
      />

      <DialogTitle
        id="founder-message-title"
        sx={{ px: 4, pt: 4, pb: 0, position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            component={motion.div}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${alpha(BRAND_SECONDARY, 0.06)} 0%, ${alpha(BRAND_SECONDARY, 0.14)} 100%)`,
              color: BRAND_SECONDARY,
            }}
          >
            <FavoriteBorder sx={{ fontSize: 22 }} />
          </Box>
          <Box
            component={motion.span}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            sx={{
              fontWeight: 700,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              background: BRAND_GRADIENT,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('onboarding.wizard.founderTitle')}
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 4, pt: 3, pb: 1, position: 'relative', zIndex: 1 }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Stack spacing={2.5}>
            <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
              {t('onboarding.wizard.founderGreeting')}
            </Typography>

            <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
              {t('onboarding.wizard.founderBody')}
            </Typography>

            <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
              {t('onboarding.wizard.founderCredits')}
            </Typography>

            <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
              {t('onboarding.wizard.founderFeedback')}
            </Typography>

            <Box sx={{ borderBottom: `1px solid ${WHITE_06}`, mx: -1 }} />

            <Typography
              sx={{
                fontFamily: '"Playfair Display", ui-serif, Georgia, serif',
                fontSize: '1.1rem',
                color: 'text.secondary',
                fontStyle: 'italic',
              }}
            >
              — Matheus
            </Typography>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 2 }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          sx={{ width: '100%' }}
        >
          <Button
            onClick={handleClose}
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            fullWidth
            sx={{
              background: BRAND_GRADIENT,
              fontWeight: 600,
              py: 1.25,
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              '&:hover': {
                background: BRAND_GRADIENT_HOVER,
              },
            }}
          >
            {t('onboarding.wizard.founderButton')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
