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
import { z } from 'genkit';
import { ai } from '../genkit/genkit.js';
import { APP_ALLOWED_CORS_ORIGINS } from '../config/cors.js';
import {
  AssistantInputSchema,
  AssistantOutputSchema,
  AssistantStreamSchema,
  GetMemoriesInputSchema,
  GetStudioStateInputSchema,
  InterviewInputSchema,
  RespondInputSchema,
  UpdatePlanInputSchema,
  UpdateStudioInputSchema,
  WebSearchInputSchema,
  type AssistantInput,
  type AssistantOutput,
  type AssistantPlan,
  type InterviewInput,
  type RespondInput,
} from '../genkit/schemas/common.js';
import {
  calculateCreditCost,
  finishAiRequest,
  isRequestIdValid,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../usage/index.js';
import { withCreditMetering } from '../genkit/middlewares/credit-metering.js';
import { VOICES, PACE_DESCRIPTIONS } from '../genkit/constants.js';
import {
  buildAssistantSystemInstruction,
  buildCustomPromptBlock,
  buildMemoriesText,
  buildStudioBlock,
  buildUserProfileBlock,
  type AssistantUserSettingsDoc,
} from '../genkit/utils/assistant-context.js';
import { getCallableUidOrThrow } from '../genkit/utils/callable-auth.js';
import { resolveModelConfig } from '../genkit/utils/model-config.js';
import { createLogger } from '../genkit/utils/logger.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TOKEN_CREDIT_RATE = 1000;
const MAX_HISTORY_MESSAGES_FOR_ESTIMATION = 10;

const log = createLogger('assistant');

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

/**
 * Remove o bloco ```json ... ``` do texto antes de retornar ao frontend.
 * Evita que o usuário veja JSON cru na mensagem do assistente.
 */
function stripJsonSettingsBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```\s*/gi, '').trim();
}

function buildMeteringHistoryText(input: AssistantInput): string {
  // Trunca histórico para estimativa — últimas N mensagens são suficientes
  const history = input.history ?? [];
  const truncated = history.slice(-MAX_HISTORY_MESSAGES_FOR_ESTIMATION);

  return JSON.stringify(
    truncated.map((message) => ({
      role: message.role,
      text: message.text,
      attachments: (message.attachments ?? []).map((attachment) => ({
        mimeType: attachment.mimeType,
        name: attachment.name ?? '',
      })),
    })),
  );
}

function serializeAssistantMeta(type: string, payload: Record<string, unknown>): string {
  return JSON.stringify({ type, ...payload });
}

function getTextFromPart(part: unknown): string {
  if (typeof part !== 'object' || part === null || !('text' in part)) {
    return '';
  }

  const text = (part as { text?: unknown }).text;
  return typeof text === 'string' ? text : '';
}

function getToolRequestFromPart(part: unknown): { name: string; input?: unknown } | null {
  if (typeof part !== 'object' || part === null || !('toolRequest' in part)) {
    return null;
  }

  const toolRequest = (part as { toolRequest?: unknown }).toolRequest;
  if (typeof toolRequest !== 'object' || toolRequest === null || !('name' in toolRequest)) {
    return null;
  }

  const name = (toolRequest as { name?: unknown }).name;
  if (typeof name !== 'string') {
    return null;
  }

  return { name, input: (toolRequest as { input?: unknown }).input };
}

function getToolResponseFromPart(part: unknown): { name: string; output?: unknown } | null {
  if (typeof part !== 'object' || part === null || !('toolResponse' in part)) {
    return null;
  }

  const toolResponse = (part as { toolResponse?: unknown }).toolResponse;
  if (typeof toolResponse !== 'object' || toolResponse === null || !('name' in toolResponse)) {
    return null;
  }

  const name = (toolResponse as { name?: unknown }).name;
  if (typeof name !== 'string') {
    return null;
  }

  return { name, output: (toolResponse as { output?: unknown }).output };
}

function getChunkParts(chunk: unknown): unknown[] {
  if (typeof chunk !== 'object' || chunk === null || !('content' in chunk)) {
    return [];
  }

  const content = (chunk as { content?: unknown }).content;
  return Array.isArray(content) ? content : [];
}

function calculateAssistantCreditsFromUsage(
  totalTokens: number | undefined,
  inputChars: number,
  outputChars: number,
): number {
  if (typeof totalTokens === 'number' && Number.isFinite(totalTokens) && totalTokens > 0) {
    return Math.max(1, Math.ceil(totalTokens / TOKEN_CREDIT_RATE));
  }

  return calculateCreditCost({
    operationType: 'assistant',
    inputChars,
    outputChars,
  });
}

// ---------------------------------------------------------------------------
// Flow Definition
// ---------------------------------------------------------------------------

export const assistant = onCallGenkit(
  {
    authPolicy: isSignedIn(),
    cors: APP_ALLOWED_CORS_ORIGINS,
    enforceAppCheck: true,
    invoker: 'public',
    region: 'southamerica-east1',
  },
  ai.defineFlow(
    {
      name: 'assistant',
      inputSchema: AssistantInputSchema,
      outputSchema: AssistantOutputSchema,
      streamSchema: AssistantStreamSchema,
    },
    async (input: AssistantInput, flowContext): Promise<AssistantOutput> => {
      const uid = getCallableUidOrThrow(flowContext);
      const { sendChunk } = flowContext;

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
      let requestStarted = false;
      let requestFinished = false;
      let creditsSettled = false;
      let creditMeter: Awaited<ReturnType<typeof withCreditMetering>> | null = null;

      try {
        await startAiRequest(db, uid, requestId, 'assistant');
        requestStarted = true;

        // -----------------------------------------------------------------------
        // 1. Busca contexto do usuário (memórias + user settings)
        // -----------------------------------------------------------------------

        await throwIfAiCancellationRequested(db, uid, requestId);

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
        const memoriesText = buildMemoriesText(memories);

        // Monta bloco de prompt customizado
        const userSettings = settingsSnap?.exists
          ? (settingsSnap.data() as AssistantUserSettingsDoc)
          : null;
        const customPromptBlock = buildCustomPromptBlock(userSettings);
        const userProfileBlock = buildUserProfileBlock(userSettings);

        // Listas de vozes e ritmos
        const voicesList = VOICES.map((v) => `- ${v.name} (${v.style})`).join('\n');
        const paceList = Object.entries(PACE_DESCRIPTIONS)
          .map(([key, desc]) => `${key} (${desc})`)
          .join(', ');

        // Bloco de estado do estúdio
        const studioBlock = buildStudioBlock(input.studioState ?? undefined);

        // -----------------------------------------------------------------------
        // 2. Reserva créditos via helper withCreditMetering()
        // -----------------------------------------------------------------------

        const historyText = buildMeteringHistoryText(input);

        creditMeter = await withCreditMetering(
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
          content: [
            { text: msg.text },
            ...(msg.attachments ?? [])
              .filter((attachment) => attachment.data.length > 0)
              .map((attachment) => ({
                inlineData: {
                  mimeType: attachment.mimeType,
                  data: attachment.data,
                },
              })),
          ],
        }));

        // Se há resume (resposta a um interrupt de entrevista), injeta o contexto
        // da pergunta anterior e a resposta do usuário no histórico
        if (input.resume) {
          // Pergunta do modelo
          historyMessages.push({
            role: 'model' as const,
            content: [{ text: input.resume.question }],
          });

          // Resposta do usuário — inclui todas as respostas se for multi-question
          const answerParts: string[] = [];
          if (input.resume.answers && input.resume.answers.length > 0) {
            // Multi-question: formata cada resposta
            answerParts.push('Respostas do usuário:');
            input.resume.answers.forEach((answer, index) => {
              answerParts.push(`${index + 1}. ${answer}`);
            });
          } else {
            answerParts.push(input.resume.answer);
          }

          historyMessages.push({
            role: 'user' as const,
            content: [{ text: answerParts.join('\n') }],
          });
        }

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
        // 4. Geração com streaming via instrução em código
        // -----------------------------------------------------------------------

        const systemInstruction = buildAssistantSystemInstruction({
          memoriesText,
          userProfileBlock,
          voicesList,
          paceList,
          studioBlock,
          customPromptBlock,
          toolFirst: true,
          memoryCount: memories.length,
          studioState: input.studioState ?? undefined,
        });

        let fullText = '';
        let sendFailed = false;
        let currentPlan: AssistantPlan = input.plan ?? [];
        let pendingStudioSettings: Record<string, unknown> | undefined;
        let currentInterview: InterviewInput | undefined;
        let currentRespond: RespondInput | undefined;

        // Resolve configuração do modelo com base na escolha do usuário
        const { model: resolvedModel, thinkingConfig } = resolveModelConfig(
          input.model ?? undefined,
          input.thinkingLevel ?? undefined,
        );

        /**
         * Yield para o event loop do Node.js — força o flush do buffer HTTP
         * entre chunks de streaming. Sem isso, múltiplos sendChunk() em
         * sequência rápida (tool_call → tool_result → texto) são agrupados
         * pelo runtime e entregues ao cliente como um único bloco.
         */
        const forceFlush = () => new Promise<void>((resolve) => setImmediate(resolve));

        const sendMetaChunk = async (type: string, payload: Record<string, unknown>) => {
          try {
            sendChunk(serializeAssistantMeta(type, payload));
            await forceFlush();
          } catch {
            sendFailed = true;
          }
        };

        // Helper: serializa erro como resultado para o modelo se auto-corrigir
        // em vez de propagar exceção e quebrar o tool loop
        const toolErrorResponse = (toolName: string, error: unknown): { error: true; tool: string; message: string } => {
          const message = error instanceof Error ? error.message.slice(0, 300) : 'Erro desconhecido';
          log.warn(`Tool ${toolName} falhou — modelo receberá erro como resultado`, { error: message });
          return { error: true, tool: toolName, message };
        };

        const updatePlanTool = ai.dynamicTool({
          name: 'updatePlan',
          description: 'Cria ou atualiza a lista de tarefas (TODO list) que o usuário vê como indicador de progresso. Use no início de tarefas com mais de um passo e sempre que o status de uma tarefa mudar (concluída, falhou, precisa de ajuda). Cada tarefa pode ter subtarefas, prioridade e dependências. Não use para tarefas triviais de uma etapa só.',
          inputSchema: UpdatePlanInputSchema,
          outputSchema: z.object({ ok: z.boolean(), taskCount: z.number() }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          currentPlan = toolInput.plan;
          await sendMetaChunk('plan_update', { plan: currentPlan });
          return { ok: true, taskCount: currentPlan.length };
        });

        const getStudioStateTool = ai.dynamicTool({
          name: 'getStudioState',
          description: 'Consulta os campos do estúdio do usuário (voz, ritmo, emoção, cenas, roteiro, etc). Use quando precisar verificar configurações atuais antes de sugerir ajustes ou responder perguntas sobre o estúdio. Pode filtrar campos específicos via parâmetro \'fields\' para respostas mais focadas. Retorna os valores atuais de cada campo. Se \'fields\' for vazio, retorna o estado completo.',
          inputSchema: GetStudioStateInputSchema,
          outputSchema: z.record(z.unknown()),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          try {
            const state = input.studioState ?? {};
            const fields = toolInput.fields ?? [];

            if (fields.length === 0) {
              return state;
            }

            return fields.reduce<Record<string, unknown>>((accumulator, field) => {
              if (field in state) {
                accumulator[field] = state[field];
              }
              return accumulator;
            }, {});
          } catch (err) {
            return toolErrorResponse('getStudioState', err);
          }
        });

        const getUserMemoriesTool = ai.dynamicTool({
          name: 'getUserMemories',
          description: 'Acessa as memórias e preferências salvas pelo usuário (ex: "prefiro voz Clara", "ritmo rápido", "estilo cinematográfico"). Use quando a tarefa depender de preferências pessoais, histórico de decisões ou diretrizes salvas. Modo \'list\' retorna resumos (até 180 chars). Modo \'expand\' retorna conteúdo completo. Se a pergunta do usuário já trouxer contexto suficiente, não é necessário consultar.',
          inputSchema: GetMemoriesInputSchema,
          outputSchema: z.object({
            memories: z.array(z.object({ content: z.string() })).optional(),
            mode: z.string().optional(),
            error: z.boolean().optional(),
            tool: z.string().optional(),
            message: z.string().optional(),
          }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          try {
            const limit = toolInput.limit ?? 20;
            const mode = toolInput.mode ?? 'list';
            const snapshot = await db
              .collection('memories')
              .where('userId', '==', uid)
              .limit(limit)
              .get();

            const memoryItems = snapshot.docs.map((doc) => {
              const data = doc.data() as { content?: unknown };
              const content = typeof data.content === 'string' ? data.content : '';
              return {
                content: mode === 'list' && content.length > 180
                  ? `${content.slice(0, 180)}...`
                  : content,
              };
            }).filter((memory) => memory.content.length > 0);

            return { memories: memoryItems, mode };
          } catch (err) {
            return toolErrorResponse('getUserMemories', err);
          }
        });

        const updateStudioTool = ai.dynamicTool({
          name: 'updateStudio',
          description: 'Propõe alterações em campos do estúdio (voz, ritmo, emoção, cenas, roteiro, etc). O frontend exibe uma prévia com os campos e valores que serão alterados. O usuário confirma ou rejeita antes de aplicar. Envie apenas os campos que deseja alterar — campos omitidos não são afetados. Use APÓS explicar o raciocínio em linguagem natural. Não envie sem detalhar o que está sugerindo e por quê. Campos válidos: selectedVoice, pace, emotion, emotionIntensity, audioProfile, scene, styleNotes, generateScenes, sceneDensity, sceneRatio, visualFramework, imageTextLanguage, isMultiSpeaker, speakerAName, speakerBName, speakerBVoice, script.',
          inputSchema: UpdateStudioInputSchema,
          outputSchema: z.object({
            ok: z.boolean().optional(),
            settings: z.record(z.unknown()).optional(),
            summary: z.string().optional(),
            error: z.boolean().optional(),
            tool: z.string().optional(),
            message: z.string().optional(),
          }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          try {
            pendingStudioSettings = toolInput.settings;
            const summary = toolInput.summary ?? 'O assistente sugeriu ajustes para o estúdio.';
            await sendMetaChunk('studio_update', { settings: toolInput.settings, summary });
            return { ok: true, settings: toolInput.settings, summary };
          } catch (err) {
            return toolErrorResponse('updateStudio', err);
          }
        });

        const interviewTool = ai.dynamicTool({
          name: 'interview',
          description: 'Faz uma pergunta ao usuário quando você precisa de uma decisão que não pode tomar sozinho. Use quando: faltar informação essencial (ex: qual voz usar), houver ambiguidade que depende de preferência pessoal, ou a tarefa exigir uma escolha do usuário para prosseguir. Cada opção DEVE ter \'label\' (curto) e \'description\' (explica o que a opção significa). Faça uma pergunta por vez. Não use para saudações, confirmações triviais ou quando já tiver informação suficiente. O fluxo de execução pausa até o usuário responder.',
          inputSchema: InterviewInputSchema,
          outputSchema: z.object({
            status: z.literal('awaiting_input'),
            question: z.string(),
          }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          currentInterview = toolInput;
          await sendMetaChunk('interview', { interview: toolInput });
          return { status: 'awaiting_input' as const, question: toolInput.question };
        });

        const respondTool = ai.dynamicTool({
          name: 'respond',
          description: 'Registra uma resposta estruturada que o frontend renderiza como ações clicáveis ou mídia. Use quando quiser oferecer ao usuário: botões de ação (ex: "Aplicar configuração", "Gerar áudio"), links de mídia (imagens, áudios), ou uma resposta final com contexto visual. O campo \'text\' é obrigatório e aparece como mensagem normal. \'suggestedActions\' e \'media\' são opcionais. Não use para respostas textuais simples — essas já são renderizadas automaticamente pelo streaming.',
          inputSchema: RespondInputSchema,
          outputSchema: z.object({ ok: z.boolean() }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          currentRespond = toolInput;
          await sendMetaChunk('respond_result', { respond: toolInput });
          return { ok: true };
        });

        const webSearchTool = ai.dynamicTool({
          name: 'webSearch',
          description: 'Pesquisa informações na web usando Google Search Grounding. Use quando precisar de dados atuais que não estão no contexto da conversa (ex: preços, notícias, documentação recente, tendências). Retorna um resumo da pesquisa com fontes. \'numResults\' controla quantas fontes (padrão: 5). Não use para informações que já estão disponíveis no estúdio, memórias ou system prompt.',
          inputSchema: WebSearchInputSchema,
          outputSchema: z.object({
            query: z.string().optional(),
            text: z.string().optional(),
            sources: z.array(z.record(z.unknown())).optional(),
            error: z.boolean().optional(),
            tool: z.string().optional(),
            message: z.string().optional(),
          }),
        }, async (toolInput) => {
          await throwIfAiCancellationRequested(db, uid, requestId);
          try {
            const response = await ai.generate({
              model: resolvedModel,
              prompt: `Pesquise e resuma objetivamente, com foco em fontes verificáveis: ${toolInput.query}`,
              config: {
                googleSearchRetrieval: {},
              },
            });
            const custom = typeof response.custom === 'object' && response.custom !== null
              ? response.custom as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<Record<string, unknown>> } }> }
              : {};
            const sources = custom.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
            return {
              query: toolInput.query,
              text: response.text,
              sources: sources.slice(0, toolInput.numResults ?? 5),
            };
          } catch (err) {
            return toolErrorResponse('webSearch', err);
          }
        });

        try {
          const { response: streamResponse, stream } = ai.generateStream({
            model: resolvedModel,
            system: systemInstruction,
            messages,
            tools: [
              updatePlanTool,
              webSearchTool,
              getStudioStateTool,
              getUserMemoriesTool,
              updateStudioTool,
              interviewTool,
              respondTool,
            ],
            maxTurns: 20,
            config: thinkingConfig ? { thinkingConfig } : undefined,
          });

          // Itera sobre chunks de texto e metadados de tools do modelo
          let interviewTriggered = false;

          for await (const chunk of stream) {
            await throwIfAiCancellationRequested(db, uid, requestId);

            for (const part of getChunkParts(chunk)) {
              const toolRequest = getToolRequestFromPart(part);
              if (toolRequest) {
                await sendMetaChunk('tool_call', {
                  name: toolRequest.name,
                  input: toolRequest.input,
                });
                // Se o modelo chamou interview, marca para interromper o stream
                // (o tool handler já emitiu o metadado via sendMetaChunk)
                if (toolRequest.name === 'interview') {
                  interviewTriggered = true;
                }
                continue;
              }

              const toolResponse = getToolResponseFromPart(part);
              if (toolResponse) {
                await sendMetaChunk('tool_result', {
                  name: toolResponse.name,
                  output: toolResponse.output,
                });
                continue;
              }

              const chunkText = getTextFromPart(part);
              if (chunkText) {
                fullText += chunkText;
                try {
                  sendChunk(chunkText);
                  await forceFlush();
                } catch {
                  // Cliente desconectou — aborta o streaming localmente,
                  // mas confirma créditos parciais pelo texto já gerado
                  sendFailed = true;
                  break;
                }
              }
            }

            if (sendFailed) break;
            if (interviewTriggered) break;
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
                model: resolvedModel,
              });
              creditsSettled = true;

              log.info('Streaming abortado por desconexão do cliente', {
                uid, requestId, chars: outputChars, credits: partialCredits,
              });
            } else {
              // Nada foi gerado — reverte reserva
              await creditMeter.revert('CLIENT_DISCONNECTED');
              creditsSettled = true;
            }

            // Retorna o texto parcial (cliente já desconectado, mas mantém consistência)
            const jsonSettings = extractJsonSettings(fullText);
            await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
              log.error('Falha ao finalizar ai_request após desconexão', {
                error: finishError instanceof Error ? finishError.message : 'desconhecido',
              });
            });
            requestFinished = true;
            return {
              text: stripJsonSettingsBlock(fullText),
              jsonSettings,
              plan: currentPlan,
              appliedSettings: pendingStudioSettings,
              interview: currentInterview,
              respond: currentRespond,
            };
          }

          // Se interview foi disparado, aborta o stream e retorna apenas o interview
          if (interviewTriggered) {
            streamResponse.catch(() => {});

            // Confirma créditos pelo texto gerado até agora (se houver)
            if (fullText.length > 0) {
              const partialCredits = calculateCreditCost({
                operationType: 'assistant',
                inputChars: input.message.length + historyText.length,
                outputChars: fullText.length,
              });
              await creditMeter.confirm({
                finalCredits: partialCredits,
                outputSize: fullText.length,
                model: resolvedModel,
              });
              creditsSettled = true;
            } else {
              await creditMeter.revert('INTERVIEW_INTERRUPT');
              creditsSettled = true;
            }

            await finishAiRequest(db, uid, requestId, 'completed').catch(() => {});
            requestFinished = true;
            return {
              text: fullText,
              plan: currentPlan,
              interview: currentInterview,
            };
          }

          // Aguarda finalização da resposta
          const response = await streamResponse;

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

          const finalCredits = calculateAssistantCreditsFromUsage(
            response.usage?.totalTokens,
            messageChars + historyChars,
            outputChars,
          );

          await creditMeter.confirm({
            finalCredits,
            outputSize: outputChars,
            model: resolvedModel,
          });
          creditsSettled = true;

          log.info('Resposta gerada', {
            uid, requestId, chars: outputChars, credits: finalCredits,
          });

          await finishAiRequest(db, uid, requestId, 'completed').catch((finishError: unknown) => {
            log.error('Falha ao finalizar ai_request com sucesso', {
              error: finishError instanceof Error ? finishError.message : 'desconhecido',
            });
          });
          requestFinished = true;
          return {
            text: stripJsonSettingsBlock(fullText),
            jsonSettings,
            plan: currentPlan,
            appliedSettings: pendingStudioSettings,
            interview: currentInterview,
            respond: currentRespond,
          };

        } catch (error) {
          // -------------------------------------------------------------------
          // 7. Reverte créditos em caso de erro
          // -------------------------------------------------------------------

          const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

          if (!creditsSettled) {
            await creditMeter.revert(errorCode);
            creditsSettled = true;
          }
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            log.error('Falha ao finalizar ai_request com erro interno', {
              error: finishError instanceof Error ? finishError.message : 'desconhecido',
            });
          });
          requestFinished = true;

          log.error('Erro na geração', { uid, requestId, error: errorCode });

          throw error;
        }
      } catch (error) {
        const errorCode = error instanceof Error ? error.message.slice(0, 200) : 'erro_desconhecido';

        if (creditMeter && !creditsSettled) {
          await creditMeter.revert(errorCode);
        }

        if (requestStarted && !requestFinished) {
          await finishAiRequest(
            db,
            uid,
            requestId,
            error instanceof HttpsError && error.code === 'cancelled' ? 'cancelled' : 'failed',
            errorCode,
          ).catch((finishError: unknown) => {
            log.error('Falha ao finalizar ai_request no catch externo', {
              error: finishError instanceof Error ? finishError.message : 'desconhecido',
            });
          });
        }

        throw error;
      }
    },
  ),
);
