import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VOICES, PACE_INSTRUCTIONS } from '../lib/constants';
import { getMemories, saveChatSession, getUserSettings, type ChatSession } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import type { Attachment, AssistantStudioState, ChatMessage } from '../features/assistant/types';
import { getGeminiApiKey } from '../lib/env';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';

const log = createLogger('useAssistant');

export type { Attachment, AssistantSettings, ChatMessage } from '../features/assistant/types';

// ---------------------------------------------------------------------------
// Mapeamento de erros amigáveis
// ---------------------------------------------------------------------------

const toUserFriendlyAssistantError = createErrorMapper({
  nonErrorMessage: 'Ocorreu um erro inesperado. Tente novamente.',
  defaultMessage: 'Não foi possível concluir. Tente novamente.',
  rules: [
    ...sharedErrorRules,
    {
      match: (m) => m.includes('deadline_exceeded') || m.includes('504'),
      message: 'O servidor demorou demais para responder. Tente novamente em instantes.',
    },
    {
      match: (m) => m.includes('safety') || m.includes('blocked'),
      message: 'Conteúdo bloqueado por filtros de segurança. Reformule a pergunta.',
    },
    {
      match: (m) => m.includes('abort') || m.includes('cancelled'),
      message: '',
    },
  ],
});

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Olá! Sou seu Assistente Criativo. Posso te ajudar a escrever roteiros, escolher a voz ideal ou configurar a cena perfeita. Agora também posso analisar seus arquivos (PDFs, imagens) para te ajudar melhor! Como posso ajudar hoje?'
};

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useAssistant(currentState?: AssistantStudioState) {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
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
    setMessages([WELCOME_MESSAGE]);
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

  const sendMessage = async (text: string, attachments?: Attachment[]) => {
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
        model: 'gemini-3.1-flash-lite-preview',
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
          { id: assistantMsgId, role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' },
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
  };

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
      (m) => m.role === 'model' && m.text.includes('Desculpe, ocorreu um erro'),
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
  }, [messages, sendMessage]);

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

// ---------------------------------------------------------------------------
// Construção do prompt do sistema (extraído do hook para legibilidade)
// ---------------------------------------------------------------------------

function buildSystemInstruction(
  memoriesText: string,
  voicesList: string,
  paceList: string,
  customPromptBlock: string,
  currentState?: AssistantStudioState,
): string {
  const studioBlock = currentState
    ? `
ESTADO ATUAL DO ESTÚDIO DO USUÁRIO:
O usuário está visualizando a tela do estúdio neste exato momento e você sabe o que está preenchido nela:
- Roteiro atual: "${currentState.script || '(vazio)'}"
- Voz Selecionada: ${currentState.selectedVoice || '(padrão)'} (MultiSpeaker: ${currentState.isMultiSpeaker ? 'Ligado' : 'Desligado'})
- Personagem (Audio Profile): "${currentState.audioProfile || '(vazio)'}"
- Cena Atual: "${currentState.scene || '(vazio)'}"
- Ritmo: ${currentState.pace || '(padrão)'}
- Notas de Sotaque/Direção: "${currentState.styleNotes || '(vazio)'}"
- Cenas Visuais: ${currentState.generateScenes ? 'Ligado' : 'Desligado'} (Ratio: ${currentState.sceneRatio || '16:9'}, Framework: ${currentState.visualFramework || 'general'})
${currentState.referenceImage ? '- O usuário conectou uma Imagem de Referência para manter os mesmos personagens.' : '- Nenhuma imagem de referência anexada.'}

Você pode sugerir configurações para o usuário baseadas no estado atual. Se você quiser que o usuário aplique uma nova configuração diretamente no estúdio, DEVE incluir um bloco JSON na sua resposta (com a tag \`\`\`json). O aplicativo irá ler esse JSON e criar um botão "Aplicar".

Exemplo Completo:
\`\`\`json
{
  "script": "Inscreva-se no canal! [laughs]",
  "isMultiSpeaker": false,
  "selectedVoice": "Zephyr",
  "audioProfile": "Narrador de mistério",
  "scene": "Ambiente tenso",
  "pace": "normal",
  "styleNotes": "Mistério, tom grave",
  "generateScenes": true,
  "sceneRatio": "16:9",
  "sceneDensity": 15,
  "visualFramework": "general"
}
\`\`\`
ATENÇÃO: Você não precisa preencher todos os campos, apenas os que desejar sugerir. Mantenha as respostas focadas no fluxo criativo!`
    : '';

  return `Você é o Assistente Criativo do Gemini Voice Studio, um especialista avançado em criação de roteiros, direção de áudio (Gemini TTS) e produção de vídeos estilo Canal Dark/YouTube.
Seu objetivo é ajudar o usuário a escrever textos para conversão em áudio TTS guiado organicamente e sugerir as melhores configurações baseadas na documentação do TTS e produção visual.

ESTRUTURA DE UM BOM PROMPT TTS (Voice Profile, Scene, Director Notes):
- O Gemini TTS baseia-se em "quem fala", "onde", "como" e "o que" (transcript).
- "Audio Profile" ou "Personagem": Define quem é o ator. Exemplo: "Jaz R., o The Morning Hype".
- "Scene" ou "Ambiente": O contexto físico/emocional que afeta a voz. Exemplo: Estúdio de rádio londrino às 10PM.
- "Director's Notes" / Sotaque: O estilo, respiração e tom. Em "Pace" defina a velocidade. Exemplo: Sorriso vocal, articulação precisa.
- "Audio Tags": Podem ser inseridas no texto: [sighs], [gasp], [laughs], [whispers], [sarcastic].
- "Multi-speaker": O TTS suporta 2 vozes simultâneas se o formato do roteiro for "Nome1: Texto \\n Nome2: Texto".

GERAÇÃO DE VÍDEO / CENAS (Modo YouTube):
- O aplicativo pode gerar imagens automaticamente acompanhando o áudio.
- Use "generateScenes": true para habilitar imagens pro vídeo.
- "sceneRatio": '16:9' para YouTube/Vídeos deitados, '9:16' para Shorts/TikTok.
- "sceneDensity": Inteiro que define a frequência das imagens (15 para dinâmico, 30 para lento).
- "visualFramework": 'general' (padrão) ou 'whiteboard' (animação desenhada, ilustrações coloridas sobre fundo branco com legendas focadas no ensino).

MEMÓRIA / CONTEXTO ADICIONAL:
${memoriesText}

VOZES DISPONÍVEIS:
${voicesList}

Ritmos disponíveis (pace): ${paceList}
${studioBlock}${customPromptBlock}`;
}
