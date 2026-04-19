import { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../lib/env';
import { base64ToBlobSync } from '../lib/audio';

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/**
 * Mapeia erros técnicos do Gemini para mensagens amigáveis em pt-BR (UX-3).
 */
function toUserFriendlyImageError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Ocorreu um erro ao gerar a imagem. Tente novamente.';
  }

  const msg = err.message.toLowerCase();

  if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('429')) {
    return 'Limite de uso atingido. Aguarde alguns minutos e tente novamente.';
  }
  if (msg.includes('api key') || msg.includes('permission_denied')) {
    return 'Erro de autenticação. Verifique sua chave de API nas configurações.';
  }
  if (msg.includes('deadline') || msg.includes('504') || msg.includes('timeout')) {
    return 'O servidor demorou demais para responder. Tente novamente.';
  }
  if (msg.includes('unavailable') || msg.includes('503')) {
    return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
  }
  if (msg.includes('safety') || msg.includes('blocked')) {
    return 'Conteúdo bloqueado por filtros de segurança. Altere o prompt e tente novamente.';
  }

  return 'Não foi possível gerar a imagem. Verifique o prompt e tente novamente.';
}

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

export function useImageGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoiza instância do GoogleGenAI (tech #9 + bp #8 + perf #9)
  const ai = useMemo(() => new GoogleGenAI({ apiKey: getGeminiApiKey() }), []);

  // Referência para revogar blob URL anterior (tech #6)
  const imageUrlRef = useRef<string | null>(null);

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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents,
        config: {
          imageConfig: {
            aspectRatio: options.aspectRatio,
          },
        },
      });

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
      console.error('Error generating image:', err);
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

  return {
    isGenerating,
    imageUrl,
    imageBlob,
    error,
    setError,
    generateImage,
    clearImage,
  };
}
