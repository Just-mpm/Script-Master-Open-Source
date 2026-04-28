/**
 * Catálogo de templates/presets do estúdio de produção.
 *
 * Cada template define um patch parcial (StudioSettingsPatch) que pode ser
 * aplicado ao store via `applySettings()`. O roteiro de exemplo serve apenas
 * como preview — o template NÃO substitui o script do usuário.
 */

import type { StudioSettingsPatch } from '../features/studio/types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TemplateCategory =
  | 'youtube'
  | 'podcast'
  | 'educacao'
  | 'marketing'
  | 'storytelling'
  | 'acessibilidade';

export interface ScriptTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TemplateCategory;
  readonly icon: string;
  readonly patch: StudioSettingsPatch;
  readonly previewScript: string;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const SCRIPT_TEMPLATES: readonly ScriptTemplate[] = [
  // ─── YouTube ───────────────────────────────────────────────
  {
    id: 'youtube-tutorial',
    name: 'Tutorial',
    description: 'Vídeo educativo passo a passo com linguagem clara e didática.',
    category: 'youtube',
    icon: 'School',
    patch: {
      pace: 'slow',
      audioProfile: 'Professor paciente e didático',
      scene: 'Estúdio clean com tela ou lousa digital ao fundo',
      styleNotes: 'Claro e objetivo',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 60,
      visualFramework: 'general',
    },
    previewScript:
      'Hoje vou te ensinar como configurar seu ambiente de desenvolvimento do zero.\n\n' +
      'Primeiro, abra o terminal e instale as dependências necessárias.\n\n' +
      'Em seguida, crie o arquivo de configuração principal.\n\n' +
      'Vamos testar se tudo está funcionando corretamente.',
  },
  {
    id: 'youtube-vlog',
    name: 'Vlog',
    description: 'Conteúdo pessoal com tom descontraído e energia alta.',
    category: 'youtube',
    icon: 'Videocam',
    patch: {
      pace: 'normal',
      audioProfile: 'Criador de conteúdo carismático',
      scene: 'Ambiente descontraído, luz natural, cores vibrantes',
      styleNotes: 'Descontraído e natural',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 30,
      visualFramework: 'general',
    },
    previewScript:
      'E aí, pessoal! Bem-vindos a mais um vídeo no canal.\n\n' +
      'Hoje o dia foi incrível e eu preciso contar tudo pra vocês.\n\n' +
      'Vamos lá, acompanhem comigo essa aventura!',
  },

  // ─── Podcast ──────────────────────────────────────────────
  {
    id: 'podcast-entrevista',
    name: 'Entrevista',
    description: 'Formato diálogo com dois locutores, ideal para conversas estruturadas.',
    category: 'podcast',
    icon: 'Mic',
    patch: {
      isMultiSpeaker: true,
      speakerAName: 'Apresentador',
      speakerBName: 'Convidado',
      pace: 'normal',
      audioProfile: 'Apresentador profissional, Convidado especialista',
      scene: 'Estúdio de podcast com microfones, iluminação quente',
      styleNotes: 'Profissional',
      generateScenes: false,
    },
    previewScript:
      'Apresentador: Muito obrigado por aceitar o convite para o nosso programa.\n\n' +
      'Convidado: O prazer é todo meu, sempre acompanho o podcast.\n\n' +
      'Apresentador: Vamos começar falando sobre o tema que mais gera debate.\n\n' +
      'Convidado: Com certeza, é um assunto que merece atenção.',
  },
  {
    id: 'podcast-monologo',
    name: 'Monólogo',
    description: 'Narração solo com tom reflexivo, ideal para deep dives e opiniões.',
    category: 'podcast',
    icon: 'RecordVoiceOver',
    patch: {
      isMultiSpeaker: false,
      pace: 'slow',
      audioProfile: 'Narrador reflexivo e articulado',
      scene: 'Estúdio acolhedor com iluminação suave e livros ao fundo',
      styleNotes: 'Reflexivo e pausado',
      generateScenes: false,
    },
    previewScript:
      'Sabe quando você para pra pensar sobre como a tecnologia mudou nossas vidas?\n\n' +
      'Hoje eu quero compartilhar uma reflexão que venho amadurecendo há semanas.\n\n' +
      'No começo eu achava que era só uma impressão minha, mas os dados confirmam.',
  },

  // ─── Educação ─────────────────────────────────────────────
  {
    id: 'educacao-aula',
    name: 'Aula',
    description: 'Conteúdo acadêmico com ritmo moderado e explicações detalhadas.',
    category: 'educacao',
    icon: 'MenuBook',
    patch: {
      pace: 'slow',
      audioProfile: 'Professor universitário experiente',
      scene: 'Sala de aula moderna ou estúdio educacional',
      styleNotes: 'Didático e detalhado',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 120,
      visualFramework: 'whiteboard',
    },
    previewScript:
      'Na aula de hoje vamos abordar os conceitos fundamentais da matéria.\n\n' +
      'Prestem atenção neste ponto, porque ele vai aparecer na avaliação.\n\n' +
      'Vejam o exemplo prático a seguir para entenderem a aplicação.\n\n' +
      'Algum dúvida até aqui? Podemos revisar se necessário.',
  },
  {
    id: 'educacao-explicacao',
    name: 'Explicação Rápida',
    description: 'Microlearning em formato curto e direto ao ponto.',
    category: 'educacao',
    icon: 'Lightbulb',
    patch: {
      pace: 'normal',
      audioProfile: 'Explicador dinâmico e cativante',
      scene: 'Estúdio minimalista com gráficos e diagramas',
      styleNotes: 'Direto e objetivo',
      generateScenes: true,
      sceneRatio: '9:16',
      sceneDensity: 15,
      visualFramework: 'whiteboard',
    },
    previewScript:
      'Você sabia que esse conceito é mais simples do que parece?\n\n' +
      'Vou te explicar em menos de um minuto.\n\n' +
      'Pense assim: é como se fosse uma receita de bolo.',
  },

  // ─── Marketing ────────────────────────────────────────────
  {
    id: 'marketing-promocao',
    name: 'Promoção',
    description: 'Peça publicitária com call-to-action e energia persuasiva.',
    category: 'marketing',
    icon: 'Campaign',
    patch: {
      pace: 'fast',
      audioProfile: 'Apresentador comercial persuasivo',
      scene: 'Ambiente profissional com cores da marca em destaque',
      styleNotes: 'Energético e persuasivo',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 30,
      visualFramework: 'general',
    },
    previewScript:
      'Não perca essa oportunidade exclusiva que está por tempo limitado!\n\n' +
      'Nossa solução já ajudou milhares de pessoas a alcançar resultados reais.\n\n' +
      'Clique no link e garanta o seu desconto de lançamento agora mesmo.',
  },

  // ─── Storytelling ─────────────────────────────────────────
  {
    id: 'storytelling-narrativa',
    name: 'Narrativa',
    description: 'História imersiva com personagens, cenários e tensão narrativa.',
    category: 'storytelling',
    icon: 'AutoStories',
    patch: {
      pace: 'slow',
      audioProfile: 'Narrador teatral com boa dicção',
      scene: 'Cenário cinematográfico com atmosfera envolvente',
      styleNotes: 'Teatral e imersivo',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 60,
      visualFramework: 'general',
    },
    previewScript:
      'A noite caía sobre a cidade velha como um manto de silêncio.\n\n' +
      'Maria atravessou a praça deserta, sentindo o peso do segredo que carregava.\n\n' +
      'Ao virar a esquina, uma luz fraca brilhou na janela do segundo andar.\n\n' +
      'Ela respirou fundo e subiu os degraus rangentes da escadaria.',
  },
  {
    id: 'storytelling-documentario',
    name: 'Documentário',
    description: 'Narrativa factual com ritmo calmo e voz autoritativa.',
    category: 'storytelling',
    icon: 'TheaterComedy',
    patch: {
      pace: 'very_slow',
      audioProfile: 'Narrador de documentário, voz grave e autoritária',
      scene: 'Imagens de arquivo e locações reais',
      styleNotes: 'Sério e informativo',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 60,
      visualFramework: 'general',
    },
    previewScript:
      'No coração da Amazônia, onde o rio encontra a floresta, existe um mundo poucos conhecem.\n\n' +
      'Pesquisadores vêm estudando a região há décadas, mas ainda há muito a descobrir.\n\n' +
      'Os dados revelam um ecossistema mais complexo do que se imaginava.',
  },

  // ─── Acessibilidade ───────────────────────────────────────
  {
    id: 'acessibilidade-audiodescricao',
    name: 'Audiodescrição',
    description: 'Descrição de cenas visuais para pessoas com deficiência visual.',
    category: 'acessibilidade',
    icon: 'AccessibilityNew',
    patch: {
      pace: 'slow',
      audioProfile: 'Audiodescritor neutro e preciso',
      scene: 'Cenário descritivo com foco em elementos visuais essenciais',
      styleNotes: 'Neutro e descritivo',
      generateScenes: true,
      sceneRatio: '16:9',
      sceneDensity: 60,
      visualFramework: 'general',
    },
    previewScript:
      'A cena se abre com uma vista aérea de uma cidade costeira ao pôr do sol.\n\n' +
      'A câmera desce lentamente até o nível da rua, onde pessoas caminham pela calçada.\n\n' +
      'Um letreiro neon azul se destaca à esquerda do quadro com a inscrição "Café Central".\n\n' +
      'A protagonista, uma mulher jovem de cabelos cacheados e casaco vermelho, entra no café.',
  },
];
