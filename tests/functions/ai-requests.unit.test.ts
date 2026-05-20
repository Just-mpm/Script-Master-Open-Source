import { describe, expect, it } from 'vitest';
import {
  finishAiRequest,
  isAiCancellationRequested,
  requestAiCancellation,
  startAiRequest,
  throwIfAiCancellationRequested,
} from '../../functions/src/usage/index.js';
import { MockFirestore } from './mockFirestore';

describe('ai-requests', () => {
  it('deve preservar cancel_requested quando o cancelamento chega antes do start', async () => {
    const db = new MockFirestore();
    const requestId = 'ai-request-1';

    await requestAiCancellation(db as unknown as Parameters<typeof requestAiCancellation>[0], 'user-1', requestId);
    await startAiRequest(db as unknown as Parameters<typeof startAiRequest>[0], 'user-1', requestId, 'assistant');

    const record = db.read(`users/user-1/ai_requests/${requestId}`);
    expect(record?.status).toBe('cancel_requested');
    expect(record?.flow).toBe('assistant');
  });

  it('deve reconhecer cancelamento e lançar HttpsError estruturado', async () => {
    const db = new MockFirestore();
    const requestId = 'ai-request-2';

    await requestAiCancellation(db as unknown as Parameters<typeof requestAiCancellation>[0], 'user-2', requestId);

    expect(await isAiCancellationRequested(db as unknown as Parameters<typeof isAiCancellationRequested>[0], 'user-2', requestId)).toBe(true);

    await expect(
      throwIfAiCancellationRequested(db as unknown as Parameters<typeof throwIfAiCancellationRequested>[0], 'user-2', requestId),
    ).rejects.toMatchObject({
      code: 'cancelled',
      details: {
        code: 'USER_CANCELLED',
        requestId,
      },
    });
  });

  it('deve ignorar novo cancelamento após conclusão final', async () => {
    const db = new MockFirestore();
    const requestId = 'ai-request-3';

    await startAiRequest(db as unknown as Parameters<typeof startAiRequest>[0], 'user-3', requestId, 'audio');
    await finishAiRequest(db as unknown as Parameters<typeof finishAiRequest>[0], 'user-3', requestId, 'completed');
    await requestAiCancellation(db as unknown as Parameters<typeof requestAiCancellation>[0], 'user-3', requestId);

    const record = db.read(`users/user-3/ai_requests/${requestId}`);
    expect(record?.status).toBe('completed');
  });
});
