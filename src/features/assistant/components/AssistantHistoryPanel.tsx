import React, { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import Box from '@mui/material/Box';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import History from '@mui/icons-material/History';
import Search from '@mui/icons-material/Search';
import SmartToy from '@mui/icons-material/SmartToy';
import type { ChatSession } from '../../../lib/db';
import {
  BRAND_PRIMARY,
  BRAND_PRIMARY_GLOW_SOFT,
  TEXT_DISABLED,
  ICON_SIZE_SM,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  GAP_COMPACT,
  GAP_MEDIUM,
  GAP_DEFAULT,
} from '../../../theme/tokens';
import { assistantDrawerPaperSx, assistantDrawerHeaderSx, assistantInsetSx, assistantHistoryItemSx } from './assistantUi';

interface AssistantHistoryPanelProps {
  history: ChatSession[];
  isLoading?: boolean;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteHistory: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
}

export const AssistantHistoryPanel = React.memo(function AssistantHistoryPanel({
  history,
  isLoading = false,
  onClose,
  onSelectSession,
  onDeleteHistory,
}: AssistantHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra sessões por título com base na busca
  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return history;
    }
    return history.filter((session) => session.title.toLowerCase().includes(query));
  }, [history, searchQuery]);

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
        <Stack direction="row" sx={assistantDrawerHeaderSx}>
          <Stack spacing={GAP_COMPACT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <History sx={{ fontSize: ICON_SIZE_LG, color: BRAND_PRIMARY }} />
              <Typography variant="h6" sx={{ letterSpacing: '-0.02em' }}>Histórico de chats</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              Retome conversas anteriores sem perder o contexto criativo.
            </Typography>
          </Stack>

          <IconButton
            onClick={onClose}
            aria-label="Fechar histórico"
            sx={{
              '&:hover': { backgroundColor: BRAND_PRIMARY_GLOW_SOFT },
            }}
          >
            <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Stack>

        {/* Campo de busca por título */}
        {history.length > 0 && (
          <Box sx={{ px: 3, pt: 2 }}>
            <TextField
              type="search"
              size="small"
              placeholder="Buscar no histórico…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: ICON_SIZE_SM, color: TEXT_DISABLED }} />
                    </InputAdornment>
                  ),
                  ...(searchQuery ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery('')}
                          aria-label="Limpar busca"
                          sx={{ mr: -0.5 }}
                        >
                          <Close sx={{ fontSize: ICON_SIZE_SM }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  } : {}),
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {isLoading ? (
            <List disablePadding sx={{ display: 'grid', gap: GAP_MEDIUM }}>
              {[1, 2, 3].map((key) => (
                <Box key={key} sx={(theme) => ({ ...assistantInsetSx(theme), p: 1.75, display: 'flex', alignItems: 'center', gap: GAP_MEDIUM })}>
                  <Skeleton variant="circular" width={ICON_SIZE_MD} height={ICON_SIZE_MD} animation="wave" />
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} animation="wave" />
                    <Skeleton variant="text" width="35%" height={14} animation="wave" />
                  </Stack>
                </Box>
              ))}
            </List>
          ) : history.length === 0 ? (
            <Stack spacing={GAP_MEDIUM} sx={{ minHeight: 320, textAlign: 'center', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: BRAND_PRIMARY_GLOW_SOFT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 0.5,
                }}
              >
                <History sx={{ fontSize: ICON_SIZE_LG, color: TEXT_DISABLED }} />
              </Box>
              <Stack spacing={GAP_COMPACT}>
                <Typography variant="subtitle1" sx={{ letterSpacing: '-0.01em' }}>Nenhum chat salvo ainda</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  Quando você conversar com o assistente, as sessões aparecem aqui para reuso rápido.
                </Typography>
              </Stack>
            </Stack>
          ) : filteredHistory.length === 0 ? (
            <Stack spacing={GAP_MEDIUM} sx={{ minHeight: 240, textAlign: 'center', alignItems: 'center', justifyContent: 'center' }}>
              <Search sx={{ fontSize: 44, color: TEXT_DISABLED }} />
              <Stack spacing={GAP_COMPACT}>
                <Typography variant="subtitle1" sx={{ letterSpacing: '-0.01em' }}>Nenhum chat encontrado</Typography>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma sessão corresponde a &ldquo;{searchQuery}&rdquo;.
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <List disablePadding sx={{ display: 'grid', gap: GAP_MEDIUM }}>
              {filteredHistory.map((session) => (
                <Box key={session.id} sx={(theme) => ({ ...assistantInsetSx(theme), overflow: 'hidden' })}>
                  <ListItemButton
                    onClick={() => onSelectSession(session)}
                    sx={assistantHistoryItemSx}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mt: 0.2 }}>
                      <SmartToy sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
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
                        sx={{
                          opacity: 0.5,
                          transition: 'opacity 0.15s ease',
                          '&:hover': { opacity: 1 },
                        }}
                      >
                        <Delete sx={{ fontSize: ICON_SIZE_MD }} />
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
});
