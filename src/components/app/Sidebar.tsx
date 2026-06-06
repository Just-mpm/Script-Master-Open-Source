import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import ImageIcon from '@mui/icons-material/Image';
import LocalLibrary from '@mui/icons-material/LocalLibrary';
import Mic from '@mui/icons-material/Mic';
import Palette from '@mui/icons-material/Palette';
import PlayCircle from '@mui/icons-material/PlayCircle';
import RateReviewIcon from '@mui/icons-material/RateReview';
import Settings from '@mui/icons-material/Settings';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from 'zustand';
import { useLocation } from 'react-router-dom';
import { useLocale } from '../../features/i18n';
import { useSidebarStore } from '../../features/sidebar/store';
import { useFeedbackDialog } from '../../components/feedback';
import { useVideoRenderController } from '../../features/video-render/store/videoRenderController';
import { useSpeedPaintRenderController } from '../../features/speed-paint/store/speedPaintRenderController';
import {
  APP_BORDER,
  APP_SURFACE,
  BRAND_SECONDARY,
  SIDEBAR_TRANSITION_DURATION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  WHITE_015,
  WHITE_05,
  RADIUS_XS,
  WHITE_08,
} from '../../theme/tokens';
import { alpha } from '@mui/material/styles';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNavItem } from './SidebarNavItem';

/** Item de navegação exibido no corpo da sidebar. */
interface NavItem {
  to: string;
  label: string;
  icon: ElementType;
  accent?: boolean;
  /** Quando definido, ao clicar o item aciona uma ação sem navegar (ex: abrir dialog) */
  action?: 'feedback';
}

/**
 * Sidebar de navegação colapsável — substitui o `Header` (AppBar) nas
 * rotas `/app/*` em desktop. Largura: 68px (colapsado) / 264px (expandido).
 *
 * Em mobile fica oculta (controle no `App.tsx`) — o `MobileBottomNav`
 * cobre a navegação. O estado collapsed/expanded é persistido em
 * localStorage via `useSidebarStore` (chave `s2a_sidebar_collapsed`).
 *
 * Estrutura:
 * 1. `SidebarHeader` — logo + botão de toggle
 * 2. `Divider`
 * 3. Lista de `SidebarNavItem` (scroll interno)
 * 4. `SidebarFooter` — avatar, locale, cookies, logout
 *
 * Inclui o `DeleteAccountDialog` e escuta o evento
 * `open-delete-account-dialog` disparado pelo `MobileBottomNav`
 * (passo 14 do plano ajustará para callback direto, mas o listener
 * permanece como contrato retrocompatível).
 */
export function Sidebar() {
  const theme = useTheme();
  const { t } = useLocale();
  const location = useLocation();
  const openFeedback = useFeedbackDialog();
  const { collapsed, toggle } = useSidebarStore(
    useShallow((s) => ({ collapsed: s.collapsed, toggle: s.toggle })),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ── Indicador de export de vídeo no nav item "Vídeo" (M7) ──
  // Lê slices primitivas do controller — espelha o padrão do `MobileBottomNav`.
  const videoIsRendering = useStore(useVideoRenderController, (s) => s.isRendering);
  const videoStatus = useStore(useVideoRenderController, (s) => s.status);

  // ── Indicador de export de speed paint no nav item "Speed Paint" ──
  // Lê slices primitivas do controller — espelha o padrão do vídeo acima.
  const spIsRendering = useStore(useSpeedPaintRenderController, (s) => s.isRendering);
  const spStatus = useStore(useSpeedPaintRenderController, (s) => s.status);

  // ── Lista de itens de navegação (espelha o que existia no Header) ──
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { to: '/app/estudio', label: t('studio.header.nav.studio'), icon: Mic },
      { to: '/app/imagens', label: t('studio.header.nav.image'), icon: ImageIcon },
      { to: '/app/video', label: t('studio.header.nav.video'), icon: PlayCircle },
      { to: '/app/pintura-rapida', label: t('studio.header.nav.speedPaint'), icon: Palette },
      { to: '/app/assistente', label: t('studio.header.nav.ai'), icon: AutoAwesome, accent: true },
      { to: '/app/biblioteca', label: t('studio.header.nav.library'), icon: LocalLibrary },
      { to: '/app/configuracoes', label: t('studio.header.nav.settings'), icon: Settings },
      // Item especial: abre o FeedbackDialog (não navega)
      {
        to: '__feedback__',
        label: t('feedback.navItem.headerLabel'),
        icon: RateReviewIcon,
        action: 'feedback',
      },
    ];
    return items;
  }, [t]);

  // ── Handler de ação para itens especiais (ex: feedback) ──
  const handleItemAction = useCallback(
    (item: NavItem) => {
      if (item.action === 'feedback') {
        openFeedback(location.pathname);
        return;
      }
      // Itens sem action são tratados pelo SidebarNavItem via Link
    },
    [openFeedback, location.pathname],
  );

  // ── Escuta o evento do MobileBottomNav para abrir o dialog de exclusão ──
  useEffect(() => {
    const handleOpenDeleteDialog = (): void => {
      setDeleteDialogOpen(true);
    };
    window.addEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
    return () => {
      window.removeEventListener('open-delete-account-dialog', handleOpenDeleteDialog);
    };
  }, []);

  // ── Largura dinâmica e transição reutilizável (paper + root) ──
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const widthTransition = theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: SIDEBAR_TRANSITION_DURATION,
  });

  return (
    <>
      <Drawer
        variant="permanent"
        open
        aria-label={t('sidebar.ariaLabel')}
        slotProps={{
          paper: {
            sx: {
              width,
              boxSizing: 'border-box',
              transition: widthTransition,
              overflowX: 'hidden',
              backgroundColor: APP_SURFACE,
              backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
              borderRight: `1px solid ${APP_BORDER}`,
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              height: '100dvh',
              zIndex: 1200,
            },
          },
        }}
        sx={{
          width,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: widthTransition,
        }}
      >
        {/* Header — logo + toggle */}
        <SidebarHeader collapsed={collapsed} onToggle={toggle} />

        <Divider sx={{ borderColor: APP_BORDER }} />

        {/* Lista de navegação — scroll interno se exceder a altura */}
        <Box
          component="nav"
          aria-label={t('sidebar.ariaLabel')}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            px: 1.5,
            py: 1.5,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: WHITE_08,
              borderRadius: RADIUS_XS,
            },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            scrollbarWidth: 'thin',
            scrollbarColor: `${WHITE_08} transparent`,
          }}
        >
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0 }}>
            {navItems.map((item) => {
              // Item de feedback: usa ListItemButton direto (não SidebarNavItem) para cor especial
              if (item.action === 'feedback') {
                return (
                  <ListItemButton
                    key={item.to}
                    onClick={() => handleItemAction(item)}
                    aria-label={item.label}
                    sx={{
                      borderRadius: RADIUS_XS,
                      color: BRAND_SECONDARY,
                      fontWeight: 600,
                      transition: 'background-color 0.2s ease, color 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(BRAND_SECONDARY, 0.08),
                        color: BRAND_SECONDARY,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                      <item.icon aria-hidden="true" />
                    </ListItemIcon>
                    {!collapsed ? (
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }}
                      />
                    ) : null }
                  </ListItemButton>
                );
              }
              return (
                <SidebarNavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  accent={item.accent}
                  collapsed={collapsed}
                  showExportDot={
                    (item.to === '/app/video' &&
                      (videoIsRendering || videoStatus === 'completed') &&
                      location.pathname !== '/app/video') ||
                    (item.to === '/app/pintura-rapida' &&
                      (spIsRendering || spStatus === 'completed') &&
                      location.pathname !== '/app/pintura-rapida')
                  }
                  videoIsRendering={
                    item.to === '/app/pintura-rapida' ? spIsRendering : videoIsRendering
                  }
                />
              );
            })}
          </List>
        </Box>

        {/* Footer — avatar, locale, cookies, logout (já inclui seu Divider) */}
        <SidebarFooter collapsed={collapsed} />
      </Drawer>

      {/* Dialog de exclusão de conta — controlado por estado local + evento do MobileBottomNav */}
      <DeleteAccountDialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} />
    </>
  );
}
