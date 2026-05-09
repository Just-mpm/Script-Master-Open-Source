import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VOICES, PACE_INSTRUCTIONS } from '../lib/constants';
import { getMemories, saveChatSession, getUserSettings, type ChatSession } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import type { Attachment, AssistantStudioState, ChatMessage } from '../features/assistant/types';
import { getGeminiApiKey } from '../lib/env';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';
import { buildSystemInstruction } from '../features/assistant/systemPrompt';

const log = createLogger('useAssistant');

export type { Attachment, AssistantSettings, ChatMessage } from '../features/assistant/types';

// ---------------------------------------------------------------------------
// Mapeamento de erros amigáveis (strings resolvidas em runtime via t())
// ---------------------------------------------------------------------------

/** Cria o mapeador de erros com strings localizadas */
function buildErrorMapper(t: (key: string) => string) {
  return createErrorMapper({
    nonErrorMessage: t('assistantStrings.errors.generic'),
    defaultMessage: t('assistantStrings.errors.default'),
    rules: [
      ...sharedErrorRules,
      {
        match: (m) => m.includes('deadline_exceeded') || m.includes('504'),
        message: t('assistantStrings.errors.stream'),
      },
      {
        match: (m) => m.includes('safety') || m.includes('blocked'),
        message: t('assistantStrings.errors.stream'),
      },
      {
        match: (m) => m.includes('abort') || m.includes('cancelled'),
        message: '',
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useAssistant(currentState?: AssistantStudioState) {
  const { user } = useAuth();
  const { t } = useLocale();

  // Mapeador de erros recriado quando locale muda
  const toUserFriendlyAssistantError = useMemo(() => buildErrorMapper(t), [t]);

  // Marker para detecção de retry (não traduzível)
  const retryDetectionMarker = t('assistantStrings.retryDetection');
  // Mensagem de fallback para erros de streaming (inclui marker invisível para retry detection)
  const streamFallbackText = `${t('assistantStrings.errors.stream')} ${retryDetectionMarker}`;

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: t('assistantStrings.welcome') },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamActiveRef = useRef(false);
  const chunkBufferRef = useRef<string>('');
  const rafRef = useRef<number>(0);
  const streamingTargetRef = useRef<string>('');

  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  // ---------------------------------------------------------------------------
  // Scroll automático
  // ---------------------------------------------------------------------------

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Rola suavemente durante streaming a cada novo token
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // ---------------------------------------------------------------------------
  // Lifecycle e persistência
  // ---------------------------------------------------------------------------

  // Aborta chamada em andamento ao desmontar
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      streamActiveRef.current = false;
    };
  }, []);

  // Auto-save session (após streaming, evita centenas de saves por segundo)
  useEffect(() => {
    if (isStreaming) return;

    if (messages.length > 1) {
      const title = messages.find(m => m.role === 'user')?.text.slice(0, 40) || 'Nova Conversa';
      const session: ChatSession = {
        id: currentSessionId,
        userId: user?.uid,
        title,
        messages,
        updatedAt: Date.now()
      };

      void Promise.resolve(saveChatSession(session, user?.uid))
        .then((savedLocallyOnly: boolean) => {
          if (savedLocallyOnly) {
            log.warn('Chat salvo apenas localmente (IndexedDB). Dados podem não sincronizar entre dispositivos.', {
              sessionId: currentSessionId,
            });
          }
        })
        .catch((sessionError: unknown) => {
          log.error('Erro ao salvar sessão do assistente', { error: sessionError });
        });
    }
  }, [messages, currentSessionId, user, isStreaming]);

  // ---------------------------------------------------------------------------
  // Controle de sessão
  // ---------------------------------------------------------------------------

  /**
   * Flush imediato do buffer de chunks de streaming.
   * Usa refs para evitar closure stale.
   */
  const flushChunkBuffer = () => {
    const buffered = chunkBufferRef.current;
    if (!buffered) return;
    chunkBufferRef.current = '';
    rafRef.current = 0;

    const targetId = streamingTargetRef.current;
    if (!targetId) return;

    setMessages(prev => prev.map(msg => {
      if (msg.id !== targetId) return msg;
      return { ...msg, text: msg.text + buffered };
    }));
  };

  const startNewChat = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamActiveRef.current = false;

    setCurrentSessionId(crypto.randomUUID());
    setMessages([{ id: 'welcome', role: 'model', text: t('assistantStrings.welcome') }]);
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
  };

  const loadSession = (session: ChatSession) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamActiveRef.current = false;

    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
  };

  // ---------------------------------------------------------------------------
  // Montagem de anexos
  // ---------------------------------------------------------------------------

  /**
   * Monta o array de parts de um anexo para envio ao Gemini.
   * Usa `inlineData` quando os dados estão disponíveis (base64 ou resolvidos do Storage).
   * Anexos sem dados (storagePath sem resolução) são ignorados no envio ao modelo.
   */
  const buildAttachmentParts = (attachments?: Attachment[]) => {
    if (!attachments || attachments.length === 0) return [];

    return attachments
      .filter((att: Attachment) => !!att.data)
      .map((att: Attachment) => ({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data,
        },
      }));
  };

  // ---------------------------------------------------------------------------
  // Envio de mensagem com streaming
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async (text: string, attachments?: Attachment[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      attachments,
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setError(null);

    // Cria AbortController para esta chamada
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    streamActiveRef.current = true;

    // ID da mensagem de resposta do assistente (para atualização progressiva)
    const assistantMsgId = (Date.now() + 1).toString();

    try {
      // Paraleliza chamadas Firestore independentes (Fix P1-2)
      const [memories, userSettings] = await Promise.all([
        getMemories(user?.uid),
        getUserSettings(user?.uid),
      ]);

      const memoriesText = memories.length > 0
        ? `\nMEMÓRIAS DO USUÁRIO (Leve estas preferências em conta):\n${memories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      const voicesList = VOICES.map(v => `- ${v.name} (${v.style})`).join('\n');
      const paceList = Object.keys(PACE_INSTRUCTIONS).join(', ');
      const customPromptBlock = userSettings?.customSystemPrompt
        ? `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`
        : '';

      const systemInstruction = buildSystemInstruction(
        memoriesText, voicesList, paceList, customPromptBlock, currentState,
      );

      // Converte histórico para formato Gemini
      const contents = messages.slice(1).map(msg => ({
        role: msg.role,
        parts: [
          { text: msg.text },
          ...buildAttachmentParts(msg.attachments),
        ],
      }));

      // Adiciona mensagem atual
      contents.push({
        role: 'user',
        parts: [
          { text },
          ...buildAttachmentParts(attachments),
        ],
      });

      // Adiciona mensagem vazia do assistente (texto progressivo)
      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'model', text: '' },
      ]);
      setIsStreaming(true);

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          abortSignal: abortController.signal,
        },
      });

      // Salva target ID no ref para o flush acessar sem closure stale
      streamingTargetRef.current = assistantMsgId;

      // Processa chunks progressivamente com buffer por frame
      for await (const chunk of stream) {
        if (abortController.signal.aborted || !streamActiveRef.current) break;

        const chunkText = chunk.text;
        if (!chunkText) continue;

        chunkBufferRef.current += chunkText;

        // Agenda flush para o próximo frame de display (se não houver um pendente)
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(flushChunkBuffer);
        }
      }

      // Flush final: aplica qualquer chunk restante no buffer
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      flushChunkBuffer();

    } catch (err: unknown) {
      // Flush final em caso de erro para não perder chunks acumulados
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      flushChunkBuffer();

      // Ignora erros de aborto (intencional pelo usuário)
      if (abortController.signal.aborted) return;

      log.error('Erro no assistente', { error: err });
      const errorMessage = toUserFriendlyAssistantError(err);

      if (errorMessage) {
        setError(errorMessage);
      }

      // Remove mensagem vazia do streaming e adiciona fallback
      setMessages(prev => {
        const withoutEmpty = prev.filter(m => !(m.id === assistantMsgId && m.text === ''));
        return [
          ...withoutEmpty,
          { id: assistantMsgId, role: 'model', text: streamFallbackText },
        ];
      });

    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      streamActiveRef.current = false;
      streamingTargetRef.current = '';
      chunkBufferRef.current = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [user, messages, currentState, ai, streamFallbackText, toUserFriendlyAssistantError]);

  /** Interrompe a geração em andamento via AbortController. */
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamActiveRef.current = false;
  };

  /**
   * Reenvia a última mensagem do usuário quando há erro.
   * Remove a mensagem de fallback do assistente e reenvia o texto original.
   */
  const retryLastMessage = useCallback(() => {
    // Encontra a última mensagem de erro do modelo (fallback)
    const lastErrorIdx = messages.findLastIndex(
      (m) => m.role === 'model' && m.text.includes(retryDetectionMarker),
    );
    if (lastErrorIdx === -1) return;

    // Encontra a última mensagem do usuário antes do erro
    const lastUserMsg = [...messages]
      .slice(0, lastErrorIdx)
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMsg) return;

    // Remove a mensagem de fallback e reenvia
    setMessages((prev) => prev.filter((_, idx) => idx !== lastErrorIdx));
    void sendMessage(lastUserMsg.text, lastUserMsg.attachments);
  }, [messages, sendMessage, retryDetectionMarker]);

  return {
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
  };
}


