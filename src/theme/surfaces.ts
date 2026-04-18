import { alpha, type Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';
import { APP_SURFACE, APP_BORDER, SHADOW_DEEP, WHITE_05, WHITE_015 } from './tokens';

export const glassPanelSx = (theme: Theme): SystemStyleObject<Theme> => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: { xs: 4, md: 5 },
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.78),
  backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
  boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.55)}`,
  backdropFilter: { xs: 'blur(14px)', md: 'blur(22px)' },
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(theme.palette.background.paper, 0.78),
  }),
});

export const insetPanelSx = (theme: Theme): SystemStyleObject<Theme> => ({
  borderRadius: 3,
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
