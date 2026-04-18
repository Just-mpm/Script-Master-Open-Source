import type { MouseEvent } from 'react';
import Box from '@mui/material/Box';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import History from '@mui/icons-material/History';
import SmartToy from '@mui/icons-material/SmartToy';
import type { ChatSession } from '../../../lib/db';
import { BRAND_PRIMARY } from '../../../theme/tokens';
import { assistantDrawerPaperSx, assistantInsetSx } from './assistantUi';

interface AssistantHistoryPanelProps {
  history: ChatSession[];
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteHistory: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
}

export function AssistantHistoryPanel({
  history,
  onClose,
  onSelectSession,
  onDeleteHistory,
}: AssistantHistoryPanelProps) {
  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          sx: assistantDrawerPaperSx,
        },
        transition: {
          unmountOnExit: true,
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <History sx={{ fontSize: 18, color: BRAND_PRIMARY }} />
              <Typography variant="h6">Histórico de chats</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Retome conversas anteriores sem perder o contexto criativo.
            </Typography>
          </Stack>

          <IconButton onClick={onClose} aria-label="Fechar histórico">
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {history.length === 0 ? (
            <Stack spacing={2} sx={{ minHeight: 320, textAlign: 'center', alignItems: 'center', justifyContent: 'center' }}>
              <History sx={{ fontSize: 44, color: 'text.secondary' }} />
              <Stack spacing={0.75}>
                <Typography variant="subtitle1">Nenhum chat salvo ainda</Typography>
                <Typography variant="body2" color="text.secondary">
                  Quando você conversar com o assistente, as sessões aparecem aqui para reuso rápido.
                </Typography>
              </Stack>
              <Stack spacing={1} sx={{ width: '100%', maxWidth: 280 }}>
                <Skeleton variant="rounded" animation="wave" height={64} />
                <Skeleton variant="rounded" animation="wave" height={64} />
              </Stack>
            </Stack>
          ) : (
            <List disablePadding sx={{ display: 'grid', gap: 1.25 }}>
              {history.map((session) => (
                <Box key={session.id} sx={(theme) => ({ ...assistantInsetSx(theme), overflow: 'hidden' })}>
                  <ListItemButton
                    onClick={() => onSelectSession(session)}
                    sx={{
                      alignItems: 'flex-start',
                      px: 2,
                      py: 1.75,
                      gap: 1.25,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mt: 0.2 }}>
                      <SmartToy sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" noWrap>
                          {session.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(session.updatedAt).toLocaleString()}
                        </Typography>
                      }
                    />

                    <Tooltip title="Excluir conversa">
                      <IconButton
                        onClick={(event) => onDeleteHistory(event, session.id)}
                        color="error"
                        aria-label="Excluir conversa"
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                </Box>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Drawer>
  );
}
