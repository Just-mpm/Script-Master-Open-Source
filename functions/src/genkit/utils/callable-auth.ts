import { HttpsError } from 'firebase-functions/v2/https';

interface CallableFlowAuthContext {
  readonly auth?: {
    readonly uid?: string;
  };
}

interface CallableFlowContext {
  readonly context?: CallableFlowAuthContext;
}

export function getCallableUidOrThrow(flowContext: CallableFlowContext): string {
  const uid = flowContext.context?.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  return uid;
}
