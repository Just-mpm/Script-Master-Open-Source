// ---------------------------------------------------------------------------
// PwaInstallPrompt — banner de instalação customizado do PWA
// ---------------------------------------------------------------------------
//
// Exibe um convite para o usuário instalar o app como PWA (Add to Home Screen).
// Diferente do `beforeinstallprompt` nativo, este banner tem timing controlado
// (delay de 3s após a captura do evento) e respeita recusas prévias
// (3 recusas → nunca mais, cooldown de 7 dias).
//
// O componente é puramente passivo: consome o hook `usePwaInstallPrompt` que já
// concentra toda a lógica de elegibilidade. Aqui só resta:
// 1) coordenar a sobreposição visual com outros prompts globais
//    (`PwaUpdatePrompt` e `AnalyticsConsentPrompt` — quem chega primeiro
//    ocupa o rodapé; o install prompt empilha acima);
// 2) disparar o prompt nativo no clique do botão e dar feedback via toast.
//
// Acessibilidade (WAI-ARIA compliance):
// - `role="status"` (em vez de `role="alert"`) — um convite de instalação é
//   uma oportunidade, não um alerta urgente. `status` já implica
//   `aria-live="polite"` e `aria-atomic="true"`, dispensando a declaração
//   manual. `role="alert"` forçaria `aria-live="assertive"`, interrompendo
//   a navegação do leitor de tela, o que seria inadequado aqui.
// - `aria-labelledby` aponta para o id do título para identificar a região
//   sem ocultar o conteúdo textual (description) da leitura natural.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useId, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Slide from '@mui/material/Slide';
import InstallMobile from '@mui/icons-material/InstallMobile';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SlideProps } from '@mui/material/Slide';
import toast from 'react-hot-toast';
import { useLocale } from '../../features/i18n';
import { createLogger } from '../../lib/logger';
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt';
import { PWA_UPDATE_VISIBILITY_EVENT } from './PwaUpdatePrompt';
import { ANALYTICS_CONSENT_CHANGED_EVENT, getAnalyticsConsent } from '../../lib/analytics';
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
  RADIUS_SM,
  RADIUS_XS,
} from '../../theme/tokens';

const log = createLogger('PWA');

/**
 * Offsets verticais do Snackbar em relação à ActionBar do estúdio.
 *
 * O `!important` na string é necessário para sobrescrever o estilo inline
 * que o Snackbar do MUI aplica via Emotion (sem ele o valor é ignorado).
 * É o mesmo padrão pré-existente em `PwaUpdatePrompt.tsx`; aqui foi
 * externalizado para uma constante tipada (`SxProps<Theme>`) que elimina
 * o cast `as never` que mascarava o tipo.
 */
const BOTTOM_OFFSETS: Record<'visible' | 'hidden', SxProps<Theme>> = {
  visible: { bottom: { xs: '200px !important', sm: '200px !important' } },
  hidden: { bottom: { xs: '90px !important', sm: '90px !important' } },
};

function PwaInstallPrompt() {
  const { t } = useLocale();
  const [updateVisible, setUpdateVisible] = useState(false);
  const [analyticsPending, setAnalyticsPending] = useState<boolean>(() => getAnalyticsConsent() === 'unknown');
  // `useId` gera um id estável entre renders e SSR-safe para o `aria-labelledby`
  // do Paper apontar para o título (sem precisar de i18n para gerar string).
  const titleId = useId();

  // Coordena sobreposição visual com prompts vizinhos. Os dois eventos são
  // emitidos por componentes irmãos: PwaUpdatePrompt e AnalyticsConsentPrompt.
  useEffect(() => {
    const handleUpdateVisibility = (event: CustomEvent<boolean>): void => {
      setUpdateVisible(event.detail);
    };
    const handleAnalyticsConsent = (): void => {
      setAnalyticsPending(getAnalyticsConsent() === 'unknown');
    };
    window.addEventListener(PWA_UPDATE_VISIBILITY_EVENT, handleUpdateVisibility as EventListener);
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleAnalyticsConsent);
    return () => {
      window.removeEventListener(PWA_UPDATE_VISIBILITY_EVENT, handleUpdateVisibility as EventListener);
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handleAnalyticsConsent);
    };
  }, []);

  const { canShow, isInstalled, promptInstall, dismiss } = usePwaInstallPrompt();

  // Não competir pelo rodapé quando um prompt de maior prioridade já está
  // visível (update é ação obrigatória; consentimento é requisito legal).
  const visible = canShow && !isInstalled && !updateVisible && !analyticsPending;

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      log.debug('Usuário aceitou instalar o PWA.');
      toast.success(t('pwaInstall.installed'), { duration: 4000, icon: '✅' });
    } else if (outcome === 'dismissed') {
      log.debug('Usuário recusou o prompt nativo de instalação.');
    } else {
      // Falha rara (race com PwaUpdatePrompt usando o mesmo `beforeinstallprompt`,
      // evento `appinstalled` ocorrido entre o clique e o prompt, etc.).
      // Sem feedback, o usuário clicaria em "Instalar" e nada aconteceria visivelmente.
      log.debug('Falha ao disparar prompt nativo de instalação.');
      toast.error(t('pwaInstall.installError'));
    }
  }, [promptInstall, t]);

  const handleDismiss = useCallback(() => {
    log.debug('Usuário dispensou o banner de instalação.');
    dismiss();
  }, [dismiss]);

  return (
    <Snackbar
      open={visible}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      slots={{ transition: Slide }}
      slotProps={{
        transition: {
          direction: 'up',
        } as SlideProps,
      }}
      sx={
        // Quando o PwaUpdatePrompt está visível (rodapé 90px), empilhamos
        // acima dele. Caso contrário, ocupamos a posição padrão de rodapé
        // acima da ActionBar do estúdio. `SxProps<Theme>` tipado evita o
        // `as never` que silenciava o type-checker.
        BOTTOM_OFFSETS[updateVisible ? 'visible' : 'hidden']
      }
    >
      <Paper
        // `role="status"` substitui `role="alert"` + `aria-live="polite"`:
        // convite de instalação é oportunidade, não urgência. `status` já
        // implica `aria-live="polite"` + `aria-atomic="true"`, sem risco
        // de comportamento indefinido em leitores de tela.
        role="status"
        aria-labelledby={titleId}
        elevation={0}
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 1.75, sm: 2 },
          minWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
          maxWidth: { sm: 520 },
          borderRadius: RADIUS_SM,
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
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: GAP_DEFAULT, sm: 1.5 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
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
                backgroundColor: alpha(BRAND_SECONDARY, 0.12),
                border: `1px solid ${alpha(BRAND_SECONDARY, 0.2)}`,
              }}
            >
              <InstallMobile
                sx={{
                  color: BRAND_SECONDARY,
                  fontSize: 20,
                  filter: `drop-shadow(0 0 4px ${alpha(BRAND_SECONDARY, 0.35)})`,
                }}
              />
            </Stack>
            <Stack spacing={GAP_COMPACT / 3 }>
              <Typography
                id={titleId}
                variant="subtitle2"
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
              >
                {t('pwaInstall.title')}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1.45 }}
              >
                {t('pwaInstall.description')}
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
              {t('pwaInstall.dismiss')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleInstall}
              sx={{
                borderRadius: RADIUS_XS,
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
              {t('pwaInstall.install')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Snackbar>
  );
}

export { PwaInstallPrompt };
