import { useState, type ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import Mic from '@mui/icons-material/Mic';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../features/i18n';
import {
  APP_BORDER,
  BRAND_GRADIENT,
  BRAND_PRIMARY_GLOW,
  ICON_SIZE_LG,
  ICON_SIZE_MD,
  RADIUS_XS,
} from '../../theme/tokens';
import { appDrawerBackdropSx, appDrawerPaperSx } from '../../theme/surfaces';

interface GuestNavItem {
  to: string;
  label: string;
  icon?: ElementType;
}

/**
 * Navegação mobile (drawer) para visitantes não autenticados.
 *
 * Substitui o botão hamburguer e drawer que viviam no `Header` (que
 * será removido). Como visitantes não acessam rotas `/app/*`, este
 * drawer lista apenas páginas públicas e CTAs de login/cadastro.
 *
 * Renderiza nada em desktop ou quando há usuário autenticado
 * (autenticados usam `MobileBottomNav`).
 */
export function GuestMobileNav() {
  const { user } = useAuth();
  const { t } = useLocale();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Guarda principal: visitantes mobile. Demais casos usam outras navegações.
  if (!isMobile || user) return null;

  /** Itens de navegação pública (páginas institucionais). */
  const navItems: GuestNavItem[] = [
    { to: '/', label: t('nav.home') },
    { to: '/funcionalidades', label: t('nav.features') },
    { to: '/open-source', label: t('nav.openSource') },
    { to: '/perguntas-frequentes', label: t('nav.faq') },
    { to: '/sobre', label: t('nav.about') },
    { to: '/contato', label: t('nav.contact') },
  ];

  /** CTAs de autenticação (escolhe o oposto à rota atual). */
  const isLoginRoute = location.pathname === '/login';
  const authCta = isLoginRoute
    ? { to: '/cadastro', label: t('nav.register') }
    : { to: '/login', label: t('nav.login') };

  const toggleDrawer = (): void => setDrawerOpen((prev) => !prev);
  const closeDrawer = (): void => setDrawerOpen(false);

  return (
    <>
      {/* Botão hamburguer — abre o drawer de navegação pública */}
      <Tooltip title={t('nav.ariaMenu')}>
        <IconButton
          color="inherit"
          aria-label={t('nav.ariaMenu')}
          aria-expanded={drawerOpen}
          aria-controls="guest-mobile-drawer"
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

      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={closeDrawer}
        slotProps={{
          paper: { sx: appDrawerPaperSx },
          backdrop: { sx: appDrawerBackdropSx },
        }}
        id="guest-mobile-drawer"
        aria-label={t('nav.ariaDrawerMenu')}
        sx={{
          '& .MuiDrawer-paper': {
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      >
        {/* Cabeçalho do drawer — marca */}
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

        {/* Lista de páginas públicas — clicar em item fecha o drawer */}
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
                    '&:hover': {
                      bgcolor: isActive ? 'action.selected' : 'action.hover',
                      color: 'text.primary',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: { variant: 'body2', sx: { fontWeight: isActive ? 600 : 400 } },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Rodapé do drawer — CTA de login/cadastro */}
        <Divider sx={{ borderColor: APP_BORDER }} />
        <Box sx={{ px: 1, py: 1 }}>
          <ListItemButton
            component={Link}
            to={authCta.to}
            onClick={closeDrawer}
            sx={{
              borderRadius: RADIUS_XS,
              color: 'primary.main',
              fontWeight: 600,
              transition: 'background-color 0.2s ease',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ListItemText
              primary={authCta.label}
              slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }}
            />
          </ListItemButton>
        </Box>
      </Drawer>
    </>
  );
}
