import { useState, useMemo, useCallback, type ElementType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ImageIcon from '@mui/icons-material/Image';
import logos from '../../assets/logos';
import Language from '@mui/icons-material/Language';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Logout from '@mui/icons-material/Logout';
import DeleteForever from '@mui/icons-material/DeleteForever';
import Mic from '@mui/icons-material/Mic';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Palette from '@mui/icons-material/Palette';
import Cookie from '@mui/icons-material/Cookie';
import Person from '@mui/icons-material/Person';
import PlayCircle from '@mui/icons-material/PlayCircle';
import RateReviewIcon from '@mui/icons-material/RateReview';
import Settings from '@mui/icons-material/Settings';
import Sparkles from '@mui/icons-material/AutoAwesome';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useAuth } from '../../contexts/AuthContext';
import { useFeedbackDialog } from '../feedback';
import { useLocale, LOCALE_CONFIGS } from '../../features/i18n';
import type { Locale } from '../../features/i18n/types';
import { openAnalyticsConsentDialog } from './AnalyticsConsentPrompt';
import { LogoutConfirmDialog } from '../LogoutConfirmDialog';
import { useStore } from 'zustand';
import { useVideoRenderController } from '../../features/video-render/store/videoRenderController';
import {
  BRAND_PRIMARY_GLOW_SOFT,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
  APP_BORDER,
  APP_SURFACE,
  WHITE_05,
  WHITE_015,
  RADIUS_SM,
  RADIUS_XS,
  BLACK_40,
} from '../../theme/tokens';
import { glassSurfaceSx } from '../../theme/surfaces';

// ─── Tipos ────────────────────────────────────────────────

interface BottomNavItem {
  to: string;
  label: string;
  icon: ElementType;
  accent?: boolean;
}

// ─── Constantes ───────────────────────────────────────────

/** Valor especial para o botão "Mais" — nunca casa com pathname real */
const MORE_VALUE = '__more__';

/** Altura da bottom nav em px (MUI default BottomNavigation) */
export const BOTTOM_NAV_HEIGHT = 56;

// ─── Componente ───────────────────────────────────────────

export function MobileBottomNav() {
  const { user, logout } = useAuth();
  const openFeedback = useFeedbackDialog();
  const { t, locale, setLocale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [localeAnchorEl, setLocaleAnchorEl] = useState<HTMLElement | null>(null);

  // ── Indicador de export de vídeo (P5=A — só ícone "Vídeo") ──
  // Lê slices primitivas do controller. Não aparece em desktop (mdDown check).
  const videoIsRendering = useStore(useVideoRenderController, (s) => s.isRendering);
  const videoStatus = useStore(useVideoRenderController, (s) => s.status);

  // ── 4 destinos principais ──
  const navItems = useMemo<BottomNavItem[]>(() => [
    { to: '/app/biblioteca', label: t('studio.header.nav.library'), icon: LocalLibrary },
    { to: '/app/video', label: t('studio.header.nav.video'), icon: PlayCircle },
    { to: '/app/assistente', label: t('studio.header.nav.ai'), icon: Sparkles, accent: true },
    { to: '/app/estudio', label: t('studio.header.nav.studio'), icon: Mic },
  ], [t]);

  // ── Itens do drawer (secundários + conta) ──
  const drawerItems = useMemo(() => {
    const items: Array<{ to: string; label: string; icon: ElementType; action?: 'feedback' }> = [
      { to: '/app/imagens', label: t('studio.header.nav.image'), icon: ImageIcon },
      { to: '/app/pintura-rapida', label: t('studio.header.nav.speedPaint'), icon: Palette },
      { to: '/app/configuracoes', label: t('studio.header.nav.settings'), icon: Settings },
      {
        to: '__feedback__',
        label: t('feedback.navItem.drawerLabel'),
        icon: RateReviewIcon,
        action: 'feedback',
      },
    ];
    return items;
  }, [t]);

  // ── Handlers ──
  const handleMoreClick = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleOpenLogoutDialog = useCallback(() => {
    closeDrawer();
    setLogoutDialogOpen(true);
  }, [closeDrawer]);

  const handleCloseLogoutDialog = useCallback(() => {
    setLogoutDialogOpen(false);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setLogoutDialogOpen(false);
    logout();
  }, [logout]);

  const handleNavigate = useCallback((to: string, action?: 'feedback') => {
    if (action === 'feedback') {
      openFeedback(location.pathname);
      closeDrawer();
      return;
    }
    navigate(to);
    closeDrawer();
  }, [navigate, closeDrawer, openFeedback, location.pathname]);

  const handleLogout = useCallback(() => {
    handleOpenLogoutDialog();
  }, [handleOpenLogoutDialog]);

  // ── Valor ativo do BottomNavigation ──
  // Se a rota atual é uma das 4 principais, usa o pathname.
  // Se for qualquer outra rota /app/*, usa MORE_VALUE para destacar o botão "Mais".
  const activeValue = useMemo(() => {
    const isMainRoute = navItems.some((item) => item.to === location.pathname);
    return isMainRoute ? location.pathname : MORE_VALUE;
  }, [location.pathname, navItems]);

  // ── Não renderiza fora do mobile ou sem usuário ──
  if (!isMobile || !user) return null;

  return (
    <>
      {/* ── Bottom Navigation Bar ── */}
      <Paper
        component="nav"
        aria-label={t('mobileBottomNav.ariaLabel')}
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          backgroundColor: APP_SURFACE,
          backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
          borderTop: `1px solid ${APP_BORDER}`,
          backdropFilter: 'blur(20px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={activeValue}
          showLabels
          sx={{
            backgroundColor: 'transparent',
            height: BOTTOM_NAV_HEIGHT,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              flex: 1,
              color: 'text.secondary',
              transition: 'color 0.2s ease, background-color 0.2s ease, transform 0.15s ease',
              borderRadius: 1.5,
              mx: 0.25,
              position: 'relative',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                color: 'common.white',
                backgroundColor: 'transparent',
              },
              '&:active': {
                transform: 'scale(0.92)',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.625rem',
              mt: 0.25,
              transition: 'font-weight 0.15s ease, opacity 0.15s ease',
              '&.Mui-selected': {
                fontSize: '0.625rem',
                fontWeight: 600,
              },
            },
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            // Dot indicator — apenas no item "Vídeo" (P5=A). Pulsante azul durante
            // render, verde estático quando concluído. Some em outras rotas.
            const isVideoItem = item.to === '/app/video';
            const showExportDot =
              isVideoItem &&
              (videoIsRendering || videoStatus === 'completed') &&
              location.pathname !== '/app/video';
            return (
              <BottomNavigationAction
                key={item.to}
                label={item.label}
                value={item.to}
                component={Link}
                to={item.to}
                icon={
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: ICON_SIZE_MD }} />
                    {/* Pill indicator — aparece no item selecionado */}
                    <Box
                      aria-hidden="true"
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 16,
                        height: 2.5,
                        borderRadius: 1.25,
                        backgroundColor: item.accent ? 'secondary.light' : 'primary.main',
                        opacity: 0,
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        '.Mui-selected &': {
                          opacity: 1,
                          transform: 'translateX(-50%) scale(1)',
                        },
                        ...(item.accent && {
                          boxShadow: `0 0 8px ${BRAND_PRIMARY_GLOW_SOFT}`,
                        }),
                      }}
                    />
                    {/* Dot de export de vídeo (P5=A) */}
                    {showExportDot && (
                      <Box
                        aria-label={videoIsRendering
                          ? t('exportCrossRoute.mobileDotActive')
                          : t('exportCrossRoute.mobileDotCompleted')}
                        role="status"
                        sx={{
                          position: 'absolute',
                          top: -2,
                          right: -4,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: videoIsRendering ? 'primary.main' : 'success.main',
                          boxShadow: videoIsRendering
                            ? `0 0 0 2px ${APP_SURFACE}, 0 0 8px ${BRAND_PRIMARY_GLOW_SOFT}`
                            : `0 0 0 2px ${APP_SURFACE}`,
                          animation: videoIsRendering
                            ? 'exportDotPulse 1.6s ease-in-out infinite'
                            : 'none',
                          '@keyframes exportDotPulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                            '50%': { transform: 'scale(1.4)', opacity: 0.7 },
                          },
                        }}
                      />
                    )}
                  </Box>
                }
                sx={item.accent ? {
                  '&.Mui-selected': {
                    color: 'secondary.light',
                  },
                } : undefined }
              />
            );
          })}

          {/* Botão "Mais" — abre/fecha o drawer */}
          <BottomNavigationAction
            label={t('mobileBottomNav.more')}
            value={MORE_VALUE}
            icon={<MoreHoriz sx={{ fontSize: ICON_SIZE_MD }} />}
            onClick={handleMoreClick}
            aria-label={t('mobileBottomNav.openMenu')}
            aria-expanded={drawerOpen}
            sx={{
              '&.Mui-selected': {
                color: 'text.primary',
                opacity: 0.9,
              },
            }}
          />
        </BottomNavigation>
      </Paper>

      {/* ── Drawer lateral (menu secundário) ── */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: APP_SURFACE,
              backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
              borderRight: `1px solid ${APP_BORDER}`,
              width: 280,
            },
          },
        }}
        aria-label={t('mobileBottomNav.ariaDrawer')}
        sx={{
          '& .MuiDrawer-paper': {
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          // Backdrop com blur — consistência com AppBar (blur 14-20px)
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: BLACK_40,
          },
          // Drawer acima da bottom nav (1200) mas abaixo do ActionBar (1400)
          '& .MuiModal-root': {
            zIndex: 1300,
          },
        }}
      >
        {/* Cabeçalho */}
        <Box sx={{ px: 2.5, py: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                component="img"
                src={logos.mark.transparent}
                alt="Script Master"
                sx={{ width: 32, height: 32, objectFit: 'contain' }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Script Master
              </Typography>
            </Stack>

            {/* Card do usuário */}
            <Paper
              variant="outlined"
              sx={(theme) => ({
                ...glassSurfaceSx(theme),
                px: 1.25,
                py: 1,
                borderRadius: RADIUS_SM,
              })}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Avatar
                  alt={user.displayName ?? t('studio.header.user.alt')}
                  src={user.photoURL ?? undefined }
                  slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                  sx={{ width: 32, height: 32, bgcolor: 'action.hover' }}
                >
                  {!user.photoURL && <Person sx={{ fontSize: ICON_SIZE_SM }} />}
                </Avatar>
                <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0] ?? t('studio.header.user.fallback')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user.email ?? t('studio.header.user.tooltip')}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        {/* Itens secundários de navegação */}
        <Box sx={{ flex: 1 }}>
          <List sx={{ px: 1, py: 1 }}>
            {drawerItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <ListItemButton
                  key={item.to}
                  onClick={() => handleNavigate(item.to, item.action)}
                  aria-current={isActive ? 'page' : undefined }
                  selected={isActive}
                  sx={{
                    borderRadius: RADIUS_XS,
                    mb: 0.5,
                    color: isActive ? 'common.white' : 'text.secondary',
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    transition: 'color 0.2s ease, background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: isActive ? 'action.selected' : 'action.hover',
                      color: 'text.primary',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': { bgcolor: 'action.selected' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    <Icon sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { variant: 'body2', sx: { fontWeight: isActive ? 600 : 400 } } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Ações da conta */}
        <Divider sx={{ borderColor: APP_BORDER }} />
        <Box sx={{ px: 1, py: 1 }}>
          <ListItemButton
            onClick={() => { closeDrawer(); openAnalyticsConsentDialog(); }}
            sx={{ borderRadius: RADIUS_XS, color: 'text.secondary' }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <Cookie sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText primary={t('analyticsConsent.manageCookies')} />
          </ListItemButton>
          <ListItemButton
            onClick={(e) => setLocaleAnchorEl(e.currentTarget)}
            sx={{ borderRadius: RADIUS_XS, color: 'text.secondary' }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <Language sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText
              primary={LOCALE_CONFIGS.find((c) => c.code === locale)?.label ?? locale }
              slotProps={{ primary: { variant: 'body2' } }}
            />
          </ListItemButton>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: RADIUS_XS,
              color: 'error.main',
              transition: 'background-color 0.2s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <Logout sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText
              primary={t('studio.header.logout.drawerLabel')}
              slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 400 } } }}
            />
          </ListItemButton>
          <ListItemButton
            onClick={() => {
              closeDrawer();
              // Dialog de exclusão é controlado pela Sidebar (presente em /app/* desktop)
              // Disparamos evento global para a Sidebar abrir o dialog
              window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
            }}
            sx={{
              borderRadius: RADIUS_XS,
              color: 'error.main',
              opacity: 0.7,
              transition: 'background-color 0.2s ease, opacity 0.2s ease',
              '&:hover': { bgcolor: 'action.hover', opacity: 1 },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
              <DeleteForever sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText
              primary={t('studio.header.deleteAccount.drawerLabel')}
              slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 400 } } }}
            />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Menu de seleção de idioma (drawer mobile) */}
      <Menu
        anchorEl={localeAnchorEl}
        open={Boolean(localeAnchorEl)}
        onClose={() => setLocaleAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
              border: `1px solid ${APP_BORDER}`,
            },
          },
        }}
      >
        {LOCALE_CONFIGS.map((config) => (
          <MenuItem
            key={config.code}
            selected={config.code === locale }
            onClick={() => {
              if (config.code !== locale) {
                setLocale(config.code as Locale);
              }
              setLocaleAnchorEl(null);
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Typography variant="body1" aria-hidden="true">
                {config.flag}
              </Typography>
            </ListItemIcon>
            <ListItemText
              primary={config.label}
              slotProps={{
                primary: {
                  variant: 'body2',
                  sx: { fontWeight: config.code === locale ? 600 : 400 },
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Dialog de confirmação de logout */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={handleCloseLogoutDialog}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
