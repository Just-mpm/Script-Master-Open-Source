import type { RefObject } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';

import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import BookmarkAdd from '@mui/icons-material/BookmarkAdd';
import Check from '@mui/icons-material/Check';
import Description from '@mui/icons-material/Description';
import Person from '@mui/icons-material/Person';
import SmartToy from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import type { AssistantSettings, ChatMessage } from '../types';
import { extractJsonSettings, stripJsonSettingsBlock } from '../utils';
import { assistantInsetSx, assistantMarkdownSx } from './assistantUi';
import { BRAND_PRIMARY, WHITE_06, WHITE_82, WHITE_16, AVATAR_SIZE_SM, ICON_SIZE_SM, ICON_SIZE_MD, RADIUS_XS, GAP_COMPACT, GAP_DEFAULT, GAP_MEDIUM, GAP_RELAXED } from '../../../theme/tokens';

interface AssistantMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  appliedMessageId: string | null;
  savedToMemoryId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onApply: (settings: AssistantSettings, messageId: string) => void;
  onSaveToMemory: (text: string, messageId: string) => void;
}

export function AssistantMessages({
  messages,
  isLoading,
  isStreaming,
  appliedMessageId,
  savedToMemoryId,
  messagesEndRef,
  onApply,
  onSaveToMemory,
}: AssistantMessagesProps) {
  // Última mensagem do modelo — pode estar em streaming (texto progressivo)
  const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');

  // Oculta skeleton quando o primeiro token já chegou (texto parcial > '')
  const showSkeleton = isLoading && !isStreaming;
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, py: { xs: 1, md: 1.5 } }}>
      <Stack spacing={GAP_RELAXED}>
        {messages.map((message) => {
          const isModel = message.role === 'model';
          // Verifica se esta é a mensagem que está sendo gerada via streaming
          const isCurrentlyStreaming = isStreaming
            && lastModelMessage?.id === message.id;
          const extracted = isModel && !isCurrentlyStreaming ? extractJsonSettings(message.text) : null;
          const settings: AssistantSettings | null = extracted && !extracted.parseError ? extracted.settings : null;
          const hasMalformedJson = extracted?.parseError === true;
          const cleanText = stripJsonSettingsBlock(message.text);

          return (
              <Stack key={message.id} direction="row" spacing={GAP_MEDIUM} sx={{ width: '100%', justifyContent: isModel ? 'flex-start' : 'flex-end' }}>
                {isModel ? (
                  <Avatar sx={{ bgcolor: WHITE_06, border: '1px solid', borderColor: 'divider', width: AVATAR_SIZE_SM, height: AVATAR_SIZE_SM }}>
                    <SmartToy sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY }} />
                  </Avatar>
                ) : null}

              <Stack spacing={GAP_COMPACT} sx={{ width: '100%', maxWidth: { xs: '100%', md: '82%' }, alignItems: isModel ? 'flex-start' : 'flex-end' }}>
                {message.attachments && message.attachments.length > 0 ? (
                  <Stack direction="row" spacing={GAP_COMPACT} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: isModel ? 'flex-start' : 'flex-end' }}>
                    {message.attachments.map((attachment, index) => {
                      const isImage = attachment.mimeType.startsWith('image/');

                      return (
                        <Box key={`${message.id}-${index}`} sx={(theme) => ({ ...assistantInsetSx(theme), px: 1.25, py: 1 })}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {isImage ? (
                              <Box
                                component="img"
                                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                alt={attachment.name}
                                sx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 1.5 }}
                              />
                            ) : (
                                <Description sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160 }} noWrap>
                              {attachment.name || 'Arquivo'}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : null}

                <Card
                  elevation={0}
                  sx={(theme) => ({
                    width: '100%',
                    px: { xs: 1.25, md: 1.75 },
                    py: { xs: 1, md: 1.25 },
                    borderRadius: RADIUS_XS,
                    border: '1px solid',
                    borderColor: isModel ? 'divider' : 'transparent',
                    background: isModel
                      ? alpha(theme.palette.background.paper, 0.66)
                      : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.94)} 0%, ${alpha(theme.palette.secondary.main, 0.88)} 100%)`,
                    color: isModel ? 'text.primary' : 'common.white',
                  })}
                >
                  <Stack spacing={GAP_COMPACT}>
                    <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                          {isModel ? <AutoAwesome sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} /> : <Person sx={{ fontSize: ICON_SIZE_MD }} />}
                        <Typography variant="caption" sx={{ fontWeight: 700, color: isModel ? 'text.secondary' : WHITE_82 }}>
                          {isModel ? 'Assistente' : 'Você'}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Box sx={{ ...assistantMarkdownSx, typography: 'body2', position: 'relative' }}>
                      {cleanText ? <ReactMarkdown>{cleanText}</ReactMarkdown> : null}
                      {isCurrentlyStreaming ? (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 2,
                            height: '1.1em',
                            bgcolor: 'text.primary',
                            ml: 0.5,
                            verticalAlign: 'text-bottom',
                            animation: 'assistantCursorBlink 1s step-end infinite',
                            '@keyframes assistantCursorBlink': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0 },
                            },
                          }}
                        />
                      ) : null}

                      {hasMalformedJson ? (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.5 }}>
                          O assistente sugeriu ajustes, mas o formato não pôde ser interpretado.
                        </Typography>
                      ) : null}
                    </Box>

                     {settings || (isModel && message.id !== 'welcome' && !isCurrentlyStreaming) ? <Divider sx={{ borderColor: isModel ? 'divider' : WHITE_16 }} /> : null}

                    <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap' }}>
                       {!isCurrentlyStreaming && settings ? (
                         <Button
                           onClick={() => onApply(settings, message.id)}
                           variant="contained"
                           color="secondary"
                           size="small"
                             startIcon={appliedMessageId === message.id ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <AutoAwesome sx={{ fontSize: ICON_SIZE_MD }} />}
                         >
                           {appliedMessageId === message.id ? 'Aplicado' : 'Aplicar no estúdio'}
                         </Button>
                       ) : null}

                       {isModel && message.id !== 'welcome' && !isCurrentlyStreaming ? (
                         <Button
                           onClick={() => onSaveToMemory(cleanText, message.id)}
                           variant="outlined"
                           color="inherit"
                           size="small"
                            startIcon={savedToMemoryId === message.id ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <BookmarkAdd sx={{ fontSize: ICON_SIZE_MD }} />}
                            sx={{ borderColor: isModel ? 'divider' : 'action.hover' }}
                         >
                           {savedToMemoryId === message.id ? 'Salvo na memória' : 'Salvar insight'}
                         </Button>
                       ) : null}
                     </Stack>
                  </Stack>
                </Card>
              </Stack>

              {!isModel ? (
                <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: AVATAR_SIZE_SM, height: AVATAR_SIZE_SM }}>
                  <Person sx={{ fontSize: ICON_SIZE_SM }} />
                </Avatar>
              ) : null}
            </Stack>
          );
        })}

        {showSkeleton ? (
          <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'flex-start' }}>
            <Avatar sx={{ bgcolor: WHITE_06, border: '1px solid', borderColor: 'divider', width: AVATAR_SIZE_SM, height: AVATAR_SIZE_SM }}>
                <SmartToy sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY }} />
            </Avatar>

            <Card elevation={0} sx={{ p: GAP_MEDIUM * 2, borderRadius: RADIUS_XS, width: '100%', maxWidth: 560 }}>
              <Stack spacing={GAP_DEFAULT}>
                <Skeleton variant="text" animation="wave" width="28%" />
                <Skeleton variant="rounded" animation="wave" height={16} width="92%" />
                <Skeleton variant="rounded" animation="wave" height={16} width="80%" />
                <Stack direction="row" spacing={GAP_COMPACT}>
                  <Skeleton variant="rounded" animation="wave" width={112} height={30} />
                  <Skeleton variant="rounded" animation="wave" width={108} height={30} />
                </Stack>
              </Stack>
            </Card>
          </Stack>
        ) : null}

        <div ref={messagesEndRef} />
      </Stack>
    </Box>
  );
}
