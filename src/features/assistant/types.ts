import type { StudioDraftState, StudioSettingsPatch } from '../studio/types';
import type { AttachmentRecord, ChatMessageRecord } from '../../lib/db';

export type AssistantStudioState = StudioDraftState;
export type AssistantSettings = StudioSettingsPatch;

export type Attachment = AttachmentRecord;

export type ChatMessage = ChatMessageRecord;

export type AssistantTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'need_help';
export type AssistantTaskPriority = 'high' | 'medium' | 'low';

export interface AssistantSubtask {
  id: string;
  title: string;
  description?: string | null;
  status: AssistantTaskStatus;
  priority: AssistantTaskPriority;
  tools?: string[] | null;
}

export interface AssistantTask {
  id: string;
  title: string;
  description?: string | null;
  status: AssistantTaskStatus;
  priority: AssistantTaskPriority;
  level: number;
  dependencies: string[];
  subtasks: AssistantSubtask[];
}

export type AssistantPlan = AssistantTask[];

export interface AssistantToolEvent {
  id: string;
  type: 'tool_call' | 'tool_result';
  name: string;
  input?: unknown;
  output?: unknown;
}

export interface AssistantStudioUpdate {
  settings: AssistantSettings;
  summary: string;
}

export interface InterviewOption {
  label: string;
  description?: string;
}

/** Uma única pergunta com opções */
export interface InterviewQuestion {
  question: string;
  options?: InterviewOption[] | null;
  /** Se true, permite selecionar múltiplas opções (checkboxes). Default: false (radio) */
  multiple?: boolean;
}

/** Dados de entrevista — suporta single e multi-question */
export interface InterviewDatum {
  /** Pergunta única (backward compat) */
  question: string;
  options?: InterviewOption[] | null;
  /** Se true, permite selecionar múltiplas opções (checkboxes). Default: false (radio) */
  multiple?: boolean;
  /** Múltiplas perguntas — se presente, renderiza como tabs com confirmação em lote */
  questions?: InterviewQuestion[] | null;
}

/** Dados de retomada quando o usuário responde a um interrupt de entrevista */
export interface InterviewResumeData {
  question: string;
  answer: string;
  /** Respostas para múltiplas perguntas (índice → resposta) */
  answers?: string[];
}

export interface RespondSuggestedAction {
  label: string;
  action: string;
  params?: Record<string, unknown> | null;
}

export interface RespondMedia {
  type: string;
  url: string;
  title?: string | null;
}

export interface RespondResult {
  text: string;
  suggestedActions?: RespondSuggestedAction[] | null;
  media?: RespondMedia[] | null;
}
