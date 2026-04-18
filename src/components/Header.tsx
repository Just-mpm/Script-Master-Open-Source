import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import type { ElementType } from 'react';
import ImageIcon from '@mui/icons-material/Image';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Login from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import Mic from '@mui/icons-material/Mic';
import Person from '@mui/icons-material/Person';
import PlayCircle from '@mui/icons-material/PlayCircle';
import Sparkles from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { APP_HEADER_HEIGHT, APP_MAX_WIDTH, BRAND_GRADIENT } from '../theme/tokens';
import { glassSurfaceSx } from '../theme/surfaces';

interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  accent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Estúdio', icon: Mic },
  { to: '/image', label: 'Imagem', icon: ImageIcon },
  { to: '/video', label: 'Vídeo', icon: PlayCircle },
  { to: '/assistant', label: 'IA', icon: Sparkles, accent: true },
  { to: '/library', label: 'Biblioteca', icon: LocalLibrary },
];

export function Header() {
  const { user, loading, login, logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <AppBar position="sticky" component="header" role="banner">
      <Container maxWidth={false} sx={{ maxWidth: APP_MAX_WIDTH, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: APP_HEADER_HEIGHT, gap: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flexShrink: 0 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'common.white',
                background: BRAND_GRADIENT,
                boxShadow: '0 18px 40px rgba(34, 211, 238, 0.28)',
              }}
            >
              <Mic sx={{ fontSize: 18 }} />
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

          <Paper
            component="nav"
            variant="outlined"
            aria-label="Navegação principal"
            sx={(theme) => ({
              ...glassSurfaceSx(theme),
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 0.75,
              py: 0.75,
              borderRadius: 999,
              overflowX: 'auto',
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
                    px: { xs: 1.25, sm: 1.75 },
                    color: isActive ? 'common.white' : item.accent ? 'secondary.light' : 'text.secondary',
                    bgcolor: isActive && !item.accent ? 'action.hover' : undefined,
                    '&:hover': {
                      bgcolor: isActive
                        ? item.accent
                          ? 'secondary.dark'
                          : 'action.hover'
                        : 'action.hover',
                    },
                    '& .MuiButton-startIcon': {
                      display: { xs: 'none', sm: 'inline-flex' },
                      mr: { sm: 1 },
                    },
                  }}
                  startIcon={<Icon sx={{ fontSize: 16 }} aria-hidden="true" />}
                >
                  {item.label}
                </Button>
              );
            })}
          </Paper>

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
            {!loading && (user ? (
              <>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    ...glassSurfaceSx(theme),
                    px: { xs: 1, sm: 1.5 },
                    py: 0.75,
                    borderRadius: 999,
                  })}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                      alt={user.displayName ?? 'Usuário'}
                      src={user.photoURL ?? undefined}
                      sx={{ width: 28, height: 28, bgcolor: 'action.hover' }}
                    >
                      {!user.photoURL && <Person sx={{ fontSize: 14 }} />}
                    </Avatar>
                    <Typography
                      variant="body2"
                      sx={{ display: { xs: 'none', lg: 'block' }, color: 'text.secondary', fontWeight: 600 }}
                    >
                      {user.displayName?.split(' ')[0] ?? 'Conta'}
                    </Typography>
                  </Stack>
                </Paper>

                <Tooltip title="Sair">
                  <IconButton onClick={logout} color="error" aria-label="Sair">
                    <Logout sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Button onClick={login} variant="contained" startIcon={<Login sx={{ fontSize: 16 }} />}>
                Login
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
