import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import type { AssistantSettings, AssistantStudioState } from './types';
import { fileToAttachment } from './utils';
import { glassPanelSx } from '../../theme/surfaces';

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
  const { user } = useAuth();
  const { messages, isLoading, isStreaming, error, sendMessage, startNewChat, loadSession, stopGeneration, messagesEndRef } = useAssistant(currentState);

  const [input, setInput] = useState('');
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [savedToMemoryId, setSavedToMemoryId] = useState<string | null>(null);
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

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);

    try {
      await saveUserSettings(customSystemPrompt, user?.uid);
      window.setTimeout(() => setShowSettings(false), 500);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      setDocumentError(`O arquivo "${file.name}" excede o limite de 500 KB permitido para a Base de Conhecimento.`);

      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }

      return;
    }

    const textContent = await file.text();
    const truncatedText = textContent.length > MAX_MEMORY_DOCUMENT_TEXT
      ? textContent.slice(0, MAX_MEMORY_DOCUMENT_TEXT)
      : textContent;

    await saveMemory(`[Documento Anexado: ${file.name}]\n${truncatedText}`, user?.uid);
    await loadMemories();

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  const handleAddMemory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newMemory.trim()) {
      return;
    }

    await saveMemory(newMemory, user?.uid);
    setNewMemory('');
    await loadMemories();
  };

  const handleDeleteMemory = (id: string) => {
    setMemoryToDelete(id);
  };

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

  const handleDeleteHistory = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    setChatToDelete(id);
  };

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

  const handleSaveMessageToMemory = async (text: string, messageId: string) => {
    await saveMemory(text, user?.uid);
    setSavedToMemoryId(messageId);
    window.setTimeout(() => setSavedToMemoryId(null), 3000);
  };

  const handleSelectSession = (session: ChatSession) => {
    loadSession(session);
    setShowHistory(false);
  };

  const handleSubmit = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) {
      return;
    }

    const attachments = await Promise.all(pendingFiles.map((file) => fileToAttachment(file)));

    await sendMessage(input, attachments);
    setInput('');
    setPendingFiles([]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
            setAttachmentError(`O arquivo "${file.name}" excede o limite de ${maxSizeLabel} para ${isImage ? 'imagens' : 'documentos'}.`);
            break;
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
  };

  const handleApply = (settings: AssistantSettings, messageId: string) => {
    onApplySettings(settings);
    setAppliedMessageId(messageId);
    window.setTimeout(() => setAppliedMessageId(null), 3000);
  };

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
      {showMemories && (
        <AssistantMemoriesPanel
          memories={memories}
          isLoading={isLoadingMemories}
          newMemory={newMemory}
          documentInputRef={documentInputRef}
          onClose={() => setShowMemories(false)}
          onNewMemoryChange={setNewMemory}
          onSubmit={handleAddMemory}
          onDeleteMemory={handleDeleteMemory}
          onDocumentUpload={handleDocumentUpload}
        />
      )}

      {showHistory && (
        <AssistantHistoryPanel
          history={history}
          isLoading={isLoadingHistory}
          onClose={() => setShowHistory(false)}
          onSelectSession={handleSelectSession}
          onDeleteHistory={handleDeleteHistory}
        />
      )}

      {showSettings && (
        <AssistantSettingsPanel
          customSystemPrompt={customSystemPrompt}
          isSavingSettings={isSavingSettings}
          onClose={() => setShowSettings(false)}
          onChangePrompt={setCustomSystemPrompt}
          onSave={handleSaveSettings}
        />
      )}

      <AssistantHeader
        onStartNewChat={startNewChat}
        onOpenHistory={() => setShowHistory(true)}
        onOpenMemories={() => setShowMemories(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {!user ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <Alert variant="outlined" severity="info">
            Você pode usar o assistente sem login, mas o histórico, as memórias e as diretrizes ficam locais ao navegador atual.
          </Alert>
        </Box>
      ) : null}

      {error ? (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <Alert variant="outlined" severity="error">
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
      />

      <AssistantComposer
        input={input}
        pendingFiles={pendingFiles}
        isLoading={isLoading}
        fileInputRef={fileInputRef}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onFileChange={handleFileChange}
        onRemoveFile={(index) => {
          setPendingFiles((previousFiles) => previousFiles.filter((_, fileIndex) => fileIndex !== index));
        }}
      />

      <Dialog
        open={Boolean(memoryToDelete)}
        onClose={deletingConfirm ? undefined : () => setMemoryToDelete(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-memory-title"
      >
        <DialogTitle id="delete-memory-title">
          {deletingConfirm ? 'Excluindo...' : 'Excluir memória?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta memória será removida permanentemente e o assistente não a considerará mais nas respostas.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setMemoryToDelete(null)} color="inherit" disabled={deletingConfirm}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmDeleteMemory()} color="error" variant="contained" disabled={deletingConfirm}>
            {deletingConfirm ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(chatToDelete)}
        onClose={deletingConfirm ? undefined : () => setChatToDelete(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="delete-chat-title"
      >
        <DialogTitle id="delete-chat-title">
          {deletingConfirm ? 'Excluindo...' : 'Excluir conversa?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta conversa será removida permanentemente do seu histórico.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setChatToDelete(null)} color="inherit" disabled={deletingConfirm}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmDeleteChat()} color="error" variant="contained" disabled={deletingConfirm}>
            {deletingConfirm ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <ErrorToast error={documentError} onDismiss={() => setDocumentError(null)} />
      <ErrorToast error={attachmentError} onDismiss={() => setAttachmentError(null)} />
    </Box>
  );
}
