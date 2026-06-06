import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Mic from '@mui/icons-material/Mic';
import Logout from '@mui/icons-material/Logout';
import Login from '@mui/icons-material/Login';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale, LocaleSelector } from '../../features/i18n';
import { LogoutConfirmDialog } from '../LogoutConfirmDialog';
import {
  APP_HEADER_HEIGHT,
  APP_MAX_WIDTH,
  APP_BORDER,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  BRAND_PRIMARY_GLOW_SOFT,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  GAP_MEDIUM,
  APP_SURFACE,
  WHITE_05,
  WHITE_015,
  SHADOW_DEEP, RADIUS_XS } from '../../theme/tokens';
import { glassSurfaceSx } from '../../theme/surfaces';
import logos from '../../assets/logos';

export function PublicHeader() {
  const { user, loading, logout } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const drawerTitleId = 'public-mobile-navigation-title';
  const isLoginRoute = location.pathname === '/login';
  const isRegisterRoute = location.pathname === '/cadastro';
  const guestCta = isLoginRoute
    ? { to: '/cadastro', label: t('nav.register') }
    : { to: '/login', label: t('nav.login') };

  /** Itens de navegação com labels traduzidos via i18n */
  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/funcionalidades', label: t('nav.features') },
    { to: '/open-source', label: t('nav.openSource') },
    { to: '/perguntas-frequentes', label: t('nav.faq') },
    { to: '/sobre', label: t('nav.about') },
    { to: '/contato', label: t('nav.contact') },
  ];

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleOpenLogoutDialog = () => {
    setLogoutDialogOpen(true);
  };

  const handleCloseLogoutDialog = () => {
    setLogoutDialogOpen(false);
  };

  const handleConfirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
  };

  const drawerPaperSx = {
    backgroundColor: APP_SURFACE,
    backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
    borderRight: `1px solid ${APP_BORDER}`,
  };

  return (
    <AppBar
      position="sticky"
      component="header"
      role="banner"
      sx={{
        transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        '&:not(:first-of-type)': {
          boxShadow: `0 4px 24px ${SHADOW_DEEP}`,
        },
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: APP_HEADER_HEIGHT, gap: { xs: 0.75, sm: 1, md: 1.5 } }}>
          {/* Logo — aria-label descritivo para screen readers */}
          <Box
            component={Link}
            to="/"
            aria-label={t('nav.logoAlt')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1.5 },
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              flexBasis: { xs: 128, sm: 178, md: 'auto' },
              maxWidth: { xs: 132, sm: 190, md: 'none' },
              flexGrow: { xs: 1, md: 0 },
              flexShrink: 1,
              transition: 'opacity 0.2s ease',
              '&:hover': { opacity: 0.88 },
            }}
          >
            <Box
              component="img"
              src={logos.mark.transparent}
              alt=""
              aria-hidden="true"
              sx={{ width: { xs: 30, sm: 36 }, height: { xs: 30, sm: 36 }, objectFit: 'contain', flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="overline"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'text.secondary',
                  lineHeight: 1.1,
                  letterSpacing: '0.08em',
                  fontSize: '0.625rem',
                }}
              >
                AI Studio
              </Typography>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  lineHeight: 1.1,
                  fontSize: { xs: '0.88rem', sm: '1.25rem' },
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Script Master
              </Typography>
            </Box>
          </Box>

          {/* Navegação desktop */}
          {!isMobile && (
            <Box
              component="nav"
              aria-label={t('nav.ariaNav')}
              sx={(theme) => ({
                ...glassSurfaceSx(theme),
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 8,
                flex: 1,
                justifyContent: 'center',
              })}
            >
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined }
                    sx={{
                      color: isActive ? 'text.primary' : 'text.secondary',
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      transition: 'color 0.2s ease, background-color 0.2s ease',
                      '&:hover': { color: 'text.primary', bgcolor: isActive ? 'action.selected' : 'action.hover' },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}
          {/* CTA / Avatar — mobile: sempre mostrar hamburger + botão */}
          {!loading && (
            <Stack
              direction="row"
              spacing={{ xs: 0.5, sm: GAP_MEDIUM }}
              sx={{ flexShrink: 0, alignItems: 'center' }}
            >
              <LocaleSelector size="small" />
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label={t('nav.ariaMenu')}
                  onClick={toggleDrawer}
                  sx={{
                    color: 'text.secondary',
                    transition: 'color 0.2s ease',
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  <MenuIcon sx={{ fontSize: ICON_SIZE_LG }} />
                </IconButton>
              )}
              {user ? (
                <Button
                  component={Link}
                  to="/app/assistente"
                  variant="contained"
                  startIcon={<AutoAwesome sx={{ fontSize: ICON_SIZE_MD }} />}
                  size="small"
                  sx={{
                    minWidth: { xs: 'auto', sm: 64 },
                    px: { xs: 1.25, sm: 2 },
                    whiteSpace: 'nowrap',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                    },
                  }}
                >
                  {t('nav.openApp')}
                </Button>
              ) : (
                <Button
                  component={Link}
                  to={guestCta.to}
                  variant="contained"
                  startIcon={!isMobile && !isRegisterRoute ? <Login sx={{ fontSize: ICON_SIZE_MD }} /> : undefined }
                  size="small"
                  sx={{
                    minWidth: { xs: 'auto', sm: 64 },
                    px: { xs: 1.25, sm: 2 },
                    whiteSpace: 'nowrap',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                    },
                  }}
                >
                  {guestCta.label}
                </Button>
              )}
            </Stack>
          )}
        </Toolbar>
      </Container>

      {/* Drawer mobile */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={isMobile && drawerOpen }
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: drawerPaperSx } }}
        aria-labelledby={drawerTitleId}
        sx={{
          '& .MuiDrawer-paper': {
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 2 }}>
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
            <Typography id={drawerTitleId} variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
              Script Master
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        <Box onClick={closeDrawer} sx={{ flex: 1 }}>
          <List sx={{ px: 1, py: 1 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  component={Link}
                  to={item.to}
                  selected={isActive}
                  aria-current={isActive ? 'page' : undefined }
                  sx={{
                    borderRadius: RADIUS_XS,
                    mb: 0.5,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    bgcolor: isActive ? 'action.selected' : 'transparent',
                    transition: 'color 0.2s ease, background-color 0.2s ease',
                    '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover', color: 'text.primary' },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { variant: 'body2', sx: { fontWeight: isActive ? 600 : 400 } } }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {user && (
          <>
            <Divider sx={{ borderColor: APP_BORDER }} />
            <Box sx={{ px: 1, py: 1 }}>
              <ListItemButton
                onClick={() => { closeDrawer(); handleOpenLogoutDialog(); }}
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
                <ListItemText primary={t('nav.logout')} slotProps={{ primary: { variant: 'body2' } }} />
              </ListItemButton>
            </Box>
          </>
        )}
      </Drawer>
      {/* Dialog de confirmação de logout */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={handleCloseLogoutDialog}
        onConfirm={handleConfirmLogout}
      />
    </AppBar>
  );
}
