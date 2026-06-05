import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useLocale } from '../../../features/i18n';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Forum from '@mui/icons-material/Forum';
import History from '@mui/icons-material/History';
import Psychology from '@mui/icons-material/Psychology';
import Settings from '@mui/icons-material/Settings';
import {
  BRAND_GRADIENT,
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  AVATAR_SIZE_MD,
  RADIUS_XS,
  TEXT_SECONDARY,
  WHITE,
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
  const { t } = useLocale();

  return (
    <Stack
      direction="row"
      spacing={{ xs: 1, md: 0 }}
      useFlexGap
      sx={{
        px: { xs: 1.5, md: 2.5 },
        py: { xs: 1, md: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.48),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={{ xs: 1, md: 1.5 }} sx={{ minWidth: 0, alignItems: 'center' }}>
        <Avatar
          variant="rounded"
          sx={{
            width: { xs: 30, md: AVATAR_SIZE_MD },
            height: { xs: 30, md: AVATAR_SIZE_MD },
            borderRadius: RADIUS_XS,
            background: BRAND_GRADIENT,
            boxShadow: `0 8px 24px ${alpha(BRAND_PRIMARY, 0.2)}`,
            flexShrink: 0,
          }}
        >
          <AutoAwesome sx={{ fontSize: { xs: ICON_SIZE_MD, md: ICON_SIZE_LG }, color: WHITE }} />
        </Avatar>

        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            noWrap
            sx={{
              letterSpacing: 0,
              fontSize: { xs: '0.875rem', md: '1.5rem' },
            }}
          >
            {t('assistant.header.title')}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: TEXT_SECONDARY,
              maxWidth: 560,
              display: { xs: 'none', sm: 'block' },
              lineHeight: 1.4,
            }}
          >
            {t('assistant.header.subtitle')}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={{ xs: 0.5, md: 0.75 }}
        useFlexGap
        sx={{
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Tooltip title={t('assistant.header.newChat')}>
          <Button
            onClick={onStartNewChat}
            variant="contained"
            size="small"
            aria-label={t('assistant.header.newChat')}
            startIcon={<Forum sx={{ fontSize: ICON_SIZE_MD }} />}
            sx={{
              minWidth: { xs: 40, sm: 'auto' },
              px: { xs: 0, sm: 1.5 },
              '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('assistant.header.newChat')}
            </Box>
          </Button>
        </Tooltip>

        <Tooltip title={t('assistant.header.openHistory')}>
          <IconButton
            onClick={onOpenHistory}
            color="primary"
            aria-label={t('assistant.header.openHistoryAria')}
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <History sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('assistant.header.openMemories')}>
          <IconButton
            onClick={onOpenMemories}
            color="primary"
            aria-label={t('assistant.header.openMemoriesAria')}
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <Psychology sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('assistant.header.openSettings')}>
          <IconButton
            onClick={onOpenSettings}
            color="primary"
            aria-label={t('assistant.header.openSettingsAria')}
            sx={{
              '&:hover': {
                backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
              },
            }}
          >
            <Settings sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
});
