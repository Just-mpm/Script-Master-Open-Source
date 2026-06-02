import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Cookie from '@mui/icons-material/Cookie';
import Logout from '@mui/icons-material/Logout';
import Person from '@mui/icons-material/Person';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale, LocaleSelector, LOCALE_CONFIGS } from '../../features/i18n';
import { isOpenBetaEnabled } from '../../lib/env';
import { CreditIndicator } from '../CreditIndicator';
import { LogoutConfirmDialog } from '../LogoutConfirmDialog';
import { openAnalyticsConsentDialog } from './AnalyticsConsentPrompt';
import {
  APP_BORDER,
  BRAND_PRIMARY_GLOW_SOFT,
  GAP_COMPACT,
  ICON_SIZE_LG,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
} from '../../theme/tokens';
import { glassSurfaceSx } from '../../theme/surfaces';

interface SidebarFooterProps {
  /** Quando true, renderiza versão colapsada (apenas ícones centralizados com Tooltip) */
  collapsed: boolean;
}

/**
 * Rodapé da Sidebar — área autenticada (desktop).
 *
 * Renderiza, do topo para o fundo:
 * 1. Card do usuário (expandido) ou Avatar circular (colapsado) — navega para /app/configuracoes
 * 2. CreditIndicator — apenas durante o beta aberto
 * 3. LocaleSelector — com Tooltip no colapsado, item de lista no expandido
 * 4. Botão de cookies — abre o dialog de consentimento de analytics
 * 5. Botão de logout — confirma via LogoutConfirmDialog
 */
export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Chave de i18n reaproveitada de `studio.header.user` — o namespace `sidebar.*`
  // previsto no plano (passo 3) ainda não foi adicionado, então usamos a chave
  // semântica existente para evitar warning de chave ausente.
  const userTooltip = t('studio.header.user.tooltip');
  const userAlt = t('studio.header.user.alt');
  const userFallback = t('studio.header.user.fallback');

  const handleOpenLogoutDialog = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const handleCloseLogoutDialog = useCallback(() => {
    setLogoutDialogOpen(false);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setLogoutDialogOpen(false);
    // void evita warning de promise não tratada (logout faz window.location.href).
    void logout();
  }, [logout]);

  const handleAvatarClick = useCallback(() => {
    navigate('/app/configuracoes');
  }, [navigate]);

  const handleCookieClick = useCallback(() => {
    openAnalyticsConsentDialog();
  }, []);

  const currentLocaleLabel = LOCALE_CONFIGS.find((c) => c.code === locale)?.label ?? '';

  // Não renderiza sem usuário — a sidebar só é montada em rotas autenticadas,
  // mas protegemos contra remontagem durante logout/sign-out.
  if (!user) return null;

  return (
    <>
      <Divider sx={{ borderColor: APP_BORDER }} />

      <Box
        sx={{
          px: collapsed ? 1.5 : 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: GAP_COMPACT,
        }}
      >
        {/* ── Avatar do usuário (link para /app/configuracoes) ── */}
        {collapsed ? (
          <Tooltip title={user.displayName ?? user.email ?? userTooltip} placement="right" arrow>
            <IconButton
              onClick={handleAvatarClick}
              aria-label={userTooltip}
              sx={{
                width: 44,
                height: 44,
                alignSelf: 'center',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar
                alt={user.displayName ?? userAlt}
                src={user.photoURL ?? undefined}
                slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
              >
                {!user.photoURL && <Person sx={{ fontSize: ICON_SIZE_SM }} />}
              </Avatar>
            </IconButton>
          </Tooltip>
        ) : (
          <Paper
            variant="outlined"
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
            aria-label={userTooltip}
            sx={(theme) => ({
              ...glassSurfaceSx(theme),
              px: 1.25,
              py: 1,
              borderRadius: 1.5,
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background-color 0.2s ease',
              '&:hover': { borderColor: 'divider' },
              '&:focus-visible': {
                outline: `2px solid ${BRAND_PRIMARY_GLOW_SOFT}`,
                outlineOffset: 2,
              },
            })}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar
                alt={user.displayName ?? userAlt}
                src={user.photoURL ?? undefined}
                slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
              >
                {!user.photoURL && <Person sx={{ fontSize: ICON_SIZE_SM }} />}
              </Avatar>
              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0] ?? userFallback}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email ?? ''}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* ── CreditIndicator — apenas durante o beta aberto ── */}
        {isOpenBetaEnabled() && (
          collapsed ? (
            <Tooltip title={currentLocaleLabel || 'Créditos'} placement="right" arrow>
              <Box sx={{ alignSelf: 'center' }}>
                <CreditIndicator />
              </Box>
            </Tooltip>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <CreditIndicator />
            </Box>
          )
        )}

        {/* ── LocaleSelector + Cookies + Logout ── */}
        {collapsed ? (
          <Stack spacing={GAP_COMPACT} sx={{ alignItems: 'center' }}>
            <Tooltip title={currentLocaleLabel} placement="right" arrow>
              <span>
                <LocaleSelector />
              </span>
            </Tooltip>
            <Tooltip title={t('analyticsConsent.manageCookies')} placement="right" arrow>
              <IconButton
                onClick={handleCookieClick}
                aria-label={t('analyticsConsent.manageCookies')}
                sx={{
                  width: 44,
                  height: 44,
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                }}
              >
                <Cookie sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('studio.header.logout.tooltip')} placement="right" arrow>
              <IconButton
                onClick={handleOpenLogoutDialog}
                aria-label={t('studio.header.logout.ariaLabel')}
                color="error"
                sx={{ width: 44, height: 44 }}
              >
                <Logout sx={{ fontSize: ICON_SIZE_LG }} aria-hidden="true" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <ListItemButton
              // LocaleSelector já é um botão próprio; ListItemButton serve apenas
              // como wrapper para alinhamento e estado de hover consistente.
              sx={{ borderRadius: 1.5, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover', color: 'text.primary' } }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <LocaleSelector />
              </ListItemIcon>
              <ListItemText
                primary={currentLocaleLabel}
                slotProps={{ primary: { variant: 'body2' } }}
              />
            </ListItemButton>
            <ListItemButton
              onClick={handleCookieClick}
              sx={{ borderRadius: 1.5, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover', color: 'text.primary' } }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <Cookie sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
              </ListItemIcon>
              <ListItemText
                primary={t('analyticsConsent.manageCookies')}
                slotProps={{ primary: { variant: 'body2' } }}
              />
            </ListItemButton>
            <ListItemButton
              onClick={handleOpenLogoutDialog}
              sx={{
                borderRadius: 1.5,
                color: 'error.main',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <Logout sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
              </ListItemIcon>
              <ListItemText
                primary={t('studio.header.logout.tooltip')}
                slotProps={{ primary: { variant: 'body2' } }}
              />
            </ListItemButton>
          </Stack>
        )}
      </Box>

      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={handleCloseLogoutDialog}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
