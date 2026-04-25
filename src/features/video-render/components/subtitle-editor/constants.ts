import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_GLOW,
  BRAND_PRIMARY_GLOW_SOFT,
  SUCCESS_MAIN,
  SUCCESS_BG_SUBTLE,
  SUCCESS_BG_MEDIUM,
  SUCCESS_BORDER,
  SUCCESS_BORDER_HOVER,
  SUCCESS_GLOW,
  ERROR_MAIN,
  ERROR_BG_SUBTLE_2,
  ERROR_BORDER,
  ERROR_BORDER_HOVER,
  ERROR_GLOW,
  TEXT_SECONDARY,
  TEXT_DISABLED,
  APP_SURFACE,
  APP_BORDER,
  ACTION_SELECTED,
  WHITE_04,
  WHITE_05,
  WHITE_06,
  WHITE_08,
  WHITE_10,
  WHITE_14,
  WHITE_22,
  BLACK_40,
  BLACK_50,
  BLACK_74,
  GLASS_BG,
  SHADOW_DEEP,
  RADIUS_CHIP,
  RADIUS_XS,
} from '../../../../theme/tokens';

// ---------------------------------------------------------------------------
// Estilos compartilhados dos botões da toolbar
// ---------------------------------------------------------------------------

/** Estilo base dos IconButtons da toolbar (size, radius, transição) */
export const TOOLBAR_ICON_BTN_BASE = {
  color: TEXT_SECONDARY,
  width: 28,
  height: 28,
  borderRadius: RADIUS_XS,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    color: BRAND_PRIMARY_LIGHT,
    boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
  },
  '&:active': {
    transform: 'scale(0.88)',
  },
};

// ---------------------------------------------------------------------------
// Estilos compartilhados dos sliders
// ---------------------------------------------------------------------------

export const THUMBNAIL_GLOW_SHADOW = `0 0 0 4px ${BRAND_PRIMARY_GLOW_SOFT}, 0 0 12px ${BRAND_PRIMARY_GLOW_SOFT}`;

export const SLIDER_SHARED_SX = {
  color: BRAND_PRIMARY,
  p: '4px 0',
  transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '& .MuiSlider-thumb': {
    width: 12,
    height: 12,
    transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease',
    '&:hover, &.Mui-focusVisible': {
      boxShadow: THUMBNAIL_GLOW_SHADOW,
      transform: 'scale(1.15)',
    },
    '&:active': {
      boxShadow: `0 0 0 6px ${BRAND_PRIMARY_GLOW_SOFT}, 0 0 20px ${BRAND_PRIMARY_GLOW}`,
      transform: 'scale(1.2)',
    },
  },
  '& .MuiSlider-rail': {
    backgroundColor: WHITE_10,
    transition: 'background-color 0.2s ease',
  },
  '& .MuiSlider-track': {
    border: 'none',
    borderRadius: 3,
  },
  '&:hover .MuiSlider-rail': {
    backgroundColor: WHITE_14,
  },
};

// ---------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------

export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 48;
export const FONT_SIZE_STEP = 2;
export const MIN_OPACITY = 0;
export const MAX_OPACITY = 1;
export const OPACITY_STEP = 0.05;
export const DRAG_SNAP = 5; // Arredonda para múltiplos de 5

// ---------------------------------------------------------------------------
// Constantes do preview CSS
// ---------------------------------------------------------------------------

/** Padding base do SubtitleOverlay para position='bottom' */
export const BASE_PADDING_BOTTOM = 40;

// ---------------------------------------------------------------------------
// Estilos dos grupos da toolbar
// ---------------------------------------------------------------------------

export const TOOLBAR_DIVIDER_SX = {
  borderColor: WHITE_14,
  mx: 0.25,
};

export const TOGGLE_BUTTON_GROUP_SX = {
  '& .MuiToggleButton-root': {
    color: TEXT_SECONDARY,
    border: `1px solid ${WHITE_08}`,
    backgroundColor: 'transparent',
    padding: '4px 8px',
    minHeight: 24,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: WHITE_06,
      borderColor: WHITE_14,
    },
    '&.Mui-selected': {
      color: BRAND_PRIMARY_LIGHT,
      backgroundColor: `${BRAND_PRIMARY_GLOW_SOFT}`,
      borderColor: `${BRAND_PRIMARY_DARK}`,
      boxShadow: `0 0 0 2px ${BRAND_PRIMARY_GLOW_SOFT}`,
      '&:hover': {
        backgroundColor: `${BRAND_PRIMARY_GLOW}`,
        boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
      },
    },
  },
  '& .MuiToggleButtonGroup-grouped': {
    border: 'none',
    '&:not(:first-of-type)': {
      marginLeft: `1px`,
      borderLeft: `1px solid ${WHITE_08}`,
    },
  },
};

export const SLIDER_LABEL_SX = {
  color: TEXT_DISABLED,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 10,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

export const FONT_CHIP_SX = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  minWidth: 38,
  color: TEXT_SECONDARY,
  backgroundColor: WHITE_05,
  border: `1px solid ${WHITE_08}`,
  userSelect: 'none',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const RESET_BTN_SX = {
  color: TEXT_SECONDARY,
  width: 28,
  height: 28,
  borderRadius: RADIUS_XS,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    color: BRAND_PRIMARY_LIGHT,
    backgroundColor: ACTION_SELECTED,
    boxShadow: `0 0 0 3px ${BRAND_PRIMARY_GLOW_SOFT}`,
  },
  '&:active': {
    transform: 'scale(0.88)',
  },
  '& .MuiSvgIcon-root': {
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

export const CONFIRM_BTN_SX = {
  color: SUCCESS_MAIN,
  width: 28,
  height: 28,
  borderRadius: RADIUS_XS,
  backgroundColor: SUCCESS_BG_SUBTLE,
  border: `1px solid ${SUCCESS_BORDER}`,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: SUCCESS_BG_MEDIUM,
    borderColor: SUCCESS_BORDER_HOVER,
    boxShadow: `0 0 14px ${SUCCESS_GLOW}`,
    transform: 'scale(1.05)',
  },
  '&:active': {
    transform: 'scale(0.88)',
  },
};

export const CANCEL_BTN_SX = {
  color: ERROR_MAIN,
  width: 28,
  height: 28,
  borderRadius: RADIUS_XS,
  backgroundColor: ERROR_BG_SUBTLE_2,
  border: `1px solid ${ERROR_BORDER}`,
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: ERROR_BORDER,
    borderColor: ERROR_BORDER_HOVER,
    boxShadow: `0 0 14px ${ERROR_GLOW}`,
    transform: 'scale(1.05)',
  },
  '&:active': {
    transform: 'scale(0.88)',
  },
};

export const FONT_BTN_HOVER_SX = {
  color: BRAND_PRIMARY_LIGHT,
  backgroundColor: ACTION_SELECTED,
};

export const EDITOR_BTN_SX = {
  position: 'absolute' as const,
  bottom: 16,
  right: 16,
  zIndex: 10,
  width: 42,
  height: 42,
  backgroundColor: GLASS_BG,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${APP_BORDER}`,
  color: BRAND_PRIMARY,
  boxShadow: `0 0 16px ${BRAND_PRIMARY_GLOW_SOFT}, 0 4px 12px ${BLACK_40}`,
  animation: 'subtitle-edit-pulse 2.4s ease-in-out infinite',
  '@keyframes subtitle-edit-pulse': {
    '0%, 100%': {
      boxShadow: `0 0 16px ${BRAND_PRIMARY_GLOW_SOFT}, 0 4px 12px ${BLACK_40}`,
    },
    '50%': {
      boxShadow: `0 0 24px ${BRAND_PRIMARY_GLOW}, 0 4px 16px ${BLACK_50}`,
    },
  },
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: APP_SURFACE,
    color: BRAND_PRIMARY_LIGHT,
    boxShadow: `0 0 28px ${BRAND_PRIMARY_GLOW}, 0 6px 20px ${BLACK_50}`,
    borderColor: BRAND_PRIMARY_DARK,
    transform: 'scale(1.06)',
  },
  '&:active': {
    transform: 'scale(0.92)',
  },
};

export const DRAG_AREA_SX = {
  position: 'absolute' as const,
  inset: 0,
  cursor: 'grab',
  pointerEvents: 'auto',
  borderRadius: 'inherit',
  border: `1.5px solid ${WHITE_10}`,
  transition: 'border-color 0.2s ease, cursor 0.15s ease',
  '&:hover': {
    borderColor: WHITE_22,
  },
  '&:active': {
    cursor: 'grabbing',
    borderColor: BRAND_PRIMARY_DARK,
  },
};

export const DRAG_HINT_SX = {
  position: 'absolute' as const,
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 2,
  py: 1,
  borderRadius: `${RADIUS_CHIP}px`,
  backgroundColor: BLACK_74,
  backdropFilter: 'blur(12px)',
  border: `1px solid ${APP_BORDER}`,
  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4)`,
  zIndex: 9,
  pointerEvents: 'none',
};

export const TOOLBAR_CONTAINER_PORTAL_SX = {
  justifyContent: 'center',
  py: 1.5,
};

export const TOOLBAR_CONTAINER_INLINE_SX = {
  position: 'absolute' as const,
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
};

export const TOOLBAR_CONTAINER_SHARED_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.5,
  py: 1,
  backgroundColor: GLASS_BG,
  backgroundImage: `linear-gradient(180deg, ${WHITE_04} 0%, ${WHITE_05} 100%)`,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  borderRadius: 4,
  border: `1px solid ${APP_BORDER}`,
  boxShadow: `0 12px 40px ${SHADOW_DEEP}, 0 0 0 1px rgba(0, 0, 0, 0.2)`,
  transition: 'border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    borderColor: WHITE_14,
  },
};
