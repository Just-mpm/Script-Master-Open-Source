import { useMemo, useRef, useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { base64ToBlobSync } from '../lib/audio';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';
import { isCallableCancelledError, isCreditCallableError } from '../lib/callable-errors';
import { useCredits } from './useCredits';

const log = createLogger('useImageGenerator');

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

const toUserFriendlyImageError = createErrorMapper({
  nonErrorMessage: 'Ocorreu um erro ao gerar a imagem. Tente novamente.',
  defaultMessage: 'Não foi possível gerar a imagem. Verifique o prompt e tente novamente.',
  rules: [
    ...sharedErrorRules,
    {
      match: (m) => m.includes('app-check') || m.includes('AppCheck') || m.includes('permission-denied'),
      message: 'Erro de segurança da sessão. Recarregue a página e tente novamente.',
    },
    {
      match: (m) => m.includes('deadline') || m.includes('504') || m.includes('timeout'),
      message: 'O servidor demorou demais para responder. Tente novamente.',
    },
    {
      match: (m) => m.includes('safety') || m.includes('blocked'),
      message: 'Conteúdo bloqueado por filtros de segurança. Altere o prompt e tente novamente.',
    },
    {
      match: (m) => m.includes('saldo') || m.includes('crédito'),
      message: 'Créditos insuficientes. Seu saldo será renovado no início do próximo mês.',
    },
  ],
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio: string;
  referenceImage?: File;
}

/** Input para o flow images no backend */
interface ImagesFlowInput {
  prompt: string;
  aspectRatio: string;
  referenceImage?: string;
  requestId: string;
}

interface ImagesFlowOutput {
  imageBase64: string;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const CANCEL_ERROR_MESSAGE = 'Geração cancelada pelo usuário.';

export function useImageGenerator() {
  const { availableCredits, unlimitedCredits, loading: creditsLoading } = useCredits();
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  // Referência para revogar blob URL anterior (tech #6)
  const imageUrlRef = useRef<string | null>(null);

  // Permite cancelar geração em andamento
  const cancelRef = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);

  // Timer para auto-dismiss do erro
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAiRequestCallable = useMemo(
    () => httpsCallable<{ requestId: string }, { success: boolean }>(functions, 'cancelAiRequest'),
    [],
  );

  // Revoga blob URL anterior quando a imagem muda ou componente desmonta
  useEffect(() => {
    return () => {
      const activeRequestId = activeRequestIdRef.current;
      if (activeRequestId) {
        void cancelAiRequestCallable({ requestId: activeRequestId }).catch(() => {});
      }
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
      // Limpa timer de auto-dismiss do erro
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [cancelAiRequestCallable]);

  const isCreditBlocked = !creditsLoading && !unlimitedCredits && availableCredits <= 0;

  useEffect(() => {
    if (!isCreditBlocked) {
      setCreditsExhausted(false);
    }
  }, [isCreditBlocked]);

  const generateImage = async (options: ImageGenerationOptions) => {
    cancelRef.current = false;
    setIsGenerating(true);
    setError(null);
    setCreditsExhausted(false);

    // Revoga blob URL anterior antes de gerar nova imagem
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImageUrl(null);
    setImageBlob(null);

    try {
      // Converte imagem de referência (File) para base64 data URL
      let referenceBase64: string | undefined;
      if (options.referenceImage) {
        referenceBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Passa o data URL completo para o backend
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(options.referenceImage!);
        });
      }

      if (cancelRef.current) throw new Error(CANCEL_ERROR_MESSAGE);

      const callable = httpsCallable<ImagesFlowInput, ImagesFlowOutput>(functions, 'images');
      const requestId = crypto.randomUUID();
      activeRequestIdRef.current = requestId;

      const result = await callable({
        prompt: options.prompt,
        aspectRatio: options.aspectRatio,
        referenceImage: referenceBase64,
        requestId,
      });

      if (cancelRef.current) {
        throw new Error(CANCEL_ERROR_MESSAGE);
      }

      const { imageBase64, mimeType } = result.data;

      if (!imageBase64) {
        throw new Error('Nenhuma imagem foi retornada.');
      }

      const blob = base64ToBlobSync(imageBase64, mimeType);
      const blobUrl = URL.createObjectURL(blob);

      setImageBlob(blob);
      setImageUrl(blobUrl);
      imageUrlRef.current = blobUrl;
    } catch (err: unknown) {
      // Cancelamento silencioso — sem erro para o usuário
      const errorMessageText = err instanceof Error ? err.message : '';
      if (errorMessageText === CANCEL_ERROR_MESSAGE || isCallableCancelledError(err)) {
        setIsGenerating(false);
        return;
      }

      log.error('Erro ao gerar imagem', { error: err });
      const friendlyMessage = toUserFriendlyImageError(err);
      if (isCreditCallableError(err) || friendlyMessage.includes('crédito') || friendlyMessage.includes('saldo')) {
        setCreditsExhausted(true);
      }
      setError(friendlyMessage);
      // Auto-dismiss após 8 segundos (UX-3)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setError('');
        errorTimerRef.current = null;
      }, 8000);
    } finally {
      activeRequestIdRef.current = null;
      setIsGenerating(false);
    }
  };

  const clearImage = () => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImageUrl(null);
    setImageBlob(null);
    setError(null);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    const activeRequestId = activeRequestIdRef.current;
    if (activeRequestId) {
      void cancelAiRequestCallable({ requestId: activeRequestId }).catch((cancelError: unknown) => {
        log.warn('Falha ao solicitar cancelamento da imagem', { error: cancelError });
      });
    }
  };

  return {
    isGenerating,
    imageUrl,
    imageBlob,
    error,
    setError,
    generateImage,
    handleCancel,
    clearImage,
    creditsExhausted: creditsExhausted || isCreditBlocked,
  };
}
