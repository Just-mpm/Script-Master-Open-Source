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
import { BRAND_GRADIENT, BRAND_PRIMARY } from '../../../theme/tokens';

interface AssistantHeaderProps {
  onStartNewChat: () => void;
  onOpenHistory: () => void;
  onOpenMemories: () => void;
  onOpenSettings: () => void;
}

export function AssistantHeader({
  onStartNewChat,
  onOpenHistory,
  onOpenMemories,
  onOpenSettings,
}: AssistantHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      sx={{
        px: { xs: 2.5, md: 3 },
        py: { xs: 2, md: 2.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.38),
        backdropFilter: 'blur(16px)',
      }}
    >
      <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            background: BRAND_GRADIENT,
            boxShadow: `0 18px 44px ${alpha(BRAND_PRIMARY, 0.22)}`,
          }}
        >
            <AutoAwesome sx={{ fontSize: 18 }} />
        </Avatar>

        <Stack spacing={0.4} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Typography variant="h6">Assistente criativo</Typography>
            <Chip label="Gemini" size="small" color="secondary" variant="outlined" />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
            Um painel de direção criativa para lapidar roteiro, voz, memória de projeto e ajustes de cena sem poluir o fluxo.
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
        <Button
          onClick={onStartNewChat}
          variant="contained"
           startIcon={<Forum sx={{ fontSize: 16 }} />}
          sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
        >
          Novo chat
        </Button>

        <Tooltip title="Abrir histórico">
          <IconButton onClick={onOpenHistory} color="primary" aria-label="Abrir histórico do assistente">
             <History sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Memórias e documentos">
          <IconButton onClick={onOpenMemories} color="primary" aria-label="Abrir memórias e documentos">
             <Psychology sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Persona e diretrizes">
          <IconButton onClick={onOpenSettings} color="primary" aria-label="Abrir persona e diretrizes">
             <Settings sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: 'none', lg: 'block' }, ml: 0.5 }}>
          <Chip label="Leitura limpa · foco no contexto" size="small" variant="outlined" />
        </Box>
      </Stack>
    </Stack>
  );
}
