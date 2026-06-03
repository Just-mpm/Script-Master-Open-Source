// ---------------------------------------------------------------------------
// Schemas Zod compartilhados entre todos os flows Genkit
// ---------------------------------------------------------------------------
//
// Centraliza tipos de entrada/saída para evitar duplicação entre flows.
// Cada flow pode estender ou compor estes schemas base.
//
// NOTA sobre .nullable().optional():
//   O Firebase httpsCallable serializa undefined como null no JSON. Para
//   evitar que schemas rejeitem null em campos opcionais, todos os campos
//   .optional() têm .nullable() adicionado. Isso aceita tanto null (do JSON)
//   quanto undefined (campo ausente).
// ---------------------------------------------------------------------------

import { type ToolRequestPart, z } from 'genkit';

// ---------------------------------------------------------------------------
// ToolRequestPart — Schema que espelha o formato nativo do Genkit
// (ToolRequestPartSchema não é re-exportado pelo pacote 'genkit').
// Usado para serializar/desserializar interrupts no round-trip frontend.
// O passthrough() aceita campos extras (text, media, etc.) do tipo original.
// ---------------------------------------------------------------------------
const ToolRequestPartZodSchema: z.ZodType<ToolRequestPart> = z.object({
  toolRequest: z.object({
    name: z.string(),
    ref: z.string().optional(),
    input: z.unknown().optional(),
    partial: z.boolean().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
  custom: z.record(z.unknown()).optional(),
}).passthrough();

// ---------------------------------------------------------------------------
// Chat / Assistant
// ---------------------------------------------------------------------------

/** Mensagem individual no histórico do chat */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().max(500_000),
  attachments: z.array(z.object({
    mimeType: z.string(),
    data: z.string().max(15_000_000).nullable().optional(),
    name: z.string().nullable().optional(),
    processed: z.boolean().nullable().optional(),
  })).max(5).nullable().optional(),
});

/** Anexo enviado pelo usuário (imagem ou documento) */
export const AttachmentSchema = z.object({
  mimeType: z.string(),
  data: z.string().max(15_000_000), // base64
  name: z.string().nullable().optional(),
});

export const AssistantHistoryInlineDataSchema = z.object({
  mimeType: z.string(),
  data: z.string().max(15_000_000),
});

export const AssistantHistoryMediaSchema = z.object({
  url: z.string().max(20_000_000),
  contentType: z.string().nullable().optional(),
});

export const AssistantHistoryToolRequestSchema = z.object({
  name: z.string(),
  ref: z.string().nullable().optional(),
  input: z.unknown().nullable().optional(),
}).passthrough();

export const AssistantHistoryToolResponseSchema = z.object({
  name: z.string(),
  ref: z.string().nullable().optional(),
  output: z.unknown().nullable().optional(),
}).passthrough();

export const AssistantHistoryPartSchema = z.object({
  text: z.string().max(500_000).nullable().optional(),
  inlineData: AssistantHistoryInlineDataSchema.nullable().optional(),
  media: AssistantHistoryMediaSchema.nullable().optional(),
  toolRequest: AssistantHistoryToolRequestSchema.nullable().optional(),
  toolResponse: AssistantHistoryToolResponseSchema.nullable().optional(),
}).passthrough();

export const AssistantHistoryMessageSchema = z.object({
  role: z.enum(['system', 'user', 'model', 'tool']),
  content: z.array(AssistantHistoryPartSchema).max(200),
}).passthrough();

/** Nível de pensamento do modelo */
export const ThinkingLevelSchema = z.enum(['minimal', 'low', 'medium', 'high']);

export const AssistantTaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'need_help']);

export const AssistantSubtaskSchema = z.object({
  id: z.string().describe('Identificador único da subtarefa (ex: "1.1", "1.2")'),
  title: z.string().describe('Título curto e OBRIGATÓRIO da subtarefa — NUNCA omita este campo'),
  description: z.string().nullable().optional().describe('Descrição detalhada opcional da subtarefa'),
  status: z.string().describe('Status da subtarefa: pending, in_progress, completed, failed ou need_help'),
});

export const AssistantTaskSchema = z.object({
  id: z.string().describe('Identificador único da tarefa (ex: "1", "2")'),
  title: z.string().describe('Título curto e OBRIGATÓRIO da tarefa — NUNCA omita este campo'),
  description: z.string().nullable().optional().describe('Descrição detalhada opcional da tarefa'),
  status: z.string().describe('Status da tarefa: pending, in_progress, completed, failed ou need_help'),
  subtasks: z.array(AssistantSubtaskSchema).describe('Lista de subtarefas (pode ser vazia [])'),
});

export const AssistantPlanSchema = z.array(AssistantTaskSchema).describe('Lista de tarefas do plano');

export const UpdatePlanInputSchema = z.object({
  plan: AssistantPlanSchema.describe('Lista completa de tarefas — cada item DEVE ter id, title e status'),
});

export const WebSearchInputSchema = z.object({
  query: z.string().describe('Termo de busca para pesquisar na web'),
  numResults: z.number().min(1).max(10).nullable().optional().describe('Quantas fontes retornar (1-10, padrão 5)'),
});

export const GetStudioStateInputSchema = z.object({
  fields: z.array(z.string()).nullable().optional(),
});

export const GetMemoriesInputSchema = z.object({
  mode: z.string().describe('Modo de listagem: list (resumos até 180 chars) ou expand (conteúdo completo)').nullable().optional(),
  limit: z.number().min(1).max(100).nullable().optional(),
});

export const UpdateStudioInputSchema = z.object({
  settings: z.record(z.unknown()).describe('Campos do estúdio a alterar (apenas os que devem mudar)'),
  summary: z.string().nullable().optional().describe('Resumo da alteração sugerida'),
});

export const InterviewOptionSchema = z.object({
  label: z.string().describe('Texto curto do botão de opção (ex: "Sim", "Voz Clara")'),
  description: z.string().nullable().optional().describe('Explicação do que a opção significa'),
});

/** Uma única pergunta com opções */
export const InterviewQuestionSchema = z.object({
  question: z.string().describe('Texto da pergunta a exibir ao usuário'),
  options: z.array(InterviewOptionSchema).nullable().optional().describe('Lista de opções de resposta'),
  /** Se true, permite selecionar múltiplas opções (checkboxes). Default: false (radio) */
  multiple: z.boolean().nullable().optional().describe('Permite múltipla seleção (padrão: false)'),
});

/** Input do tool de entrevista — suporta single e multi-question */
export const InterviewInputSchema = z.object({
  /** Pergunta única (backward compat) */
  question: z.string().describe('Texto da pergunta a exibir ao usuário — OBRIGATÓRIO'),
  options: z.array(InterviewOptionSchema).nullable().optional().describe('Lista de opções de resposta'),
  /** Se true, permite selecionar múltiplas opções (checkboxes). Default: false (radio) */
  multiple: z.boolean().nullable().optional().describe('Permite múltipla seleção (padrão: false)'),
  /** Múltiplas perguntas — se presente, renderiza como tabs com confirmação em lote */
  questions: z.array(InterviewQuestionSchema).nullable().optional().describe('Lista de múltiplas perguntas (opcional)'),
});

/** Dados de retomada quando o usuário responde a um interrupt de entrevista */
export const InterviewResumeDataSchema = z.object({
  question: z.string(),
  answer: z.string(),
  /** Respostas para múltiplas perguntas (índice → resposta) */
  answers: z.array(z.string()).nullable().optional(),
});

export const RespondSuggestedActionSchema = z.object({
  label: z.string().describe('Texto curto do botão (ex: "Aplicar", "Gerar áudio")'),
  action: z.string().describe('Identificador da ação (ex: "apply_settings", "generate_audio")'),
  params: z.record(z.unknown()).nullable().optional().describe('Parâmetros da ação'),
});

export const RespondMediaSchema = z.object({
  type: z.string().describe('Tipo da mídia (ex: "image", "audio")'),
  url: z.string().describe('URL da mídia'),
  title: z.string().nullable().optional().describe('Título/descrição da mídia'),
});

export const RespondInputSchema = z.object({
  text: z.string().describe('Texto da resposta que o usuário vê como mensagem normal'),
  suggestedActions: z.array(RespondSuggestedActionSchema).nullable().optional().describe('Botões de ação clicáveis'),
  media: z.array(RespondMediaSchema).nullable().optional().describe('Links de mídia (imagens, áudios)'),
});

/** Input do flow de chat principal */
export const AssistantInputSchema = z.object({
  message: z.string(),
  history: z.array(ChatMessageSchema).nullable().optional(),
  attachments: z.array(AttachmentSchema).max(5).nullable().optional(),
  studioState: z.record(z.unknown()).nullable().optional(),
  plan: AssistantPlanSchema.nullable().optional(),
  requestId: z.string().nullable().optional(), // idempotência
  model: z.enum(['fast', 'specialist']).nullable().optional(), // qual modelo usar
  thinkingLevel: ThinkingLevelSchema.nullable().optional(), // nível de pensamento
  /** Dados de retomada quando o usuário responde a um interrupt */
  resume: InterviewResumeDataSchema.nullable().optional(),
  /**
   * Tool request do interrupt pendente (ToolRequestPart do Genkit).
   * Necessário para retomar corretamente via Genkit resume API,
   * preservando thought signatures e function call IDs do Gemini 3.
   */
  interruptToolRequest: ToolRequestPartZodSchema.nullable().optional(),
  /** Histórico completo do Genkit (MessageData[]) com tool calls/responses — preserva contexto entre mensagens */
  fullHistory: z.array(AssistantHistoryMessageSchema).max(2_000).nullable().optional(),
  contextSummary: z.string().max(20_000).nullable().optional(),
  compactionCount: z.number().int().min(0).nullable().optional(),
  estimatedContextTokens: z.number().int().min(0).nullable().optional(),
});

/** Output do flow de chat */
export const AssistantOutputSchema = z.object({
  text: z.string(),
  jsonSettings: z.record(z.unknown()).nullable().optional(),
  plan: AssistantPlanSchema.nullable().optional(),
  appliedSettings: z.record(z.unknown()).nullable().optional(),
  interview: InterviewInputSchema.nullable().optional(),
  respond: RespondInputSchema.nullable().optional(),
  /**
   * Tool request do interrupt pendente (ToolRequestPart do Genkit).
   * Preserva function call ID e thought signatures do Gemini 3.
   */
  interruptToolRequest: ToolRequestPartZodSchema.nullable().optional(),
  /** Histórico completo do Genkit (MessageData[]) com tool calls/responses — preserva contexto entre mensagens */
  fullHistory: z.array(AssistantHistoryMessageSchema).max(2_000).nullable().optional(),
  contextSummary: z.string().max(20_000).nullable().optional(),
  compactionCount: z.number().int().min(0).nullable().optional(),
  estimatedContextTokens: z.number().int().min(0).nullable().optional(),
});

/** Stream chunk do chat */
export const AssistantStreamSchema = z.string();

// ---------------------------------------------------------------------------
// Inline Assistant
// ---------------------------------------------------------------------------

export const InlineAssistantInputSchema = z.object({
  selectedText: z.string(),
  instruction: z.string(),
  fullScript: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  thinkingLevel: ThinkingLevelSchema.nullable().optional(), // nível de pensamento
});

export const InlineAssistantOutputSchema = z.object({
  rewrittenText: z.string(),
});

// ---------------------------------------------------------------------------
// Áudio / TTS
// ---------------------------------------------------------------------------

export const VoiceConfigSchema = z.object({
  voiceId: z.string(),
  pace: z.string().nullable().optional(),
  emotion: z.string().nullable().optional(),
  emotionIntensity: z.number().min(0).max(1).nullable().optional(),
});

export const MultiSpeakerConfigSchema = z.object({
  speakerAName: z.string().nullable().optional(),
  speakerBName: z.string().nullable().optional(),
  speakerBVoice: z.string().nullable().optional(),
});

export const AudioInputSchema = z.object({
  script: z.string().min(1).max(50_000),
  voiceConfig: VoiceConfigSchema,
  isMultiSpeaker: z.boolean().nullable().optional(),
  multiSpeakerConfig: MultiSpeakerConfigSchema.nullable().optional(),
  audioProfile: z.string().nullable().optional(),
  scene: z.string().nullable().optional(),
  styleNotes: z.string().nullable().optional(),
  generateScenes: z.boolean().nullable().optional(),
  sceneRatio: z.string().nullable().optional(),
  sceneDensity: z.number().nullable().optional(),
  visualFramework: z.string().nullable().optional(),
  imageTextLanguage: z.string().nullable().optional(),
  referenceImage: z.string().nullable().optional(),
  preflight: z.object({
    availableCredits: z.number(),
    totalPlanned: z.number(),
    unlimited: z.boolean(),
  }).nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export const AudioOutputSchema = z.object({
  /** Base64 do áudio WAV. Presente apenas para áudios menores que ~8MB. */
  audioBase64: z.string().nullable().optional(),
  /** URL signed do Firebase Storage para áudios grandes (>8MB). */
  audioUrl: z.string().nullable().optional(),
  mimeType: z.string(),
  durationInSeconds: z.number(),
  chunks: z.number(),
  segments: z.array(z.object({
    text: z.string(),
    startSec: z.number(),
    endSec: z.number(),
    chunkIndex: z.number(),
  })).nullable().optional(),
});

export const AudioPreflightStepSchema = z.object({
  type: z.enum(['audio', 'chunking', 'scene_prompts', 'image']),
  label: z.string(),
  plannedCount: z.number(),
  credits: z.number(),
  details: z.array(z.string()),
});

export const AudioPreflightInputSchema = AudioInputSchema;

export const AudioPreflightOutputSchema = z.object({
  summary: z.string(),
  estimatedDurationSeconds: z.number(),
  estimatedChunkCount: z.number(),
  estimatedSceneCount: z.number(),
  confidence: z.enum(['high', 'medium']),
  steps: z.array(AudioPreflightStepSchema),
  credits: z.object({
    available: z.number(),
    totalPlanned: z.number(),
    remainingAfter: z.number(),
    unlimited: z.boolean(),
  }),
  canProceed: z.boolean(),
  blockingReasonCode: z.string().nullable().optional(),
  blockingMessage: z.string().nullable().optional(),
  notes: z.array(z.string()),
});

export const CreditSnapshotOutputSchema = z.object({
  availableCredits: z.number(),
  usedCredits: z.number(),
  baseCredits: z.number(),
  bonusCredits: z.number(),
  reservedCredits: z.number(),
  feedbackBonusGranted: z.boolean(),
  feedbackPromoSeen: z.boolean(),
  unlimitedCredits: z.boolean(),
  currentPeriodKey: z.string(),
});

// ---------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------

export const ImageInputSchema = z.object({
  prompt: z.string().min(1).max(5_000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9']),
  referenceImage: z.string().nullable().optional(), // base64 data URL
  requestId: z.string().nullable().optional(),
});

export const ImageOutputSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
});

// ---------------------------------------------------------------------------
// Scene Prompts
// ---------------------------------------------------------------------------

export const ScenePromptsInputSchema = z.object({
  script: z.string(),
  durationInSeconds: z.number(),
  style: z.string().nullable().optional(),
  densitySeconds: z.number().min(1).nullable().optional(),
  visualFramework: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export const ScenePromptItemSchema = z.object({
  timestamp: z.number(),
  prompt: z.string(),
});

export const ScenePromptsOutputSchema = z.object({
  prompts: z.array(ScenePromptItemSchema),
  isFallback: z.boolean(),
});

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

export const ChunkingInputSchema = z.object({
  script: z.string(),
  limit: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
});

/**
 * Chunk enriquecido — além do texto, carrega metadados para continuidade
 * de tom entre chunks.
 *
 * - text: conteúdo textual do chunk (sempre termina com pontuação final)
 * - isContinuation: true se o chunk é continuação direta do anterior
 *   (sem quebra de parágrafo ou troca de ideia)
 * - trailingSentence: última frase do chunk, usada como âncora contextual
 *   para o próximo chunk (sample context) — computada programaticamente
 */
export const ChunkItemSchema = z.object({
  text: z.string(),
  isContinuation: z.boolean().nullable().optional(),
  trailingSentence: z.string().nullable().optional(),
});

export const ChunkingOutputSchema = z.object({
  chunks: z.array(z.string()),
  /** Chunks enriquecidos com metadados de continuidade (presente quando disponível) */
  enrichedChunks: z.array(ChunkItemSchema).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const FeedbackInputSchema = z.object({
  category: z.string(),
  text: z.string(),
  screenContext: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export const FeedbackOutputSchema = z.object({
  success: z.boolean(),
  bonusGranted: z.boolean(),
  availableCredits: z.number().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Tipos inferidos (para uso em funções TypeScript)
// ---------------------------------------------------------------------------

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type AssistantHistoryPart = z.infer<typeof AssistantHistoryPartSchema>;
export type AssistantHistoryMessage = z.infer<typeof AssistantHistoryMessageSchema>;
export type AssistantTaskStatus = z.infer<typeof AssistantTaskStatusSchema>;
export type AssistantSubtask = z.infer<typeof AssistantSubtaskSchema>;
export type AssistantTask = z.infer<typeof AssistantTaskSchema>;
export type AssistantPlan = z.infer<typeof AssistantPlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
export type GetStudioStateInput = z.infer<typeof GetStudioStateInputSchema>;
export type GetMemoriesInput = z.infer<typeof GetMemoriesInputSchema>;
export type UpdateStudioInput = z.infer<typeof UpdateStudioInputSchema>;
export type InterviewOption = z.infer<typeof InterviewOptionSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type InterviewInput = z.infer<typeof InterviewInputSchema>;
export type InterviewResumeData = z.infer<typeof InterviewResumeDataSchema>;
export type RespondSuggestedAction = z.infer<typeof RespondSuggestedActionSchema>;
export type RespondMedia = z.infer<typeof RespondMediaSchema>;
export type RespondInput = z.infer<typeof RespondInputSchema>;
export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
export type ThinkingLevel = z.infer<typeof ThinkingLevelSchema>;
export type AssistantModel = 'fast' | 'specialist';
export type InlineAssistantInput = z.infer<typeof InlineAssistantInputSchema>;
export type InlineAssistantOutput = z.infer<typeof InlineAssistantOutputSchema>;
export type AudioInput = z.infer<typeof AudioInputSchema>;
export type AudioOutput = z.infer<typeof AudioOutputSchema>;
export type AudioPreflightInput = z.infer<typeof AudioPreflightInputSchema>;
export type AudioPreflightOutput = z.infer<typeof AudioPreflightOutputSchema>;
export type CreditSnapshotOutput = z.infer<typeof CreditSnapshotOutputSchema>;
export type ImageInput = z.infer<typeof ImageInputSchema>;
export type ImageOutput = z.infer<typeof ImageOutputSchema>;
export type ScenePromptsInput = z.infer<typeof ScenePromptsInputSchema>;
export type ScenePromptsOutput = z.infer<typeof ScenePromptsOutputSchema>;
export type ChunkingInput = z.infer<typeof ChunkingInputSchema>;
export type ChunkingOutput = z.infer<typeof ChunkingOutputSchema>;
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>;
