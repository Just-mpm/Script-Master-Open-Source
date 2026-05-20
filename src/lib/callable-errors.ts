interface CallableErrorDetails {
  code?: string;
  [key: string]: unknown;
}

interface CallableErrorShape {
  code?: string;
  message?: string;
  details?: CallableErrorDetails;
  customData?: {
    details?: CallableErrorDetails;
  };
}

export interface CallableErrorInfo {
  firebaseCode: string;
  message: string;
  detailCode: string | null;
  details: CallableErrorDetails | null;
}

function isCallableErrorDetails(value: unknown): value is CallableErrorDetails {
  return typeof value === 'object' && value !== null;
}

export function getCallableErrorInfo(error: unknown): CallableErrorInfo {
  const candidate = error as CallableErrorShape | undefined;
  const topLevelDetails = candidate?.details;
  const legacyDetails = candidate?.customData?.details;
  const details = isCallableErrorDetails(topLevelDetails)
    ? topLevelDetails
    : isCallableErrorDetails(legacyDetails)
      ? legacyDetails
      : null;

  return {
    firebaseCode: candidate?.code ?? '',
    message: candidate?.message ?? '',
    detailCode: typeof details?.code === 'string' ? details.code : null,
    details,
  };
}

export function isCreditCallableError(error: unknown): boolean {
  const info = getCallableErrorInfo(error);
  return (
    info.detailCode === 'INSUFFICIENT_CREDITS' ||
    info.detailCode === 'CREDITS_CHANGED_AFTER_PREFLIGHT' ||
    info.message.toLowerCase().includes('crédito') ||
    info.message.toLowerCase().includes('saldo')
  );
}

export function isCallableCancelledError(error: unknown): boolean {
  const info = getCallableErrorInfo(error);
  return (
    info.detailCode === 'USER_CANCELLED' ||
    info.firebaseCode === 'cancelled' ||
    info.firebaseCode === 'functions/cancelled' ||
    info.message.toLowerCase().includes('cancelad')
  );
}
