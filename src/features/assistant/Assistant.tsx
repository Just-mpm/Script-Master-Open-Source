import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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

export function Assistant({ onApplySettings, currentState }: AssistantProps) {
  const { user } = useAuth();
  const { messages, isLoading, error, sendMessage, startNewChat, loadSession, messagesEndRef } = useAssistant(currentState);

  const [input, setInput] = useState('');
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null);
  const [savedToMemoryId, setSavedToMemoryId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    const data = await getUserSettings(user?.uid);

    if (data) {
      setCustomSystemPrompt(data.customSystemPrompt);
    }
  }, [user?.uid]);

  const loadMemories = useCallback(async () => {
    const data = await getMemories(user?.uid);
    setMemories(data);
  }, [user?.uid]);

  const loadHistory = useCallback(async () => {
    const data = await getChatSessions(user?.uid);
    setHistory(data);
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
      window.alert(`O arquivo ${file.name} é muito grande. O limite máximo é de 500KB para garantir a segurança da Base de Conhecimento.`);

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

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id, user?.uid);
    await loadMemories();
  };

  const handleDeleteHistory = async (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.stopPropagation();
    await deleteChatSession(id, user?.uid);
    await loadHistory();
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
      setPendingFiles((previousFiles) => [...previousFiles, ...newFiles]);
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
        appliedMessageId={appliedMessageId}
        savedToMemoryId={savedToMemoryId}
        messagesEndRef={messagesEndRef}
        onApply={handleApply}
        onSaveToMemory={handleSaveMessageToMemory}
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
    </Box>
  );
}
