// ---------------------------------------------------------------------------
// Flow do Assistente — Chat principal com streaming
// ---------------------------------------------------------------------------
//
// Substitui useAssistant.ts do frontend, movendo toda a lógica de IA
// para o backend via Genkit + Cloud Functions.
//
// Funcionalidades:
//   - Chat com streaming de texto (Server-Sent Events)
//   - Suporte a anexos (imagens e documentos via inlineData)
//   - Extração de configurações JSON sugeridas (```json)
//   - Gestão transacional de créditos via helper withCreditMetering()
//   - Contexto dinâmico: memórias, vozes, ritmos, estado do estúdio
//
// Protegido por:
//   - authPolicy: isSignedIn()  → apenas usuários autenticados
//   - enforceAppCheck: true     → apenas requests do app oficial
//   - region: southamerica-east1
// ---------------------------------------------------------------------------

import { onCallGenkit, isSignedIn, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '../genkit/genkit.js';
import {
  AssistantInputSchema,
  AssistantOutputSchema,
  AssistantStreamSchema,
  type AssistantInput,
  type AssistantOutput,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  isRequestIdValid,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { VOICES, PACE_DESCRIPTIONS } from '../genkit/constants.js';
import { asString } from '../genkit/utils/helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extrai um bloco JSON da resposta do modelo.
 * Procura por ```json ... ``` e retorna o objeto parseado.
 */
function extractJsonSettings(text: string): Record<string, unknown> | undefined {
  // Regex para capturar bloco ```json ... ```
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/i;
  const match = jsonBlockRegex.exec(text);

  if (!match || !match[1]) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(match[1].trim());
    // Garante que o resultado é um objeto válido (não array, não primitivo)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    // JSON inválido — ignora silenciosamente
    return undefined;
  }
}

/** Constrói o bloco de estado do estúdio para o prompt */
function buildStudioBlock(
  studioState: Record<string, unknown> | undefined,
): string {
  if (!studioState) {
    return '';
  }

  const script = asString(studioState.script) || '(vazio)';
  const selectedVoice = asString(studioState.selectedVoice) || '(padrão)';
  const isMultiSpeaker = Boolean(studioState.isMultiSpeaker);
  const audioProfile = asString(studioState.audioProfile) || '(vazio)';
  const scene = asString(studioState.scene) || '(vazio)';
  const pace = asString(studioState.pace) || '(padrão)';
  const styleNotes = asString(studioState.styleNotes) || '(vazio)';
  const generateScenes = studioState.generateScenes ? 'Ligado' : 'Desligado';
  const sceneRatio = asString(studioState.sceneRatio) || '16:9';
  const visualFramework = asString(studioState.visualFramework) || 'general';
  const referenceImage = studioState.referenceImage
    ? '- O usuário conectou uma Imagem de Referência para manter os mesmos personagens.'
    : '- Nenhuma imagem de referência anexada.';

  return `
ESTADO ATUAL DO ESTÚDIO DO USUÁRIO:
O usuário está visualizando a tela do estúdio neste exato momento e você sabe o que está preenchido nela:
- Roteiro atual: "${script}"
- Voz Selecionada: ${selectedVoice} (MultiSpeaker: ${isMultiSpeaker ? 'Ligado' : 'Desligado'})
- Personagem (Audio Profile): "${audioProfile}"
- Cena Atual: "${scene}"
- Ritmo: ${pace}
- Notas de Sotaque/Direção: "${styleNotes}"
- Cenas Visuais: ${generateScenes} (Ratio: ${sceneRatio}, Framework: ${visualFramework})
${referenceImage}

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
ATENÇÃO: Você não precisa preencher todos os campos, apenas os que desejar sugerir. Mantenha as respostas focadas no fluxo criativo!`;
}



// ---------------------------------------------------------------------------
// Flow Definition
// ---------------------------------------------------------------------------

export const assistant = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    enforceAppCheck: true,
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'assistant',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
      streamSchema: AssistantStreamSchema,
    },
    async (input: AssistantInput, { sendChunk }): Promise<AssistantOutput> => {
      const auth = ai.currentContext()?.auth;
      const uid = auth?.uid;

      if (!uid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado');
      }

      // Guard do beta aberto — bloqueia acesso quando beta fechado
      if (process.env.OPEN_BETA_ENABLED !== 'true') {
        throw new HttpsError('unavailable', 'O beta aberto está temporariamente desabilitado. Tente novamente em breve.');
      }

      const db = getFirestore();

      // Valida requestId enviado pelo cliente (deve ser UUID v4)
      if (input.requestId && !isRequestIdValid(input.requestId)) {
        throw new HttpsError('invalid-argument', 'requestId inválido — deve ser UUID v4');
      }
      const requestId = input.requestId || crypto.randomUUID();

      // -----------------------------------------------------------------------
      // 1. Busca contexto do usuário (memórias + user settings)
      // -----------------------------------------------------------------------

      const [memoriesSnap, settingsSnap] = await Promise.all([
        db
          .collection('memories')
          .where('userId', '==', uid)
          .limit(100)
          .get()
          .catch(() => null),
        db
          .collection('user_settings')
          .doc(uid)
          .get()
          .catch(() => null),
      ]);

      // Monta texto de memórias
      const memories: Array<{ content: string }> = memoriesSnap && !memoriesSnap.empty
        ? memoriesSnap.docs.map((d) => d.data() as { content: string })
        : [];
      const memoriesText = memories.length > 0
        ? `\nMEMÓRIAS DO USUÁRIO (Leve estas preferências em conta):\n${memories.map((m) => `- ${m.content}`).join('\n')}`
        : '';

      // Monta bloco de prompt customizado
      const userSettings = settingsSnap?.exists
        ? (settingsSnap.data() as { customSystemPrompt?: string })
        : null;
      const customPromptBlock = userSettings?.customSystemPrompt
        ? `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`
        : '';

      // Listas de vozes e ritmos
      const voicesList = VOICES.map((v) => `- ${v.name} (${v.style})`).join('\n');
      const paceList = Object.entries(PACE_DESCRIPTIONS)
        .map(([key, desc]) => `${key} (${desc})`)
        .join(', ');

      // Bloco de estado do estúdio
      const studioBlock = buildStudioBlock(input.studioState);

      // -----------------------------------------------------------------------
      // 2. Reserva créditos via helper withCreditMetering()
      // -----------------------------------------------------------------------

      const historyText = JSON.stringify(input.history ?? []);

      const creditMeter = await withCreditMetering(
        db,
        uid,
        requestId,
        'assistant',
        { message: input.message, history: historyText },
      );

      // -----------------------------------------------------------------------
      // 3. Constrói mensagens para o modelo
      // -----------------------------------------------------------------------

      // Converte anexos para partes inlineData
      const attachmentParts = (input.attachments ?? [])
        .filter((att) => att.data && att.data.length > 0)
        .map((att) => ({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data,
          },
        }));

      // Histórico de mensagens
      const historyMessages = (input.history ?? []).map((msg) => ({
        role: msg.role as 'user' | 'model',
        content: [{ text: msg.text }],
      }));

      // Mensagem atual do usuário
      const currentMessage = {
        role: 'user' as const,
        content: [
          { text: input.message },
          ...attachmentParts,
        ],
      };

      const messages = [...historyMessages, currentMessage];

      // -----------------------------------------------------------------------
      // 4. Geração com streaming via Dotprompt
      // -----------------------------------------------------------------------

      const assistantPrompt = ai.prompt('assistant');

      let fullText = '';
      let sendFailed = false;

      try {
        const { response: streamResponse, stream } = await assistantPrompt.stream({
          input: {
            memoriesText,
            voicesList,
            paceList,
            customPromptBlock,
            studioBlock,
          },
          messages,
        });

        // Itera sobre chunks de texto do modelo
        for await (const chunk of stream) {
          const chunkText = chunk.content?.[0]?.text ?? chunk.text ?? '';
          if (chunkText) {
            fullText += chunkText;
            try {
              sendChunk(chunkText);
            } catch {
              // Cliente desconectou — aborta o streaming localmente,
              // mas confirma créditos parciais pelo texto já gerado
              sendFailed = true;
              break;
            }
          }
        }

        // Se cliente desconectou durante o streaming, confirma custo parcial
        if (sendFailed) {
          // Aborta o stream pendente (não bloqueia)
          streamResponse.catch(() => {});

          if (fullText.length > 0) {
            const messageChars = input.message.length;
            const historyChars = historyText.length;
            const outputChars = fullText.length;

            const partialCredits = calculateCreditCost({
              operationType: 'assistant',
              inputChars: messageChars + historyChars,
              outputChars,
            });

            await creditMeter.confirm({
              finalCredits: partialCredits,
              outputSize: outputChars,
              model: 'gemini-3.1-flash-lite-preview',
            });

            console.log(
              `[assistant] Streaming abortado por desconexão do cliente: ` +
              `uid=${uid} requestId=${requestId} chars=${outputChars} credits=${partialCredits}`,
            );
          } else {
            // Nada foi gerado — reverte reserva
            await creditMeter.revert('CLIENT_DISCONNECTED');
          }

          // Retorna o texto parcial (cliente já desconectado, mas mantém consistência)
          const jsonSettings = extractJsonSettings(fullText);
          return { text: fullText, jsonSettings };
        }

        // Aguarda finalização da resposta
        await streamResponse;

        // -------------------------------------------------------------------
        // 5. Extrai configurações JSON da resposta
        // -------------------------------------------------------------------

        const jsonSettings = extractJsonSettings(fullText);

        // -------------------------------------------------------------------
        // 6. Confirma créditos com o custo real
        // -------------------------------------------------------------------

        const messageChars = input.message.length;
        const historyChars = historyText.length;
        const outputChars = fullText.length;

        const finalCredits = calculateCreditCost({
          operationType: 'assistant',
          inputChars: messageChars + historyChars,
          outputChars,
        });

        await creditMeter.confirm({
          finalCredits,
          outputSize: outputChars,
          model: 'gemini-3.1-flash-lite-preview',
        });

        console.log(
          `[assistant] Resposta gerada: uid=${uid} requestId=${requestId} ` +
          `chars=${outputChars} credits=${finalCredits}`,
        );

        return { text: fullText, jsonSettings };

      } catch (error) {
        // -------------------------------------------------------------------
        // 7. Reverte créditos em caso de erro
        // -------------------------------------------------------------------

        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        await creditMeter.revert(errorCode);

        console.error(
          `[assistant] Erro na geração: uid=${uid} requestId=${requestId} erro=${errorCode}`,
        );

        throw error;
      }
    },
  ),
);
