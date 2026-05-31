import { describe, expect, it, vi } from 'vitest';
import {
  ASSISTANT_COMPACTION_MAX_SUMMARY_CHARS,
  ASSISTANT_COMPACTION_TRIGGER_MESSAGES,
  ASSISTANT_MAX_INPUT_TOKENS,
  assertAssistantPayloadWithinLimit,
  compactAssistantHistory,
  estimateHistoryTokens,
  findSafeTailStart,
  sanitizeHistoryAttachments,
} from '../../functions/src/genkit/utils/assistant-compaction';
import type { AssistantHistoryMessage } from '../../functions/src/genkit/schemas/common';

function message(role: AssistantHistoryMessage['role'], text: string): AssistantHistoryMessage {
  return { role, content: [{ text }] };
}

function createLargeHistory(): AssistantHistoryMessage[] {
  return Array.from({ length: 32 }, (_, index) => [
    message('user', `Pergunta ${index}: ${'a'.repeat(14_000)}`),
    message('model', `Resposta ${index}: ${'b'.repeat(14_000)}`),
  ]).flat();
}

describe('assistant-compaction', () => {
  it('estima tokens localmente usando serialização aproximada', () => {
    const tokens = estimateHistoryTokens([message('user', 'a'.repeat(400))]);
    expect(tokens).toBeGreaterThanOrEqual(100);
  });

  it('não compacta abaixo do limite', async () => {
    const generateSummary = vi.fn();
    const result = await compactAssistantHistory(
      [message('user', 'Olá'), message('model', 'Oi')],
      '',
      generateSummary,
    );

    expect(result.compacted).toBe(false);
    expect(generateSummary).not.toHaveBeenCalled();
  });

  it('compacta prefixo antigo, preserva cauda e incorpora resumo anterior', async () => {
    const generateSummary = vi.fn().mockResolvedValue({
      text: '## Objetivo Atual\nContinuar conversa',
      totalTokens: 321,
    });
    const history = createLargeHistory();
    const result = await compactAssistantHistory(history, 'Resumo existente', generateSummary);

    expect(result.compacted).toBe(true);
    expect(result.messages.length).toBeLessThan(history.length);
    expect(result.contextSummary).toContain('Continuar conversa');
    expect(generateSummary).toHaveBeenCalledWith(expect.stringContaining('Resumo existente'));
    expect(result.summaryTokens).toBe(321);
  });

  it('não inicia a cauda entre toolRequest e toolResponse', () => {
    const history: AssistantHistoryMessage[] = [
      message('user', 'a'.repeat(300)),
      { role: 'model', content: [{ toolRequest: { name: 'updatePlan' } }] },
      { role: 'tool', content: [{ toolResponse: { name: 'updatePlan', output: { ok: true } } }] },
      message('model', 'fim'),
    ];

    expect(findSafeTailStart(history, 10)).toBe(0);
  });

  it('remove inlineData antigo sem apagar texto', () => {
    const sanitized = sanitizeHistoryAttachments([{
      role: 'user',
      content: [
        { text: 'legenda' },
        { inlineData: { mimeType: 'image/png', data: 'base64' } },
      ],
    }]);

    expect(sanitized[0].content).toEqual([{ text: 'legenda' }]);
  });

  it('remove media data URL antigo e preserva URL externa leve', () => {
    const sanitized = sanitizeHistoryAttachments([{
      role: 'user',
      content: [
        { media: { contentType: 'image/png', url: 'data:image/png;base64,antigo' } },
        { media: { contentType: 'image/png', url: 'https://example.com/imagem.png' } },
      ],
    }]);

    expect(sanitized[0].content).toEqual([
      { media: { contentType: 'image/png', url: 'https://example.com/imagem.png' } },
    ]);
  });

  it('compacta preventivamente quando há muitas mensagens curtas', async () => {
    const history = Array.from(
      { length: ASSISTANT_COMPACTION_TRIGGER_MESSAGES },
      (_, index) => message(index % 2 === 0 ? 'user' : 'model', `mensagem ${index}`),
    );
    const generateSummary = vi.fn().mockResolvedValue({ text: 'Resumo preventivo' });
    const result = await compactAssistantHistory(history, '', generateSummary);

    expect(result.compacted).toBe(true);
    expect(result.messages.length).toBeLessThan(history.length);
    expect(generateSummary).toHaveBeenCalledOnce();
  });

  it('limita o resumo retornado pelo modelo', async () => {
    const result = await compactAssistantHistory(
      createLargeHistory(),
      '',
      vi.fn().mockResolvedValue({ text: 'x'.repeat(ASSISTANT_COMPACTION_MAX_SUMMARY_CHARS + 10) }),
    );

    expect(result.contextSummary).toHaveLength(ASSISTANT_COMPACTION_MAX_SUMMARY_CHARS);
  });

  it('rejeita payload manual exagerado antes da inferência', () => {
    expect(() => assertAssistantPayloadWithinLimit(ASSISTANT_MAX_INPUT_TOKENS + 1)).toThrow();
  });
});
