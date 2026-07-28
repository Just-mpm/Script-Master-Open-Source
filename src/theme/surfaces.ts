import type { SxProps } from '@mui/material/styles';
import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { APP_SURFACE, APP_BORDER, BLACK_40, SHADOW_DEEP, WHITE_04, WHITE_06, WHITE_08, WHITE_16, WHITE_05, WHITE_015, BRAND_PRIMARY, BRAND_PRIMARY_GLOW_SOFT } from './tokens';

export const glassPanelSx = (theme: Theme): SystemStyleObject<Theme> => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: { xs: 3, md: 4 },
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.78),
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.55)}`,
  backdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
  WebkitBackdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(theme.palette.background.paper, 0.78),
  }),
});

export const insetPanelSx = (theme: Theme): SystemStyleObject<Theme> => ({
  borderRadius: 2,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  backgroundColor: alpha(theme.palette.background.default, 0.28),
  backgroundImage: 'none',
  boxShadow: 'none',
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(theme.palette.common.black, 0.16),
  }),
});

export const glassSurfaceSx = (theme: Theme): SystemStyleObject<Theme> => ({
  backgroundColor: alpha(APP_SURFACE, 0.78),
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: `1px solid ${APP_BORDER}`,
  boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.55)}`,
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(APP_SURFACE, 0.78),
  }),
});

/**
 * Estilo glass compartilhado para o `Paper` de Drawers laterais de navegação
 * (`MobileBottomNav`, `GuestMobileNav` e `PublicHeader`).
 *
 * Centraliza `backgroundColor`, gradiente sutil e `borderRight` para que os
 * Drawers tenham exatamente a mesma aparência de superfície. Drawers que
 * precisem de personalização adicional (ex: `MobileBottomNav` define
 * `width: 280` para a largura do drawer mobile) devem estender este objeto
 * via spread em vez de redefinir as três chaves básicas.
 */
export const appDrawerPaperSx: SxProps<Theme> = {
  backgroundColor: APP_SURFACE,
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  borderRight: `1px solid ${APP_BORDER}`,
};

/**
 * Estilo compartilhado para o `Backdrop` (fundo escurecido) dos Drawers
 * laterais (`MobileBottomNav`, `GuestMobileNav`, `PublicHeader`).
 *
 * Padroniza `backdropFilter: blur(8px)` (com prefixo `-webkit-` para
 * Safari iOS) e opacidade `BLACK_40` em todos os 3 Drawers para garantir
 * consistência visual — o `MobileBottomNav` já usava esses valores
 * inline; os outros 2 Drawers ficavam sem backdrop blur, gerando
 * inconsistência. Padrão `slotProps.backdrop` do MUI v9 (idiomático
 * oficial — `BackdropProps` foi removido na v9, conforme notebook oficial).
 *
 * Como usar (compartilhar com `appDrawerPaperSx`):
 * ```tsx
 * <Drawer
 *   slotProps={{
 *     backdrop: { sx: appDrawerBackdropSx },
 *     paper: { sx: appDrawerPaperSx },
 *   }}
 * >
 * ```
 */
export const appDrawerBackdropSx: SxProps<Theme> = {
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  backgroundColor: BLACK_40,
};

/** TextField com fundo semi-transparente, borda sutil e focus state refinado — para buscas e campos de texto */
export const searchFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    backgroundColor: WHITE_04,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: WHITE_08,
      borderWidth: 1,
    },
    '&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline': {
      borderColor: WHITE_16,
    },
    '&.Mui-focused': {
      backgroundColor: WHITE_06,
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: BRAND_PRIMARY,
        borderWidth: 2,
      },
      boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
    },
  },
};
