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

import { z } from 'genkit';

// ---------------------------------------------------------------------------
// Chat / Assistant
// ---------------------------------------------------------------------------

/** Mensagem individual no histórico do chat */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
  attachments: z.array(z.object({
    mimeType: z.string(),
    data: z.string(),
    name: z.string().nullable().optional(),
  })).nullable().optional(),
});

/** Anexo enviado pelo usuário (imagem ou documento) */
export const AttachmentSchema = z.object({
  mimeType: z.string(),
  data: z.string(), // base64
  name: z.string().nullable().optional(),
});

/** Nível de pensamento do modelo */
export const ThinkingLevelSchema = z.enum(['minimal', 'low', 'medium', 'high']);

/** Input do flow de chat principal */
export const AssistantInputSchema = z.object({
  message: z.string(),
  history: z.array(ChatMessageSchema).nullable().optional(),
  attachments: z.array(AttachmentSchema).nullable().optional(),
  studioState: z.record(z.unknown()).nullable().optional(),
  requestId: z.string().nullable().optional(), // idempotência
  model: z.enum(['fast', 'specialist']).nullable().optional(), // qual modelo usar
  thinkingLevel: ThinkingLevelSchema.nullable().optional(), // nível de pensamento
});

/** Output do flow de chat */
export const AssistantOutputSchema = z.object({
  text: z.string(),
  jsonSettings: z.record(z.unknown()).nullable().optional(),
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
  script: z.string(),
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
  unlimitedCredits: z.boolean(),
  currentPeriodKey: z.string(),
});

// ---------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------

export const ImageInputSchema = z.object({
  prompt: z.string(),
  aspectRatio: z.string(),
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
  densitySeconds: z.number().nullable().optional(),
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
 * de tom e injeção de audio tags entre chunks.
 *
 * - text: conteúdo textual do chunk (nunca cortado no meio de frase)
 * - emotionTag: audio tag sugerida para o início deste chunk (ex: "[excitedly]")
 * - isContinuation: true se o chunk é continuação direta do anterior
 *   (sem quebra de parágrafo ou troca de ideia)
 * - trailingSentence: última frase do chunk, usada como âncora contextual
 *   para o próximo chunk (sample context)
 */
export const ChunkItemSchema = z.object({
  text: z.string(),
  emotionTag: z.string().nullable().optional(),
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
