// ---------------------------------------------------------------------------
// Schemas Zod compartilhados entre todos os flows Genkit
// ---------------------------------------------------------------------------
//
// Centraliza tipos de entrada/saída para evitar duplicação entre flows.
// Cada flow pode estender ou compor estes schemas base.
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
    name: z.string().optional(),
  })).optional(),
});

/** Anexo enviado pelo usuário (imagem ou documento) */
export const AttachmentSchema = z.object({
  mimeType: z.string(),
  data: z.string(), // base64
  name: z.string().optional(),
});

/** Input do flow de chat principal */
export const AssistantInputSchema = z.object({
  message: z.string(),
  history: z.array(ChatMessageSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  studioState: z.record(z.unknown()).optional(),
  requestId: z.string().optional(), // idempotência
});

/** Output do flow de chat */
export const AssistantOutputSchema = z.object({
  text: z.string(),
  jsonSettings: z.record(z.unknown()).optional(),
});

/** Stream chunk do chat */
export const AssistantStreamSchema = z.string();

// ---------------------------------------------------------------------------
// Inline Assistant
// ---------------------------------------------------------------------------

export const InlineAssistantInputSchema = z.object({
  selectedText: z.string(),
  instruction: z.string(),
  fullScript: z.string().optional(),
  requestId: z.string().optional(),
});

export const InlineAssistantOutputSchema = z.object({
  rewrittenText: z.string(),
});

// ---------------------------------------------------------------------------
// Áudio / TTS
// ---------------------------------------------------------------------------

export const VoiceConfigSchema = z.object({
  voiceId: z.string(),
  pace: z.string().optional(),
  emotion: z.string().optional(),
  emotionIntensity: z.number().min(0).max(1).optional(),
});

export const MultiSpeakerConfigSchema = z.object({
  speakerAName: z.string().optional(),
  speakerBName: z.string().optional(),
  speakerBVoice: z.string().optional(),
});

export const AudioInputSchema = z.object({
  script: z.string(),
  voiceConfig: VoiceConfigSchema,
  isMultiSpeaker: z.boolean().optional(),
  multiSpeakerConfig: MultiSpeakerConfigSchema.optional(),
  audioProfile: z.string().optional(),
  scene: z.string().optional(),
  styleNotes: z.string().optional(),
  generateScenes: z.boolean().optional(),
  sceneRatio: z.string().optional(),
  sceneDensity: z.number().optional(),
  visualFramework: z.string().optional(),
  imageTextLanguage: z.string().optional(),
  referenceImage: z.string().nullable().optional(),
  preflight: z.object({
    availableCredits: z.number(),
    totalPlanned: z.number(),
    unlimited: z.boolean(),
  }).optional(),
  requestId: z.string().optional(),
});

export const AudioOutputSchema = z.object({
  /** Base64 do áudio WAV. Presente apenas para áudios menores que ~8MB. */
  audioBase64: z.string().optional(),
  /** URL signed do Firebase Storage para áudios grandes (>8MB). */
  audioUrl: z.string().optional(),
  mimeType: z.string(),
  durationInSeconds: z.number(),
  chunks: z.number(),
  segments: z.array(z.object({
    text: z.string(),
    startSec: z.number(),
    endSec: z.number(),
    chunkIndex: z.number(),
  })).optional(),
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
  blockingReasonCode: z.string().optional(),
  blockingMessage: z.string().optional(),
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
  referenceImage: z.string().optional(), // base64 data URL
  requestId: z.string().optional(),
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
  style: z.string().optional(),
  densitySeconds: z.number().optional(),
  visualFramework: z.string().optional(),
  locale: z.string().optional(),
  requestId: z.string().optional(),
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
  limit: z.number().optional(),
  requestId: z.string().optional(),
});

export const ChunkingOutputSchema = z.object({
  chunks: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const FeedbackInputSchema = z.object({
  category: z.string(),
  text: z.string(),
  screenContext: z.string().optional(),
  requestId: z.string().optional(),
});

export const FeedbackOutputSchema = z.object({
  success: z.boolean(),
  bonusGranted: z.boolean(),
  availableCredits: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Tipos inferidos (para uso em funções TypeScript)
// ---------------------------------------------------------------------------

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
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
