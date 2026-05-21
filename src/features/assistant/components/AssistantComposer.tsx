import React, { type ChangeEvent, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { useLocale } from '../../../features/i18n';
import {
  ICON_SIZE_SM,
  ICON_SIZE_MD,
  WHITE_06,
  TEXT_DISABLED,
  ERROR_MAIN,
} from '../../../theme/tokens';
import {
  assistantComposerContainerSx,
  assistantComposerInputSx,
  assistantAttachmentChipSx,
  assistantActionIconButtonSx,
  assistantSendButtonSx,
} from './assistantUi';
import AttachFile from '@mui/icons-material/AttachFile';
import Close from '@mui/icons-material/Close';
import Description from '@mui/icons-material/Description';
import Image from '@mui/icons-material/Image';
import SendIcon from '@mui/icons-material/Send';
import Stop from '@mui/icons-material/Stop';

interface AssistantComposerProps {
  input: string;
  pendingFiles: File[];
  isLoading: boolean;
  creditsBlocked?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onStopGeneration?: () => void;
}

export const AssistantComposer = React.memo(function AssistantComposer({
  input,
  pendingFiles,
  isLoading,
  creditsBlocked = false,
  fileInputRef,
  onInputChange,
  onSubmit,
  onFileChange,
  onRemoveFile,
  onStopGeneration,
}: AssistantComposerProps) {
  const { t } = useLocale();

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

  const canSend = (input.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !creditsBlocked;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={(theme) => assistantComposerContainerSx(theme)}
    >
      <Stack spacing={1}>
        {pendingFiles.length > 0 ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');

              return (
                <Chip
                  key={`${file.name}-${index}`}
                  icon={isImage
                    ? <Image sx={{ fontSize: ICON_SIZE_SM }} />
                    : <Description sx={{ fontSize: ICON_SIZE_SM }} />}
                  label={file.name}
                  onDelete={() => onRemoveFile(index)}
                  deleteIcon={<Close sx={{ fontSize: ICON_SIZE_SM }} />}
                  variant="outlined"
                  size="small"
                  sx={assistantAttachmentChipSx}
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
          placeholder={t('assistant.composer.placeholder')}
          fullWidth
          disabled={creditsBlocked}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-end', mb: 0.25 }}>
                  <Tooltip title={t('assistant.composer.attachFile')}>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      edge="start"
                      aria-label={t('assistant.composer.attachFileAria')}
                      size="small"
                      disabled={creditsBlocked}
                      sx={{
                        color: TEXT_DISABLED,
                        '&:hover': { color: 'text.secondary', backgroundColor: alpha(WHITE_06, 0.5) },
                      }}
                    >
                      <AttachFile sx={{ fontSize: ICON_SIZE_MD }} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.25, mr: 0.25 }}>
                  {isLoading ? (
                    <Tooltip title={t('assistant.composer.stopGeneration')}>
                      <IconButton
                        onClick={onStopGeneration || onSubmit}
                        aria-label={t('assistant.composer.stopGeneration')}
                        size="small"
                        sx={{
                          ...assistantActionIconButtonSx,
                          minWidth: 40,
                          width: 40,
                          height: 40,
                          backgroundColor: 'error.main',
                          boxShadow: `0 4px 16px ${alpha(ERROR_MAIN, 0.24)}`,
                          '&:hover': {
                            ...assistantActionIconButtonSx['&:hover'],
                            backgroundColor: 'error.dark',
                            boxShadow: `0 6px 24px ${alpha(ERROR_MAIN, 0.36)}`,
                          },
                        }}
                      >
                        <Stop sx={{ fontSize: ICON_SIZE_SM }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      disabled={!canSend}
                      aria-label={t('assistant.composer.send')}
                      endIcon={<SendIcon sx={{ fontSize: ICON_SIZE_SM }} />}
                      sx={assistantSendButtonSx}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: { xs: 'none', sm: 'inline' },
                        }}
                      >
                        {t('assistant.composer.send')}
                      </Box>
                    </Button>
                  )}
                </InputAdornment>
              ),
            },
          }}
          sx={(theme) => assistantComposerInputSx(theme)}
        />
      </Stack>
    </Box>
  );
});
