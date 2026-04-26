import { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../lib/env';
import { base64ToBlobSync } from '../lib/audio';
import { withRetry } from '../lib/rate-limiter';
import { createLogger } from '../lib/logger';
import { createErrorMapper, sharedErrorRules } from '../lib/error-mapping';

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
      match: (m) => m.includes('deadline') || m.includes('504') || m.includes('timeout'),
      message: 'O servidor demorou demais para responder. Tente novamente.',
    },
    {
      match: (m) => m.includes('safety') || m.includes('blocked'),
      message: 'Conteúdo bloqueado por filtros de segurança. Altere o prompt e tente novamente.',
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const CANCEL_ERROR_MESSAGE = 'Geração cancelada pelo usuário.';

export function useImageGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoiza instância do GoogleGenAI (tech #9 + bp #8 + perf #9)
  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  // Referência para revogar blob URL anterior (tech #6)
  const imageUrlRef = useRef<string | null>(null);

  // Permite cancelar geração em andamento
  const cancelRef = useRef(false);

  // Revoga blob URL anterior quando a imagem muda ou componente desmonta
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, []);

  const generateImage = async (options: ImageGenerationOptions) => {
    cancelRef.current = false;
    setIsGenerating(true);
    setError(null);

    // Revoga blob URL anterior antes de gerar nova imagem
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    setImageUrl(null);
    setImageBlob(null);

    try {
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (options.referenceImage) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(options.referenceImage!);
        });

        contents.push({
          inlineData: {
            mimeType: options.referenceImage.type,
            data: base64Data,
          },
        });
      }

      contents.push({ text: options.prompt });

      const { value: response } = await withRetry(
        () => {
          if (cancelRef.current) throw new Error(CANCEL_ERROR_MESSAGE);
          return ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents,
            config: {
              imageConfig: {
                aspectRatio: options.aspectRatio,
              },
            },
          });
        },
        { maxRetries: 3, baseDelayMs: 1000, jitterMs: 500 },
      );

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (!part.inlineData?.data) {
          continue;
        }

        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';

        // Reutiliza conversão base64 -> Blob do audio.ts (bp #7)
        const blob = base64ToBlobSync(imageData, mimeType);
        const blobUrl = URL.createObjectURL(blob);

        setImageBlob(blob);
        setImageUrl(blobUrl);
        imageUrlRef.current = blobUrl;
        foundImage = true;
        break;
      }

      if (!foundImage) {
        throw new Error('Nenhuma imagem foi retornada pelo modelo.');
      }
    } catch (err: unknown) {
      // Cancelamento silencioso — sem erro para o usuário
      const errorMessageText = err instanceof Error ? err.message : '';
      if (errorMessageText === CANCEL_ERROR_MESSAGE) {
        setIsGenerating(false);
        return;
      }

      log.error('Erro ao gerar imagem', { error: err });
      const friendlyMessage = toUserFriendlyImageError(err);
      setError(friendlyMessage);
      // Auto-dismiss após 8 segundos (UX-3)
      setTimeout(() => setError(''), 8000);
    } finally {
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
  };
}
