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

function asPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatEmotionIntensity(value: unknown): string {
  const intensity = asPositiveNumber(value);
  return intensity === null ? '(padrão)' : intensity.toFixed(2);
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
