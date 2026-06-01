import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LanguageIcon from '@mui/icons-material/Language';
import { useState, type MouseEvent } from 'react';
import { useLocale } from '../context';
import { LOCALE_CONFIGS } from '../locales';
import { ICON_SIZE_LG, APP_BORDER, WHITE_05, WHITE_015 } from '../../../theme/tokens';

interface LocaleSelectorProps {
  /** Tamanho do botão: 'small' para header, 'medium' para outros contextos */
  size?: 'small' | 'medium';
}

/**
 * Seletor de idioma compacto.
 * Exibe um botão com ícone de globo e abre um dropdown com as opções disponíveis.
 */
export function LocaleSelector({ size = 'small' }: LocaleSelectorProps) {
  const { locale, setLocale } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: string) => {
    handleClose();
    if (code !== locale) {
      setLocale(code as typeof locale);
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        aria-label={LOCALE_CONFIGS.find((c) => c.code === locale)?.label}
        size={size}
        sx={{
          color: 'text.secondary',
          transition: 'color 0.2s ease',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <LanguageIcon sx={{ fontSize: ICON_SIZE_LG }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              mt: 0.5,
              backgroundImage: `linear-gradient(180deg, ${WHITE_05} 0%, ${WHITE_015} 100%)`,
              border: `1px solid ${APP_BORDER}`,
            },
          },
        }}
      >
        {LOCALE_CONFIGS.map((config) => (
          <MenuItem
            key={config.code}
            selected={config.code === locale}
            onClick={() => handleSelect(config.code)}
            sx={{
              py: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Typography variant="body1" aria-hidden="true">
                {config.flag}
              </Typography>
            </ListItemIcon>
            <ListItemText
              primary={config.label}
              slotProps={{
                primary: {
                  variant: 'body2',
                  sx: {
                    fontWeight: config.code === locale ? 600 : 400,
                  },
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
