import type { StudioDraftState, StudioSettingsPatch } from '../studio/types';
import type { AttachmentRecord, ChatMessageRecord } from '../../lib/db';

export type AssistantStudioState = StudioDraftState;
export type AssistantSettings = StudioSettingsPatch;

export type Attachment = AttachmentRecord;

export type ChatMessage = ChatMessageRecord;
