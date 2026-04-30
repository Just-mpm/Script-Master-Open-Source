/**
 * Etapa 3 do wizard — tela de conclusao com animacao de sucesso,
 * mensagem personalizada e botao para acessar a plataforma.
 */

import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'motion/react';
import ArrowForward from '@mui/icons-material/ArrowForward';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { useLocale } from '../../i18n';
import { useWizardStore } from '../store/wizardStore';
import { BRAND_GRADIENT, SUCCESS_MAIN } from '../../../theme/tokens';
import { useAuth } from '../../../contexts/AuthContext';
import { saveUserSettings } from '../../../lib/db/user-settings';
import { useNavigate } from 'react-router-dom';
import { createLogger } from '../../../lib/logger';

const log = createLogger('completionStep');

export function CompletionStep() {
  const { t } = useLocale();
  const { data, complete } = useWizardStore(
    useShallow((s) => ({ data: s.data, complete: s.complete })),
  );
  const user = useAuth().user;
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstName = data.name.split(' ')[0];

  const handleAccess = async () => {
    setSaving(true);
    setSaveError(false);

    try {
      if (user) {
        await saveUserSettings('', user.uid, {
          name: data.name,
          role: data.role,
          goals: data.goals,
        });
      }
      complete();
      navigate('/app/estudio');
    } catch (error) {
      log.error('Falha ao salvar perfil do wizard', { cause: error as Error });
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack
      sx={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      {/* Circulo de sucesso com glow */}
      <Stack sx={{ position: 'relative', mb: 3 }}>
        {/* Glow animado */}
        <Box
          component={motion.div}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          sx={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            backgroundColor: SUCCESS_MAIN,
            filter: 'blur(20px)',
          }}
        />

        {/* Icone principal */}
        <Box
          component={motion.div}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${SUCCESS_MAIN}, #059669)`,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <CheckCircle sx={{ fontSize: 48, color: '#fff' }} />
        </Box>

        {/* Badge decorativo */}
        <Box
          component={motion.div}
          initial={{ scale: 0, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.6 }}
          sx={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'background.paper',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        >
          <AutoAwesome sx={{ fontSize: 18, color: '#F7941E' }} />
        </Box>
      </Stack>

      {/* Titulo personalizado com nome do usuario */}
      <Box
        component={motion.h1}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        sx={{
          fontSize: '1.75rem',
          fontWeight: 700,
          background: BRAND_GRADIENT,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          m: 0,
        }}
      >
        {t('onboarding.wizard.completionTitle')}, {firstName}!
      </Box>

      {/* Mensagem de conclusao */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', maxWidth: 320, lineHeight: 1.7 }}
        >
          {t('onboarding.wizard.completionMessage')}
        </Typography>
      </Box>

      {/* Feedback de erro no salvamento */}
      {saveError && (
        <Alert severity="warning" sx={{ maxWidth: 360 }}>
          {t('onboarding.wizard.saveError')}
        </Alert>
      )}

      {/* Botao de acesso */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        sx={{ mt: 3 }}
      >
        <Button
          onClick={handleAccess}
          disabled={saving}
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          sx={{
            background: BRAND_GRADIENT,
            px: 4,
            fontWeight: 600,
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5BA3D0 0%, #F7941E 100%)',
            },
          }}
        >
          {t('onboarding.wizard.completionButton')}
        </Button>
      </Box>
    </Stack>
  );
}
