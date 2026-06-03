import type { Locale } from '../features/i18n/types';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Testimonial de um criador de conteúdo */
export interface Testimonial {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly company: string;
  readonly text: string;
  readonly rating: number;
  readonly useCase: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings de testimonials por idioma (apenas text e useCase são traduzidos) */
const testimonialsStrings = {
  'pt-BR': {
    t0Text:
      'Antes eu travava na hora de gravar. Agora coloco o roteiro, gero uma narração limpa e já começo a pensar nas cenas do vídeo.',
    t0UseCase: 'YouTube',
    t1Text:
      'Uso duas vozes para simular conversa e testar o episódio antes de gravar de verdade. Fica muito mais fácil ajustar ritmo e perguntas.',
    t1UseCase: 'Podcast',
    t2Text:
      'Para campanha curta, o ganho é sair do briefing para uma versão narrada muito rápido. A equipe revisa com áudio e cena, não só texto solto.',
    t2UseCase: 'Marketing',
    t3Text:
      'Consigo transformar material de aula em narração clara e com ritmo melhor. Ajuda muito quando o conteúdo precisa ser entendido sem depender só da tela.',
    t3UseCase: 'Educação',
    t4Text:
      'Escrevo o roteiro, gero cenas e testo ideias para Shorts sem recomeçar tudo. O Speed Paint ajuda a dar movimento quando a imagem estática ficaria parada demais.',
    t4UseCase: 'Shorts',
    t5Text:
      'O assistente me ajuda a melhorar abertura, tom e chamada final. Depois gero a narração e escuto se o roteiro realmente funciona.',
    t5UseCase: 'Roteiro',
  },
  en: {
    t0Text:
      'I used to freeze when it was time to record. Now I paste the script, generate clean narration, and start thinking about the video scenes.',
    t0UseCase: 'YouTube',
    t1Text:
      'I use two voices to simulate the conversation and test the episode before recording for real. It is much easier to adjust pace and questions.',
    t1UseCase: 'Podcast',
    t2Text:
      'For short campaigns, the win is moving from brief to narrated version fast. The team reviews audio and scenes, not just loose text.',
    t2UseCase: 'Marketing',
    t3Text:
      'I can turn lesson material into clear narration with better pacing. It helps a lot when content needs to work beyond the screen.',
    t3UseCase: 'Education',
    t4Text:
      'I write the script, generate scenes, and test ideas for Shorts without starting over. Speed Paint adds motion when a static image would feel too still.',
    t4UseCase: 'Shorts',
    t5Text:
      'The assistant helps me improve the hook, tone, and final call to action. Then I generate narration and hear whether the script really works.',
    t5UseCase: 'Screenwriting',
  },
  es: {
    t0Text:
      'Antes me trababa cuando tenía que grabar. Ahora pego el guion, genero una narración limpia y empiezo a pensar en las escenas del video.',
    t0UseCase: 'YouTube',
    t1Text:
      'Uso dos voces para simular la conversación y probar el episodio antes de grabar de verdad. Es mucho más fácil ajustar ritmo y preguntas.',
    t1UseCase: 'Podcast',
    t2Text:
      'Para campañas cortas, la ventaja es pasar del brief a una versión narrada muy rápido. El equipo revisa audio y escenas, no solo texto suelto.',
    t2UseCase: 'Marketing',
    t3Text:
      'Puedo transformar material de clase en narración clara y con mejor ritmo. Ayuda mucho cuando el contenido debe entenderse más allá de la pantalla.',
    t3UseCase: 'Educación',
    t4Text:
      'Escribo el guion, genero escenas y pruebo ideas para Shorts sin empezar de cero. Speed Paint agrega movimiento cuando una imagen estática quedaría muy quieta.',
    t4UseCase: 'Shorts',
    t5Text:
      'El asistente me ayuda a mejorar la apertura, el tono y la llamada final. Después genero la narración y escucho si el guion realmente funciona.',
    t5UseCase: 'Guion',
  },
} as const;

type TestimonialsStrings = (typeof testimonialsStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de testimonials a partir das strings localizadas */
function buildTestimonials(strings: TestimonialsStrings): Testimonial[] {
  return [
    {
      id: 'youtube-creator',
      name: 'Lucas Andrade',
      role: 'Criador de conteúdo',
      company: 'Canal TechBr',
      text: strings.t0Text,
      rating: 5,
      useCase: strings.t0UseCase,
    },
    {
      id: 'podcaster',
      name: 'Camila Ferreira',
      role: 'Podcaster',
      company: 'PodCast Insights',
      text: strings.t1Text,
      rating: 5,
      useCase: strings.t1UseCase,
    },
    {
      id: 'marketer',
      name: 'Ricardo Mendes',
      role: 'Head de Marketing',
      company: 'Agência Vértice',
      text: strings.t2Text,
      rating: 5,
      useCase: strings.t2UseCase,
    },
    {
      id: 'teacher',
      name: 'Prof. Juliana Costa',
      role: 'Professora de História',
      company: 'Colégio Estadual Central',
      text: strings.t3Text,
      rating: 4,
      useCase: strings.t3UseCase,
    },
    {
      id: 'shorts-creator',
      name: 'Gabriel Oliveira',
      role: 'Produtor de conteúdo curto',
      company: 'Reels & Shorts BR',
      text: strings.t4Text,
      rating: 5,
      useCase: strings.t4UseCase,
    },
    {
      id: 'screenwriter',
      name: 'Mariana Lopes',
      role: 'Roteirista freelance',
      company: 'Independente',
      text: strings.t5Text,
      rating: 5,
      useCase: strings.t5UseCase,
    },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna os testimonials no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedTestimonials(locale: Locale): Testimonial[] {
  const strings = testimonialsStrings[locale] ?? testimonialsStrings['pt-BR'];
  return buildTestimonials(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Testimonials de criadores — fonte única para a landing page.
 * Textos realistas baseados nos casos de uso do produto.
 */
export const TESTIMONIALS: readonly Testimonial[] = getLocalizedTestimonials('pt-BR');
