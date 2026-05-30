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
  /** Quando true, usa resumos em vez de contexto completo (tool-first) */
  toolFirst?: boolean;
  /** Contagem de memórias para o resumo tool-first */
  memoryCount?: number;
  /** Estado do estúdio para o resumo tool-first */
  studioState?: Record<string, unknown>;
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
  /** Timestamps pré-calculados pelo código (em segundos) */
  timestamps: readonly number[];
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
  /** Audio tag de ritmo para injetar no transcript (ex: "[very slow]") */
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
- Quando sugerir mudanças aplicáveis no estúdio, explique primeiro em linguagem humana e use a ferramenta updateStudio se houver algo concreto para aplicar.

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

/**
 * Gera um resumo curto das memórias para injetar no system prompt.
 * Em vez de injetar todo o conteúdo, indica a quantidade e instrui
 * o modelo a usar getUserMemories quando precisar de detalhes.
 */
export function buildMemoriesSummary(memoryCount: number): string {
  if (memoryCount === 0) {
    return '\nMEMÓRIAS: O usuário ainda não salvou memórias. Use getUserMemories se precisar verificar.';
  }

  return `\nMEMÓRIAS: O usuário tem ${memoryCount} memória(s) salva(s). Use a ferramenta getUserMemories para acessá-las quando relevante para a tarefa (preferências de voz, ritmo, estilo, etc).`;
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

Você pode sugerir configurações para o usuário baseadas no estado atual. Se você quiser que o usuário aplique uma nova configuração diretamente no estúdio, use a ferramenta updateStudio para enviar uma prévia confirmável.
Use updateStudio apenas com os campos que deseja sugerir. O usuário sempre verá uma prévia antes de aplicar. Mantenha as respostas focadas no fluxo criativo!`;
}

/**
 * Gera um resumo curto do estado do estúdio para injetar no system prompt.
 * Em vez de injetar todos os campos, indica que o estado existe e instrui
 * o modelo a usar getStudioState quando precisar de detalhes específicos.
 */
export function buildStudioSummary(
  studioState: Record<string, unknown> | undefined,
): string {
  if (!studioState) {
    return '\nESTÚDIO: Nenhum estado do estúdio foi enviado. O usuário pode estar fora do estúdio.';
  }

  const script = asString(studioState.script);
  const hasScript = script && script !== '(vazio)' && script.length > 0;
  const voice = asString(studioState.selectedVoice) || 'padrão';
  const scenesOn = Boolean(studioState.generateScenes);

  const parts: string[] = [];
  parts.push(`Voz: ${voice}`);
  if (hasScript) parts.push(`Roteiro: ${script.length} caracteres`);
  parts.push(`Cenas visuais: ${scenesOn ? 'ligado' : 'desligado'}`);

  return `
ESTÚDIO: O usuário tem um estúdio ativo com ${parts.join(', ')}. Use a ferramenta getStudioState para verificar campos específicos (voz, ritmo, emoção, cenas, etc) quando precisar responder sobre configurações ou sugerir ajustes.
Se o usuário fizer uma saudação curta e houver roteiro, cumprimente de volta e mencione que pode trabalhar em cima do roteiro atual.`;
}

export function buildAssistantSystemInstruction(params: AssistantSystemInstructionParams): string {
  const {
    memoriesText,
    userProfileBlock,
    voicesList,
    paceList,
    studioBlock,
    customPromptBlock,
    toolFirst,
    memoryCount,
    studioState,
  } = params;

  // Tool-first: usa resumos em vez de contexto completo
  // Evita montar o bloco completo quando o modelo vai consultar via tools
  const memoriesSection = toolFirst
    ? buildMemoriesSummary(memoryCount ?? 0)
    : `\nMEMÓRIA E CONTEXTO PERSISTENTE:\n${memoriesText}`;

  const studioSection = toolFirst
    ? buildStudioSummary(studioState)
    : studioBlock ?? buildStudioBlock(studioState);

  return `${buildCoreProductInstruction()}

REGRAS ESPECÍFICAS DO CHAT:
- Trate a última mensagem do usuário como a tarefa principal desta resposta.
- Se houver um roteiro preenchido no estúdio, trate-o como projeto ativo.
- Não diga que falta contexto quando o roteiro atual já trouxer material suficiente para responder.
- Se o usuário perguntar sobre "meu script", "roteiro do estúdio" ou equivalente, analise o texto real do estúdio de forma concreta.
- Quando você sugerir ajustes de estúdio:
  1. Explique primeiro o raciocínio em linguagem natural.
  2. Use updateStudio apenas se houver uma mudança concreta para aplicar.
  3. Não diga que vai sugerir uma configuração sem realmente detalhar a sugestão.
- Antes de responder, use as ferramentas necessárias para coletar informações.
- Se faltar uma decisão essencial do usuário, use interview com uma pergunta curta e opções claras quando fizer sentido.
- Você pode pensar em voz alta de forma breve enquanto trabalha.

REGRAS DO updatePlan (OBRIGATÓRIAS):
- Crie um plano com updatePlan no início de tarefas com mais de um passo.
- NUNCA recria o plano do zero — sempre envie o array completo com os status atualizados.
- Mantenha EXATAMENTE uma tarefa como 'in_progress' por vez enquanto houver trabalho pendente.
- Atualize o status em tempo real (não em lote ao final).
- Só marque uma tarefa como 'completed' após o trabalho estar efetivamente concluído e verificado — nunca baseado em intenção.
- Se uma tarefa estiver bloqueada ou parcialmente pronta, mantenha como 'in_progress' e adicione uma nova tarefa descrevendo o bloqueio.
- Itens devem ser específicos e acionáveis; quebre tarefas difíceis em subtarefas pequenas.
- Preserve títulos e IDs existentes ao atualizar — não renomeie tarefas sem necessidade.
- Quando o usuário disser "continue" ou "retome", localize a próxima tarefa incompleta no plano existente e continue de lá.

FERRAMENTAS DISPONÍVEIS:
- updatePlan: gerencia a lista de tarefas visível ao usuário.
- webSearch: busca informações atuais na web.
- getStudioState: consulta configurações atuais do estúdio.
- getUserMemories: acessa preferências e memórias salvas.
- updateStudio: propõe ajustes no estúdio (prévia → confirmação).
- interview: pergunta ao usuário quando faltar decisão essencial.
- respond: registra resposta com ações/mídia para o frontend.
${memoriesSection}

${userProfileBlock}

VOZES DISPONÍVEIS:
${voicesList}

Ritmos disponíveis (pace): ${paceList}
${studioSection}${customPromptBlock}`;
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
    frameworkInstructions,
    style,
    languageName,
    languageNameUpper,
    script,
    timestamps,
  } = params;

  const timestampList = timestamps.map((t, i) => `  Cena ${i + 1}: ${t}s`).join('\n');

  return `Você é um diretor de arte responsável por criar a linha visual de um vídeo narrado.

OBJETIVO:
- Descreva exatamente ${imageCount} cenas para acompanhar um áudio de ${durationLabel} segundos.
- Os momentos de cada cena já estão definidos — sua tarefa é criar a descrição visual de cada uma.
- O resultado deve ser consistente, específico e pronto para geração de imagem.

MOMENTOS PRÉ-DEFINIDOS (NÃO ALTERE):
${timestampList}

${frameworkInstructions}

DIREÇÃO DE ARTE BASE:
- Estilo fornecido pelo usuário: ${style}
- Se houver conflito entre o estilo livre e o framework visual, o framework tem prioridade.

FORMATO OBRIGATÓRIO DE SAÍDA:
- Retorne um array JSON com exatamente ${imageCount} objetos.
- Cada item deve ter apenas:
  - "prompt": prompt extremamente detalhado em inglês para gerador de imagens.
- NÃO inclua timestamp no output — os momentos já estão definidos.

REGRA CRÍTICA DE IDIOMA VISUAL:
- Sempre que a imagem precisar de texto visível, o texto renderizado na imagem deve estar em ${languageName}.
- O prompt pode estar em inglês, mas o texto dentro da cena deve ser em ${languageName}.
- Quando citar esse texto no prompt, preserve o conteúdo na língua final. Exemplo: The words "TEXTO EM ${languageNameUpper}" written on the board.

ROTEIRO NARRADO:
${script}`;
}

export function buildChunkingInstruction(script: string, limit: number): string {
  return `Divida o roteiro abaixo em partes sequenciais para narração TTS.

<rules>
- Máximo ${limit} caracteres por parte.
- Use 80-100% do limite sempre que possível. Evite partes muito curtas (menos de 200 caracteres).
- Cada parte DEVE terminar com pontuação final de sentença (. ! ? ... — :).
- NUNCA divida no meio de uma palavra ou de uma frase.
- NÃO altere, reescreva, adicione ou remova palavras. Cópia exata do original.
- Quebre em pausas lógicas: fim de parágrafo, fim de frase ou troca de ideia.
</rules>

<output>
Retorne um array JSON onde cada item tem:
- "text": o texto exato da parte
- "isContinuation": true se é continuação direta da parte anterior (false para a primeira)
</output>

<script>
${script}
</script>`;
}

/**
 * Monta o prompt TTS seguindo a estrutura recomendada pelo Gemini TTS:
 *
 * 1. Preâmbulo curto instruindo síntese de fala
 * 2. Audio Profile — persona da voz (nome + descrição)
 * 3. Scene — ambiente e clima
 * 4. Director's Notes — orientações concisas (emoção, ritmo, estilo)
 * 5. Context — ponto de partida para o chunk atual
 * 6. Transcript — texto a ser falado (com rótulo explícito)
 *
 * Regras da documentação oficial seguidas:
 * - Inglês em todas as seções (idioma recomendado para prompts TTS)
 * - Rótulo "Transcript:" explícito (evita classifier false rejection)
 * - Sem overspecify (regras demais pioram a performance)
 * - Sem "não fale" (instrução contraditória confunde o classificador)
 * - Audio tags em inglês mesmo para transcrições não-inglesas
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

  const taggedTranscript = buildTaggedTranscript(chunk, emotionAudioTag, paceAudioTag);

  // ------------------------------------------------------------------
  // Seções do prompt (todas em inglês, conforme recomendação oficial)
  // ------------------------------------------------------------------
  const sections: string[] = [];

  // 1. Preâmbulo curto — instrui a síntese de fala
  sections.push(
    'Synthesize speech for the transcript below. Follow the audio profile, scene, and director\'s notes.',
  );

  // 2. Audio Profile — persona (nome + descrição)
  const profileParts: string[] = [];
  if (speakerName) profileParts.push(speakerName);
  if (audioProfile) profileParts.push(audioProfile);
  if (profileParts.length > 0) {
    sections.push(`Audio Profile:\n${profileParts.join(' — ')}`);
  }

  // 3. Scene — ambiente e clima
  if (scene) {
    sections.push(`Scene:\n${scene}`);
  }

  // 4. Director's Notes — concisas, sem overspecify
  const notesParts: string[] = [];
  if (emotionInstruction) notesParts.push(`Tone: ${emotionInstruction}`);
  if (directionNotes) notesParts.push(`Direction: ${directionNotes}`);
  if (notesParts.length > 0) {
    sections.push(`Director's Notes:\n${notesParts.join('\n')}`);
  }

  // 5. Continuity — nota curta (apenas para chunks 2+)
  if (continuityContext) {
    sections.push(continuityContext);
  }

  // Sample Context — ponto de partida (sem "não fale")
  if (sampleContext) {
    sections.push(`Context:\n${sampleContext}`);
  }

  // Multi-speaker context (já em inglês no caller)
  if (multiSpeakerContext) {
    sections.push(multiSpeakerContext);
  }

  // 6. Transcript — rótulo explícito (evita classifier false rejection)
  sections.push(`Transcript:\n${taggedTranscript}`);

  return sections.filter(Boolean).join('\n\n');
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
