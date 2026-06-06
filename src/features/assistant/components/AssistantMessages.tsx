import type { RefObject } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import Divider from '@mui/material/Divider';
import { useLocale } from '../../../features/i18n';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Check from '@mui/icons-material/Check';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Description from '@mui/icons-material/Description';
import Person from '@mui/icons-material/Person';
import Refresh from '@mui/icons-material/Refresh';
import SmartToy from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import type { AssistantSettings, AssistantToolEvent, ChatMessage } from '../types';
import { extractJsonSettings, stripJsonSettingsBlock } from '../utils';
import {
  assistantInsetSx,
  assistantMarkdownSx,
  assistantBubbleModelSx,
  assistantBubbleUserSx,
  assistantMessagesContainerSx,
  assistantTypingIndicatorSx,
  assistantEmptyStateSx,
  assistantSuggestionChipSx,
} from './assistantUi';
import { ToolEventList } from './ToolEventCard';
import { ThinkingShimmer } from './ThinkingShimmer';
import { TwoPhaseStopButton } from './TwoPhaseStopButton';
import { PreBlock } from './CodeBlock';
import { ImageLightbox } from './ImageLightbox';
import {
  BRAND_PRIMARY,
  BRAND_GRADIENT,
  APP_BORDER,
  BRAND_PRIMARY_GLOW_SOFT,
  WHITE_06,
  WHITE_16,
  WHITE_82,
  TEXT_DISABLED,
  TEXT_SECONDARY,
  AVATAR_SIZE_SM,
  AVATAR_SIZE_MD,
  ICON_SIZE_SM,
  ICON_SIZE_MD,
  ICON_SIZE_LG,
  RADIUS_XS,
  GAP_COMPACT,
  GAP_DEFAULT,
  GAP_MEDIUM,
  GAP_RELAXED,
} from '../../../theme/tokens';

// Array vazio estável — evita quebrar React.memo ao comparar referências
const EMPTY_TOOL_EVENTS: AssistantToolEvent[] = [];

// --- Formatação de timestamp ---

const LOCALE_MAP: Record<string, string> = {
  'pt-BR': 'pt-BR',
  'en': 'en-US',
  'es': 'es-ES',
};

/**
 * Formata timestamp relativo (ex: "agora", "5 min", "14:32", "31/05").
 * Usa Intl.RelativeTimeFormat quando disponível, com fallback manual.
 * Trata timestamps futuros (clock skew) retornando null.
 */
function formatTimestamp(ms?: number, locale?: string, t?: (key: string) => string): string | null {
  if (!ms) return null;
  const resolvedLocale = LOCALE_MAP[locale ?? 'pt-BR'] ?? 'pt-BR';
  const now = Date.now();
  const diff = now - ms;

  // Timestamp futuro (clock skew ou dados corrompidos)
  if (diff < 0) return null;

  if (diff < 60_000) return t?.('assistant.messages.now') ?? 'agora';

  // Tenta Intl.RelativeTimeFormat para pluralização correta
  if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
    const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' });
    if (diff < 3_600_000) {
      const minutes = Math.floor(diff / 60_000);
      return rtf.format(-minutes, 'minute');
    }
    if (diff < 86_400_000) {
      return new Date(ms).toLocaleTimeString(resolvedLocale, { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(ms).toLocaleDateString(resolvedLocale, { day: '2-digit', month: '2-digit' });
  }

  // Fallback manual
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} ${t?.('assistant.messages.minAgo') ?? 'min'}`;
  if (diff < 86_400_000) {
    return new Date(ms).toLocaleTimeString(resolvedLocale, { hour: '2-digit', minute: '2-digit' });
  }
  return new Date(ms).toLocaleDateString(resolvedLocale, { day: '2-digit', month: '2-digit' });
}

// --- Props de cada bubble isolado ---

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentlyStreaming: boolean;
  isApplied: boolean;
  isCopied: boolean;
  isLastModelMessage: boolean;
  onCopy: (text: string, messageId: string) => void;
  onApply: (settings: AssistantSettings, messageId: string) => void;
  onStopGeneration: () => void;
  onRegenerate?: () => void;
  toolEvents?: AssistantToolEvent[];
}

// --- Shallow compare para arrays de attachments ---

function shallowEqualAttachments(
  prev: ChatMessage['attachments'],
  next: ChatMessage['attachments'],
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return prev === next;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    // Compara campos comuns (mimeType, name) — suficiente para detecção de mudança no memo
    if (prev[i].mimeType !== next[i].mimeType || prev[i].name !== next[i].name) {
      return false;
    }
  }
  return true;
}

// --- Memo comparator: só re-renderiza quando dados da mensagem mudam ---

function arePropsEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  return (
    prev.message.id === next.message.id
    && prev.message.text === next.message.text
    && prev.message.role === next.message.role
    && shallowEqualAttachments(prev.message.attachments, next.message.attachments)
    && prev.message.createdAt === next.message.createdAt
    && prev.isCurrentlyStreaming === next.isCurrentlyStreaming
    && prev.isApplied === next.isApplied
    && prev.isCopied === next.isCopied
    && prev.isLastModelMessage === next.isLastModelMessage
    && prev.toolEvents === next.toolEvents
    && prev.onCopy === next.onCopy
    && prev.onApply === next.onApply
    && prev.onStopGeneration === next.onStopGeneration
    && prev.onRegenerate === next.onRegenerate
  );
}

// --- Bubble individual: memoizado para evitar re-renders durante streaming ---

const MessageBubble = React.memo(function MessageBubble({
  message,
  isCurrentlyStreaming,
  isApplied,
  isCopied,
  isLastModelMessage,
  onCopy,
  onApply,
  onStopGeneration,
  onRegenerate,
  toolEvents = [],
}: MessageBubbleProps) {
  const { locale, t } = useLocale();
  const isModel = message.role === 'model';
  const extracted = isModel && !isCurrentlyStreaming ? extractJsonSettings(message.text) : null;
  const settings: AssistantSettings | null = extracted && !extracted.parseError ? extracted.settings : null;
  const hasMalformedJson = extracted?.parseError === true;
  const cleanText = stripJsonSettingsBlock(message.text);

  return (
    <Stack spacing={GAP_COMPACT} sx={{ width: '100%', alignItems: isModel ? 'flex-start' : 'flex-end' }}>
      {message.attachments && message.attachments.length > 0 ? (
          <Stack direction="row" spacing={GAP_COMPACT} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: isModel ? 'flex-start' : 'flex-end' }}>
            {message.attachments.map((attachment, index) => {
              const isImage = attachment.mimeType.startsWith('image/');

              return (
                <Box key={`${message.id}-${index}`} sx={(theme) => ({ ...assistantInsetSx(theme), px: 1.25, py: 1 })}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {isImage && 'data' in attachment ? (
                      <ImageLightbox
                        src={`data:${attachment.mimeType};base64,${attachment.data}`}
                        alt={attachment.name ?? 'Imagem'}
                        thumbnailSx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: RADIUS_XS }}
                      />
                    ) : (
                      <Description sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160 }} noWrap>
                      {attachment.name || t('assistant.messages.file')}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : null }

        <Card
          elevation={0}
          sx={(theme) => (isModel ? assistantBubbleModelSx(theme) : assistantBubbleUserSx(theme))}
        >
          <Stack spacing={GAP_DEFAULT}>
            <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                {isModel
                  ? <AutoAwesome sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                  : <Person sx={{ fontSize: ICON_SIZE_MD }} />}
                <Typography variant="caption" sx={{ fontWeight: 700, color: isModel ? TEXT_SECONDARY : WHITE_82 }}>
                  {isModel ? t('assistant.messages.assistant') : t('assistant.messages.you')}
                </Typography>
                {message.createdAt ? (
                  <Typography variant="caption" sx={{ color: TEXT_DISABLED, fontSize: '0.65rem' }}>
                    {formatTimestamp(message.createdAt, locale, t)}
                  </Typography>
                ) : null }
              </Stack>

              {isCurrentlyStreaming ? (
                <TwoPhaseStopButton onStop={onStopGeneration} />
              ) : cleanText ? (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={isCopied ? t('assistant.messages.copied') : t('assistant.messages.copyText')}>
                    <IconButton
                      onClick={() => void onCopy(cleanText, message.id)}
                      size="small"
                      aria-label={t('assistant.messages.copyTextAria')}
                      sx={{
                        color: isCopied ? 'success.main' : TEXT_DISABLED,
                        '&:hover': { backgroundColor: BRAND_PRIMARY_GLOW_SOFT, color: 'text.secondary' },
                      }}
                    >
                      {isCopied ? <Check sx={{ fontSize: ICON_SIZE_SM }} /> : <ContentCopy sx={{ fontSize: ICON_SIZE_SM }} />}
                    </IconButton>
                  </Tooltip>
                  {isLastModelMessage && onRegenerate ? (
                    <Tooltip title={t('assistant.messages.regenerate')}>
                      <IconButton
                        onClick={onRegenerate}
                        size="small"
                        aria-label={t('assistant.messages.regenerate')}
                        sx={{
                          color: TEXT_DISABLED,
                          '&:hover': { backgroundColor: BRAND_PRIMARY_GLOW_SOFT, color: 'text.secondary' },
                        }}
                      >
                        <Refresh sx={{ fontSize: ICON_SIZE_SM }} />
                      </IconButton>
                    </Tooltip>
                  ) : null }
                </Stack>
              ) : null }
            </Stack>

            <Box sx={{ ...assistantMarkdownSx, typography: 'body2', position: 'relative' }}>
              {cleanText ? <ReactMarkdown components={{ pre: PreBlock }}>{cleanText}</ReactMarkdown> : null }
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
                    borderRadius: 1,
                    '@keyframes assistantCursorBlink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              ) : null }

              {hasMalformedJson ? (
                <Typography variant="caption" sx={{ color: TEXT_DISABLED, fontStyle: 'italic', mt: 0.5 }}>
                  {t('assistant.messages.malformedJson')}
                </Typography>
              ) : null }
            </Box>

            {isModel && toolEvents.length > 0 ? (
              <ToolEventList events={toolEvents} isStreaming={isCurrentlyStreaming} />
            ) : null }

            {settings
              ? <Divider sx={{ borderColor: isModel ? APP_BORDER : WHITE_16 }} />
              : null }

            <Stack direction="row" spacing={GAP_DEFAULT} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              {!isCurrentlyStreaming && settings ? (
                <Button
                  onClick={() => onApply(settings, message.id)}
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={isApplied ? <Check sx={{ fontSize: ICON_SIZE_MD }} /> : <AutoAwesome sx={{ fontSize: ICON_SIZE_MD }} />}
                >
                  {isApplied ? t('assistant.messages.applied') : t('assistant.messages.applyToStudio')}
                </Button>
              ) : null }

              {isApplied ? (
                <Chip
                  component="a"
                  href="/app/estudio"
                  label={t('assistant.messages.goToStudio')}
                  size="small"
                  clickable
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderColor: BRAND_PRIMARY,
                    color: BRAND_PRIMARY,
                    '&:hover': {
                      bgcolor: BRAND_PRIMARY_GLOW_SOFT,
                    },
                  }}
                  variant="outlined"
                />
              ) : null }
            </Stack>
          </Stack>
        </Card>
    </Stack>
  );
}, arePropsEqual);

// --- Empty State: quando não há mensagens ---

function EmptyChatState({ onSuggestionClick }: { onSuggestionClick: (prompt: string) => void }) {
  const { t } = useLocale();

  return (
    <Box sx={assistantEmptyStateSx}>
      <Box
        sx={{
          width: { xs: AVATAR_SIZE_MD * 1.8, md: AVATAR_SIZE_MD * 2.5 },
          height: { xs: AVATAR_SIZE_MD * 1.8, md: AVATAR_SIZE_MD * 2.5 },
          borderRadius: '50%',
          background: BRAND_GRADIENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: { xs: 2, md: 3 },
          boxShadow: `0 12px 40px ${alpha(BRAND_PRIMARY, 0.2)}`,
        }}
      >
        <AutoAwesome sx={{ fontSize: { xs: ICON_SIZE_LG * 1.4, md: ICON_SIZE_LG * 1.8 } }} />
      </Box>

      <Typography variant="h6" sx={{ mb: 0.75, letterSpacing: 0 }}>
        {t('assistant.messages.emptyTitle')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
        {t('assistant.messages.emptyDescription')}
      </Typography>

      <Stack
        direction="row"
        spacing={GAP_COMPACT}
        useFlexGap
        sx={{ flexWrap: 'wrap', mt: { xs: 2, md: 3 }, justifyContent: 'center' }}
      >
        {(['howItWorks', 'createScript', 'reviewText', 'whichVoice'] as const).map((key) => (
          <Chip
            key={key}
            label={t(`assistant.messages.suggestions.${key}`)}
            size="small"
            variant="outlined"
            onClick={() => onSuggestionClick(t(`assistant.messages.suggestionPrompts.${key}`))}
            sx={assistantSuggestionChipSx}
          />
        ))}

      </Stack>
    </Box>
  );
}

// --- Componente pai (lista de mensagens) ---

interface AssistantMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  isCompacting?: boolean;
  appliedMessageId: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  streamingMessageRef: RefObject<HTMLDivElement | null>;
  onApply: (settings: AssistantSettings, messageId: string) => void;
  onStopGeneration: () => void;
  onRegenerate?: () => void;
  onSuggestionClick?: (prompt: string) => void;
  toolEvents?: AssistantToolEvent[];
}

export function AssistantMessages({
  messages,
  isLoading,
  isStreaming,
  isCompacting = false,
  appliedMessageId,
  messagesEndRef,
  streamingMessageRef,
  onApply,
  onStopGeneration,
  onRegenerate,
  onSuggestionClick,
  toolEvents = [],
}: AssistantMessagesProps) {
  const { t } = useLocale();

  // Última mensagem do modelo — pode estar em streaming (texto progressivo)
  const lastModelMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model') return messages[i];
    }
    return undefined;
  }, [messages]);

  // Oculta skeleton quando o primeiro token já chegou
  const showSkeleton = isLoading && (!isStreaming || isCompacting);

  // Estado para feedback de "copiado" no clipboard
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      window.setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Clipboard API pode falhar em contextos restritos — fallback para execCommand
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedMessageId(messageId);
        window.setTimeout(() => setCopiedMessageId(null), 2000);
      } catch {
        // Falha total — sem feedback negativo para não poluir a UX
      }
    }
  }, []);

  // Se não há mensagens e não está carregando, mostra empty state
  const isEmptyChat = messages.length === 0 && !isLoading;

  return (
    <Box sx={assistantMessagesContainerSx}>
      {isEmptyChat ? (
        <EmptyChatState onSuggestionClick={onSuggestionClick || (() => {})} />
      ) : (
        <Stack spacing={GAP_RELAXED}>
          <AnimatePresence mode="popLayout">
            {messages.map((message) => {
              const isCurrentlyStreamingMessage = isStreaming && lastModelMessage?.id === message.id;
              const isLastModel = !isCurrentlyStreamingMessage && lastModelMessage?.id === message.id && !isLoading;
              const bubble = (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentlyStreaming={isCurrentlyStreamingMessage}
                  isApplied={appliedMessageId === message.id }
                  isCopied={copiedMessageId === message.id }
                  isLastModelMessage={isLastModel}
                  onCopy={handleCopyMessage}
                  onApply={onApply}
                  onStopGeneration={onStopGeneration}
                  onRegenerate={onRegenerate}
                  toolEvents={lastModelMessage?.id === message.id ? toolEvents : EMPTY_TOOL_EVENTS }
                />
              );

              // Âncora de scroll: início da mensagem em streaming
              if (isCurrentlyStreamingMessage) {
                return (
                  <div key={message.id} ref={streamingMessageRef}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    >
                      {bubble}
                    </motion.div>
                  </div>
                );
              }

              return (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                >
                  {bubble}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {showSkeleton ? (
            <Stack direction="row" spacing={GAP_MEDIUM} sx={{ alignItems: 'flex-start' }}>
              <Avatar
                sx={{
                  bgcolor: WHITE_06,
                  border: `1px solid ${APP_BORDER}`,
                  width: AVATAR_SIZE_SM,
                  height: AVATAR_SIZE_SM,
                }}
              >
                <SmartToy sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY }} />
              </Avatar>

              <Card elevation={0} sx={(theme) => ({ ...assistantBubbleModelSx(theme), p: GAP_MEDIUM * 2, width: '100%', maxWidth: 560 })}>
                <Stack spacing={GAP_DEFAULT}>
                  <Stack direction="row" spacing={GAP_DEFAULT} sx={{ alignItems: 'center' }}>
                    <AutoAwesome sx={{ fontSize: ICON_SIZE_MD, color: BRAND_PRIMARY }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: TEXT_SECONDARY }}>{t('assistant.messages.assistant')}</Typography>
                  </Stack>
                  <ThinkingShimmer text={t(isCompacting ? 'assistant.messages.compacting' : 'assistant.messages.thinking')} />
                  <Box sx={assistantTypingIndicatorSx}>
                    <Box className="typing-dot" />
                    <Box className="typing-dot" />
                    <Box className="typing-dot" />
                  </Box>
                </Stack>
              </Card>
            </Stack>
          ) : null }

          <div ref={messagesEndRef} />
        </Stack>
      )}
    </Box>
  );
}
