import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { motion, AnimatePresence } from 'motion/react';
import { useLocale } from '../../features/i18n';
import { GAP_COMPACT, ICON_SIZE_LG } from '../../theme/tokens';
import logos from '../../assets/logos';

interface SidebarHeaderProps {
  /** Estado atual da sidebar: `true` = apenas logo. */
  collapsed: boolean;
  /** Callback disparado pelo botão de toggle. */
  onToggle: () => void;
}

/**
 * Topo da sidebar: logo (clicável, leva ao estúdio) + botão de toggle.
 *
 * Em modo **expandido** mostra a marca "Script Master" ao lado do logo
 * com fade horizontal. Em modo **colapsado** mostra apenas o logo 32x32
 * centralizado. O toggle usa `ChevronRight`/`ChevronLeft` e possui
 * `aria-expanded` + `aria-label` dinâmico para acessibilidade.
 */
export function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  const { t } = useLocale();

  return (
    <Box
      sx={{
        px: collapsed ? 1.5 : 2,
        py: 1.5,
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: GAP_COMPACT,
      }}
    >
      {/* Logo — clicável, leva ao estúdio */}
      <Box
        component={Link}
        to="/app/estudio"
        aria-label={t('nav.logoAlt')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
          flex: 1,
        }}
      >
        <Box
          component="img"
          src={logos.mark.transparent}
          alt=""
          aria-hidden="true"
          sx={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
        />
        {/* Texto da marca — visível apenas em modo expandido */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.06, duration: 0.15 } }}
              exit={{ opacity: 0, x: -4, transition: { duration: 0.1 } }}
              style={{ overflow: 'hidden', minWidth: 0 }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap' }}
                noWrap
              >
                Script Master
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Toggle button — chevron invertido conforme estado */}
      <Tooltip
        title={collapsed ? t('sidebar.toggle.expand') : t('sidebar.toggle.collapse')}
        placement="right"
        arrow
      >
        <IconButton
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('sidebar.toggle.expand') : t('sidebar.toggle.collapse')}
          sx={{
            color: 'text.secondary',
            transition: 'background-color 0.2s ease, color 0.2s ease',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          {collapsed ? (
            <ChevronRight sx={{ fontSize: ICON_SIZE_LG }} />
          ) : (
            <ChevronLeft sx={{ fontSize: ICON_SIZE_LG }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
