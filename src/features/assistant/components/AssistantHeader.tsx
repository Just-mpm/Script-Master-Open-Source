import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Forum from '@mui/icons-material/Forum';
import History from '@mui/icons-material/History';
import Psychology from '@mui/icons-material/Psychology';
import Settings from '@mui/icons-material/Settings';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  GAP_MEDIUM,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  AVATAR_SIZE_MD,
  RADIUS_XS,
  TEXT_SECONDARY,
} from '../../../theme/tokens';

interface AssistantHeaderProps {
  onStartNewChat: () => void;
  onOpenHistory: () => void;
  onOpenMemories: () => void;
  onOpenSettings: () => void;
}

export const AssistantHeader = React.memo(function AssistantHeader({
  onStartNewChat,
  onOpenHistory,
  onOpenMemories,
  onOpenSettings,
}: AssistantHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: GAP_MEDIUM, md: 0 }}
      sx={{
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.5, md: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.48),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={GAP_MEDIUM} sx={{ minWidth: 0, alignItems: 'center' }}>
        <Avatar
          variant="rounded"
          sx={{
            width: AVATAR_SIZE_MD,
            height: AVATAR_SIZE_MD,
            borderRadius: RADIUS_XS,
            background: BRAND_GRADIENT,
            boxShadow: `0 8px 24px ${alpha(BRAND_PRIMARY, 0.2)}`,
          }}
        >
          <AutoAwesome sx={{ fontSize: ICON_SIZE_LG }} />
        </Avatar>

        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ letterSpacing: '-0.02em' }}>
              Assistente criativo
            </Typography>
            <Chip
              label="Gemini"
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ flexShrink: 0, fontWeight: 600, fontSize: '0.7rem' }}
            />
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: TEXT_SECONDARY,
              maxWidth: 560,
              display: { xs: 'block', md: 'none' },
              lineHeight: 1.4,
            }}
          >
            Um painel de direção criativa para lapidar roteiro, voz, memória de projeto e ajustes de cena.
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{
          flexWrap: 'wrap',
          width: { xs: '100%', md: 'auto' },
          alignItems: 'center',
        }}
      >
        <Button
          onClick={onStartNewChat}
          variant="contained"
          startIcon={<Forum sx={{ fontSize: ICON_SIZE_MD }} />}
          sx={{
            minWidth: { xs: '100%', sm: 'auto' },
          }}
        >
          Novo chat
        </Button>

        <Tooltip title="Abrir histórico">
          <IconButton
            onClick={onOpenHistory}
            color="primary"
            aria-label="Abrir histórico do assistente"
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <History sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Memórias e documentos">
          <IconButton
            onClick={onOpenMemories}
            color="primary"
            aria-label="Abrir memórias e documentos"
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <Psychology sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Persona e diretrizes">
          <IconButton
            onClick={onOpenSettings}
            color="primary"
            aria-label="Abrir persona e diretrizes"
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <Settings sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: 'none', lg: 'block' }, ml: 0.5 }}>
          <Chip
            label="Leitura limpa"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
          />
        </Box>
      </Stack>
    </Stack>
  );
});
