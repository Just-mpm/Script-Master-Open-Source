// ---------------------------------------------------------------------------
// PwaUpdatePrompt — banner de atualização do PWA
// ---------------------------------------------------------------------------
//
// Detecta quando uma nova versão do service worker está disponível (via
// vite-plugin-pwa com registerType: 'prompt') e exibe um Snackbar fixo
// com botão "Atualizar agora" (força ativação do novo SW + reload) e
// opção "Ignorar" (persiste decisão no sessionStorage para não irritar).
//
// O hook useRegisterSW de 'virtual:pwa-register/react' registra o SW
// automaticamente — o registro manual em main.tsx foi removido.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Snackbar from '@mui/material/Snackbar';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Slide from '@mui/material/Slide';
import SystemUpdateAlt from '@mui/icons-material/SystemUpdateAlt';
import { alpha } from '@mui/material/styles';
import type { SlideProps } from '@mui/material/Slide';
import toast from 'react-hot-toast';
import { useLocale } from '../../features/i18n';
import { createLogger } from '../../lib/logger';
import {
  APP_BORDER_STRONG,
  APP_SURFACE,
  BRAND_GRADIENT,
  BRAND_GLOW,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
  GAP_COMPACT,
  GAP_DEFAULT,
  SHADOW_DEEP,
  WHITE_04,
  WHITE_06,
  WHITE_08,
} from '../../theme/tokens';

/** Chave no sessionStorage para controlar "ignorar" por versão do SW */
const DISMISS_KEY = 'pwa_update_dismissed_sw';

const log = createLogger('PWA');

function PwaUpdatePrompt() {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        log.debug('Service worker registrado', { scriptURL: registration.active?.scriptURL });
      }
    },
    onRegisterError(error) {
      log.error('Erro ao registrar service worker', { error: String(error) });
    },
  });

  // Toast discreto quando o app fica pronto para uso offline
  useEffect(() => {
    if (offlineReady) {
      toast.success(t('pwaUpdate.offlineReady'), { duration: 4000, icon: '📡' });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, t]);

  // Verifica se o usuário já ignorou esta versão do SW
  const shouldShow = needRefresh && !dismissed;

  useEffect(() => {
    if (needRefresh) {
      try {
        const dismissedSw = sessionStorage.getItem(DISMISS_KEY);
        // Se o SW registrado for o mesmo que foi ignorado, não mostra
        if (dismissedSw === 'true') {
          setDismissed(true);
        }
      } catch {
        // sessionStorage pode estar inacessível (modo privado restrito)
      }
    }
  }, [needRefresh]);

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleDismiss = useCallback(() => {
    setNeedRefresh(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // sessionStorage inacessível — ignora silenciosamente
    }
  }, [setNeedRefresh]);

  return (
    <Snackbar
      open={shouldShow}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      slots={{ transition: Slide }}
      slotProps={{
        transition: {
          direction: 'up',
        } as SlideProps,
      }}
      sx={{
        // Garante espaço acima da ActionBar do estúdio (bottom: 24px + altura ~56px)
        bottom: { xs: '90px !important', sm: '90px !important' } as never,
      }}
    >
      <Paper
        role="alert"
        aria-live="assertive"
        elevation={0}
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 1.75, sm: 2 },
          minWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
          maxWidth: { sm: 520 },
          borderRadius: 3,
          border: `1px solid ${APP_BORDER_STRONG}`,
          backgroundColor: alpha(APP_SURFACE, 0.82),
          backgroundImage: `linear-gradient(180deg, ${WHITE_06} 0%, ${WHITE_04} 100%)`,
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: `
            0 16px 48px ${alpha(SHADOW_DEEP, 0.65)},
            0 0 0 1px ${alpha(BRAND_PRIMARY, 0.1)},
            inset 0 1px 0 ${WHITE_08}
          `,
          ...theme.applyStyles('dark', {
            backgroundImage: 'none',
          }),
          // Barra de destaque lateral com gradiente da marca
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            left: 0,
            bottom: 8,
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: BRAND_GRADIENT,
            opacity: 0.85,
          },
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: GAP_DEFAULT, sm: 1.5 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, pl: { xs: 1.5, sm: 0 } }}
        >
          {/* Ícone + texto */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
          >
            <Stack
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: alpha(BRAND_PRIMARY, 0.12),
                border: `1px solid ${alpha(BRAND_PRIMARY, 0.2)}`,
              }}
            >
              <SystemUpdateAlt
                sx={{
                  color: BRAND_SECONDARY,
                  fontSize: 20,
                  filter: `drop-shadow(0 0 4px ${alpha(BRAND_SECONDARY, 0.35)})`,
                }}
              />
            </Stack>
            <Stack spacing={GAP_COMPACT / 3}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
              >
                {t('pwaUpdate.title')}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1.45 }}
              >
                {t('pwaUpdate.description')}
              </Typography>
            </Stack>
          </Stack>

          {/* Botões de ação */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexShrink: 0,
              alignSelf: { xs: 'stretch', sm: 'center' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
            }}
          >
            <Button
              size="small"
              variant="text"
              onClick={handleDismiss}
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                minWidth: 0,
                px: 1.5,
                '&:hover': {
                  color: 'text.primary',
                  backgroundColor: WHITE_04,
                },
              }}
            >
              {t('pwaUpdate.dismiss')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleUpdate}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                px: 2,
                background: BRAND_GRADIENT,
                boxShadow: `0 4px 14px ${alpha(BRAND_PRIMARY, 0.35)}`,
                transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                '&:hover': {
                  background: BRAND_GRADIENT,
                  boxShadow: BRAND_GLOW,
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: `0 2px 8px ${alpha(BRAND_PRIMARY, 0.3)}`,
                },
              }}
            >
              {t('pwaUpdate.update')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Snackbar>
  );
}

export { PwaUpdatePrompt };
