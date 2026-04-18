import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VOICES, PACE_INSTRUCTIONS } from '../lib/constants';
import { getMemories, saveChatSession, getUserSettings, type ChatSession } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import type { Attachment, AssistantStudioState, ChatMessage } from '../features/assistant/types';
import { getGeminiApiKey } from '../lib/env';

export type { Attachment, AssistantSettings, ChatMessage } from '../features/assistant/types';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Olá! Sou seu Assistente Criativo. Posso te ajudar a escrever roteiros, escolher a voz ideal ou configurar a cena perfeita. Agora também posso analisar seus arquivos (PDFs, imagens) para te ajudar melhor! Como posso ajudar hoje?'
};

export function useAssistant(currentState?: AssistantStudioState) {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save session
  useEffect(() => {
    if (messages.length > 1) {
      const title = messages.find(m => m.role === 'user')?.text.slice(0, 40) || 'Nova Conversa';
      const session: ChatSession = {
        id: currentSessionId,
        userId: user?.uid,
        title,
        messages,
        updatedAt: Date.now()
      };

      void Promise.resolve(saveChatSession(session, user?.uid)).catch((sessionError: unknown) => {
        console.error('Erro ao salvar sessão do assistente:', sessionError);
      });
    }
  }, [messages, currentSessionId, user]);

  const startNewChat = () => {
    setCurrentSessionId(crypto.randomUUID());
    setMessages([WELCOME_MESSAGE]);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  };

  const sendMessage = async (text: string, attachments?: Attachment[]) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;

    const newUserMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text,
      attachments 
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const memories = await getMemories(user?.uid);
      const memoriesText = memories.length > 0 
        ? `\nMEMÓRIAS DO USUÁRIO (Leve estas preferências em conta):\n${memories.map(m => `- ${m.content}`).join('\n')}`
        : '';

      const voicesList = VOICES.map(v => `- ${v.name} (${v.style})`).join('\n');
      const paceList = Object.keys(PACE_INSTRUCTIONS).join(', ');

      const userSettings = await getUserSettings(user?.uid);
      const customPromptBlock = userSettings?.customSystemPrompt
        ? `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`
        : '';

      const systemInstruction = `Você é o Assistente Criativo do Gemini Voice Studio, um especialista avançado em criação de roteiros, direção de áudio (Gemini TTS) e produção de vídeos estilo Canal Dark/YouTube.
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

ESTADO ATUAL DO ESTÚDIO DO USUÁRIO:
O usuário está visualizando a tela do estúdio neste exato momento e você sabe o que está preenchido nela:
- Roteiro atual: "${currentState?.script || '(vazio)'}"
- Voz Selecionada: ${currentState?.selectedVoice || '(padrão)'} (MultiSpeaker: ${currentState?.isMultiSpeaker ? 'Ligado' : 'Desligado'})
- Personagem (Audio Profile): "${currentState?.audioProfile || '(vazio)'}"
- Cena Atual: "${currentState?.scene || '(vazio)'}"
- Ritmo: ${currentState?.pace || '(padrão)'}
- Notas de Sotaque/Direção: "${currentState?.styleNotes || '(vazio)'}"
- Cenas Visuais: ${currentState?.generateScenes ? 'Ligado' : 'Desligado'} (Ratio: ${currentState?.sceneRatio || '16:9'}, Framework: ${currentState?.visualFramework || 'general'})
${currentState?.referenceImage ? '- O usuário conectou uma Imagem de Referência para manter os mesmos personagens.' : '- Nenhuma imagem de referência anexada.'}

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
ATENÇÃO: Você não precisa preencher todos os campos, apenas os que desejar sugerir. Mantenha as respostas focadas no fluxo criativo!${customPromptBlock}`;

      // Convert history to Gemini format
      const contents = messages.slice(1).map(msg => ({
        role: msg.role,
        parts: [
          { text: msg.text },
          ...(msg.attachments?.map(att => ({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          })) || [])
        ]
      }));

      // Add current message
      contents.push({
        role: 'user',
        parts: [
          { text },
          ...(attachments?.map(att => ({
            inlineData: {
              mimeType: att.mimeType,
              data: att.data
            }
          })) || [])
        ]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || 'Desculpe, não consegui gerar uma resposta.';

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: responseText }
      ]);

    } catch (err: unknown) {
      console.error('Error in assistant:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Ocorreu um erro ao comunicar com o assistente.';

      setError(errorMessage);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    startNewChat,
    loadSession,
    messagesEndRef
  };
}
