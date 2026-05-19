import { useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { useLocale } from '../features/i18n';

const log = createLogger('useInlineAssistant');

export function useInlineAssistant() {
  const { t } = useLocale();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

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

        const result = await callable({
          selectedText,
          instruction,
          fullScript,
          requestId: crypto.randomUUID(),
        });

        const rewrittenText = result.data.rewrittenText;

        if (!rewrittenText) {
          throw new Error('Resposta vazia da IA.');
        }

        return rewrittenText;
      } catch (err: unknown) {
        log.error('Erro na geração inline', { error: err });
        const mappedError = errorMapper(err);
        if (mappedError.includes('crédito') || mappedError.includes('saldo')) {
          setCreditsExhausted(true);
        }
        setError(mappedError);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [errorMapper],
  );

  return {
    isProcessing,
    error,
    rewrite,
    creditsExhausted,
  };
}
