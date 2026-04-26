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
import { useState } from 'react';
import Mic from '@mui/icons-material/Mic';
import Logout from '@mui/icons-material/Logout';
import Login from '@mui/icons-material/Login';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../../contexts/AuthContext';
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
  SHADOW_DEEP,
} from '../../theme/tokens';
import { glassSurfaceSx } from '../../theme/surfaces';

interface PublicNavItem {
  to: string;
  label: string;
}

const PUBLIC_NAV_ITEMS: PublicNavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/funcionalidades', label: 'Funcionalidades' },
  { to: '/precos', label: 'Preços' },
  { to: '/perguntas-frequentes', label: 'FAQ' },
  { to: '/sobre', label: 'Sobre' },
];

export function PublicHeader() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

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
        <Toolbar disableGutters sx={{ minHeight: APP_HEADER_HEIGHT, gap: { xs: 1, md: 1.5 } }}>
          {/* Logo */}
          <Box
            component={Link}
            to="/"
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
              aria-hidden="true"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'common.white',
                background: BRAND_GRADIENT,
                boxShadow: `0 4px 16px ${BRAND_PRIMARY_GLOW}`,
                transition: 'box-shadow 0.3s ease',
              }}
            >
              <Mic sx={{ fontSize: ICON_SIZE_LG }} />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.1, letterSpacing: '0.08em', fontSize: '0.625rem' }}>
                AI Studio
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                Script Master
              </Typography>
            </Box>
          </Box>

          {/* Navegação desktop */}
          {!isMobile && (
            <Box
              component="nav"
              aria-label="Navegação pública"
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
              {PUBLIC_NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
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

          {isMobile && <Box sx={{ flex: 1 }} />}

          {/* CTA / Avatar — mobile: sempre mostrar hamburger + botão */}
          {!loading && (
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ flexShrink: 0, alignItems: 'center' }}>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="Menu"
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
                  to="/app/estudio"
                  variant="contained"
                  startIcon={<AutoAwesome sx={{ fontSize: ICON_SIZE_MD }} />}
                  size="small"
                  sx={{
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                    },
                  }}
                >
                  Abrir App
                </Button>
              ) : (
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  startIcon={!isMobile ? <Login sx={{ fontSize: ICON_SIZE_MD }} /> : undefined}
                  size="small"
                  sx={{
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': {
                      boxShadow: `0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
                    },
                  }}
                >
                  Entrar
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
        open={isMobile && drawerOpen}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: drawerPaperSx } }}
        aria-label="Menu de navegação"
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Script Master
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: APP_BORDER }} />

        <Box onClick={closeDrawer} sx={{ flex: 1 }}>
          <List sx={{ px: 1, py: 1 }}>
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  component={Link}
                  to={item.to}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
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
                onClick={() => { closeDrawer(); logout(); }}
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
                <ListItemText primary="Sair" slotProps={{ primary: { variant: 'body2' } }} />
              </ListItemButton>
            </Box>
          </>
        )}
      </Drawer>
    </AppBar>
  );
}
