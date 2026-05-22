/**
 * Card individual de template — usado dentro do TemplateGallery.
 */

import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { type SxProps, type Theme } from '@mui/material/styles';
import School from '@mui/icons-material/School';
import Videocam from '@mui/icons-material/Videocam';
import Mic from '@mui/icons-material/Mic';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import MenuBook from '@mui/icons-material/MenuBook';
import Lightbulb from '@mui/icons-material/Lightbulb';
import Campaign from '@mui/icons-material/Campaign';
import AutoStories from '@mui/icons-material/AutoStories';
import TheaterComedy from '@mui/icons-material/TheaterComedy';
import AccessibilityNew from '@mui/icons-material/AccessibilityNew';
import type { TemplateCategory, ScriptTemplate } from '../../../data/scriptTemplates';
import { TEMPLATE_CATEGORY_LABELS } from '../utils/templateUtils';
import { GAP_COMPACT, GAP_DEFAULT, RADIUS_SM, WHITE_08, BRAND_PRIMARY_GLOW_SOFT } from '../../../theme/tokens';

// ---------------------------------------------------------------------------
// Mapa de ícones MUI
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ sx?: SxProps<Theme> }>> = {
  School,
  Videocam,
  Mic,
  RecordVoiceOver,
  MenuBook,
  Lightbulb,
  Campaign,
  AutoStories,
  TheaterComedy,
  AccessibilityNew,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: ScriptTemplate;
  selected?: boolean;
  onSelect: (template: ScriptTemplate) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const TemplateCard = React.memo(function TemplateCard({
  template,
  selected,
  onSelect,
}: TemplateCardProps) {
  const theme = useTheme();
  const IconComponent = ICON_MAP[template.icon];

  const handleSelect = () => onSelect(template);

  return (
    <Box
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Template: ${template.name}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      }}
      sx={(t) => ({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: GAP_DEFAULT,
        p: 2.5,
        borderRadius: RADIUS_SM,
        border: '1px solid',
        borderColor: selected
          ? alpha(t.palette.primary.main, 0.55)
          : WHITE_08,
        backgroundColor: selected
          ? alpha(t.palette.primary.main, 0.1)
          : alpha(t.palette.background.default, 0.35),
        boxShadow: selected
          ? `0 0 0 1px ${alpha(t.palette.primary.main, 0.3)}, 0 12px 32px ${alpha(t.palette.primary.main, 0.14)}`
          : 'none',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: alpha(t.palette.primary.main, 0.4),
          backgroundColor: alpha(t.palette.primary.main, 0.06),
          boxShadow: `0 0 0 1px ${alpha(t.palette.primary.main, 0.25)}, 0 8px 24px ${BRAND_PRIMARY_GLOW_SOFT}`,
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': {
          outline: `2px solid ${t.palette.primary.main}`,
          outlineOffset: 2,
        },
      })}
    >
      {/* Header: ícone + badge de categoria */}
      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: RADIUS_SM,
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.main,
          }}
        >
          {IconComponent ? <IconComponent sx={{ fontSize: 20 }} /> : <School sx={{ fontSize: 20 }} />}
        </Box>

        <Chip
          label={TEMPLATE_CATEGORY_LABELS[template.category as TemplateCategory] ?? template.category}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.65rem',
            letterSpacing: '0.04em',
            height: 22,
          }}
        />
      </Stack>

      {/* Nome + descrição */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="subtitle2"
          component="p"
          sx={{
            mb: GAP_COMPACT,
            fontWeight: 600,
            color: selected ? 'primary.main' : 'text.primary',
          }}
        >
          {template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {template.description}
        </Typography>
      </Box>
    </Box>
  );
});
