/**
 * Card de selecao reutilizavel para perfil e metas do wizard.
 * MUI Paper com motion, estados selecionado/nao-selecionado.
 */

import { useCallback } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { motion } from 'motion/react';
import Check from '@mui/icons-material/Check';
import { BRAND_PRIMARY, RADIUS_SM, RADIUS_XS } from '../../../theme/tokens';

type SelectionMode = 'single' | 'multi';

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactElement;
  label: string;
  description?: string;
  multiline?: boolean;
  selectionMode?: SelectionMode;
}

export function SelectionCard({
  selected,
  onClick,
  icon,
  label,
  description,
  multiline,
  selectionMode = 'single',
}: SelectionCardProps) {
  const theme = useTheme();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <Box
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Paper
        role={selectionMode === 'single' ? 'radio' : 'checkbox'}
        aria-checked={selected}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 1.5,
          p: multiline ? 2 : 1.5,
          borderRadius: RADIUS_SM,
          cursor: 'pointer',
          border: `1px solid ${selected ? BRAND_PRIMARY : alpha(theme.palette.common.white, 0.08)}`,
          backgroundColor: selected
            ? alpha(BRAND_PRIMARY, 0.08)
            : alpha(theme.palette.common.white, 0.03),
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        elevation={0}
      >
        {/* Container do icone */}
        <Stack
          sx={{
            p: multiline ? 1.2 : 1,
            borderRadius: RADIUS_XS,
            backgroundColor: selected
              ? alpha(BRAND_PRIMARY, 0.16)
              : alpha(theme.palette.common.white, 0.06),
            color: selected ? BRAND_PRIMARY : 'text.secondary',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          {icon}
        </Stack>

        {/* Label e descricao */}
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: selected ? 'text.primary' : 'text.secondary',
            }}
          >
            {label}
          </Typography>
          {description && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', mt: 0.25, lineHeight: 1.4 }}
            >
              {description}
            </Typography>
          )}
        </Stack>

        {/* Indicador de selecao */}
        {selected && (
          <Stack
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: BRAND_PRIMARY,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check sx={{ fontSize: 12, color: '#fff' }} />
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
