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
      'Eu gravava narrações de 2 horas e editava dias inteiros. Com o Script Master, meu roteiro vira áudio profissional em minutos. A detecção automática de cenas economiza horas de edição.',
    t0UseCase: 'YouTube',
    t1Text:
      'O multi-speaker mudou meu fluxo. Gravo entrevistas, passo o roteiro e o Script Master gera duas vozes distintas. Meus ouvintes nem percebem que não são locutores reais.',
    t1UseCase: 'Podcast',
    t2Text:
      'Precisávamos de escala para vídeos de cliente. Agora nosso time produz vídeos com legendas e narração 3x mais rápido. O ROI foi imediato no primeiro mês.',
    t2UseCase: 'Marketing',
    t3Text:
      'Uso para criar audiodescrição de material didático para alunos com deficiência visual. A qualidade da voz e o controle de pace fazem diferença real na aprendizagem deles.',
    t3UseCase: 'Educação',
    t4Text:
      'O pipeline de cenas + geração de imagens é insano. Escrevo o roteiro e saem 10 frames prontos para Reels. Speed Paint dá um toque único que ninguém mais tem.',
    t4UseCase: 'Vídeos Curtos',
    t5Text:
      'O assistente IA ajuda a refinar diálogos e ajustar tom. Quando preciso ouvir como fica, gero o áudio direto no estúdio. É como ter um diretor de elenco na minha mesa.',
    t5UseCase: 'Roteiro',
  },
  en: {
    t0Text:
      'I used to record 2-hour narrations and edit for days. With Script Master, my script turns into professional audio in minutes. Automatic scene detection saves hours of editing.',
    t0UseCase: 'YouTube',
    t1Text:
      'Multi-speaker changed my workflow. I record interviews, pass the script, and Script Master generates two distinct voices. My listeners can\'t even tell they aren\'t real narrators.',
    t1UseCase: 'Podcast',
    t2Text:
      'We needed scale for client videos. Now our team produces videos with subtitles and narration 3x faster. The ROI was immediate in the first month.',
    t2UseCase: 'Marketing',
    t3Text:
      'I use it to create audio descriptions of educational material for visually impaired students. The voice quality and pace control make a real difference in their learning.',
    t3UseCase: 'Education',
    t4Text:
      'The scene pipeline + image generation is insane. I write the script and 10 frames come out ready for Reels. Speed Paint adds a unique touch nobody else has.',
    t4UseCase: 'Short Videos',
    t5Text:
      'The AI assistant helps refine dialogues and adjust tone. When I need to hear how it sounds, I generate the audio right in the studio. It\'s like having a casting director at my desk.',
    t5UseCase: 'Screenwriting',
  },
  es: {
    t0Text:
      'Grababa narraciones de 2 horas y editaba días enteros. Con Script Master, mi guion se convierte en audio profesional en minutos. La detección automática de escenas ahorra horas de edición.',
    t0UseCase: 'YouTube',
    t1Text:
      'El multi-locutor cambió mi flujo. Gravo entrevistas, paso el guion y Script Master genera dos voces distintas. Mis oyentes ni perciben que no son locutores reales.',
    t1UseCase: 'Podcast',
    t2Text:
      'Necesitábamos escala para videos de clientes. Ahora nuestro equipo produce videos con subtítulos y narración 3x más rápido. El ROI fue inmediato en el primer mes.',
    t2UseCase: 'Marketing',
    t3Text:
      'Lo uso para crear audiodescripción de material didáctico para alumnos con discapacidad visual. La calidad de voz y el control de ritmo hacen diferencia real en su aprendizaje.',
    t3UseCase: 'Educación',
    t4Text:
      'El pipeline de escenas + generación de imágenes es increíble. Escribo el guion y salen 10 frames listos para Reels. Speed Paint da un toque único que nadie más tiene.',
    t4UseCase: 'Videos Cortos',
    t5Text:
      'El asistente IA ayuda a refinar diálogos y ajustar tono. Cuando necesito escuchar cómo queda, genero el audio directo en el estudio. Es como tener un director de elenco en mi mesa.',
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
