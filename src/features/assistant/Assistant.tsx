import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import ReactMarkdown from 'react-markdown';
import {
  deleteChatSession,
  deleteMemory,
  getChatSessions,
  getMemories,
  getUserSettings,
  saveMemory,
  saveUserSettings,
  type ChatSession,
  type Memory,
} from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { useAssistant } from '../../hooks/useAssistant';
import { ErrorToast } from '../../components/ErrorToast';
import { AssistantComposer, type AssistantComposerHandle } from './components/AssistantComposer';
import { AssistantHeader } from './components/AssistantHeader';
import { AssistantHistoryPanel } from './components/AssistantHistoryPanel';
import { AssistantMemoriesPanel } from './components/AssistantMemoriesPanel';
import { AssistantMessages } from './components/AssistantMessages';
import { AssistantSettingsPanel } from './components/AssistantSettingsPanel';
import { PlanWidget } from './components/PlanWidget';
import { SettingsPreviewCard } from './components/SettingsPreviewCard';
import type { AssistantSettings, AssistantStudioState, InterviewResumeData } from './types';
import { fileToAttachment } from './utils';
import { glassPanelSx } from '../../theme/surfaces';
import { assistantMarkdownSx } from './components/assistantUi';
import { DeleteConfirmationDialog } from '../../components/video-library/DeleteConfirmationDialog';
import { CreditBlockedMessage } from '../../components/CreditBlockedMessage';
import { APP_BORDER, APP_SURFACE_ELEVATED, BRAND_PRIMARY, ICON_SIZE_SM, RADIUS_XS, SHADOW_DEEP } from '../../theme/tokens';
import { useLocale } from '../../features/i18n';
import { InterviewPanel } from './components/InterviewPanel';
import { ScrollToBottomFab } from './components/ScrollToBottomFab';

interface AssistantProps {
  onApplySettings: (settings: AssistantSettings) => void;
  currentState?: AssistantStudioState;
}

const MAX_DOCUMENT_SIZE = 500 * 1024;
const MAX_MEMORY_DOCUMENT_TEXT = 490000;
const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENT_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function Assistant({ onApplySettings, currentState }: AssistantProps) {
  const { locale, t } = useLocale();
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    isStreaming,
    isCompacting,
    error,
    sendMessage,
    startNewChat,
    loadSession,
    stopGeneration,
    retryLastMessage,
    regenerateLastResponse,
    messagesEndRef,
    streamingMessageRef,
    creditsExhausted,
    creditBlockedByBalance,
    selectedModel,
    setSelectedModel,
    selectedThinkingLevel,
    setSelectedThinkingLevel,
    thinkingEnabled,
    setThinkingEnabled,
    plan,
    pendingSettings,
    toolEvents,
    interview,
    respondResult,
    clearPendingSettings,
    clearInterview,
  } = useAssistant(currentState);

  const composerRef = useRef<AssistantComposerHandle>(null);
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newMemory, setNewMemory] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [documentTruncationWarning, setDocumentTruncationWarning] = useState<string | null>(null);

  // Confirmação de exclusão
  const [memoryToDelete, setMemoryToDelete] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadSettings = useCallback(async () => {
    const data = await getUserSettings(user?.uid);

    if (data) {
      setCustomSystemPrompt(data.customSystemPrompt);
    }
  }, [user?.uid]);

  const loadMemories = useCallback(async () => {
    setIsLoadingMemories(true);
    try {
      const data = await getMemories(user?.uid);
      setMemories(data);
    } finally {
      setIsLoadingMemories(false);
    }
  }, [user?.uid]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getChatSessions(user?.uid);
      setHistory(data);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (showMemories) {
      void loadMemories();
    }
  }, [loadMemories, showMemories]);

  useEffect(() => {
    if (showHistory) {
      void loadHistory();
    }
  }, [loadHistory, showHistory]);

  useEffect(() => {
    if (showSettings) {
      void loadSettings();
    }
  }, [loadSettings, showSettings]);

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);

    try {
      await saveUserSettings(customSystemPrompt, user?.uid);
      window.setTimeout(() => setShowSettings(false), 500);
    } finally {
      setIsSavingSettings(false);
    }
  }, [customSystemPrompt, user?.uid]);

  const handleDocumentUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setDocumentError(t('assistant.runtime.documentTooLarge', { fileName: file.name }));

      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }

      return;
    }

    setIsUploadingDocument(true);

    try {
      const textContent = await file.text();
      const wasTruncated = textContent.length > MAX_MEMORY_DOCUMENT_TEXT;
      const truncatedText = wasTruncated
        ? textContent.slice(0, MAX_MEMORY_DOCUMENT_TEXT)
        : textContent;

      if (wasTruncated) {
        setDocumentTruncationWarning(t('assistant.runtime.documentTruncated', {
          characterCount: new Intl.NumberFormat(locale).format(MAX_MEMORY_DOCUMENT_TEXT),
        }));
        window.setTimeout(() => setDocumentTruncationWarning(null), 6000);
      }

      await saveMemory(`[Documento Anexado: ${file.name}]\n${truncatedText}`, user?.uid);
      await loadMemories();
    } catch {
      setDocumentError(t('assistant.runtime.processDocumentError'));
    } finally {
      setIsUploadingDocument(false);

      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  }, [user, loadMemories, locale, t]);

  const handleAddMemory = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newMemory.trim()) {
      return;
    }

    setIsSavingMemory(true);

    try {
      await saveMemory(newMemory, user?.uid);
      setNewMemory('');
      await loadMemories();
    } catch {
      setDocumentError(t('assistant.runtime.saveMemoryError'));
    } finally {
      setIsSavingMemory(false);
    }
  }, [newMemory, user, loadMemories, t]);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemoryToDelete(id);
  }, []);

  const confirmDeleteMemory = async () => {
    if (!memoryToDelete) return;

    setDeletingConfirm(true);
    try {
      await deleteMemory(memoryToDelete, user?.uid);
      await loadMemories();
    } finally {
      setMemoryToDelete(null);
      setDeletingConfirm(false);
    }
  };

  const handleDeleteHistory = useCallback((event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    setChatToDelete(id);
  }, []);

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    setDeletingConfirm(true);
    try {
      await deleteChatSession(chatToDelete, user?.uid);
      await loadHistory();
    } finally {
      setChatToDelete(null);
      setDeletingConfirm(false);
    }
  };

  const handleSelectSession = useCallback((session: ChatSession) => {
    loadSession(session);
    setShowHistory(false);
  }, [loadSession]);

  const handleSubmit = useCallback(async () => {
    const currentInput = composerRef.current?.getValue() ?? '';
    if ((!currentInput.trim() && pendingFiles.length === 0) || isLoading) {
      return;
    }

    const nextInput = currentInput;
    const nextFiles = pendingFiles;
    composerRef.current?.clear();
    setPendingFiles([]);

    const attachments = await Promise.all(nextFiles.map((file) => fileToAttachment(file)));

    await sendMessage(nextInput, attachments);
  }, [pendingFiles, isLoading, sendMessage]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);

      setPendingFiles((previousFiles) => {
        // Limite de quantidade total de anexos
        const remainingSlots = MAX_ATTACHMENTS - previousFiles.length;

        if (remainingSlots <= 0) {
          setAttachmentError(`Você atingiu o limite de ${MAX_ATTACHMENTS} anexos por mensagem.`);

          return previousFiles;
        }

        const candidates = newFiles.slice(0, remainingSlots);
        const validFiles: File[] = [];

        for (const file of candidates) {
          const isImage = file.type.startsWith('image/');
          const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_ATTACHMENT_SIZE;
          const maxSizeLabel = isImage ? '10 MB' : '5 MB';

          if (file.size > maxSize) {
            setAttachmentError(t(
              isImage
                ? 'assistant.runtime.attachmentTooLargeImage'
                : 'assistant.runtime.attachmentTooLargeDocument',
              { fileName: file.name, maxSize: maxSizeLabel },
            ));
            continue;
          }

          validFiles.push(file);
        }

        if (validFiles.length === 0) {
          return previousFiles;
        }

        return [...previousFiles, ...validFiles];
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [t]);

  const handleApply = useCallback((settings: AssistantSettings, messageId: string) => {
    onApplySettings(settings);
    setAppliedMessageId(messageId);
    window.setTimeout(() => setAppliedMessageId(null), 3000);
  }, [onApplySettings]);

  const handleApplyPendingSettings = useCallback(() => {
    if (!pendingSettings) {
      return;
    }

    onApplySettings(pendingSettings.settings);
    clearPendingSettings();
  }, [clearPendingSettings, onApplySettings, pendingSettings]);

  const handleAnswerInterview = useCallback((answer: string, answers?: string[]) => {
    const trimmedAnswer = answer.trim();
    if (!interview || !trimmedAnswer) {
      return;
    }

    clearInterview();

    // Envia resposta com dados de resume
    const resumeData: InterviewResumeData = {
      question: interview.question,
      answer: trimmedAnswer,
      answers: answers && answers.length > 0 ? answers : undefined,
    };

    void sendMessage(trimmedAnswer, undefined, undefined, resumeData);
  }, [clearInterview, interview, sendMessage]);

  const handleSuggestedAction = useCallback((action: string, params?: Record<string, unknown> | null) => {
    composerRef.current?.setValue(params ? `${action}\n${JSON.stringify(params, null, 2)}` : action);
  }, []);

  const handleSuggestionClick = useCallback((prompt: string) => {
    composerRef.current?.setValue(prompt);
  }, []);

  const handleCloseMemories = useCallback(() => setShowMemories(false), []);
  const handleCloseHistory = useCallback(() => setShowHistory(false), []);
  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleOpenHistory = useCallback(() => setShowHistory(true), []);
  const handleOpenMemories = useCallback(() => setShowMemories(true), []);
  const handleOpenSettings = useCallback(() => setShowSettings(true), []);
  const handleRemoveFile = useCallback((index: number) => {
    setPendingFiles((previousFiles) => previousFiles.filter((_, fileIndex) => fileIndex !== index));
  }, []);
  const handleDismissDocumentError = useCallback(() => setDocumentError(null), []);
  const handleDismissAttachmentError = useCallback(() => setAttachmentError(null), []);
  const handleDismissTruncationWarning = useCallback(() => setDocumentTruncationWarning(null), []);

  return (
    <Box
      sx={(theme) => ({
        ...glassPanelSx(theme),
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 0,
      })}
    >
      {documentTruncationWarning ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 1 }}>
          <Alert severity="warning" onClose={handleDismissTruncationWarning} sx={{ borderRadius: 2 }}>
            {documentTruncationWarning}
          </Alert>
        </Box>
      ) : null}

      {showMemories && (
        <AssistantMemoriesPanel
          memories={memories}
          isLoading={isLoadingMemories}
          newMemory={newMemory}
          documentInputRef={documentInputRef}
          onClose={handleCloseMemories}
          onNewMemoryChange={setNewMemory}
          onSubmit={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onDocumentUpload={handleDocumentUpload}
          isSavingMemory={isSavingMemory}
          isUploadingDocument={isUploadingDocument}
        />
      )}

      {showHistory && (
        <AssistantHistoryPanel
          history={history}
          isLoading={isLoadingHistory}
          onClose={handleCloseHistory}
          onSelectSession={handleSelectSession}
          onDeleteHistory={handleDeleteHistory}
        />
      )}

      {showSettings && (
        <AssistantSettingsPanel
          customSystemPrompt={customSystemPrompt}
          isSavingSettings={isSavingSettings}
          onClose={handleCloseSettings}
          onChangePrompt={setCustomSystemPrompt}
          onSave={handleSaveSettings}
        />
      )}

      <AssistantHeader
        onStartNewChat={startNewChat}
        onOpenHistory={handleOpenHistory}
        onOpenMemories={handleOpenMemories}
        onOpenSettings={handleOpenSettings}
      />

      {!user ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <Alert
            variant="outlined"
            severity="info"
            sx={{
              borderRadius: 2,
              borderColor: alpha(BRAND_PRIMARY, 0.24),
              '& .MuiAlert-icon': { color: BRAND_PRIMARY },
            }}
          >
            {t('assistant.runtime.guestNotice')}
          </Alert>
        </Box>
      ) : null}

      {creditsExhausted ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <CreditBlockedMessage show={true} />
        </Box>
      ) : null}

      {error && !creditsExhausted ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <Alert
            variant="outlined"
            severity="error"
            sx={{ borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={retryLastMessage}>
                {t('assistant.runtime.retry')}
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      ) : null}

      {/* Container scrollável — agrupa mensagens + widgets dinâmicos */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          scrollBehavior: 'smooth',
          position: 'relative',
        }}
      >
        <AssistantMessages
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          isCompacting={isCompacting}
          appliedMessageId={appliedMessageId}
          messagesEndRef={messagesEndRef}
          streamingMessageRef={streamingMessageRef}
          onApply={handleApply}
          onStopGeneration={stopGeneration}
          onRegenerate={regenerateLastResponse}
          onSuggestionClick={handleSuggestionClick}
          toolEvents={toolEvents}
        />

        <PlanWidget tasks={plan} />

        {pendingSettings ? (
          <SettingsPreviewCard
            pendingSettings={pendingSettings}
            onApply={handleApplyPendingSettings}
            onDismiss={clearPendingSettings}
          />
        ) : null}

        {respondResult && (
          respondResult.text || (respondResult.suggestedActions?.length ?? 0) > 0 || (respondResult.media?.length ?? 0) > 0
        ) ? (
          <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
            <Card
              elevation={0}
              sx={{
                width: '100%',
                px: { xs: 1.5, md: 2 },
                py: { xs: 1.25, md: 1.5 },
                borderRadius: RADIUS_XS,
                border: `1px solid ${APP_BORDER}`,
                backgroundColor: alpha(APP_SURFACE_ELEVATED, 0.7),
                backgroundImage: 'none',
                backdropFilter: 'blur(8px)',
                boxShadow: `0 2px 12px ${alpha(SHADOW_DEEP, 0.18)}`,
              }}
            >
              <Stack spacing={1.25}>
                <AutoAwesome sx={{ fontSize: ICON_SIZE_SM, color: BRAND_PRIMARY, opacity: 0.7 }} />
                {respondResult.text ? (
                  <Box sx={{ ...assistantMarkdownSx, typography: 'body2' }}>
                    <ReactMarkdown>{respondResult.text}</ReactMarkdown>
                  </Box>
                ) : null}
                {respondResult.suggestedActions && respondResult.suggestedActions.length > 0 ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {respondResult.suggestedActions.map((action) => (
                      <Button
                        key={`${action.action}-${action.label}`}
                        color="inherit"
                        variant="outlined"
                        size="small"
                        onClick={() => handleSuggestedAction(action.action, action.params)}
                        sx={{ textTransform: 'none', borderColor: APP_BORDER }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
                ) : null}

                {respondResult.media && respondResult.media.length > 0 ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {respondResult.media.map((media) => (
                      <Chip
                        key={`${media.type}-${media.url}`}
                        component="a"
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        clickable
                        label={media.title ?? media.url}
                        variant="outlined"
                        sx={{ borderColor: APP_BORDER, maxWidth: '100%' }}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </Card>
          </Box>
        ) : null}

        {interview ? (
          <InterviewPanel
            interview={interview}
            onAnswer={handleAnswerInterview}
          />
        ) : null}

        <ScrollToBottomFab containerRef={scrollContainerRef} isStreaming={isStreaming} />
      </Box>

      <AssistantComposer
        ref={composerRef}
        pendingFiles={pendingFiles}
        isLoading={isLoading}
        isThinkActive={thinkingEnabled}
        creditsBlocked={creditBlockedByBalance}
        interviewPending={!!interview}
        fileInputRef={fileInputRef}
        selectedModel={selectedModel}
        selectedThinkingLevel={selectedThinkingLevel}
        onSubmit={handleSubmit}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        onStopGeneration={stopGeneration}
        onThinkToggle={() => setThinkingEnabled((prev) => !prev)}
        onModelChange={setSelectedModel}
        onThinkingLevelChange={setSelectedThinkingLevel}
      />

      <DeleteConfirmationDialog
        open={Boolean(memoryToDelete)}
        itemName={memoryToDelete ?? null}
        deletingItem={deletingConfirm}
        deleteError={null}
        titleIdleLabel={t('assistant.deleteMemoryConfirm')}
        description={t('assistant.runtime.deleteMemoryDescription')}
        onConfirm={() => void confirmDeleteMemory()}
        onCancel={() => setMemoryToDelete(null)}
      />

      <DeleteConfirmationDialog
        open={Boolean(chatToDelete)}
        itemName={chatToDelete ?? null}
        deletingItem={deletingConfirm}
        deleteError={null}
        titleIdleLabel={t('assistant.runtime.deleteConversationTitle')}
        description={t('assistant.runtime.deleteConversationDescription')}
        onConfirm={() => void confirmDeleteChat()}
        onCancel={() => setChatToDelete(null)}
      />

      <ErrorToast error={documentError} onDismiss={handleDismissDocumentError} />
      <ErrorToast error={attachmentError} onDismiss={handleDismissAttachmentError} />
    </Box>
  );
}
