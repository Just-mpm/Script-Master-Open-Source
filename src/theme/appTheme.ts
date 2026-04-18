import type { LinkProps as MuiLinkProps } from '@mui/material/Link';
import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';
import type { Components } from '@mui/material/styles';
import { LinkBehavior } from './linkBehavior';
import {
  ACTION_ACTIVE,
  ACTION_DISABLED,
  ACTION_DISABLED_BACKGROUND,
  ACTION_FOCUS,
  ACTION_HOVER,
  ACTION_SELECTED,
  APP_BACKGROUND,
  APP_BACKGROUND_GLOW,
  APP_BORDER,
  APP_BORDER_STRONG,
  APP_HEADER_HEIGHT,
  APP_SURFACE,
  APP_SURFACE_ELEVATED,
  BRAND_PRIMARY,
  BRAND_PRIMARY_CONTRAST_TEXT,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_LIGHT,
  BRAND_SECONDARY,
  BRAND_SECONDARY_CONTRAST_TEXT,
  BRAND_SECONDARY_DARK,
  BRAND_SECONDARY_LIGHT,
  ERROR_MAIN,
  SUCCESS_MAIN,
  TEXT_DISABLED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  WARNING_MAIN,
} from './tokens';

const components: Components = {
  MuiLink: {
    defaultProps: {
      component: LinkBehavior,
    } as MuiLinkProps,
  },
  MuiButtonBase: {
    defaultProps: {
      LinkComponent: LinkBehavior,
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      ':root': {
        colorScheme: 'dark',
        '--bg-base': 'var(--mui-palette-background-default)',
        '--bg-surface': 'var(--mui-palette-background-paper)',
        '--bg-elevated': APP_SURFACE_ELEVATED,
        '--border': 'var(--mui-palette-divider)',
        '--border-hover': APP_BORDER_STRONG,
        '--border-base': 'var(--mui-palette-divider)',
        '--text-primary': 'var(--mui-palette-text-primary)',
        '--text-secondary': 'var(--mui-palette-text-secondary)',
        '--text-tertiary': 'var(--mui-palette-text-disabled)',
        '--accent': 'var(--mui-palette-primary-main)',
        '--accent-hover': 'var(--mui-palette-primary-dark)',
        '--accent-glow': 'color-mix(in srgb, var(--mui-palette-primary-main), transparent 72%)',
        '--glass-bg': 'color-mix(in srgb, var(--mui-palette-background-paper), transparent 22%)',
        '--glass-border': 'color-mix(in srgb, var(--mui-palette-common-white), transparent 95%)',
      },
      html: {
        minHeight: '100%',
      },
      body: {
        minHeight: '100vh',
        background: APP_BACKGROUND_GLOW,
        color: TEXT_PRIMARY,
      },
      '#root': {
        minHeight: '100vh',
      },
      '::selection': {
        backgroundColor: alpha(BRAND_PRIMARY, 0.3),
        color: 'var(--mui-palette-text-primary)',
      },
    },
  },
  MuiAppBar: {
    defaultProps: {
      elevation: 0,
      color: 'transparent',
    },
    styleOverrides: {
      root: {
        backgroundColor: alpha(APP_BACKGROUND, 0.68),
        backgroundImage: 'none',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${APP_BORDER}`,
      },
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: APP_HEADER_HEIGHT,
        '@media (min-width: 0px)': {
          minHeight: APP_HEADER_HEIGHT,
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      outlined: {
        borderColor: APP_BORDER,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 999,
        minHeight: 44,
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              boxShadow: `0 18px 44px ${alpha(BRAND_PRIMARY, 0.28)}`,
            },
          },
        ],
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        minHeight: 44,
        minWidth: 44,
        borderRadius: 999,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 18,
        variants: [
          {
            props: { variant: 'filled', color: 'success' },
            style: {
              backgroundColor: alpha(SUCCESS_MAIN, 0.92),
              color: TEXT_PRIMARY,
            },
          },
          {
            props: { variant: 'filled', color: 'error' },
            style: {
              backgroundColor: alpha(ERROR_MAIN, 0.92),
              color: TEXT_PRIMARY,
            },
          },
        ],
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        zIndex: 1500,
      },
    },
  },
};

const sharedPalette = {
  primary: {
    main: BRAND_PRIMARY,
    light: BRAND_PRIMARY_LIGHT,
    dark: BRAND_PRIMARY_DARK,
    contrastText: BRAND_PRIMARY_CONTRAST_TEXT,
  },
  secondary: {
    main: BRAND_SECONDARY,
    light: BRAND_SECONDARY_LIGHT,
    dark: BRAND_SECONDARY_DARK,
    contrastText: BRAND_SECONDARY_CONTRAST_TEXT,
  },
  success: { main: SUCCESS_MAIN },
  error: { main: ERROR_MAIN },
  warning: { main: WARNING_MAIN },
  background: {
    default: APP_BACKGROUND,
    paper: APP_SURFACE,
  },
  divider: APP_BORDER,
  text: {
    primary: TEXT_PRIMARY,
    secondary: TEXT_SECONDARY,
    disabled: TEXT_DISABLED,
  },
  action: {
    active: ACTION_ACTIVE,
    hover: ACTION_HOVER,
    selected: ACTION_SELECTED,
    disabled: ACTION_DISABLED,
    disabledBackground: ACTION_DISABLED_BACKGROUND,
    focus: ACTION_FOCUS,
  },
} as const;

let appTheme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: sharedPalette,
    },
    dark: {
      palette: sharedPalette,
    },
  },
  shape: {
    borderRadius: 20,
  },
  spacing: 8,
  typography: {
    fontFamily: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(','),
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.04em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.035em',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.55,
    },
    button: {
      fontWeight: 600,
    },
  },
  components,
});

appTheme = responsiveFontSizes(appTheme);

appTheme = createTheme(appTheme, {
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.9),
          border: `1px solid ${APP_BORDER_STRONG}`,
        },
      },
    },
  },
});

export default appTheme;
