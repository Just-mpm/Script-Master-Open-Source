import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';
import { isCallableCancelledError } from '../lib/callable-errors';
import { getProviderAuthFromStore } from '../features/provider-settings';

const log = createLogger('useInlineAssistant');

export function useInlineAssistant() {
  const { t } = useLocale();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const cancelledRequestIdsRef = useRef<Set<string>>(new Set());
  const cancelAiRequestCallable = useMemo(
    () => httpsCallable<{ requestId: string }, { success: boolean }>(functions, 'cancelAiRequest'),
    [],
  );

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
    ],
  });

  const rewrite = useCallback(
    async (selectedText: string, instruction: string, fullScript: string): Promise<string | null> => {
      if (!selectedText.trim() || !instruction.trim()) return null;

      const providerAuth = getProviderAuthFromStore();
      if (!providerAuth) {
        setError('Configure sua chave de API do Gemini nas configurações.');
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const callable = httpsCallable<{
          selectedText: string;
          instruction: string;
          fullScript: string;
          requestId: string;
          providerAuth: { provider: 'gemini'; apiKey: string };
        }, { rewrittenText: string }>(functions, 'inlineAssistant');
        const requestId = crypto.randomUUID();
        activeRequestIdRef.current = requestId;

        const result = await callable({
          selectedText,
          instruction,
          fullScript,
          requestId,
          providerAuth,
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
  };
}
