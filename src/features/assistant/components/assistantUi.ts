import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import {
  APP_BORDER,
  APP_BORDER_STRONG,
  APP_SURFACE,
  APP_SURFACE_ELEVATED,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  BRAND_SECONDARY,
  SHADOW_DEEP,
  TEXT_DISABLED,
  TEXT_SECONDARY,
  WHITE_01,
  WHITE_04,
  WHITE_06,
  WHITE_08,
  WHITE_10,
  WHITE_82,
  BLACK_50,
  GAP_COMPACT,
  GAP_MEDIUM,
  RADIUS_XS,
  RADIUS_CHIP,
} from '../../../theme/tokens';
import { insetPanelSx } from '../../../theme/surfaces';

// ─── Drawer Paper ───────────────────────────────────────────────
// Full-height glass surface com borda lateral e sombra profunda

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

// ─── Drawer Header ──────────────────────────────────────────────
// Cabeçalho de drawer com separação visual sutil

export const assistantDrawerHeaderSx = {
  px: 3,
  py: 2.5,
  borderBottom: `1px solid ${APP_BORDER}`,
  alignItems: 'center',
  justifyContent: 'space-between',
};

// ─── Inset Panel ────────────────────────────────────────────────
// Painel recessado para itens dentro de drawers

export const assistantInsetSx = (theme: Theme) => ({
  ...insetPanelSx(theme),
  backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.56),
  transition: 'border-color 0.2s ease, background-color 0.2s ease',
});

// ─── Chat Bubble: Modelo (AI) ───────────────────────────────────
// Bolha da IA — glass surface, borda sutil, sem gradiente

export const assistantBubbleModelSx = (theme: Theme) => ({
  width: '100%',
  px: { xs: 1.5, md: 2 },
  py: { xs: 1.25, md: 1.5 },
  borderRadius: RADIUS_XS,
  border: `1px solid ${APP_BORDER}`,
  backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.7),
  backgroundImage: 'none',
  backdropFilter: 'blur(8px)',
  boxShadow: `0 2px 12px ${alpha(SHADOW_DEEP, 0.18)}`,
  transition: 'box-shadow 0.3s ease',
  ...theme.applyStyles('dark', {
    backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.6),
    backgroundImage: 'none',
  }),
});

// ─── Chat Bubble: Usuário ───────────────────────────────────────
// Bolha do usuário — gradiente brand com glow sutil

export const assistantBubbleUserSx = (theme: Theme) => ({
  width: '100%',
  px: { xs: 1.5, md: 2 },
  py: { xs: 1.25, md: 1.5 },
  borderRadius: RADIUS_XS,
  border: '1px solid transparent',
  background: `linear-gradient(135deg, ${alpha(BRAND_PRIMARY, 0.92)} 0%, ${alpha(BRAND_SECONDARY, 0.82)} 100%)`,
  color: 'common.white',
  boxShadow: `0 4px 20px ${alpha(BRAND_PRIMARY, 0.16)}`,
  ...theme.applyStyles('dark', {
    backgroundImage: 'none',
  }),
});

// ─── Composer Input ─────────────────────────────────────────────
// Campo de input do compositor com glass e focus glow

export const assistantComposerInputSx = (theme: Theme) => ({
  '& .MuiOutlinedInput-root': {
    alignItems: 'flex-end',
    borderRadius: RADIUS_XS,
    px: 0.75,
    py: 0.75,
    backgroundColor: alpha(theme.palette.background.default, 0.56),
    border: `1px solid ${APP_BORDER}`,
    boxShadow: `inset 0 2px 8px ${alpha(SHADOW_DEEP, 0.12)}`,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: APP_BORDER_STRONG,
    },
    '&.Mui-focused': {
      borderColor: BRAND_PRIMARY,
      boxShadow: `inset 0 2px 8px ${alpha(SHADOW_DEEP, 0.12)}, 0 0 0 3px ${alpha(BRAND_PRIMARY, 0.15)}`,
      backgroundColor: alpha(theme.palette.background.default, 0.64),
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    display: 'none',
  },
});

// ─── Composer Container ─────────────────────────────────────────
// Container do compositor com glass bottom

export const assistantComposerContainerSx = (theme: Theme) => ({
  position: 'sticky',
  bottom: 0,
  zIndex: 2,
  px: { xs: 2, md: 3 },
  py: { xs: 1.5, md: 2 },
  borderTop: `1px solid ${APP_BORDER}`,
  background: `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0)} 0%, ${alpha(theme.palette.background.paper, 0.94)} 24%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
});

// ─── Typing Indicator ───────────────────────────────────────────
// Indicador de "digitando" com 3 pontos animados

export const assistantTypingIndicatorSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.5,
  py: 1,
  '& .typing-dot': {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: alpha(BRAND_PRIMARY, 0.6),
    animation: 'assistantTypingBounce 1.4s ease-in-out infinite',
    '&:nth-of-type(1)': { animationDelay: '0s' },
    '&:nth-of-type(2)': { animationDelay: '0.2s' },
    '&:nth-of-type(3)': { animationDelay: '0.4s' },
    '@keyframes assistantTypingBounce': {
      '0%, 60%, 100%': {
        transform: 'translateY(0)',
        opacity: 0.4,
      },
      '30%': {
        transform: 'translateY(-6px)',
        opacity: 1,
      },
    },
  },
};

// ─── Markdown Styling ───────────────────────────────────────────
// Estilos para renderização de markdown dentro das bolhas

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
  '& strong': {
    fontWeight: 700,
    color: 'inherit',
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
  '& blockquote': {
    borderLeft: `3px solid ${WHITE_10}`,
    pl: 2,
    my: GAP_COMPACT,
    color: 'text.secondary',
  },
  '& a': {
    color: BRAND_PRIMARY,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
};

// ─── Message List Scroll ────────────────────────────────────────
// Área de scroll das mensagens com padding generoso

export const assistantMessagesContainerSx = {
  flex: 1,
  overflowY: 'auto',
  px: { xs: 2, md: 3 },
  py: { xs: 1.5, md: 2 },
  scrollBehavior: 'smooth' as const,
};

// ─── History Item Hover ─────────────────────────────────────────
// Hover state para itens do histórico

export const assistantHistoryItemSx = {
  alignItems: 'flex-start',
  px: 2,
  py: 1.75,
  gap: GAP_MEDIUM,
  borderRadius: RADIUS_XS,
  transition: 'background-color 0.15s ease',
  '&:hover': {
    backgroundColor: alpha(WHITE_06, 0.5),
  },
};

// ─── Empty State ────────────────────────────────────────────────
// Estado vazio do chat

export const assistantEmptyStateSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  px: { xs: 3, md: 4 },
  py: 4,
};

// ─── Suggestion Chip ─────────────────────────────────────────────
// Chips de prompt rápido no empty state com hover feedback

export const assistantSuggestionChipSx = {
  cursor: 'pointer',
  borderColor: APP_BORDER,
  color: WHITE_82,
  fontWeight: 500,
  transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease, transform 0.15s ease',
  '&:hover': {
    borderColor: BRAND_PRIMARY,
    color: 'text.primary',
    backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
    transform: 'scale(1.04)',
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
};

// ─── Attachment Chip ────────────────────────────────────────────
// Chip de anexo com estilo premium

export const assistantAttachmentChipSx = {
  maxWidth: '100%',
  borderRadius: RADIUS_XS,
  border: `1px solid ${APP_BORDER}`,
  backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.7),
  '& .MuiChip-label': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

// ─── Action Icon Button ─────────────────────────────────────────
// Botão circular para ações compactas, como parar geração

export const assistantActionIconButtonSx = {
  minWidth: 40,
  width: 40,
  height: 40,
  borderRadius: '50%',
  px: 0,
  boxShadow: `0 4px 16px ${alpha(BRAND_PRIMARY, 0.24)}`,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    boxShadow: `0 6px 24px ${alpha(BRAND_PRIMARY, 0.36)}`,
    transform: 'scale(1.04)',
  },
  '&:active': {
    transform: 'scale(0.96)',
  },
  '&.Mui-disabled': {
    boxShadow: 'none',
    transform: 'none',
  },
};

// ─── Send Button ────────────────────────────────────────────────
// Botão principal de envio em formato de pílula, com boa leitura no mobile

export const assistantSendButtonSx = {
  minWidth: { xs: 40, sm: 104 },
  height: 40,
  borderRadius: 999,
  px: { xs: 0, sm: 1.5 },
  gap: { xs: 0, sm: 0.75 },
  boxShadow: `0 4px 16px ${alpha(BRAND_PRIMARY, 0.24)}`,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '& .MuiButton-endIcon': {
    ml: { xs: 0, sm: 0.25 },
    mr: 0,
  },
  '&:hover': {
    boxShadow: `0 6px 24px ${alpha(BRAND_PRIMARY, 0.36)}`,
    transform: 'translateY(-1px)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&.Mui-disabled': {
    boxShadow: 'none',
    transform: 'none',
  },
};

// ─── Composer Wrapper ─────────────────────────────────────────
// Wrapperanimated que expande/colapsa com spring

export const assistantComposerWrapperSx = {
  overflow: 'hidden',
  borderRadius: RADIUS_XS,
  backgroundColor: alpha(APP_SURFACE, 0.96),
  backgroundImage: `linear-gradient(180deg, ${WHITE_04} 0%, ${WHITE_01} 100%)`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${APP_BORDER}`,
  boxShadow: `0 8px 32px ${alpha(SHADOW_DEEP, 0.16)}`,
  transition: 'box-shadow 0.2s ease',
};

// ─── Composer Input Row ───────────────────────────────────────
// Row principal do composer (anexa + input + botões)

export const assistantComposerInputRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.5,
  py: 1.25,
};

// ─── Cycling Placeholder ──────────────────────────────────────
// Placeholder animado letter-by-letter (blur + translateY) — layer absoluto sobre o input

export const assistantCyclingPlaceholderSx = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none' as const,
  zIndex: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  color: TEXT_DISABLED,
  userSelect: 'none' as const,
};

export const assistantPlaceholderLetterSx = {
  display: 'inline-block',
};

// ─── Think Toggle ─────────────────────────────────────────────
// Botão pill "Pensar" com ícone de lâmpada — usa tokens do design system

export const assistantThinkToggleSx = (isActive: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.75,
  py: 0.875,
  borderRadius: 999,
  fontWeight: 500,
  fontSize: '0.8125rem',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  ...(isActive
    ? {
        backgroundColor: alpha(BRAND_PRIMARY, 0.14),
        outline: `1px solid ${alpha(BRAND_PRIMARY, 0.5)}`,
        color: BRAND_PRIMARY,
        '& svg': { fill: BRAND_PRIMARY },
      }
    : {
        backgroundColor: alpha(WHITE_06, 0.5),
        color: TEXT_SECONDARY,
        '&:hover': {
          backgroundColor: alpha(WHITE_08, 0.6),
          color: 'text.primary',
        },
      }),
});

// ─── Control Button (Model/Thinking) ─────────────────────────
// Botão pill genérico para seletores de modelo/profundidade

export const assistantControlButtonSx = (accentColor: string) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1.5,
  py: 0.75,
  borderRadius: 999,
  fontWeight: 500,
  fontSize: '0.8125rem',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  backgroundColor: alpha(WHITE_06, 0.5),
  color: 'text.primary',
  '&:hover': {
    backgroundColor: alpha(WHITE_08, 0.7),
    boxShadow: `0 0 12px ${alpha(accentColor, 0.3)}`,
  },
  '& svg': {
    color: accentColor,
  },
});

// ─── Expanded Controls Row ─────────────────────────────────────
// Linha de controles que aparece no estado expanded

export const assistantComposerControlsSx = {
  display: 'flex',
  justifyContent: 'flex-start',
  px: 1.75,
  pb: 0.5,
  gap: 1,
};

// ─── Segmented Control (ToggleButtonGroup) ────────────────────
// Estilo premium para seletores segmentados no header do assistente

export const assistantSegmentedControlSx = (theme: Theme) => ({
  backgroundColor: alpha(theme.palette.common.white, 0.04),
  p: 0.5,
  borderRadius: RADIUS_CHIP,
  '& .MuiToggleButtonGroup-grouped': {
    margin: 0,
    border: 0,
    borderRadius: RADIUS_CHIP - 1,
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: '0.75rem',
    lineHeight: 1.2,
    py: 0.625,
    px: 1.25,
    transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
    '&:not(:first-of-type)': {
      borderRadius: RADIUS_CHIP - 1,
      borderLeft: 'none',
    },
    '&:first-of-type': {
      borderRadius: RADIUS_CHIP - 1,
    },
    '&.Mui-selected': {
      backgroundColor: alpha(BRAND_PRIMARY, 0.16),
      color: 'text.primary',
      boxShadow: `0 1px 4px ${alpha(SHADOW_DEEP, 0.24)}`,
      '&:hover': {
        backgroundColor: alpha(BRAND_PRIMARY, 0.22),
      },
    },
    '&:hover:not(.Mui-selected)': {
      backgroundColor: alpha(theme.palette.common.white, 0.06),
    },
  },
});

// ─── Segmented Control Label ──────────────────────────────────
// Label sutil acima ou ao lado de cada grupo segmentado

export const assistantSelectorLabelSx = {
  fontSize: '0.6875rem',
  fontWeight: 500,
  color: TEXT_SECONDARY,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
};
