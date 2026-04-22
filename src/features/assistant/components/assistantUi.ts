import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { APP_BORDER, APP_SURFACE, APP_SURFACE_ELEVATED, SHADOW_DEEP, WHITE_04, WHITE_01, WHITE_08, BLACK_50, GAP_COMPACT, GAP_MEDIUM, RADIUS_XS } from '../../../theme/tokens';
import { insetPanelSx } from '../../../theme/surfaces';

export const assistantDrawerPaperSx = (theme: Theme) => ({
  width: { xs: '100%', sm: 400, lg: 440 },
  maxWidth: '100%',
  backgroundColor: alpha(APP_SURFACE, 0.96),
  backgroundImage: `linear-gradient(180deg, ${WHITE_04} 0%, ${WHITE_01} 100%)`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderLeft: `1px solid ${APP_BORDER}`,
  boxShadow: `0 24px 80px ${alpha(SHADOW_DEEP, 0.64)}`,
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(APP_SURFACE, 0.96),
  }),
});

export const assistantInsetSx = (theme: Theme) => ({
  ...insetPanelSx(theme),
  backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.56),
});

export const assistantMarkdownSx = {
  '& > *:first-of-type': {
    mt: 0,
  },
  '& > *:last-child': {
    mb: 0,
  },
  '& p': {
    my: GAP_COMPACT * 0.66,
  },
  '& ul, & ol': {
    my: GAP_COMPACT * 0.66,
    pl: 3,
  },
  '& li': {
    mb: GAP_COMPACT * 0.33,
  },
  '& code': {
    px: 0.75,
    py: 0.25,
    borderRadius: RADIUS_XS,
    fontSize: '0.85em',
    backgroundColor: WHITE_08,
  },
  '& pre': {
    overflowX: 'auto',
    p: GAP_MEDIUM * 2,
    borderRadius: RADIUS_XS,
    backgroundColor: BLACK_50,
  },
};
