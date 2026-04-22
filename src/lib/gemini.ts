import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './env';

const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

export interface ScenePrompt {
  timestamp: number; // in seconds
  prompt: string;
}

interface ReferenceImagePayload {
  mimeType: string;
  data: string;
}

function parseReferenceImage(referenceImage: string): ReferenceImagePayload {
  const dataUriMatch = referenceImage.match(/^data:([^;]+);base64,(.+)$/);

  if (dataUriMatch) {
    return {
      mimeType: dataUriMatch[1],
      data: dataUriMatch[2],
    };
  }

  return {
    mimeType: 'image/jpeg',
    data: referenceImage,
  };
}

export async function generateScenePrompts(script: string, durationInSeconds: number, style: string, densitySeconds: number = 15, visualFramework: string = 'general'): Promise<ScenePrompt[]> {
  const imageCount = Math.max(1, Math.ceil(durationInSeconds / densitySeconds));
  
  const frameworkInstructions = visualFramework === 'whiteboard'
    ? `
[CRÍTICO: MODO WHITEBOARD MASTER]
A identidade visual DEVE imitar vídeos de "whiteboard animation" coloridos (ex: Ilustrações explicativas em quadro branco).
Regras estritas deste modo:
1. O fundo DEVE ser explicitamente descrito como um quadro branco e limpo ("white board", "blank white background").
2. Elementos visuais devem ser PRIMARIAMENTE ilustrações coloridas (use termos como "colored marker illustration", "colorful doodle", "expressive sketch").
3. [IMPORTANTE] Como é uma aula/explicação, insira textos integrados na imagem resumindo o tópico. No prompt, use instruções para renderizar texto (ex: \`text "TÓPICO" written on the board\`) com 1 a 4 palavras chaves capturadas daquela parte do roteiro.
4. NÃO use fotografias ou 3D. Apenas ilustrações artísticas vibrantes e explicativas desenhadas sobre o fundo branco.`
    : `
[MODO CENÁRIO PADRÃO]
As imagens devem ser ricas e focar em fotografia, cinemática, ou seguir estritamente a direção de arte e estilo configurados no Inspector.`;

  const systemPrompt = `Você é um diretor de arte visionário responsável por criar a identidade visual de um vídeo para o YouTube.
O áudio deste vídeo tem ${durationInSeconds.toFixed(1)} segundos de duração.
Eu preciso de exatamente ${imageCount} descrições de cenas (prompts) para gerar as imagens de fundo que acompanharão este áudio a cada ~${densitySeconds} segundos.

${frameworkInstructions}

A direção de base e estilo customizado fornecido pelo usuário é: ${style || 'Nenhum específico'}. Combine o framework com essa direção, mas em caso de conflito, o framework tem prioridade.

Retorne um array JSON onde cada objeto tem:
- "timestamp": o tempo exato em segundos (a primeira DEVE ser 0).
- "prompt": um prompt EXTREMAMENTE detalhado em INGLÊS para um gerador de imagens avançado.
  - Para gerar textos corretamente em inglês no prompt, especifique algo como: \`The word "TEXT" written in bold letters\`. Mas use as palavras relativas ao contexto narrado traduzidas ou no idioma correspondente.

Roteiro Narrado:
${script}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.NUMBER },
              prompt: { type: Type.STRING }
            },
            required: ["timestamp", "prompt"]
          }
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("Resposta vazia ao gerar prompts de cena.");
    
    text = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(text) as ScenePrompt[];
    
    return parsed;
  } catch (error) {
    console.error("Erro ao gerar prompts de cena:", error);
    // Fallback
    return [{ timestamp: 0, prompt: `A captivating scene about: ${script.substring(0, 100)}... Style: ${style}` }];
  }
}

export async function generateImageFromPrompt(prompt: string, aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '16:9', referenceImage?: string): Promise<string | null> {
  let retries = 0;
  const MAX_IMAGE_RETRIES = 2;

  while (retries <= MAX_IMAGE_RETRIES) {
    try {
      const contentsParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
      
      if (referenceImage) {
        const referenceImagePayload = parseReferenceImage(referenceImage);
        contentsParts.push({
          inlineData: {
            mimeType: referenceImagePayload.mimeType,
            data: referenceImagePayload.data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [{ role: 'user', parts: contentsParts }],
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (!part.inlineData?.data) {
          continue;
        }

        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${imageData}`;
      }
      return null;
    } catch (error: unknown) {
      const errorObject = error as { message?: string; status?: string; code?: number };
      const isQuotaError = errorObject.message?.includes('quota') || 
                          errorObject.message?.includes('429') || 
                          errorObject.status === 'RESOURCE_EXHAUSTED';
      
      if ((isQuotaError || errorObject.message?.includes('Deadline') || errorObject.status === 'UNAVAILABLE' || errorObject.code === 503) && retries < MAX_IMAGE_RETRIES) {
        retries++;
        console.warn(`Erro temporário (${errorObject.status || errorObject.code}) na imagem, tentando em ${retries * 3}s...`);
        await new Promise(r => setTimeout(r, retries * 3000));
        continue;
      }
      
      console.error("Erro ao gerar imagem:", error);
      return null;
    }
  }
  return null;
}
