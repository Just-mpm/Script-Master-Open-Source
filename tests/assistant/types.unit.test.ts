import { describe, it, expect } from 'vitest';
import type { AssistantStudioState, AssistantSettings, Attachment, ChatMessage } from '../../src/features/assistant/types';
import type { StudioDraftState, StudioSettingsPatch } from '../../src/features/studio/types';
import type { AttachmentRecord, ChatMessageRecord } from '../../src/lib/db';

describe('assistant/types', () => {
  // Verificações em tempo de compilação — se os aliases estiverem quebrados,
  // estas atribuições causarão erro de tipo no typecheck.
  const studioOk: StudioDraftState = {} as AssistantStudioState;
  const settingsOk: StudioSettingsPatch = {} as AssistantSettings;
  const attachmentOk: AttachmentRecord = {} as Attachment;
  const chatOk: ChatMessageRecord = {} as ChatMessage;

  it('módulo de tipos carrega sem erros', async () => {
    const mod = await import('../../src/features/assistant/types');
    expect(mod).toBeDefined();
  });

  it('todos os aliases de tipo são compatíveis (compile-time)', () => {
    expect(studioOk).toBeDefined();
    expect(settingsOk).toBeDefined();
    expect(attachmentOk).toBeDefined();
    expect(chatOk).toBeDefined();
  });
});
