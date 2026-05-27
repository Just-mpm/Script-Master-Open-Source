import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
import { AssistantComposer } from './components/AssistantComposer';
import { AssistantHeader } from './components/AssistantHeader';
import { AssistantHistoryPanel } from './components/AssistantHistoryPanel';
import { AssistantMemoriesPanel } from './components/AssistantMemoriesPanel';
import { AssistantMessages } from './components/AssistantMessages';
import { AssistantSettingsPanel } from './components/AssistantSettingsPanel';
import { PlanWidget } from './components/PlanWidget';
import type { AssistantSettings, AssistantStudioState } from './types';
import { fileToAttachment } from './utils';
import { glassPanelSx } from '../../theme/surfaces';
import { DeleteConfirmationDialog } from '../../components/video-library/DeleteConfirmationDialog';
import { CreditBlockedMessage } from '../../components/CreditBlockedMessage';
import { APP_BORDER, BRAND_PRIMARY } from '../../theme/tokens';
import { useLocale } from '../../features/i18n';
import type { StudioSettingsPatch } from '../studio/types';

interface AssistantProps {
  onApplySettings: (settings: AssistantSettings) => void;
  currentState?: AssistantStudioState;
}

/** Mapeamento de chaves de settings para chaves i18n de labels */
const SETTINGS_LABEL_KEYS: Record<keyof StudioSettingsPatch, string> = {
  script: 'studio.header.scriptTab',
  selectedVoice: 'configuracoes.voiceLabel',
  isMultiSpeaker: 'configuracoes.multiSpeakerLabel',
  speakerAName: 'configuracoes.personaNameLabel',
  speakerBName: 'configuracoes.speakerBNameLabel',
  speakerBVoice: 'configuracoes.speakerBVoiceLabel',
  audioProfile: 'configuracoes.profileLabel',
  scene: 'configuracoes.sceneLabel',
  pace: 'configuracoes.paceLabel',
  styleNotes: 'configuracoes.styleNotesLabel',
  generateScenes: 'configuracoes.generateScenesLabel',
  sceneDensity: 'configuracoes.sceneDensityLabel',
  sceneRatio: 'configuracoes.sceneRatioLabel',
  visualFramework: 'configuracoes.visualFrameworkLabel',
  emotion: 'configuracoes.emotionLabel',
  emotionIntensity: 'studio.emotion.intensity',
  imageTextLanguage: 'configuracoes.imageTextLanguageLabel',
};

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
    error,
    sendMessage,
    startNewChat,
    loadSession,
    stopGeneration,
    retryLastMessage,
    messagesEndRef,
    creditsExhausted,
    creditBlockedByBalance,
    selectedModel,
    setSelectedModel,
    selectedThinkingLevel,
    setSelectedThinkingLevel,
    plan,
    pendingSettings,
    toolEvents,
    interview,
    respondResult,
    clearPendingSettings,
    clearInterview,
  } = useAssistant(currentState);

  /** Formata um valor de setting para exibição amigável */
  const formatSettingValue = useCallback((key: string, value: unknown): string => {
    if (typeof value === 'boolean') return value ? t('common.confirm') : t('common.cancel');
    if (key === 'emotion') return t(`studio.emotion.options.${String(value)}`) ?? String(value);
    if (key === 'imageTextLanguage') return String(value).toUpperCase();
    if (typeof value === 'number') return String(value);
    return String(value);
  }, [t]);

  /** Gera lista de { label, value } para preview dos settings pendentes */
  const settingsPreview = useMemo(() => {
    if (!pendingSettings) return [];
    return Object.entries(pendingSettings.settings)
      .filter(([key, value]) => key in SETTINGS_LABEL_KEYS && value !== undefined && value !== null && value !== '')
      .map(([key, value]) => ({
        label: t(SETTINGS_LABEL_KEYS[key as keyof StudioSettingsPatch]),
        value: formatSettingValue(key, value),
      }));
  }, [pendingSettings, t, formatSettingValue]);

  const [input, setInput] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [savedToMemoryId, setSavedToMemoryId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isThinkActive, setIsThinkActive] = useState(false);
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

  const handleSaveMessageToMemory = useCallback(async (text: string, messageId: string) => {
    await saveMemory(text, user?.uid);
    setSavedToMemoryId(messageId);
    window.setTimeout(() => setSavedToMemoryId(null), 3000);
  }, [user?.uid]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    loadSession(session);
    setShowHistory(false);
  }, [loadSession]);

  const handleSubmit = useCallback(async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) {
      return;
    }

    const nextInput = input;
    const nextFiles = pendingFiles;
    setInput('');
    setPendingFiles([]);

    const attachments = await Promise.all(nextFiles.map((file) => fileToAttachment(file)));

    await sendMessage(nextInput, attachments);
  }, [input, pendingFiles, isLoading, sendMessage]);

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

  const handleAnswerInterview = useCallback((answer: string) => {
    const trimmedAnswer = answer.trim();
    if (!interview || !trimmedAnswer) {
      return;
    }

    clearInterview();
    setInterviewAnswer('');
    void sendMessage(trimmedAnswer, undefined, undefined, {
      question: interview.question,
      answer: trimmedAnswer,
    });
  }, [clearInterview, interview, sendMessage]);

  const handleSuggestedAction = useCallback((action: string, params?: Record<string, unknown> | null) => {
    setInput(params ? `${action}\n${JSON.stringify(params, null, 2)}` : action);
  }, []);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
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
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
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

      <AssistantMessages
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        appliedMessageId={appliedMessageId}
        savedToMemoryId={savedToMemoryId}
        messagesEndRef={messagesEndRef}
        onApply={handleApply}
        onSaveToMemory={handleSaveMessageToMemory}
        onStopGeneration={stopGeneration}
        onSuggestionClick={handleSuggestionClick}
        toolEvents={toolEvents}
      />

      <PlanWidget tasks={plan} />

      {pendingSettings ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
          <Alert
            variant="outlined"
            severity="info"
            sx={{ borderRadius: 2 }}
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={handleApplyPendingSettings}>
                  {t('assistant.messages.applyToStudio')}
                </Button>
                <Button color="inherit" size="small" onClick={clearPendingSettings}>
                  {t('assistant.messages.ignore')}
                </Button>
              </Stack>
            }
          >
            <Stack spacing={0.5}>
              <Typography variant="body2">{pendingSettings.summary}</Typography>
              {settingsPreview.length > 0 ? (
                <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
                  {settingsPreview.map(({ label, value }) => (
                    <Typography key={label} component="li" variant="caption" sx={{ color: 'text.secondary' }}>
                      <strong>{label}:</strong> {value}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Alert>
        </Box>
      ) : null}

      {respondResult && (
        respondResult.text || (respondResult.suggestedActions?.length ?? 0) > 0 || (respondResult.media?.length ?? 0) > 0
      ) ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
          <Alert variant="outlined" severity="info" sx={{ borderRadius: 2 }}>
            <Stack spacing={1.25}>
              {respondResult.text ? (
                <Typography variant="body2">{respondResult.text}</Typography>
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
          </Alert>
        </Box>
      ) : null}

      {interview ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
          <Alert
            variant="outlined"
            severity="info"
            sx={{ borderRadius: 2 }}
          >
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {interview.question}
              </Typography>

              {interview.options && interview.options.length > 0 ? (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {interview.options.map((option) => (
                    <Button
                      key={option.label}
                      color="inherit"
                      variant="outlined"
                      size="small"
                      onClick={() => handleAnswerInterview(option.label)}
                      sx={{ textTransform: 'none', borderColor: APP_BORDER, flexDirection: 'column', alignItems: 'flex-start', py: 0.75 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                        {option.description}
                      </Typography>
                    </Button>
                  ))}
                </Stack>
              ) : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  value={interviewAnswer}
                  onChange={(event) => setInterviewAnswer(event.target.value)}
                  size="small"
                  fullWidth
                  placeholder={t('assistant.messages.interviewPlaceholder')}
                  aria-label={t('assistant.messages.interviewPlaceholder')}
                />
                <Button
                  variant="contained"
                  onClick={() => handleAnswerInterview(interviewAnswer)}
                  disabled={!interviewAnswer.trim()}
                  sx={{ flexShrink: 0 }}
                >
                  {t('assistant.messages.interviewSend')}
                </Button>
              </Stack>
            </Stack>
          </Alert>
        </Box>
      ) : null}

      <AssistantComposer
        input={input}
        pendingFiles={pendingFiles}
        isLoading={isLoading}
        isThinkActive={isThinkActive}
        creditsBlocked={creditBlockedByBalance}
        interviewPending={!!interview}
        fileInputRef={fileInputRef}
        selectedModel={selectedModel}
        selectedThinkingLevel={selectedThinkingLevel}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        onStopGeneration={stopGeneration}
        onThinkToggle={() => setIsThinkActive((prev) => !prev)}
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
