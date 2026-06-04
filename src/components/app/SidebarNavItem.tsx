import { type ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import { motion, AnimatePresence } from 'motion/react';
import {
  ACTION_HOVER,
  ACTION_SELECTED,
  APP_SURFACE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_SECONDARY_GLOW_SOFT,
  ICON_SIZE_MD,
} from '../../theme/tokens';

interface SidebarNavItemProps {
  /** Rota React Router para a qual o item navega. */
  to: string;
  /** Texto exibido no modo expandido e como aria-label/tooltip em colapsado. */
  label: string;
  /** Componente de ícone MUI (ex: `Mic`, `Sparkles`). */
  icon: ElementType;
  /** Cor diferenciada (secundária) para o item — usado no Assistente IA. */
  accent?: boolean;
  /** Estado atual da sidebar: `true` = apenas ícones com tooltip. */
  collapsed: boolean;
  /** Exibe dot pulsante no canto superior direito do ícone (exportação de vídeo ativa) */
  showExportDot?: boolean;
  /** true = renderizando (dot azul pulsante), false = concluído (dot verde estático) */
  videoIsRendering?: boolean;
}

/**
 * Item de navegação individual da sidebar.
 *
 * Adapta o layout conforme o estado `collapsed`:
 * - **Colapsado**: `IconButton` quadrado (44x44) com `Tooltip` no hover.
 * - **Expandido**: `ListItemButton` com `ListItemIcon` + `ListItemText`,
 *   com fade animado no label via `AnimatePresence`.
 *
 * Estado ativo detectado automaticamente via `useLocation()` — recebe
 * `aria-current="page"` para acessibilidade e ganha borda esquerda
 * 3px `BRAND_PRIMARY` (ou glow `BRAND_SECONDARY` para itens com `accent`).
 */
export function SidebarNavItem({
  to,
  label,
  icon: Icon,
  accent,
  collapsed,
  showExportDot,
  videoIsRendering,
}: SidebarNavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  // Texto/ícone: branco se ativo, accent (secondary.light) se accent, senão text.secondary
  const activeColor = isActive
    ? 'text.primary'
    : accent
      ? 'secondary.light'
      : 'text.secondary';

  // Estilos base compartilhados (fundo ativo, hover, borda esquerda com glow).
  // Quando o dot de export está ativo, troca overflow:hidden → visible para o
  // dot escapar do bounding box sem ser clipado (::before da borda ativa não
  // é afetado — ele vive dentro do item, não do overflow edge).
  const itemSx = {
    borderRadius: 1.5,
    position: 'relative' as const,
    overflow: showExportDot ? ('visible' as const) : ('hidden' as const),
    bgcolor: isActive ? ACTION_SELECTED : 'transparent',
    color: activeColor,
    transition: 'background-color 0.15s ease, color 0.15s ease',
    '&::before': isActive
      ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 4,
          bottom: 4,
          width: 3,
          borderRadius: '0 2px 2px 0',
          backgroundColor: BRAND_PRIMARY,
          // Accent usa glow laranja, padrão usa glow azul
          boxShadow: `0 0 12px ${accent ? BRAND_SECONDARY_GLOW_SOFT : BRAND_PRIMARY_GLOW_SOFT }`,
        }
      : undefined,
    '&:hover': {
      bgcolor: isActive ? ACTION_SELECTED : ACTION_HOVER,
      color: 'text.primary',
    },
  };

  // ── Modo colapsado: ícone quadrado centralizado com tooltip ──
  if (collapsed) {
    return (
      <Tooltip title={label} placement="right" arrow>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            component={Link}
            to={to}
            aria-current={isActive ? 'page' : undefined }
            aria-label={label}
            sx={{
              width: 44,
              height: 44,
              ...itemSx,
            }}
          >
            <Icon sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
          {showExportDot && <ExportDot videoIsRendering={videoIsRendering} />}
        </Box>
      </Tooltip>
    );
  }

  // ── Modo expandido: ListItemButton com label animado ──
  return (
    <ListItemButton
      component={Link}
      to={to}
      aria-current={isActive ? 'page' : undefined }
      selected={isActive}
      sx={itemSx}
    >
      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Icon sx={{ fontSize: ICON_SIZE_MD }} aria-hidden="true" />
          {showExportDot && <ExportDot videoIsRendering={videoIsRendering} />}
        </Box>
      </ListItemIcon>
      <AnimatePresence mode="wait">
        <motion.div
          key="label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.15 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          style={{ overflow: 'hidden' }}
        >
          <ListItemText
            primary={label}
            slotProps={{
              primary: {
                variant: 'body2',
                sx: { fontWeight: isActive ? 600 : 400, color: 'inherit' },
              },
            }}
          />
        </motion.div>
      </AnimatePresence>
    </ListItemButton>
  );
}

/**
 * Dot pulsante de exportação de vídeo (espelha o do `MobileBottomNav`).
 * Azul pulsante enquanto render está em andamento; verde estático quando concluído.
 * Some quando o usuário está na rota do próprio item.
 */
function ExportDot({ videoIsRendering }: { videoIsRendering?: boolean }) {
  return (
    <Box
      role="status"
      aria-label={videoIsRendering ? 'Renderização em andamento' : 'Vídeo pronto para ver'}
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
  );
}
