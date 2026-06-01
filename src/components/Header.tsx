import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import useMediaQuery from '@mui/material/useMediaQuery';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, useMemo, useEffect, type ElementType } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import ImageIcon from '@mui/icons-material/Image';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Login from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import DeleteForever from '@mui/icons-material/DeleteForever';
import Mic from '@mui/icons-material/Mic';
import Palette from '@mui/icons-material/Palette';
import Person from '@mui/icons-material/Person';
import PlayCircle from '@mui/icons-material/PlayCircle';
import Settings from '@mui/icons-material/Settings';
import Cookie from '@mui/icons-material/Cookie';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../contexts/AuthContext';
import { useLocale, LocaleSelector, LOCALE_CONFIGS } from '../features/i18n';
import { isOpenBetaEnabled } from '../lib/env';
import { CreditIndicator } from './CreditIndicator';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';
import { Link, useLocation } from 'react-router-dom';
import {
  APP_HEADER_HEIGHT,
  APP_MAX_WIDTH,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
  ICON_SIZE_LG,
  GAP_COMPACT,
  GAP_MEDIUM,
  APP_SURFACE,
  APP_BORDER,
  APP_BORDER_STRONG,
  SHADOW_DEEP,
  WHITE_05,
  WHITE_015,
} from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';
import logos from '../assets/logos';
import { openAnalyticsConsentDialog } from './app/AnalyticsConsentPrompt';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  accent?: boolean;
}

export function Header() {
  const { user, loading, logout, deleteAccount } = useAuth();
  const { t, locale } = useLocale();
  const location = useLocation();
  const currentPath = location.pathname;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isScrolled = useScrollTrigger({
    disableHysteresis: true,
    threshold: 12,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Escuta evento do MobileBottomNav para abrir dialog de exclusão
  useEffect(() => {
    const handleOpenDeleteDialog = () => {
      setDeleteConfirmText('');
      setDeleteDialogOpen(true);
    };
    window.addEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
    return () => window.removeEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
  }, []);

  // Billing — badge do plano no header

  const navItems = useMemo<NavItem[]>(() => [
    { to: '/app/estudio', label: t('studio.header.nav.studio'), icon: Mic },
    { to: '/app/imagens', label: t('studio.header.nav.image'), icon: ImageIcon },
    { to: '/app/video', label: t('studio.header.nav.video'), icon: PlayCircle },
    { to: '/app/pintura-rapida', label: t('studio.header.nav.speedPaint'), icon: Palette },
    { to: '/app/assistente', label: t('studio.header.nav.ai'), icon: Sparkles, accent: true },
    { to: '/app/biblioteca', label: t('studio.header.nav.library'), icon: LocalLibrary },
    { to: '/app/configuracoes', label: t('studio.header.nav.settings'), icon: Settings },
  ], [t]);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  const handleOpenDeleteDialog = () => {
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

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

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch {
      // Erro já tratado no AuthContext
      setIsDeleting(false);
    }
  };

  /** Estilo glass do drawer (fundo + borda) */
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
        backdropFilter: isScrolled ? 'blur(20px)' : 'blur(14px)',
        backgroundColor: isScrolled ? 'rgba(7, 10, 25, 0.92)' : 'rgba(7, 10, 25, 0.82)',
        backgroundImage: isScrolled ? `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)` : 'none',
        borderBottom: `1px solid ${isScrolled ? APP_BORDER_STRONG : APP_BORDER}`,
        boxShadow: isScrolled ? `0 12px 40px ${SHADOW_DEEP}` : 'none',
        transition: 'box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: { xs: `calc(${APP_HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`, md: APP_HEADER_HEIGHT }, gap: { xs: 1, md: 1.5 }, pt: 'env(safe-area-inset-top, 0px)' }}>
          {/* Logo — clicável para voltar ao estúdio */}
          <Box
            component={Link}
            to="/app/estudio"
            aria-label={t('nav.logoAlt')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              flexShrink: 0,
              transition: 'opacity 0.2s ease',
              '&:hover': { opacity: 0.88 },
            }}
          >
            <Box
              component="img"
              src={logos.mark.transparent}
              alt=""
              aria-hidden="true"
              sx={{ width: 36, height: 36, objectFit: 'contain' }}
            />

            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', lineHeight: 1.1, letterSpacing: '0.08em', fontSize: '0.625rem' }}
              >
                {t('studio.header.subtitle')}
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                Script Master
              </Typography>
            </Box>
          </Box>

          {/* Navegação desktop — oculta em mobile */}
          {!isMobile && (
            <Paper
              component="nav"
              variant="outlined"
              aria-label={t('studio.header.nav.ariaNav')}
              sx={(theme) => ({
                ...glassSurfaceSx(theme),
                display: 'flex',
                alignItems: 'center',
                gap: GAP_COMPACT,
                px: GAP_COMPACT,
                py: GAP_COMPACT,
                borderRadius: 8,
                overflowX: 'auto',
                overscrollBehaviorX: 'contain',
                flex: 1,
                minWidth: 0,
                backgroundColor: isScrolled ? WHITE_015 : undefined,
                borderColor: isScrolled ? APP_BORDER_STRONG : undefined,
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
              })}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.to;

                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    variant="text"
                    sx={{
                      flexShrink: 0,
                      minWidth: 'auto',
                      px: { xs: 1, sm: 1.75 },
                      color: isActive ? 'common.white' : item.accent ? 'secondary.light' : 'text.secondary',
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: 1.5,
                      transition: 'color 0.2s ease, background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: isActive ? 'action.selected' : 'action.hover',
                        color: 'text.primary',
                      },
                    }}
                    startIcon={<Icon sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      {item.label}
                    </Box>
                  </Button>
                );
              })}
            </Paper>
          )}

          {/* Preenche espaço vazio no mobile (onde estaria a nav horizontal) */}
          {isMobile && <Box sx={{ flex: 1 }} />}

          <NetworkStatusIndicator />

          <Stack direction="row" spacing={GAP_MEDIUM} sx={{ flexShrink: 0, alignItems: 'center' }}>
            {!loading && (user ? (
              <>
                {/* Botão menu mobile — visível apenas para visitantes (autenticados usam bottom nav) */}
                {isMobile && !user && (
                  <Tooltip title={t('nav.ariaMenu')}>
                    <IconButton
                      color="inherit"
                      aria-label={t('studio.header.nav.ariaOpenMenu')}
                      onClick={toggleDrawer}
                      sx={{
                        color: 'text.secondary',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      <MenuIcon sx={{ fontSize: ICON_SIZE_LG }} />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title={user.email ?? user.displayName ?? t('studio.header.user.tooltip')}>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    ...glassSurfaceSx(theme),
                    px: { xs: 1, sm: 1.5 },
                    py: 0.75,
                    borderRadius: 8,
                    backgroundColor: isScrolled ? WHITE_015 : undefined,
                    transition: 'border-color 0.2s ease',
                    '&:hover': {
                      borderColor: APP_BORDER_STRONG,
                    },
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Avatar
                      alt={user.displayName ?? t('studio.header.user.alt')}
                      src={user.photoURL ?? undefined}
                      slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                      sx={{ width: 28, height: 28, bgcolor: 'action.hover' }}
                    >
                      {!user.photoURL && <Person sx={{ fontSize: ICON_SIZE_SM }} />}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{ display: { xs: 'none', lg: 'block' }, color: 'text.secondary', fontWeight: 600 }}
                    >
                      {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0] ?? t('studio.header.user.fallback')}
                    </Typography>
                  </Stack>
                </Paper>
                </Tooltip>

                {/* Indicador de créditos — visível apenas no beta aberto */}
                {isOpenBetaEnabled() && <CreditIndicator />}

                {!isMobile && (
                  <Tooltip title={LOCALE_CONFIGS.find((c) => c.code === locale)?.label ?? ''}>
                    <LocaleSelector />
                  </Tooltip>
                )}

                {!isMobile && (
                  <Tooltip title={t('analyticsConsent.manageCookies')}>
                    <IconButton onClick={openAnalyticsConsentDialog} aria-label={t('analyticsConsent.manageCookies')}>
                      <Cookie sx={{ fontSize: ICON_SIZE_MD }} />
                    </IconButton>
                  </Tooltip>
                )}

                {!isMobile && (
                  <Tooltip title={t('studio.header.logout.tooltip')}>
                    <IconButton
                      onClick={handleOpenLogoutDialog}
                      color="error"
                      aria-label={t('studio.header.logout.ariaLabel')}
                      sx={{
                        transition: 'background-color 0.2s ease, color 0.2s ease',
                      }}
                    >
                      <Logout sx={{ fontSize: ICON_SIZE_LG }} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            ) : (
              <Button
                component={Link}
                to="/login"
                variant="contained"
                startIcon={<Login sx={{ fontSize: ICON_SIZE_MD }} />}
                sx={{
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW}`,
                  },
                }}
              >
                {t('studio.header.login')}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </Container>

      {/* Drawer mobile de navegação */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={isMobile && drawerOpen}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: drawerPaperSx } }}
        aria-label={t('studio.header.nav.ariaDrawerMenu')}
        sx={{
          '& .MuiDrawer-paper': {
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      >
        {/* Cabeçalho do drawer */}
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

            {user && (
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
            )}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        <Box onClick={closeDrawer} sx={{ flex: 1 }}>
          <List sx={{ px: 1, py: 1 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.to;

              return (
                <ListItemButton
                  key={item.to}
                  component={Link}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    color: isActive
                      ? 'common.white'
                      : item.accent
                        ? 'secondary.light'
                        : 'text.secondary',
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

        {/* Rodapé do drawer — ações da conta */}
        {user && (
          <>
            <Divider sx={{ borderColor: APP_BORDER }} />
            <Box sx={{ px: 1, py: 1 }}>
              <ListItemButton
                onClick={() => { closeDrawer(); openAnalyticsConsentDialog(); }}
                sx={{ borderRadius: 2, color: 'text.secondary' }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <Cookie sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
                </ListItemIcon>
                <ListItemText primary={t('analyticsConsent.manageCookies')} />
              </ListItemButton>
              <ListItemButton
                onClick={() => { closeDrawer(); handleOpenLogoutDialog(); }}
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
                onClick={() => { closeDrawer(); handleOpenDeleteDialog(); }}
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
          </>
        )}
      </Drawer>

      {/* Dialog de confirmação de logout */}
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={handleCloseLogoutDialog}
        onConfirm={handleConfirmLogout}
      />

      {/* Dialog de confirmação de exclusão de conta */}
      <Dialog
        open={deleteDialogOpen}
        onClose={isDeleting ? undefined : handleCloseDeleteDialog}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-account-title"
        slotProps={{
          paper: { sx: { borderRadius: 2 } },
        }}
      >
        <DialogTitle id="delete-account-title">
          {isDeleting ? t('studio.header.deleteAccount.dialogTitleDeleting') : t('studio.header.deleteAccount.dialogTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {t('studio.header.deleteAccount.dialogDescription')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <span dangerouslySetInnerHTML={{ __html: t('studio.header.deleteAccount.dialogConfirm') }} />
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="EXCLUIR"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            disabled={isDeleting}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog} color="inherit" disabled={isDeleting}>
            {t('studio.header.deleteAccount.dialogCancel')}
          </Button>
          <Button
            onClick={handleConfirmDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
          >
            {isDeleting ? t('studio.header.deleteAccount.dialogDeleting') : t('studio.header.deleteAccount.dialogDelete')}
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}
