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

export async function startAiRequest(
  db: Firestore,
  uid: string,
  requestId: string,
  flow: AiRequestFlow,
): Promise<void> {
  const ref = getRequestRef(db, uid, requestId);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = snap.exists ? snap.data() as AiRequestRecord : null;
    const status = existing?.status === 'cancel_requested' ? 'cancel_requested' : 'running';

    transaction.set(ref, {
      requestId,
      flow,
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      finishedAt: existing?.finishedAt,
      errorCode: existing?.errorCode,
    } satisfies AiRequestRecord, { merge: true });
  });
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

    transaction.set(ref, {
      requestId,
      flow: current?.flow ?? 'pending',
      status: 'cancel_requested',
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      finishedAt: current?.finishedAt,
      errorCode: current?.errorCode,
    } satisfies AiRequestRecord, { merge: true });
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

  await ref.set({
    status,
    errorCode,
    updatedAt: Date.now(),
    finishedAt: Date.now(),
  } satisfies Partial<AiRequestRecord>, { merge: true });
}
