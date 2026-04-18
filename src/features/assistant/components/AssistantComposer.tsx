import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
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
        py: { xs: 2, md: 2.5 },
        borderTop: '1px solid',
        borderColor: 'divider',
        background: (theme) => `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0)} 0%, ${alpha(theme.palette.background.paper, 0.92)} 18%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        backdropFilter: 'blur(18px)',
      }}
    >
      <Stack spacing={1.5}>
        {pendingFiles.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');

              return (
                <Chip
                  key={`${file.name}-${index}`}
                   icon={isImage ? <Image sx={{ fontSize: 14 }} /> : <Description sx={{ fontSize: 14 }} />}
                   label={file.name}
                   onDelete={() => onRemoveFile(index)}
                   deleteIcon={<Close sx={{ fontSize: 14 }} />}
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
                       <AttachFile sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.5, mr: 0.5 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    loading={isLoading}
                    disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                     endIcon={!isLoading ? <SendIcon sx={{ fontSize: 16 }} /> : undefined}
                    sx={{ minWidth: 120 }}
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
              borderRadius: 4,
              px: 0.5,
              py: 0.75,
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.72),
            },
          }}
        />

        <Alert variant="outlined" severity="info" sx={{ py: 0.25 }}>
          <Typography variant="caption" color="inherit">
            Enter envia. Shift + Enter quebra linha. Você pode anexar imagens, PDF e texto para enriquecer o contexto.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
}
