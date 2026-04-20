import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { ICON_SIZE_SM, ICON_SIZE_MD, RADIUS_XS } from '../../../theme/tokens';
import AttachFile from '@mui/icons-material/AttachFile';
import Close from '@mui/icons-material/Close';
import Description from '@mui/icons-material/Description';
import Image from '@mui/icons-material/Image';
import SendIcon from '@mui/icons-material/Send';

interface AssistantComposerProps {
  input: string;
  pendingFiles: File[];
  isLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
}

export function AssistantComposer({
  input,
  pendingFiles,
  isLoading,
  fileInputRef,
  onInputChange,
  onSubmit,
  onFileChange,
  onRemoveFile,
}: AssistantComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        px: { xs: 2, md: 3 },
        py: { xs: 1.25, md: 1.5 },
        borderTop: '1px solid',
        borderColor: 'divider',
        background: (theme) => `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0)} 0%, ${alpha(theme.palette.background.paper, 0.92)} 18%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        backdropFilter: 'blur(18px)',
      }}
    >
      <Stack spacing={1}>
        {pendingFiles.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');

              return (
                <Chip
                  key={`${file.name}-${index}`}
                   icon={isImage ? <Image sx={{ fontSize: ICON_SIZE_SM }} /> : <Description sx={{ fontSize: ICON_SIZE_SM }} />}
                   label={file.name}
                   onDelete={() => onRemoveFile(index)}
                   deleteIcon={<Close sx={{ fontSize: ICON_SIZE_SM }} />}
                  variant="outlined"
                  sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                />
              );
            })}
          </Stack>
        ) : null}

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          hidden
          multiple
          accept="image/*,.pdf,.txt"
        />

        <TextField
          id="assistant-chat-input"
          name="chat-message"
          multiline
          minRows={1}
          maxRows={6}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Peça ajustes de roteiro, ideias de voz, ritmo, cena ou análise de anexos…"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-end', mb: 0.5 }}>
                  <Tooltip title="Anexar arquivo">
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      edge="start"
                      aria-label="Anexar arquivo"
                    >
                       <AttachFile sx={{ fontSize: ICON_SIZE_MD }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.5, mr: 0.5 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    loading={isLoading}
                    disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                      endIcon={!isLoading ? <SendIcon sx={{ fontSize: ICON_SIZE_MD }} /> : undefined}
                    sx={{ minWidth: 96 }}
                  >
                    Enviar
                  </Button>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              alignItems: 'flex-end',
              borderRadius: RADIUS_XS,
              px: 0.5,
              py: 0.5,
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.72),
            },
          }}
        />
      </Stack>
    </Box>
  );
}
