import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiApiKey } from './env';
import type {
  EditingPlan,
  EditingScene,
  TransitionType,
  CameraMovement,
} from '../features/video-render/lib/editingPlan';
import {
  TRANSITION_TYPE_LIST,
  CAMERA_MOVEMENT_LIST,
  VISUAL_EFFECT_LIST,
} from '../features/video-render/lib/editingPlan';
import type { AudioAnalysisResult } from '../features/video-render/lib/audioAnalysis';

const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

export interface ScenePrompt {
  timestamp: number; // in seconds
  prompt: string;
}

interface ReferenceImagePayload {
  mimeType: string;
  data: string;
}

/** Imagem de cena carregada como base64 para envio ao Gemini */
export interface SceneImagePayload {
  /** Timestamp da cena a que esta imagem pertence */
  timestamp: number;
  /** MIME type da imagem (ex: image/png) */
  mimeType: string;
  /** Dados base64 da imagem (sem o prefixo data:) */
  base64: string;
}

/** Número máximo de imagens enviadas ao Gemini para análise visual.
 *  Limite conservador para não estourar o contexto do flash-lite (~1M tokens).
 *  Cada imagem base64 consome ~50-150K tokens, então 3 imagens = ~150-450K tokens. */
const MAX_IMAGES_FOR_ANALYSIS = 3;

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

/**
 * Extrai dados de imagem de um URL (data:, blob: ou HTTP) como base64.
 * Falha silenciosamente retornando null — nunca quebra o fluxo principal.
 */
async function fetchImageAsBase64(imageUrl: string): Promise<SceneImagePayload | null> {
  try {
    // Data URL: extrai mime e base64 diretamente
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { timestamp: 0, mimeType: match[1], base64: match[2] };
      }
      return null;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    // Usa Content-Type do response ou infere a partir do URL
    const contentType = response.headers.get('Content-Type') ?? '';
    const mimeType = contentType.startsWith('image/')
      ? contentType.split(';')[0].trim()
      : inferMimeTypeFromUrl(imageUrl);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Converte ArrayBuffer para binary string e depois para base64 via btoa().
    // O loop é necessário porque btoa() não aceita Uint8Array diretamente.
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return { timestamp: 0, mimeType, base64 };
  } catch {
    // Falha silenciosa — a imagem será ignorada
    console.warn('[gemini] Falha ao carregar imagem para análise visual:', imageUrl.substring(0, 60));
    return null;
  }
}

/** Infere MIME type a partir da extensão do URL */
function inferMimeTypeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    avif: 'image/avif',
  };
  return mimeMap[ext ?? ''] ?? 'image/jpeg';
}

/**
 * Carrega e seleciona as imagens das cenas para análise visual.
 * Seleciona amostra representativa quando há mais cenas que o limite.
 * Aceita imageUrl opcional — filtra automaticamente os que não têm imagem.
 * Silenciosamente ignora imagens que falharem ao carregar.
 */
export async function loadSceneImagesForAnalysis(
  scenes: ReadonlyArray<{ timestamp: number; imageUrl?: string }>,
): Promise<SceneImagePayload[]> {
  // Filtra cenas com URL de imagem válida (undefined → excluído)
  const scenesWithImages = scenes.filter(
    (s): s is { timestamp: number; imageUrl: string } => !!s.imageUrl?.trim(),
  );

  if (scenesWithImages.length === 0) return [];

  // Seleciona amostra representativa: primeira, última e intermediárias espaçadas
  const selectedScenes = selectRepresentativeScenes(scenesWithImages, MAX_IMAGES_FOR_ANALYSIS);

  // Carrega todas em paralelo — falhas individuais são silenciosas
  const results = await Promise.all(
    selectedScenes.map(async (scene) => {
      const payload = await fetchImageAsBase64(scene.imageUrl);
      if (!payload) return null;
      // Associa o timestamp correto da cena
      return { ...payload, timestamp: scene.timestamp } satisfies SceneImagePayload;
    }),
  );

  // Remove nulls (falhas)
  return results.filter((img): img is SceneImagePayload => img !== null);
}

/**
 * Seleciona até `maxCount` cenas de forma representativa:
 * sempre inclui a primeira e a última, e distribui intermediárias uniformemente.
 */
function selectRepresentativeScenes<T>(
  scenes: ReadonlyArray<T>,
  maxCount: number,
): ReadonlyArray<T> {
  if (scenes.length <= maxCount) return scenes;

  const result: T[] = [];

  // Primeira cena sempre incluída
  result.push(scenes[0]);

  // Distribui cenas intermediárias uniformemente
  const remaining = maxCount - 2; // reserva slots para primeira e última
  if (remaining > 0 && scenes.length > 2) {
    const step = (scenes.length - 2) / (remaining + 1);
    for (let i = 1; i <= remaining; i++) {
      const idx = Math.min(Math.round(i * step), scenes.length - 2);
      result.push(scenes[idx]);
    }
  }

  // Última cena sempre incluída
  if (result[result.length - 1] !== scenes[scenes.length - 1]) {
    result.push(scenes[scenes.length - 1]);
  }

  return result.slice(0, maxCount);
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

/**
 * Gera um plano de edição automático para as cenas do vídeo.
 * Quando imagens reais estão disponíveis, o Gemini analisa a composição visual
 * (framing, foco, elementos, mood) para sugerir transições, câmera e efeitos alinhados.
 * Faz fallback para plano padrão (fade em tudo) em caso de erro.
 */
export async function generateEditingPlan(
  script: string,
  scenes: { timestamp: number; prompt: string }[],
  durationInSeconds: number,
  audioAnalysis?: AudioAnalysisResult | null,
  sceneImages?: SceneImagePayload[],
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

  // Trunca o script se for muito longo (evita estourar o limite de tokens do modelo)
  const MAX_SCRIPT_CHARS = 15_000;
  const truncatedScript = script.length > MAX_SCRIPT_CHARS
    ? `${script.slice(0, MAX_SCRIPT_CHARS)}\n\n[ROTEIRO TRUNCADO — ${script.length} caracteres no total]`
    : script;

  const scenesJson = scenes.map(s => JSON.stringify(s)).join('\n');

  // Seção de análise de áudio — inserida antes do roteiro quando disponível
  const audioSection = audioAnalysis?.toPromptText
    ? `\n${audioAnalysis.toPromptText}\n\n`
    : '';

  // Seção de instrução visual — adicionada quando há imagens reais
  const visualSection = sceneImages && sceneImages.length > 0
    ? buildVisualInstructions(sceneImages)
    : '';

  const systemPrompt = `Você é um editor de vídeo profissional especializado em conteúdo para YouTube Shorts, Reels e TikTok.
O vídeo tem ${durationInSeconds.toFixed(1)} segundos e ${scenes.length} cenas.

Analise o roteiro e crie um plano de edição dinâmico para cada cena.
${visualSection}
Regras obrigatórias:
1. Mantenha os timestamps EXATAMENTE iguais aos fornecidos.
2. Mantenha os prompts EXATAMENTE iguais aos fornecidos.
3. A primeira cena DEVE usar transição "cut".
4. Varie as transições — evite repetir a mesma em cenas consecutivas.
5. Durações de transição: use os defaults (cut=0, fade=500, slide=400, zoom=600, dissolve=800, wipe=500).
6. Gere legendas curtas (até 8 palavras) que resumam o momento da cena. Se a cena não precisa de legenda, omita o campo.
7. Use efeitos visuais com moderação — a maioria das cenas deve usar ["none"] ou omitir o campo.

Diretrizes criativas:
- Use movimentos de câmera para criar dinamismo (zoom-in em momentos de tensão, pan em cenas panorâmicas, ken-burns em revelações).
- Legendas devem ser impactantes: use frases curtas que capturam a atenção (até 8 palavras).
- Combine efeitos visuais com o tom narrativo: sépia/gradiente para nostalgia, contraste para momentos dramáticos.
- Transições mais longas (dissolve) para cenas emocionais, rápidas (cut, wipe) para ação.
- Cada cena deve ter personalidade própria — evite que todas pareçam iguais.

Exemplos de boas combinações:
- Cena panorâmica → pan-right + fade + legenda descritiva
- Momento de impacto → zoom-in + cut + contraste
- Transição emocional → ken-burns + dissolve + legenda reflexiva

${audioSection}Roteiro:
${truncatedScript}

Cenas fornecidas (JSON):
${scenesJson}`;

  // Monta as parts do conteúdo — inclui imagens como inlineData quando disponíveis
  const contentParts: Array<
    { inlineData: { mimeType: string; data: string } } | { text: string }
  > = [];

  // Imagens antes do texto (melhor prática do Gemini para multimodal)
  // Limita a MAX_IMAGES_FOR_ANALYSIS por segurança — base64 consome muitos tokens
  const imagesToSend = sceneImages?.slice(0, MAX_IMAGES_FOR_ANALYSIS) ?? [];
  if (imagesToSend.length > 0) {
    for (const img of imagesToSend) {
      contentParts.push({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      });
    }
  }

  // Texto do prompt por último
  contentParts.push({ text: systemPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: contentParts }],
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
                enum: TRANSITION_TYPE_LIST,
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
                  enum: VISUAL_EFFECT_LIST,
                },
              },
              camera: {
                type: Type.STRING,
                description: 'Movimento de câmera durante a cena',
                enum: CAMERA_MOVEMENT_LIST,
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
      transition: TRANSITION_TYPE_LIST.includes(scene.transition as TransitionType)
        ? (scene.transition as TransitionType)
        : 'fade',
      transitionDuration: scene.transitionDuration ?? 500,
      subtitle: scene.subtitle?.trim() || undefined,
      effects: Array.isArray(scene.effects) ? scene.effects : undefined,
      camera: CAMERA_MOVEMENT_LIST.includes(scene.camera as CameraMovement)
        ? (scene.camera as CameraMovement)
        : 'static',
      durationOverride: scene.durationOverride,
    }));

    return normalized;
}

/**
 * Monta instruções de análise visual para o prompt, referenciando os timestamps das imagens.
 */
function buildVisualInstructions(images: ReadonlyArray<SceneImagePayload>): string {
  const timestamps = images.map(img => `${img.timestamp}s`).join(', ');
  return `
[ANÁLISE VISUAL DISPONÍVEL]
As imagens reais das cenas nos timestamps [${timestamps}] foram fornecidas junto com este prompt.
Analise a composição visual de cada imagem para refinar suas decisões de edição:

Regras de análise visual:
1. Composição e framing — se a imagem tem elemento central dominante, use ken-burns ou zoom-in; se tem elementos distribuídos horizontalmente, use pan-left/pan-right.
2. Mood visual — se a imagem é monocromática/tons frios, considere grayscale ou contrast-up; se tem tom quente/vintage, considere sepia ou saturate.
3. Distribuição espacial — se elementos principais estão à direita, use slide-left para a próxima cena; se à esquerda, use slide-right.
4. Profundidade e foco — se há camadas de profundidade, use zoom-out para revelar; se há foco em detalhe, use zoom-in para imergir.
5. Iluminação e contraste — cenas de alta luz/contraste combinam com cut; cenas suaves combinam com fade/dissolve.

Importante: as imagens não estão em ordem — use o timestamp de cada cena para correlacionar.
Cenas sem imagem devem seguir as diretrizes gerais do roteiro.

`;
}
