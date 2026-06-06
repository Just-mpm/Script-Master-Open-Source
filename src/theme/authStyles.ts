import type { SxProps, Theme } from '@mui/material/styles';
import {
  APP_BORDER_STRONG,
  BRAND_PRIMARY,
  BRAND_PRIMARY_LIGHT,
  TEXT_SECONDARY,
} from './tokens';

/** TextField com bordas visíveis e focus state refinado para dark theme */
export const authTextFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: APP_BORDER_STRONG,
      borderWidth: 1,
    },
    '&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline': {
      borderColor: 'text.secondary',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: BRAND_PRIMARY,
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    color: TEXT_SECONDARY,
    '&.Mui-focused': {
      color: BRAND_PRIMARY_LIGHT,
    },
  },
  '& .MuiFormHelperText-root': {
    mt: 0.5,
  },
};

/** Link inline interativo com hover state */
export const authLinkSx: SxProps<Theme> = {
  color: 'primary.main',
  cursor: 'pointer',
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'color 0.2s ease, text-decoration 0.2s ease',
  '&:hover': {
    color: 'primary.light',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(46, 117, 182, 0.4)',
    textUnderlineOffset: '2px',
  },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: BRAND_PRIMARY,
    outlineOffset: 2,
    borderRadius: 1,
  },
};
