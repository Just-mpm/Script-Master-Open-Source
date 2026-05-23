import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export type AiRequestStatus =
  | 'running'
  | 'cancel_requested'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type AiRequestFlow =
  | 'assistant'
  | 'inline_assistant'
  | 'audio'
  | 'scene_prompts'
  | 'image'
  | 'pending';

export interface AiRequestRecord {
  requestId: string;
  flow: AiRequestFlow;
  status: AiRequestStatus;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  errorCode?: string;
}

function getRequestRef(db: Firestore, uid: string, requestId: string) {
  return db.doc(`users/${uid}/ai_requests/${requestId}`);
}

function buildAiRequestPatch(record: {
  requestId?: string;
  flow?: AiRequestFlow;
  status?: AiRequestStatus;
  createdAt?: number;
  updatedAt?: number;
  finishedAt?: number;
  errorCode?: string;
}): Partial<AiRequestRecord> {
  const patch: Partial<AiRequestRecord> = {};

  if (typeof record.requestId === 'string' && record.requestId.length > 0) {
    patch.requestId = record.requestId;
  }

  if (typeof record.flow === 'string') {
    patch.flow = record.flow;
  }

  if (typeof record.status === 'string') {
    patch.status = record.status;
  }

  if (typeof record.createdAt === 'number') {
    patch.createdAt = record.createdAt;
  }

  if (typeof record.updatedAt === 'number') {
    patch.updatedAt = record.updatedAt;
  }

  if (typeof record.finishedAt === 'number') {
    patch.finishedAt = record.finishedAt;
  }

  if (typeof record.errorCode === 'string' && record.errorCode.length > 0) {
    patch.errorCode = record.errorCode;
  }

  return patch;
}

export async function startAiRequest(
  db: Firestore,
  uid: string,
  requestId: string,
  flow: AiRequestFlow,
): Promise<void> {
  const ref = getRequestRef(db, uid, requestId);
  const now = Date.now();

  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const existing = snap.exists ? snap.data() as AiRequestRecord : null;
      const status = existing?.status === 'cancel_requested' ? 'cancel_requested' : 'running';

      transaction.set(ref, buildAiRequestPatch({
        requestId,
        flow,
        status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        finishedAt: existing?.finishedAt,
        errorCode: existing?.errorCode,
      }), { merge: true });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai-requests] startAiRequest falhou: uid=${uid} requestId=${requestId} flow=${flow} erro=${message}`);
    throw new HttpsError('internal', `Falha ao registrar requisição de IA: ${message}`, {
      code: 'START_AI_REQUEST_FAILED',
    });
  }
}

export async function requestAiCancellation(
  db: Firestore,
  uid: string,
  requestId: string,
): Promise<boolean> {
  const ref = getRequestRef(db, uid, requestId);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? snap.data() as AiRequestRecord : null;

    if (current && (current.status === 'completed' || current.status === 'cancelled' || current.status === 'failed')) {
      return;
    }

    transaction.set(ref, buildAiRequestPatch({
      requestId,
      flow: current?.flow ?? 'pending',
      status: 'cancel_requested',
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      finishedAt: current?.finishedAt,
      errorCode: current?.errorCode,
    }), { merge: true });
  });

  return true;
}

export async function isAiCancellationRequested(
  db: Firestore,
  uid: string,
  requestId: string,
): Promise<boolean> {
  const ref = getRequestRef(db, uid, requestId);
  const snap = await ref.get();

  if (!snap.exists) {
    return false;
  }

  const current = snap.data() as AiRequestRecord;
  return current.status === 'cancel_requested' || current.status === 'cancelled';
}

export async function throwIfAiCancellationRequested(
  db: Firestore,
  uid: string,
  requestId: string,
): Promise<void> {
  if (await isAiCancellationRequested(db, uid, requestId)) {
    throw new HttpsError(
      'cancelled',
      'A operação foi cancelada pelo usuário.',
      { code: 'USER_CANCELLED', requestId },
    );
  }
}

export async function finishAiRequest(
  db: Firestore,
  uid: string,
  requestId: string,
  status: Extract<AiRequestStatus, 'cancelled' | 'completed' | 'failed'>,
  errorCode?: string,
): Promise<void> {
  const ref = getRequestRef(db, uid, requestId);

  await ref.set(buildAiRequestPatch({
    status,
    updatedAt: Date.now(),
    finishedAt: Date.now(),
    errorCode,
  }), { merge: true });
}
