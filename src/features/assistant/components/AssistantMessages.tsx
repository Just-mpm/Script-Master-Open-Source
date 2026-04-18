import type { RefObject } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import BookmarkAdd from '@mui/icons-material/BookmarkAdd';
import Check from '@mui/icons-material/Check';
import Description from '@mui/icons-material/Description';
import Image from '@mui/icons-material/Image';
import Person from '@mui/icons-material/Person';
import SmartToy from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import type { AssistantSettings, ChatMessage } from '../types';
import { extractJsonSettings, stripJsonSettingsBlock } from '../utils';
import { assistantInsetSx, assistantMarkdownSx } from './assistantUi';
import { BRAND_PRIMARY, WHITE_06, WHITE_82, WHITE_16 } from '../../../theme/tokens';

interface AssistantMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  appliedMessageId: string | null;
  savedToMemoryId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onApply: (settings: AssistantSettings, messageId: string) => void;
  onQuickPrompt: (prompt: string) => void;
  onSaveToMemory: (text: string, messageId: string) => void;
}

const QUICK_PROMPTS = [
  { label: 'Ideia de roteiro', text: 'Me dê uma ideia de roteiro curto para um vídeo de tecnologia.' },
  { label: 'Melhor voz', text: 'Qual voz você recomenda para um podcast de meditação?' },
  { label: 'Dicas de ritmo', text: 'Como posso usar as notas de estilo para deixar a voz mais natural?' },
];

export function AssistantMessages({
  messages,
  isLoading,
  appliedMessageId,
  savedToMemoryId,
  messagesEndRef,
  onApply,
  onQuickPrompt,
  onSaveToMemory,
}: AssistantMessagesProps) {
  const showQuickPrompts = messages.length === 1 && !isLoading;

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {showQuickPrompts ? (
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 4,
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.62),
            }}
          >
            <Stack spacing={2}>
              <Stack spacing={0.75}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.18em' }}>
                  Comece por aqui
                </Typography>
                <Typography variant="h6">Use o assistente como uma mesa de direção</Typography>
                <Typography variant="body2" color="text.secondary">
                  Peça análise, reescrita, definição de voz, ritmo e sugestões aplicáveis ao estúdio sem precisar sair da conversa.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                {QUICK_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt.label}
                    variant="outlined"
                    color="inherit"
                    onClick={() => onQuickPrompt(prompt.text)}
                    sx={{ justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', borderRadius: 3, py: 1.5, px: 1.75 }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle2" color="primary.main">
                        {prompt.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {prompt.text}
                      </Typography>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Card>
        ) : null}

        {messages.map((message) => {
          const isModel = message.role === 'model';
          const settings = isModel ? extractJsonSettings(message.text) : null;
          const cleanText = stripJsonSettingsBlock(message.text);

          return (
            <Stack
              key={message.id}
              direction="row"
              spacing={1.5}
              justifyContent={isModel ? 'flex-start' : 'flex-end'}
              sx={{ width: '100%' }}
            >
                {isModel ? (
                  <Avatar sx={{ bgcolor: WHITE_06, border: '1px solid', borderColor: 'divider' }}>
                    <SmartToy sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
                  </Avatar>
                ) : null}

              <Stack spacing={1} sx={{ width: '100%', maxWidth: { xs: '100%', md: '82%' }, alignItems: isModel ? 'flex-start' : 'flex-end' }}>
                {message.attachments && message.attachments.length > 0 ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: isModel ? 'flex-start' : 'flex-end' }}>
                    {message.attachments.map((attachment, index) => {
                      const isImage = attachment.mimeType.startsWith('image/');

                      return (
                        <Box key={`${message.id}-${index}`} sx={(theme) => ({ ...assistantInsetSx(theme), px: 1.25, py: 1 })}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {isImage ? (
                              <Box
                                component="img"
                                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                alt={attachment.name}
                                sx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 1.5 }}
                              />
                            ) : (
                                <Description sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
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
                    px: { xs: 2, md: 2.5 },
                    py: { xs: 1.75, md: 2 },
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: isModel ? 'divider' : 'transparent',
                    background: isModel
                      ? alpha(theme.palette.background.paper, 0.66)
                      : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.94)} 0%, ${alpha(theme.palette.secondary.main, 0.88)} 100%)`,
                    color: isModel ? 'text.primary' : 'common.white',
                  })}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                          {isModel ? <AutoAwesome sx={{ fontSize: 18, color: BRAND_PRIMARY }} /> : <Person sx={{ fontSize: 18 }} />}
                        <Typography variant="caption" sx={{ fontWeight: 700, color: isModel ? 'text.secondary' : WHITE_82 }}>
                          {isModel ? 'Assistente' : 'Você'}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Box sx={{ ...assistantMarkdownSx, typography: 'body2' }}>
                      <ReactMarkdown>{cleanText}</ReactMarkdown>
                    </Box>

                     {settings || (isModel && message.id !== 'welcome') ? <Divider sx={{ borderColor: isModel ? 'divider' : WHITE_16 }} /> : null}

                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      {settings ? (
                        <Button
                          onClick={() => onApply(settings, message.id)}
                          variant="contained"
                          color="secondary"
                            startIcon={appliedMessageId === message.id ? <Check sx={{ fontSize: 16 }} /> : <AutoAwesome sx={{ fontSize: 16 }} />}
                        >
                          {appliedMessageId === message.id ? 'Aplicado' : 'Aplicar no estúdio'}
                        </Button>
                      ) : null}

                      {isModel && message.id !== 'welcome' ? (
                        <Button
                          onClick={() => onSaveToMemory(cleanText, message.id)}
                          variant="outlined"
                          color="inherit"
                           startIcon={savedToMemoryId === message.id ? <Check sx={{ fontSize: 16 }} /> : <BookmarkAdd sx={{ fontSize: 16 }} />}
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
                <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  <Person sx={{ fontSize: 16 }} />
                </Avatar>
              ) : null}
            </Stack>
          );
        })}

        {isLoading ? (
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar sx={{ bgcolor: WHITE_06, border: '1px solid', borderColor: 'divider' }}>
                <SmartToy sx={{ fontSize: 16, color: BRAND_PRIMARY }} />
            </Avatar>

            <Card elevation={0} sx={{ p: 2, borderRadius: 4, width: '100%', maxWidth: 640 }}>
              <Stack spacing={1.5}>
                <Skeleton variant="text" animation="wave" width="28%" />
                <Skeleton variant="rounded" animation="wave" height={20} width="92%" />
                <Skeleton variant="rounded" animation="wave" height={20} width="80%" />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rounded" animation="wave" width={132} height={36} />
                  <Skeleton variant="rounded" animation="wave" width={128} height={36} />
                </Stack>
              </Stack>
            </Card>
          </Stack>
        ) : null}

         <Alert severity="info" variant="outlined" icon={<Image sx={{ fontSize: 18 }} />}>
          O assistente entende o contexto do estúdio atual e pode sugerir JSON aplicável para voz, roteiro, ritmo e geração de cenas.
        </Alert>

        <div ref={messagesEndRef} />
      </Stack>
    </Box>
  );
}
