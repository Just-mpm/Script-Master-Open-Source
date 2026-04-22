import type { ChangeEvent, FormEvent, RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Add from '@mui/icons-material/Add';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Close from '@mui/icons-material/Close';
import Description from '@mui/icons-material/Description';
import Delete from '@mui/icons-material/Delete';
import Psychology from '@mui/icons-material/Psychology';
import type { Memory } from '../../../lib/db';
import { BRAND_PRIMARY, BRAND_SECONDARY, ICON_SIZE_MD, ICON_SIZE_LG, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM } from '../../../theme/tokens';
import { assistantDrawerPaperSx, assistantInsetSx } from './assistantUi';

interface AssistantMemoriesPanelProps {
  memories: Memory[];
  isLoading?: boolean;
  newMemory: string;
  documentInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onNewMemoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteMemory: (id: string) => void;
  onDocumentUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function AssistantMemoriesPanel({
  memories,
  isLoading = false,
  newMemory,
  documentInputRef,
  onClose,
  onNewMemoryChange,
  onSubmit,
  onDeleteMemory,
  onDocumentUpload,
}: AssistantMemoriesPanelProps) {
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
          <Stack spacing={GAP_COMPACT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
              <Psychology sx={{ fontSize: ICON_SIZE_LG, color: BRAND_PRIMARY }} />
              <Typography variant="h6">Memórias e documentos</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Ensine preferências, contexto de marca e anexos que ajudam o assistente a responder melhor.
            </Typography>
          </Stack>

          <IconButton onClick={onClose} aria-label="Fechar memórias">
            <Close sx={{ fontSize: ICON_SIZE_MD }} />
          </IconButton>
        </Stack>

          <Stack spacing={2} sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box component="form" onSubmit={onSubmit}>
            <TextField
              fullWidth
              value={newMemory}
              onChange={(event) => onNewMemoryChange(event.target.value)}
              placeholder="Ex.: prefiro aberturas mais curtas e narradores com tom calmo"
              label="Adicionar memória curta"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                       <Button type="submit" variant="contained" size="small" startIcon={<Add sx={{ fontSize: ICON_SIZE_MD }} />}>
                        Salvar
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <input
            type="file"
            ref={documentInputRef}
            onChange={onDocumentUpload}
            accept=".md,.txt,.csv"
            hidden
          />

          <Box sx={(theme) => ({ ...assistantInsetSx(theme), p: 2 })}>
            <Stack spacing={GAP_MEDIUM}>
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                <AutoAwesome sx={{ fontSize: ICON_SIZE_MD, color: BRAND_SECONDARY }} />
                <Typography variant="subtitle2">Base de conhecimento</Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Envie .md, .txt ou .csv com diretrizes, documentação ou repertório que o assistente deve considerar.
              </Typography>

              <Button
                onClick={() => documentInputRef.current?.click()}
                variant="outlined"
                 startIcon={<CloudUpload sx={{ fontSize: ICON_SIZE_MD }} />}
              >
                Anexar documento
              </Button>
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {isLoading ? (
            <List disablePadding sx={{ display: 'grid', gap: GAP_MEDIUM }}>
              {[1, 2, 3].map((key) => (
                <ListItem
                  key={key}
                  disablePadding
                  sx={(theme) => ({ ...assistantInsetSx(theme), alignItems: 'flex-start', p: 2, pr: 7 })}
                >
                  <ListItemText
                    primary={<Skeleton variant="text" animation="wave" />}
                    secondary={<Skeleton variant="text" width="30%" height={14} animation="wave" />}
                    slotProps={{
                      primary: { variant: 'body2', sx: { pr: 1 } },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          ) : memories.length === 0 ? (
            <Stack spacing={GAP_MEDIUM} sx={{ minHeight: 280, textAlign: 'center', alignItems: 'center', justifyContent: 'center' }}>
                <Description sx={{ fontSize: 42, color: 'text.secondary' }} />
              <Typography variant="subtitle1">Ainda não há memórias salvas</Typography>
              <Typography variant="body2" color="text.secondary">
                Salve preferências e referências para tornar as respostas mais consistentes com sua operação.
              </Typography>
            </Stack>
          ) : (
            <List disablePadding sx={{ display: 'grid', gap: GAP_MEDIUM }}>
              {memories.map((memory) => (
                <ListItem
                  key={memory.id}
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Excluir memória">
                      <IconButton edge="end" onClick={() => onDeleteMemory(memory.id)} color="error" aria-label="Excluir memória">
                         <Delete sx={{ fontSize: ICON_SIZE_MD }} />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={(theme) => ({ ...assistantInsetSx(theme), alignItems: 'flex-start', p: 2, pr: 7 })}
                >
                  <ListItemText
                    primary={memory.content.length > 320 ? `${memory.content.slice(0, 320)}…` : memory.content}
                    secondary={new Date(memory.createdAt).toLocaleString()}
                    slotProps={{
                      primary: {
                        variant: 'body2',
                        color: 'text.primary',
                        sx: { whiteSpace: 'pre-wrap', pr: 1 },
                      },
                      secondary: {
                        variant: 'caption',
                        color: 'text.secondary',
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Drawer>
  );
}
