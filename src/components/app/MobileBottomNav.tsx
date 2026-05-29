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
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Logout from '@mui/icons-material/Logout';
import DeleteForever from '@mui/icons-material/DeleteForever';
import Mic from '@mui/icons-material/Mic';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Palette from '@mui/icons-material/Palette';
import Person from '@mui/icons-material/Person';
import PlayCircle from '@mui/icons-material/PlayCircle';
import Settings from '@mui/icons-material/Settings';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../features/i18n';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  BRAND_PRIMARY_GLOW_SOFT,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
  APP_BORDER,
  APP_SURFACE,
  WHITE_05,
  WHITE_015,
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
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── 4 destinos principais ──
  const navItems = useMemo<BottomNavItem[]>(() => [
    { to: '/app/biblioteca', label: t('studio.header.nav.library'), icon: LocalLibrary },
    { to: '/app/video', label: t('studio.header.nav.video'), icon: PlayCircle },
    { to: '/app/assistente', label: t('studio.header.nav.ai'), icon: Sparkles, accent: true },
    { to: '/app/estudio', label: t('studio.header.nav.studio'), icon: Mic },
  ], [t]);

  // ── Itens do drawer (secundários + conta) ──
  const drawerItems = useMemo(() => [
    { to: '/app/imagens', label: t('studio.header.nav.image'), icon: ImageIcon },
    { to: '/app/pintura-rapida', label: t('studio.header.nav.speedPaint'), icon: Palette },
    { to: '/app/configuracoes', label: t('studio.header.nav.settings'), icon: Settings },
  ], [t]);

  // ── Handlers ──
  const handleMoreClick = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleNavigate = useCallback((to: string) => {
    navigate(to);
    closeDrawer();
  }, [navigate, closeDrawer]);

  const handleLogout = useCallback(() => {
    closeDrawer();
    logout();
  }, [closeDrawer, logout]);

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
                  </Box>
                }
                sx={item.accent ? {
                  '&.Mui-selected': {
                    color: 'secondary.light',
                  },
                } : undefined}
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                aria-hidden="true"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'common.white',
                  background: BRAND_GRADIENT,
                  boxShadow: `0 12px 28px ${BRAND_PRIMARY_GLOW}`,
                }}
              >
                <Mic sx={{ fontSize: ICON_SIZE_MD }} />
              </Box>
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
                borderRadius: 3,
              })}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Avatar
                  alt={user.displayName ?? t('studio.header.user.alt')}
                  src={user.photoURL ?? undefined}
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
                  onClick={() => handleNavigate(item.to)}
                  aria-current={isActive ? 'page' : undefined}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
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
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
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
              // Dialog de exclusão é controlado pelo Header
              // Disparamos evento para o Header abrir o dialog
              window.dispatchEvent(new CustomEvent('open-delete-account-dialog'));
            }}
            sx={{
              borderRadius: 2,
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
    </>
  );
}
