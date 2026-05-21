import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';
import { isCallableCancelledError, isCreditCallableError } from '../lib/callable-errors';
import { useCredits } from './useCredits';

const log = createLogger('useInlineAssistant');

export function useInlineAssistant() {
  const { t } = useLocale();
  const { availableCredits, unlimitedCredits, canEnforceBalance, loading: creditsLoading, error: creditsError } = useCredits();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);
  const activeRequestIdRef = useRef<string | null>(null);
  const cancelledRequestIdsRef = useRef<Set<string>>(new Set());
  const cancelAiRequestCallable = useMemo(
    () => httpsCallable<{ requestId: string }, { success: boolean }>(functions, 'cancelAiRequest'),
    [],
  );

  const isCreditBlocked = canEnforceBalance && !creditsLoading && !creditsError && !unlimitedCredits && availableCredits <= 0;

  useEffect(() => {
    if (!isCreditBlocked) {
      setCreditsExhausted(false);
    }
  }, [isCreditBlocked]);

  const requestRemoteCancellation = useCallback((requestId?: string | null) => {
    if (!requestId) return;

    cancelledRequestIdsRef.current.add(requestId);
    void cancelAiRequestCallable({ requestId }).catch((cancelError: unknown) => {
      log.warn('Falha ao solicitar cancelamento do inline assistant', { error: cancelError });
    });
  }, [cancelAiRequestCallable]);

  useEffect(() => {
    return () => {
      requestRemoteCancellation(activeRequestIdRef.current);
    };
  }, [requestRemoteCancellation]);

  const errorMapper = createErrorMapper({
    nonErrorMessage: t('studio.scriptEditor.inlineAI.errorGeneric') || 'Erro inesperado',
    defaultMessage: t('studio.scriptEditor.inlineAI.errorGeneric') || 'Erro ao processar',
    rules: [
      ...sharedErrorRules,
      {
        match: (m) => m.includes('app-check') || m.includes('AppCheck') || m.includes('permission-denied'),
        message: 'Erro de segurança da sessão. Recarregue a página e tente novamente.',
      },
      {
        match: (m) => m.includes('saldo') || m.includes('crédito'),
        message: 'Créditos insuficientes. Seu saldo será renovado no início do próximo mês.',
      },
    ],
  });

  const rewrite = useCallback(
    async (selectedText: string, instruction: string, fullScript: string): Promise<string | null> => {
      if (!selectedText.trim() || !instruction.trim()) return null;

      setIsProcessing(true);
      setError(null);
      setCreditsExhausted(false);

      try {
        const callable = httpsCallable<{
          selectedText: string;
          instruction: string;
          fullScript: string;
          requestId: string;
        }, { rewrittenText: string }>(functions, 'inlineAssistant');
        const requestId = crypto.randomUUID();
        activeRequestIdRef.current = requestId;

        const result = await callable({
          selectedText,
          instruction,
          fullScript,
          requestId,
        });
        if (cancelledRequestIdsRef.current.has(requestId)) {
          return null;
        }

        const rewrittenText = result.data.rewrittenText;

        if (!rewrittenText) {
          throw new Error('Resposta vazia da IA.');
        }

        return rewrittenText;
      } catch (err: unknown) {
        if (isCallableCancelledError(err)) {
          return null;
        }
        log.error('Erro na geração inline', { error: err });
        const mappedError = errorMapper(err);
        if (isCreditCallableError(err) || mappedError.includes('crédito') || mappedError.includes('saldo')) {
          setCreditsExhausted(true);
        }
        setError(mappedError);
        return null;
      } finally {
        if (activeRequestIdRef.current) {
          cancelledRequestIdsRef.current.delete(activeRequestIdRef.current);
          activeRequestIdRef.current = null;
        }
        setIsProcessing(false);
      }
    },
    [errorMapper],
  );

  const stopProcessing = useCallback(() => {
    requestRemoteCancellation(activeRequestIdRef.current);
    activeRequestIdRef.current = null;
    setIsProcessing(false);
  }, [requestRemoteCancellation]);

  return {
    isProcessing,
    error,
    rewrite,
    stopProcessing,
    creditsExhausted: creditsExhausted || isCreditBlocked,
  };
}
