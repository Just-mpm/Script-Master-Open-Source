import { asString } from './helpers.js';

interface MemoryEntry {
  content: string;
}

export interface AssistantUserSettingsDoc {
  customSystemPrompt?: string;
  name?: string;
  role?: string;
  goals?: string[];
}

interface AssistantSystemInstructionParams {
  memoriesText: string;
  userProfileBlock: string;
  voicesList: string;
  paceList: string;
  studioBlock: string;
  customPromptBlock: string;
}

interface InlineAssistantInstructionParams {
  memoriesText: string;
  userProfileBlock: string;
  voicesList: string;
  paceList: string;
  customPromptBlock: string;
  selectedText: string;
  instruction: string;
  fullScript: string;
}

interface ScenePromptsInstructionParams {
  durationLabel: string;
  imageCount: number;
  densitySeconds: number;
  frameworkInstructions: string;
  style: string;
  languageName: string;
  languageNameUpper: string;
  script: string;
}

interface TtsInstructionParams {
  continuityContext: string;
  multiSpeakerContext: string;
  audioProfile: string;
  scene: string;
  emotionInstruction: string;
  directionNotes: string;
  chunk: string;
  /** Audio tag de emoção para injetar no início do transcript (ex: "[excitedly]") */
  emotionAudioTag?: string;
  /** Audio tag de ritmo para injetar no transcript (ex: "[slowly]") */
  paceAudioTag?: string;
  /** Últimas 1-2 frases do chunk anterior, como âncora contextual (não falado) */
  sampleContext?: string;
  /** Nome do locutor/persona para ancorar a performance */
  speakerName?: string;
}

interface ImageInstructionParams {
  prompt: string;
  aspectRatio: string;
  hasReferenceImage: boolean;
}

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatEmotionIntensity(value: unknown): string {
  const intensity = asPositiveNumber(value);
  return intensity === null ? '(padrão)' : intensity.toFixed(2);
}

function buildCoreProductInstruction(): string {
  return `Você é o Assistente Criativo do Gemini Voice Studio, especialista em criação de roteiros, direção de áudio com Gemini TTS e produção visual para vídeos narrados.

OBJETIVO CENTRAL:
- Ajudar o usuário a transformar ideias e roteiros em resultados práticos dentro do produto.
- Priorizar clareza, contexto atual do projeto e sugestões que possam ser aplicadas de forma concreta.

PRINCÍPIOS DE RESPOSTA:
- Responda primeiro à intenção imediata do usuário.
- Use o contexto real já disponível antes de pedir briefing do zero.
- Prefira respostas úteis, naturais e objetivas.
- Só faça listas longas quando isso realmente ajudar o usuário.
- Quando sugerir mudanças aplicáveis no estúdio, explique primeiro em linguagem humana e depois inclua um bloco JSON apenas se houver algo concreto para aplicar.

CONTEXTO DO PRODUTO:
- O produto trabalha com roteiro, voz, ritmo, cena, imagens e vídeo.
- O TTS depende de quem fala, do ambiente, do ritmo e das notas de direção.
- O modo multi-speaker suporta dois locutores quando o roteiro estiver formatado como diálogo.
- O produto pode gerar cenas visuais com proporção, densidade e framework visual específicos.`;
}

export function buildMemoriesText(memories: ReadonlyArray<MemoryEntry>): string {
  if (memories.length === 0) {
    return '';
  }

  return `\nMEMÓRIAS DO USUÁRIO (Leve estas preferências em conta):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`;
}

export function buildCustomPromptBlock(userSettings: AssistantUserSettingsDoc | null): string {
  if (!userSettings?.customSystemPrompt) {
    return '';
  }

  return `\n\nDIRETRIZES CUSTOMIZADAS DO USUÁRIO:\n${userSettings.customSystemPrompt}`;
}

export function buildUserProfileBlock(userSettings: AssistantUserSettingsDoc | null): string {
  if (!userSettings) {
    return '';
  }

  const name = asString(userSettings.name);
  const role = asString(userSettings.role);
  const goals = Array.isArray(userSettings.goals)
    ? userSettings.goals.filter((goal): goal is string => typeof goal === 'string' && goal.trim().length > 0)
    : [];

  if (!name && !role && goals.length === 0) {
    return '';
  }

  const goalText = goals.length > 0 ? goals.join(', ') : '(não informado)';

  return `
PERFIL E PREFERÊNCIAS DO USUÁRIO:
- Nome: ${name || '(não informado)'}
- Perfil principal: ${role || '(não informado)'}
- Objetivos no app: ${goalText}

Use esse perfil para adaptar exemplos, sugestões e o nível de detalhamento das respostas.`;
}

export function buildStudioBlock(
  studioState: Record<string, unknown> | undefined,
): string {
  if (!studioState) {
    return '';
  }

  const script = asString(studioState.script) || '(vazio)';
  const selectedVoice = asString(studioState.selectedVoice) || '(padrão)';
  const isMultiSpeaker = Boolean(studioState.isMultiSpeaker);
  const speakerAName = asString(studioState.speakerAName) || 'Voz A';
  const speakerBName = asString(studioState.speakerBName) || 'Voz B';
  const speakerBVoice = asString(studioState.speakerBVoice) || '(padrão)';
  const audioProfile = asString(studioState.audioProfile) || '(vazio)';
  const scene = asString(studioState.scene) || '(vazio)';
  const pace = asString(studioState.pace) || '(padrão)';
  const styleNotes = asString(studioState.styleNotes) || '(vazio)';
  const emotion = asString(studioState.emotion) || '(padrão)';
  const emotionIntensity = formatEmotionIntensity(studioState.emotionIntensity);
  const generateScenes = studioState.generateScenes ? 'Ligado' : 'Desligado';
  const sceneRatio = asString(studioState.sceneRatio) || '16:9';
  const sceneDensity = asPositiveNumber(studioState.sceneDensity);
  const visualFramework = asString(studioState.visualFramework) || 'general';
  const imageTextLanguage = asString(studioState.imageTextLanguage) || 'pt-BR';
  const referenceImage = studioState.referenceImage
    ? '- O usuário conectou uma Imagem de Referência para manter os mesmos personagens.'
    : '- Nenhuma imagem de referência anexada.';
  const hasScript = script !== '(vazio)';
  const activeProjectGuidance = hasScript
    ? `
PROJETO ATIVO:
- Existe um roteiro preenchido no estúdio agora.
- Ao responder mensagens curtas como "oi", "olá" ou "tudo bem", cumprimente de volta de forma natural e mencione brevemente que você pode trabalhar em cima do roteiro atual.
- Não assuma que o usuário está começando do zero.
- Não peça tema, formato ou briefing inicial se o roteiro atual já estiver preenchido, a menos que o próprio usuário peça para recomeçar.`
    : `
PROJETO ATIVO:
- O estúdio está sem roteiro preenchido no momento.
- Se o usuário fizer uma saudação curta, responda de forma natural e só depois ofereça ajuda para começar um novo projeto.`;

  return `
ESTADO ATUAL DO ESTÚDIO DO USUÁRIO:
O usuário está visualizando a tela do estúdio neste exato momento e você sabe o que está preenchido nela:
- Roteiro atual: "${script}"
- Voz Selecionada: ${selectedVoice} (MultiSpeaker: ${isMultiSpeaker ? 'Ligado' : 'Desligado'})
- Locutores: ${speakerAName}${isMultiSpeaker ? ` + ${speakerBName} (voz B: ${speakerBVoice})` : ''}
- Personagem (Audio Profile): "${audioProfile}"
- Cena Atual: "${scene}"
- Ritmo: ${pace}
- Emoção: ${emotion} (intensidade: ${emotionIntensity})
- Notas de Sotaque/Direção: "${styleNotes}"
- Cenas Visuais: ${generateScenes} (Ratio: ${sceneRatio}, Densidade: ${sceneDensity ?? 15}, Framework: ${visualFramework}, Idioma do texto: ${imageTextLanguage})
${referenceImage}
${activeProjectGuidance}

Você pode sugerir configurações para o usuário baseadas no estado atual. Se você quiser que o usuário aplique uma nova configuração diretamente no estúdio, DEVE incluir um bloco JSON na sua resposta (com a tag \`\`\`json). O aplicativo irá ler esse JSON e criar um botão "Aplicar".

Exemplo Completo:
\`\`\`json
{
  "script": "Inscreva-se no canal! [laughs]",
  "isMultiSpeaker": false,
  "selectedVoice": "Zephyr",
  "audioProfile": "Narrador de mistério",
  "scene": "Ambiente tenso",
  "pace": "normal",
  "styleNotes": "Mistério, tom grave",
  "generateScenes": true,
  "sceneRatio": "16:9",
  "sceneDensity": 15,
  "visualFramework": "general"
}
\`\`\`
ATENÇÃO: Você não precisa preencher todos os campos, apenas os que desejar sugerir. Mantenha as respostas focadas no fluxo criativo!`;
}

export function buildAssistantSystemInstruction(params: AssistantSystemInstructionParams): string {
  const {
    memoriesText,
    userProfileBlock,
    voicesList,
    paceList,
    studioBlock,
    customPromptBlock,
  } = params;

  return `${buildCoreProductInstruction()}

REGRAS ESPECÍFICAS DO CHAT:
- Trate a última mensagem do usuário como a tarefa principal desta resposta.
- Se houver um roteiro preenchido no estúdio, trate-o como projeto ativo.
- Não diga que falta contexto quando o roteiro atual já trouxer material suficiente para responder.
- Se o usuário perguntar sobre "meu script", "roteiro do estúdio" ou equivalente, analise o texto real do estúdio de forma concreta.
- Quando você sugerir ajustes de estúdio:
  1. Explique primeiro o raciocínio em linguagem natural.
  2. Inclua um bloco \`\`\`json apenas se houver uma mudança concreta para aplicar.
  3. Não diga que vai sugerir uma configuração sem realmente detalhar a sugestão.

MEMÓRIA E CONTEXTO PERSISTENTE:
${memoriesText}

${userProfileBlock}

VOZES DISPONÍVEIS:
${voicesList}

Ritmos disponíveis (pace): ${paceList}
${studioBlock}${customPromptBlock}`;
}

export function buildInlineAssistantInstruction(params: InlineAssistantInstructionParams): string {
  const {
    memoriesText,
    userProfileBlock,
    voicesList,
    paceList,
    customPromptBlock,
    selectedText,
    instruction,
    fullScript,
  } = params;

  return `${buildCoreProductInstruction()}

MODO DE EDIÇÃO INLINE:
- Você está editando apenas um trecho do roteiro atual.
- Preserve coerência com o tom e a intenção do roteiro completo.
- Não devolva explicações, introduções, markdown envolvente ou texto fora do trecho final.
- A saída será usada como substituição direta do trecho selecionado.

MEMÓRIA E CONTEXTO PERSISTENTE:
${memoriesText}

${userProfileBlock}

VOZES DISPONÍVEIS:
${voicesList}

Ritmos disponíveis (pace): ${paceList}
${customPromptBlock}

ROTEIRO COMPLETO PARA CONTEXTO:
"""
${fullScript}
"""

INSTRUÇÃO DO USUÁRIO:
"${instruction}"

TRECHO SELECIONADO A SER REESCRITO:
"""
${selectedText}
"""

RETORNE APENAS O TRECHO FINAL REESCRITO.`;
}

export function buildScenePromptsInstruction(params: ScenePromptsInstructionParams): string {
  const {
    durationLabel,
    imageCount,
    densitySeconds,
    frameworkInstructions,
    style,
    languageName,
    languageNameUpper,
    script,
  } = params;

  return `Você é um diretor de arte responsável por criar a linha visual de um vídeo narrado.

OBJETIVO:
- Gerar exatamente ${imageCount} descrições de cenas para acompanhar um áudio com ${durationLabel} segundos.
- As cenas devem distribuir a narrativa aproximadamente a cada ${densitySeconds} segundos.
- O resultado deve ser consistente, específico e pronto para geração de imagem.

${frameworkInstructions}

DIREÇÃO DE ARTE BASE:
- Estilo fornecido pelo usuário: ${style}
- Se houver conflito entre o estilo livre e o framework visual, o framework tem prioridade.

FORMATO OBRIGATÓRIO DE SAÍDA:
- Retorne um array JSON.
- Cada item deve ter:
  - "timestamp": número em segundos, e o primeiro deve ser 0.
  - "prompt": prompt extremamente detalhado em inglês para gerador de imagens.

REGRA CRÍTICA DE IDIOMA VISUAL:
- Sempre que a imagem precisar de texto visível, o texto renderizado na imagem deve estar em ${languageName}.
- O prompt pode estar em inglês, mas o texto dentro da cena deve ser em ${languageName}.
- Quando citar esse texto no prompt, preserve o conteúdo na língua final. Exemplo: The words "TEXTO EM ${languageNameUpper}" written on the board.

ROTEIRO NARRADO:
${script}`;
}

export function buildChunkingInstruction(script: string, limit: number): string {
  return `Você é um especialista em divisão de roteiros para narração profissional (TTS).

OBJETIVO:
Dividir o roteiro abaixo em partes sequenciais que serão narradas por um locutor profissional.
Cada parte será transformada em um segmento de áudio contínuo.

REGRAS CRÍTICAS DE DIVISÃO:
1. NUNCA quebre no meio de uma frase. Toda parte deve terminar com pontuação final (. ! ? ; : — ...) ou fim de parágrafo.
2. Cada parte deve ter no máximo ${limit} caracteres.
3. Evite partes muito curtas (menos de 80 caracteres) — agrupe frases curtas vizinhas quando possível.
4. Priorize quebras em:
   - Fim de parágrafo (quebra mais natural)
   - Fim de frase com ponto final
   - Pausas fortes (ponto e vírgula, travessão, dois pontos)
   - Troca natural de ideia ou tópico
5. Preserve pares lógicos inseparáveis:
   - Pergunta e resposta imediata
   - Causa e efeito ("porque", "portanto", "assim")
   - Enumerações ("primeiro... segundo... terceiro...")
6. NÃO altere, reescreva, resuma, adicione ou remova palavras. O texto de cada parte deve ser uma cópia exata do original.

FORMATO DE SAÍDA OBRIGATÓRIO:
Retorne um array JSON onde cada item é um objeto com:
- "text": o texto exato do chunk (string)
- "emotionTag": audio tag em inglês que melhor descreve o tom predominante deste chunk (ex: "[excitedly]", "[seriously]", "[calmly]", "[warmly]"). Use string vazia se o tom for neutro.
- "isContinuation": true se este chunk é continuação direta da mesma ideia do chunk anterior (sem quebra de parágrafo ou troca de tópico), false caso contrário.
- "trailingSentence": a última frase completa do chunk (para usar como âncora contextual do próximo chunk).

Exemplo de saída:
[
  {
    "text": "Primeira parte do roteiro com tom introdutório.",
    "emotionTag": "[warmly]",
    "isContinuation": false,
    "trailingSentence": "Primeira parte do roteiro com tom introdutório."
  },
  {
    "text": "Continuação da mesma ideia, aprofundando o tema.",
    "emotionTag": "",
    "isContinuation": true,
    "trailingSentence": "Continuação da mesma ideia, aprofundando o tema."
  }
]

ROTEIRO:
${script}`;
}

/**
 * Monta o prompt TTS seguindo a estrutura recomendada pelo Gemini TTS:
 *
 * 1. Preâmbulo anti-read-aloud (instrução explícita para NÃO ler as instruções)
 * 2. Audio Profile — persona da voz com nome (ancora a performance)
 * 3. Scene — ambiente e vibe
 * 4. Director's Notes — orientações consolidadas (estilo, ritmo, emoção, sotaque)
 * 5. Continuity Context — para chunks subsequentes (mantém tom/energia)
 * 6. Sample Context — últimas frases do chunk anterior (âncora não falada)
 * 7. Transcript — texto a ser falado, com audio tags inline
 *
 * Referência: https://ai.google.dev/gemini-api/docs/speech-generation#prompting
 */
export function buildTtsInstruction(params: TtsInstructionParams): string {
  const {
    continuityContext,
    multiSpeakerContext,
    audioProfile,
    scene,
    emotionInstruction,
    directionNotes,
    chunk,
    emotionAudioTag,
    paceAudioTag,
    sampleContext,
    speakerName,
  } = params;

  // Monta o transcript com audio tags inline
  const taggedTranscript = buildTaggedTranscript(chunk, emotionAudioTag, paceAudioTag);

  // Audio Profile estruturado — nome + descrição ancora a performance
  const audioProfileSection = buildAudioProfileSection(audioProfile, speakerName);

  // Director's Notes consolidado — unifica estilo, ritmo, emoção, notas livres
  const directorNotesSection = buildDirectorNotesSection(directionNotes, emotionInstruction);

  return [
    // Preâmbulo anti-read-aloud (Fase 4.2)
    'INSTRUÇÃO DE SÍNTESE DE FALA: Gere apenas a fala da transcrição abaixo. NUNCA leia estas instruções, notas de direção, nomes de seção ou rótulos em voz alta. Sua saída deve conter APENAS as palavras da transcrição, interpretadas conforme a direção.',

    // Audio Profile (Fase 5.2)
    audioProfileSection,

    // Scene
    scene ? `CENA:\n${scene}` : '',

    // Director's Notes consolidado (Fase 5.3)
    directorNotesSection,

    // Multi-speaker
    multiSpeakerContext,

    // Continuidade entre chunks (Fase 2.1)
    continuityContext,

    // Sample Context — âncora não falada (Fase 2.3)
    sampleContext ? `CONTEXTO ANTERIOR (não fale isto, use apenas como referência de tom):\n"${sampleContext}"` : '',

    // Transcript com audio tags (Fase 3.2 + 3.3)
    `TRANSCRIÇÃO:\n${taggedTranscript}`,
  ].filter(Boolean).join('\n\n');
}

/**
 * Constrói a seção Audio Profile estruturada.
 * Se houver speakerName, ancora a performance com o nome do personagem.
 */
function buildAudioProfileSection(audioProfile: string, speakerName?: string): string {
  if (!audioProfile && !speakerName) return '';

  const parts: string[] = [];
  if (speakerName) {
    parts.push(`Nome: ${speakerName}`);
  }
  if (audioProfile) {
    parts.push(audioProfile);
  }

  return `PERFIL DE ÁUDIO:\n${parts.join('\n')}`;
}

/**
 * Constrói a seção Director's Notes consolidada.
 * Unifica styleNotes, emotion e pace em uma única seção coesa.
 */
function buildDirectorNotesSection(directionNotes: string, emotionInstruction: string): string {
  const notes: string[] = [];

  if (directionNotes) {
    notes.push(directionNotes);
  }
  if (emotionInstruction) {
    notes.push(emotionInstruction);
  }

  if (notes.length === 0) return '';

  return `NOTAS DO DIRETOR:\n${notes.join('\n')}`;
}

/**
 * Injeta audio tags inline no transcript.
 *
 * - emotionAudioTag: inserida no início do transcript para definir o tom emocional
 * - paceAudioTag: inserida no início (após emotionTag) para reforçar o ritmo
 *
 * As tags são em inglês mesmo para texto em outro idioma (recomendação oficial).
 */
function buildTaggedTranscript(chunk: string, emotionAudioTag?: string, paceAudioTag?: string): string {
  const tags: string[] = [];
  if (emotionAudioTag) tags.push(emotionAudioTag);
  if (paceAudioTag) tags.push(paceAudioTag);

  if (tags.length === 0) return chunk;

  // Insere as tags no início do transcript, separadas por espaço
  return `${tags.join(' ')} ${chunk}`;
}

export function buildImageInstruction(params: ImageInstructionParams): string {
  const { prompt, aspectRatio, hasReferenceImage } = params;

  return `Crie uma imagem única de alta qualidade com proporção ${aspectRatio}.

OBJETIVO:
- Entregar uma imagem visualmente forte, coerente e pronta para uso no estúdio.
- Respeitar exatamente a direção criativa fornecida pelo usuário.

REGRAS:
- Preserve fidelidade ao pedido principal.
- Priorize clareza visual, composição forte e leitura fácil dos elementos principais.
- Se houver imagem de referência anexada, use-a para manter consistência de identidade visual, personagens, estilo ou composição sem copiar artefatos desnecessários.
- Não explique nada. Gere apenas a imagem final.

REFERÊNCIA ANEXADA: ${hasReferenceImage ? 'sim' : 'não'}

PROMPT CRIATIVO DO USUÁRIO:
${prompt}`;
}
