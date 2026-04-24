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
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { useState, type ElementType } from 'react';
import ImageIcon from '@mui/icons-material/Image';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Login from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import Mic from '@mui/icons-material/Mic';
import Palette from '@mui/icons-material/Palette';
import Person from '@mui/icons-material/Person';
import PlayCircle from '@mui/icons-material/PlayCircle';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../contexts/AuthContext';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';
import { useLocation } from 'react-router-dom';
import { APP_HEADER_HEIGHT, APP_MAX_WIDTH, BRAND_GRADIENT,   BRAND_PRIMARY_GLOW, ICON_SIZE_MD, ICON_SIZE_SM, ICON_SIZE_LG, GAP_COMPACT, GAP_MEDIUM, APP_SURFACE, APP_BORDER, WHITE_05, WHITE_015 } from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  accent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/estudio', label: 'Estúdio', icon: Mic },
  { to: '/app/imagens', label: 'Imagem', icon: ImageIcon },
  { to: '/app/video', label: 'Vídeo', icon: PlayCircle },
  { to: '/app/pintura-rapida', label: 'Speed Paint', icon: Palette },
  { to: '/app/assistente', label: 'IA', icon: Sparkles, accent: true },
  { to: '/app/biblioteca', label: 'Biblioteca', icon: LocalLibrary },
];

export function Header() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  /** Estilo glass do drawer (fundo + borda) */
  const drawerPaperSx = {
    backgroundColor: APP_SURFACE,
    backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
    borderRight: `1px solid ${APP_BORDER}`,
  };

  return (
    <AppBar position="sticky" component="header" role="banner">
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: APP_HEADER_HEIGHT, gap: { xs: 1, md: 1.5 } }}>
          <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flexShrink: 0, alignItems: 'center' }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'common.white',
                background: BRAND_GRADIENT,
                boxShadow: `0 18px 40px ${BRAND_PRIMARY_GLOW}`,
              }}
            >
              <Mic sx={{ fontSize: ICON_SIZE_LG }} />
            </Box>

            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.1 }}>
                AI Studio
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                Script Master
              </Typography>
            </Box>
          </Stack>

          {/* Navegação desktop — oculta em mobile */}
          {!isMobile && (
            <Paper
              component="nav"
              variant="outlined"
              aria-label="Navegação principal"
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
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
              })}
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.to;

                return (
                  <Button
                    key={item.to}
                    href={item.to}
                    aria-current={isActive ? 'page' : undefined}
                    variant={isActive ? 'contained' : 'text'}
                    color={item.accent && isActive ? 'secondary' : 'primary'}
                    sx={{
                      flexShrink: 0,
                      minWidth: 'auto',
                      px: { xs: 1, sm: 1.75 },
                      color: isActive ? 'common.white' : item.accent ? 'secondary.light' : 'text.secondary',
                      bgcolor: isActive && !item.accent ? 'action.hover' : undefined,
                      '&:hover': {
                        bgcolor: isActive
                          ? item.accent
                            ? 'secondary.dark'
                            : 'action.hover'
                          : 'action.hover',
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
                {/* Botão menu mobile — visível apenas em telas pequenas */}
                {isMobile && (
                  <Tooltip title="Menu">
                    <IconButton
                      color="inherit"
                      aria-label="Abrir menu de navegação"
                      onClick={toggleDrawer}
                    >
                      <MenuIcon sx={{ fontSize: ICON_SIZE_LG }} />
                    </IconButton>
                  </Tooltip>
                )}

                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    ...glassSurfaceSx(theme),
                    px: { xs: 1, sm: 1.5 },
                    py: 0.75,
                    borderRadius: 8,
                  })}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Avatar
                      alt={user.displayName ?? 'Usuário'}
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
                      {user.displayName?.split(' ')[0] ?? 'Conta'}
                    </Typography>
                  </Stack>
                </Paper>

                {!isMobile && (
                  <Tooltip title="Sair">
                    <IconButton onClick={logout} color="error" aria-label="Sair">
                      <Logout sx={{ fontSize: ICON_SIZE_LG }} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            ) : (
              <Button href="/login" variant="contained" startIcon={<Login sx={{ fontSize: ICON_SIZE_MD }} />}>
                Login
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
        aria-label="Menu de navegação"
      >
        {/* Cabeçalho do drawer */}
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Script Master
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        <Box onClick={closeDrawer} sx={{ flex: 1 }}>
          <List sx={{ px: 1, py: 1 }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.to;

              return (
                <ListItemButton
                  key={item.to}
                  href={item.to}
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
                    bgcolor: isActive ? 'action.hover' : 'transparent',
                    '&:hover': {
                      bgcolor: isActive
                        ? item.accent
                          ? 'secondary.dark'
                          : 'action.hover'
                        : 'action.hover',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.hover' },
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

        {/* Rodapé do drawer — logout */}
        {user && (
          <>
            <Divider sx={{ borderColor: APP_BORDER }} />
            <Box sx={{ px: 1, py: 1 }}>
              <ListItemButton
                onClick={() => { closeDrawer(); logout(); }}
                sx={{
                  borderRadius: 2,
                  color: 'error.main',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                  <Logout sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
                </ListItemIcon>
                <ListItemText
                  primary="Sair"
                  slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 400 } } }}
                />
              </ListItemButton>
            </Box>
          </>
        )}
      </Drawer>
    </AppBar>
  );
}
