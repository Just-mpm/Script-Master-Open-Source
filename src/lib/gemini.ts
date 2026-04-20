import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './env';
import type {
  EditingPlan,
  EditingScene,
  TransitionType,
  CameraMovement,
  VisualEffect,
} from '../features/video-render/lib/editingPlan';

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

// ---------------------------------------------------------------------------
// Geração de plano de edição (transições, legendas, câmera, efeitos)
// ---------------------------------------------------------------------------

const TRANSITION_TYPES: TransitionType[] = [
  'fade', 'slide-left', 'slide-right', 'slide-up', 'zoom', 'cut', 'dissolve', 'wipe',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out', 'ken-burns',
];

const VISUAL_EFFECTS: VisualEffect[] = [
  'none', 'grayscale', 'sepia', 'blur', 'vignette', 'brightness-up', 'contrast-up', 'saturate',
];

/**
 * Gera um plano de edição automático para as cenas do vídeo.
 * Retorna um EditingScene por cena com transição, legenda, câmera e efeitos.
 * Faz fallback para plano padrão (fade em tudo) em caso de erro.
 */
export async function generateEditingPlan(
  script: string,
  scenes: { timestamp: number; prompt: string }[],
  durationInSeconds: number,
): Promise<EditingPlan> {
  // Plano padrão caso a IA falhe — fade em todas as cenas
  const fallbackPlan: EditingPlan = scenes.map(scene => ({
    timestamp: scene.timestamp,
    prompt: scene.prompt,
    transition: 'fade' as TransitionType,
    transitionDuration: 500,
    camera: 'static' as CameraMovement,
  }));

  if (scenes.length === 0) return fallbackPlan;

  const scenesJson = scenes.map(s => JSON.stringify(s)).join('\n');

  const systemPrompt = `Você é um editor de vídeo profissional especializado em vídeos do YouTube.
O vídeo tem ${durationInSeconds.toFixed(1)} segundos e ${scenes.length} cenas.

Analise o roteiro e as cenas fornecidas e crie um plano de edição para cada cena.

Regras:
1. Mantenha os timestamps EXATAMENTE iguais aos das cenas fornecidas.
2. Mantenha os prompts EXATAMENTE iguais aos das cenas fornecidas.
3. A primeira cena DEVE usar transição "cut" (entrada direta sem efeito).
4. Escolha transições variadas — evite usar a mesma em cenas consecutivas.
5. Gere legendas curtas (até 8 palavras) que resumam o momento da cena. Se a cena não precisa de legenda, omita o campo.
6. Escolha movimentos de câmera que combinem com o conteúdo narrativo.
7. Use efeitos visuais com moderação — a maioria das cenas deve usar ["none"] ou omitir o campo.
8. Durações de transição: use os defaults (cut=0, fade=500, slide=400, zoom=600, dissolve=800, wipe=500).

Roteiro:
${script}

Cenas fornecidas (JSON):
${scenesJson}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timestamp: {
                type: Type.NUMBER,
                description: 'Timestamp da cena em segundos (deve ser idêntico ao fornecido)',
              },
              prompt: {
                type: Type.STRING,
                description: 'Prompt descritivo da cena (deve ser idêntico ao fornecido)',
              },
              transition: {
                type: Type.STRING,
                description: 'Tipo de transição para entrar nesta cena',
                enum: TRANSITION_TYPES,
              },
              transitionDuration: {
                type: Type.NUMBER,
                description: 'Duração da transição em milissegundos (default: 500)',
              },
              subtitle: {
                type: Type.STRING,
                description: 'Legenda curta (até 8 palavras). Omita se não for necessário.',
              },
              effects: {
                type: Type.ARRAY,
                description: 'Efeitos visuais aplicados. Use ["none"] ou omita se não houver efeito.',
                items: {
                  type: Type.STRING,
                  enum: VISUAL_EFFECTS,
                },
              },
              camera: {
                type: Type.STRING,
                description: 'Movimento de câmera durante a cena',
                enum: CAMERA_MOVEMENTS,
              },
            },
            required: ['timestamp', 'prompt', 'transition', 'camera'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('Resposta vazia ao gerar plano de edição.');

    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as EditingScene[];

    // Validação básica: garante que o plano tem o mesmo número de cenas
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('Plano de edição vazio ou inválido, usando fallback.');
      return fallbackPlan;
    }

    // Normaliza valores inválidos e preenche defaults
    const normalized: EditingPlan = parsed.map((scene, index) => ({
      timestamp: scene.timestamp ?? scenes[index]?.timestamp ?? 0,
      prompt: scene.prompt ?? scenes[index]?.prompt ?? '',
      transition: TRANSITION_TYPES.includes(scene.transition as TransitionType)
        ? (scene.transition as TransitionType)
        : 'fade',
      transitionDuration: scene.transitionDuration ?? 500,
      subtitle: scene.subtitle?.trim() || undefined,
      effects: Array.isArray(scene.effects) ? scene.effects : undefined,
      camera: CAMERA_MOVEMENTS.includes(scene.camera as CameraMovement)
        ? (scene.camera as CameraMovement)
        : 'static',
      durationOverride: scene.durationOverride,
    }));

    return normalized;
}
