import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from '../lib/env';

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio: string;
  referenceImage?: File;
}

export function useImageGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (options: ImageGenerationOptions) => {
    setIsGenerating(true);
    setError(null);
    setImageUrl(null);
    setImageBlob(null);

    try {
      const apiKey = getGeminiApiKey();
      const ai = new GoogleGenAI({ apiKey });
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
        contents: contents,
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

        const byteCharacters = atob(imageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        setImageBlob(blob);
        setImageUrl(URL.createObjectURL(blob));
        foundImage = true;
        break;
      }

      if (!foundImage) {
        throw new Error('Nenhuma imagem foi retornada pelo modelo.');
      }
    } catch (err: unknown) {
      console.error('Error generating image:', err);
      setError(err instanceof Error && err.message ? err.message : 'Ocorreu um erro ao gerar a imagem.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImage = () => {
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
