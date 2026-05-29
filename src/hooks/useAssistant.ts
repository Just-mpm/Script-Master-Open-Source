import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { removeUndefinedFields } from '../lib/callable-utils';
import { saveChatSession, type ChatSession } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import type {
  Attachment,
  AssistantPlan,
  AssistantSettings,
  AssistantStudioState,
  AssistantStudioUpdate,
  AssistantToolEvent,
  ChatMessage,
  InterviewDatum,
  InterviewResumeData,
  RespondResult,
} from '../features/assistant/types';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';
import { getCallableErrorInfo, isCallableCancelledError, isCreditCallableError } from '../lib/callable-errors';
import { useCredits } from './useCredits';

const log = createLogger('useAssistant');
const STREAM_ABORTED = Symbol('assistant-stream-aborted');

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
        match: (m) => m.includes('app-check') || m.includes('AppCheck') || m.includes('permission-denied'),
        message: t('assistantStrings.errors.sessionSecurity'),
      },
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
      {
        match: (m) => m.includes('saldo') || m.includes('crédito'),
        message: t('assistantStrings.errors.creditsInsufficient'),
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Tipos internos para tipagem das chamadas httpsCallable
// ---------------------------------------------------------------------------

interface AssistantFlowInput {
  message: string;
  history?: Array<{
    role: 'user' | 'model';
    text: string;
    attachments?: Array<{ mimeType: string; data: string; name?: string }>;
  }>;
  attachments?: Array<{ mimeType: string; data: string; name?: string }>;
  studioState?: Record<string, unknown>;
  plan?: AssistantPlan;
  requestId: string;
  model?: 'fast' | 'specialist';
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  /** Dados de retomada quando o usuário responde a um interrupt de entrevista */
  resume?: { question: string; answer: string };
}

interface AssistantFlowOutput {
  text: string;
  jsonSettings?: Record<string, unknown>;
  plan?: AssistantPlan;
  appliedSettings?: Record<string, unknown>;
  interview?: InterviewDatum | null;
  respond?: RespondResult | null;
}

type AssistantStreamMeta =
  | { type: 'plan_update'; plan: AssistantPlan }
  | { type: 'studio_update'; settings: AssistantSettings; summary?: string }
  | { type: 'interview'; interview: InterviewDatum }
  | { type: 'respond_result'; respond: RespondResult }
  | { type: 'tool_call'; name: string; input?: unknown }
  | { type: 'tool_result'; name: string; output?: unknown };

function normalizeAttachments(attachments: Attachment[] | null | undefined): Attachment[] {
  return Array.isArray(attachments) ? attachments : [];
}

function normalizeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    attachments: normalizeAttachments(message.attachments),
  }));
}

function parseAssistantStreamMeta(chunkText: string): AssistantStreamMeta | null {
  if (!chunkText.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(chunkText) as Partial<AssistantStreamMeta>;
    if (parsed.type === 'plan_update' && Array.isArray(parsed.plan)) {
      return parsed as AssistantStreamMeta;
    }

    if (
      parsed.type === 'studio_update'
      && typeof parsed.settings === 'object'
      && parsed.settings !== null
    ) {
      return parsed as AssistantStreamMeta;
    }

    if (
      parsed.type === 'interview'
      && typeof parsed.interview === 'object'
      && parsed.interview !== null
    ) {
      return parsed as AssistantStreamMeta;
    }

    if (
      parsed.type === 'respond_result'
      && typeof parsed.respond === 'object'
      && parsed.respond !== null
    ) {
      return parsed as AssistantStreamMeta;
    }

    if (
      (parsed.type === 'tool_call' || parsed.type === 'tool_result')
      && typeof parsed.name === 'string'
    ) {
      return parsed as AssistantStreamMeta;
    }
  } catch {
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useAssistant(currentState?: AssistantStudioState) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { availableCredits, unlimitedCredits, canEnforceBalance, loading: creditsLoading, error: creditsError } = useCredits();

  // Mapeador de erros recriado quando locale muda
  const toUserFriendlyAssistantError = useMemo(() => buildErrorMapper(t), [t]);

  // Marker para detecção de retry (não traduzível)
  const retryDetectionMarker = t('assistantStrings.retryDetection');
  // Mensagem de fallback para erros de streaming (inclui marker invisível para retry detection)
  const streamFallbackText = `${t('assistantStrings.errors.stream')} ${retryDetectionMarker}`;

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonSettings, setJsonSettings] = useState<Record<string, unknown> | null>(null);
  const [plan, setPlan] = useState<AssistantPlan>([]);
  const [pendingSettings, setPendingSettings] = useState<AssistantStudioUpdate | null>(null);
  const [toolEvents, setToolEvents] = useState<AssistantToolEvent[]>([]);
  const [interview, setInterview] = useState<InterviewDatum | null>(null);
  const [respondResult, setRespondResult] = useState<RespondResult | null>(null);

  // Sincroniza ref com estado para acesso sem stale closure
  useEffect(() => { interviewRef.current = interview; }, [interview]);
  const [creditsExhausted, setCreditsExhausted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'fast' | 'specialist'>('fast');
  const [selectedThinkingLevel, setSelectedThinkingLevel] = useState<'minimal' | 'low' | 'medium' | 'high'>('medium');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMessageRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamActiveRef = useRef(false);
  const chunkBufferRef = useRef<string>('');
  const rafRef = useRef<number>(0);
  const streamingTargetRef = useRef<string>('');
  const activeRequestIdRef = useRef<string | null>(null);
  const streamedContentStartedRef = useRef(false);
  const planRef = useRef<AssistantPlan>([]);
  const interviewRef = useRef<InterviewDatum | null>(null);

  // Callable estável (a instância do SDK é memoizada)
  const assistantCallable = useMemo(
    () => httpsCallable<AssistantFlowInput, AssistantFlowOutput>(functions, 'assistant'),
    [],
  );
  const cancelAiRequestCallable = useMemo(
    () => httpsCallable<{ requestId: string }, { success: boolean }>(functions, 'cancelAiRequest'),
    [],
  );

  const requestRemoteCancellation = useCallback((requestId?: string | null) => {
    if (!requestId) return;

    void cancelAiRequestCallable({ requestId }).catch((cancelError: unknown) => {
      log.warn('Falha ao solicitar cancelamento do assistente', { error: cancelError });
    });
  }, [cancelAiRequestCallable]);

  // ---------------------------------------------------------------------------
  // Scroll automático
  // ---------------------------------------------------------------------------

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Rola para o final apenas quando uma mensagem do USUÁRIO é enviada
  // (não durante streaming do modelo — para não forçar scroll)
  const prevMessagesLenRef = useRef(0);
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isNewUserMessage = messages.length > prevMessagesLenRef.current && lastMessage?.role === 'user';
    prevMessagesLenRef.current = messages.length;

    if (isNewUserMessage) {
      scrollToBottom();
    }
  }, [messages]);

  // Rola UMA VEZ para o início da mensagem do modelo quando o streaming começa
  // Depois libera o scroll para o usuário
  const hasScrolledToStreamStartRef = useRef(false);
  useEffect(() => {
    if (isStreaming && !hasScrolledToStreamStartRef.current) {
      hasScrolledToStreamStartRef.current = true;
      // Pequeno delay para garantir que o DOM já renderizou a mensagem
      requestAnimationFrame(() => {
        streamingMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (!isStreaming) {
      hasScrolledToStreamStartRef.current = false;
    }
  }, [isStreaming]);

  // ---------------------------------------------------------------------------
  // Lifecycle e persistência
  // ---------------------------------------------------------------------------

  // Aborta chamada em andamento ao desmontar
  useEffect(() => {
    return () => {
      requestRemoteCancellation(activeRequestIdRef.current);
      abortControllerRef.current?.abort();
      streamActiveRef.current = false;
    };
  }, [requestRemoteCancellation]);

  const isCreditBlocked = !!user && canEnforceBalance && !creditsLoading && !creditsError && !unlimitedCredits && availableCredits <= 0;

  useEffect(() => {
    if (!isCreditBlocked) {
      setCreditsExhausted(false);
    }
  }, [isCreditBlocked]);

  // Auto-save session (após streaming, evita centenas de saves por segundo)
  useEffect(() => {
    if (isStreaming) return;

    if (messages.length > 1) {
      const title = messages.find(m => m.role === 'user')?.text.slice(0, 40) || t('assistantStrings.defaultChatTitle');
      const session: ChatSession = {
        id: currentSessionId,
        userId: user?.uid,
        title,
        messages: normalizeChatMessages(messages),
        updatedAt: Date.now(),
        // Persiste plano e entrevista para resiliência a reload
        activePlan: planRef.current.length > 0 ? planRef.current : undefined,
        pendingInterview: interviewRef.current ?? undefined,
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
  }, [messages, currentSessionId, user, isStreaming, t]);

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

  const removePendingAssistantPlaceholder = useCallback(() => {
    if (streamedContentStartedRef.current) {
      return;
    }

    const targetId = streamingTargetRef.current;
    if (!targetId) {
      return;
    }

    setMessages((prev) => prev.filter((message) => !(message.id === targetId && message.role === 'model' && message.text === '')));
  }, []);

  const waitForAbortSignal = (signal: AbortSignal): Promise<typeof STREAM_ABORTED> => (
    new Promise((resolve) => {
      if (signal.aborted) {
        resolve(STREAM_ABORTED);
        return;
      }

      let pollId: ReturnType<typeof setInterval> | null = setInterval(() => {
        if (!signal.aborted) return;
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
        signal.removeEventListener('abort', handleAbort);
        resolve(STREAM_ABORTED);
      }, 16);

      const handleAbort = () => {
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }
        signal.removeEventListener('abort', handleAbort);
        resolve(STREAM_ABORTED);
      };

      signal.addEventListener('abort', handleAbort, { once: true });
    })
  );

  const startNewChat = () => {
    requestRemoteCancellation(activeRequestIdRef.current);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamActiveRef.current = false;

    setCurrentSessionId(crypto.randomUUID());
    setMessages([]);
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
    setPlan([]);
    setPendingSettings(null);
    setToolEvents([]);
    setInterview(null);
    setRespondResult(null);
    planRef.current = [];
  };

  const loadSession = (session: ChatSession) => {
    requestRemoteCancellation(activeRequestIdRef.current);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamActiveRef.current = false;

    setCurrentSessionId(session.id);
    setMessages(normalizeChatMessages(session.messages));
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);

    // Restaura plano e entrevista do session (resiliência a reload)
    const restoredPlan = session.activePlan ?? [];
    setPlan(restoredPlan);
    planRef.current = restoredPlan;
    setInterview(session.pendingInterview ?? null);

    setPendingSettings(null);
    setToolEvents([]);
    setRespondResult(null);
  };

  const clearPendingSettings = useCallback(() => {
    setPendingSettings(null);
  }, []);

  const clearInterview = useCallback(() => {
    setInterview(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Envio de mensagem com streaming (backend Genkit)
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(async (
    text: string,
    attachments?: Attachment[],
    historyOverride?: ChatMessage[],
    resume?: InterviewResumeData,
  ) => {
    if (!text.trim() && (!attachments || attachments.length === 0) && !resume) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      attachments,
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setError(null);
    setCreditsExhausted(false);
    setJsonSettings(null);
    setPendingSettings(null);
    setToolEvents([]);
    setInterview(null);
    setRespondResult(null);

    // Cria AbortController para esta chamada
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    streamActiveRef.current = true;

    // ID da mensagem de resposta do assistente (para atualização progressiva)
    const assistantMsgId = (Date.now() + 1).toString();
    streamedContentStartedRef.current = false;

    try {
      // Constrói input para o flow assistant
      // O backend gerencia memórias, vozes, ritmos e system prompt sozinho
      const requestId = crypto.randomUUID();
      activeRequestIdRef.current = requestId;

      const historySource = historyOverride ?? messages;
      const rawInput: AssistantFlowInput = {
        message: text,
        history: historySource.filter((msg) => msg.id !== 'welcome').map((msg) => ({
          role: msg.role,
          text: msg.text,
          attachments: normalizeAttachments(msg.attachments)
            ?.filter((attachment) => !!attachment.data)
            .map((attachment) => ({
              mimeType: attachment.mimeType,
              data: attachment.data,
              name: attachment.name,
            })),
        })),
        attachments: attachments
          ? normalizeAttachments(attachments)
          ?.filter((att) => !!att.data)
          .map((att) => ({
            mimeType: att.mimeType,
            data: att.data!,
            name: att.name,
          }))
          : undefined,
        studioState: currentState as Record<string, unknown> | undefined,
        plan: planRef.current.length > 0 ? planRef.current : undefined,
        requestId,
        model: selectedModel,
        thinkingLevel: thinkingEnabled ? selectedThinkingLevel : undefined,
        resume: resume ?? undefined,
      };
      const input = removeUndefinedFields(rawInput);

      // Adiciona mensagem vazia do assistente (texto progressivo)
      setMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'model', text: '' },
      ]);
      setIsStreaming(true);

      // Streaming via Genkit flow — chunks são strings (streamSchema = z.string())
      const { stream, data: finalData } = await assistantCallable.stream(input);

      // Salva target ID no ref para o flush acessar sem closure stale
      streamingTargetRef.current = assistantMsgId;

      // Processa chunks progressivamente com buffer por frame.
      // A leitura é raced com o abort local para não ficar presa quando o
      // próximo chunk nunca chega ao cliente.
      const streamIterator = stream[Symbol.asyncIterator]();

      while (streamActiveRef.current) {
        const nextResult = await Promise.race([
          streamIterator.next(),
          waitForAbortSignal(abortController.signal),
        ]);

        if (nextResult === STREAM_ABORTED || abortController.signal.aborted || !streamActiveRef.current) {
          break;
        }

        if (nextResult.done) {
          break;
        }

        const chunkText = typeof nextResult.value === 'string' ? nextResult.value : '';
        if (!chunkText) continue;

        const meta = parseAssistantStreamMeta(chunkText);
        if (meta?.type === 'plan_update') {
          planRef.current = meta.plan;
          setPlan(meta.plan);
          continue;
        }

        if (meta?.type === 'studio_update') {
          setPendingSettings({
            settings: meta.settings,
            summary: meta.summary ?? 'O assistente sugeriu ajustes para o estúdio.',
          });
          continue;
        }

        if (meta?.type === 'interview') {
          setInterview(meta.interview);
          setPendingSettings(null);
          continue;
        }

        if (meta?.type === 'respond_result') {
          setRespondResult(meta.respond);
          continue;
        }

        if (meta?.type === 'tool_call' || meta?.type === 'tool_result') {
          setToolEvents((prev) => [
            ...prev.slice(-19),
            {
              id: `${Date.now()}-${prev.length}`,
              type: meta.type,
              name: meta.name,
              input: meta.type === 'tool_call' ? meta.input : undefined,
              output: meta.type === 'tool_result' ? meta.output : undefined,
            },
          ]);
          continue;
        }

        streamedContentStartedRef.current = true;
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

      // Aguarda o resultado final do flow (contém jsonSettings extraído pelo backend)
      if (!abortController.signal.aborted && streamActiveRef.current) {
        try {
          const output = await finalData;
          if (output.jsonSettings) {
            setJsonSettings(output.jsonSettings);
          }
          if (output.plan) {
            planRef.current = output.plan;
            setPlan(output.plan);
          }
          // Interview primeiro — pode limpar pendingSettings
          if (output.interview) {
            setInterview(output.interview);
            setPendingSettings(null);
          }
          // appliedSettings DEPOIS de interview para não ser sobrescrito
          if (output.appliedSettings) {
            setPendingSettings({
              settings: output.appliedSettings as AssistantSettings,
              summary: 'O assistente sugeriu ajustes para o estúdio.',
            });
          }
          if (output.respond) {
            setRespondResult(output.respond);
          }
        } catch (finalDataError: unknown) {
          if (!isCallableCancelledError(finalDataError)) {
            const errorInfo = getCallableErrorInfo(finalDataError);
            log.warn('Falha ao obter metadados finais do assistente', { error: errorInfo.message || finalDataError });
          }
          // jsonSettings é opcional — falha ao obter não deve quebrar o chat
        }
      } else {
        void finalData.catch(() => {});
      }

    } catch (err: unknown) {
      // Flush final em caso de erro para não perder chunks acumulados
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      flushChunkBuffer();

      // Ignora erros de aborto (intencional pelo usuário)
      if (abortController.signal.aborted || isCallableCancelledError(err)) {
        removePendingAssistantPlaceholder();
        return;
      }

      log.error('Erro no assistente', { error: err });
      const errorMessage = toUserFriendlyAssistantError(err);

      if (isCreditCallableError(err) || errorMessage.includes('crédito') || errorMessage.includes('saldo')) {
        setCreditsExhausted(true);
      }

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
      activeRequestIdRef.current = null;
      streamActiveRef.current = false;
      streamingTargetRef.current = '';
      streamedContentStartedRef.current = false;
      chunkBufferRef.current = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [
    messages,
    currentState,
    assistantCallable,
    removePendingAssistantPlaceholder,
    streamFallbackText,
    toUserFriendlyAssistantError,
    selectedModel,
    selectedThinkingLevel,
    thinkingEnabled,
  ]);

  /** Interrompe a geração em andamento via AbortController. */
  const stopGeneration = () => {
    requestRemoteCancellation(activeRequestIdRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamActiveRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    flushChunkBuffer();
    removePendingAssistantPlaceholder();
    streamingTargetRef.current = '';
    streamedContentStartedRef.current = false;
    chunkBufferRef.current = '';
    setIsLoading(false);
    setIsStreaming(false);
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

    // Remove a mensagem de fallback e reenvia usando o histórico já limpo,
    // evitando mandar o fallback técnico de volta para o backend.
    const sanitizedMessages = messages.filter((_, idx) => idx !== lastErrorIdx);
    setMessages(sanitizedMessages);
    void sendMessage(lastUserMsg.text, lastUserMsg.attachments, sanitizedMessages);
  }, [messages, sendMessage, retryDetectionMarker]);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    jsonSettings,
    sendMessage,
    startNewChat,
    loadSession,
    stopGeneration,
    retryLastMessage,
    messagesEndRef,
    streamingMessageRef,
    plan,
    pendingSettings,
    toolEvents,
    interview,
    respondResult,
    clearPendingSettings,
    clearInterview,
    creditBlockedByBalance: isCreditBlocked,
    creditsExhausted: creditsExhausted || isCreditBlocked,
    selectedModel,
    setSelectedModel,
    selectedThinkingLevel,
    setSelectedThinkingLevel,
    thinkingEnabled,
    setThinkingEnabled,
  };
}


