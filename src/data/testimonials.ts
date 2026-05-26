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
      'Antes eu gravava 2h e editava dias. Agora meu roteiro vira áudio profissional em 15 minutos. A detecção de cenas me economiza 4 horas de trabalho por vídeo.',
    t0UseCase: 'YouTube',
    t1Text:
      'Entrevistas com 2 vozes que parecem gravadas em estudio. O multi-speaker mudou meu fluxo completamente — gravo menos, erro menos, público elogia mais.',
    t1UseCase: 'Podcast',
    t2Text:
      'Escalamos produção de 5 para 15 vídeos por mês.同一time, stesso budget.ROI no primeiro mês foi inegável.',
    t2UseCase: 'Marketing',
    t3Text:
      'Alunos com deficiência visual agora têm audiodescrição de qualidade. A clareza da voz e o controle de ritmo fazem diferença real no aprendizado deles.',
    t3UseCase: 'Educação',
    t4Text:
      'Escrevo roteiro, saem 10 cenas prontas para Reels. Speed Paint dá aquele efeito que ninguém mais tem — audiência prende olhando até o fim.',
    t4UseCase: 'Shorts',
    t5Text:
      'Diretor de elenco virtual. O assistente sugere ajustes de tom e ritmo, gero o áudio e ouço se está bom. Ciclo de revisão que levava dias agora leva minutos.',
    t5UseCase: 'Roteiro',
  },
  en: {
    t0Text:
      'I used to record 2h and edit for days. Now my script becomes professional audio in 15 minutes. Scene detection saves me 4 hours per video.',
    t0UseCase: 'YouTube',
    t1Text:
      'Interviews with 2 voices that sound studio-recorded. Multi-speaker changed my workflow completely — less recording, fewer mistakes, audience loves it.',
    t1UseCase: 'Podcast',
    t2Text:
      'We scaled from 5 to 15 videos per month. Same team, same budget. ROI was undeniable from month one.',
    t2UseCase: 'Marketing',
    t3Text:
      'Visually impaired students now have quality audio descriptions. Voice clarity and pace control make a real difference in their learning.',
    t3UseCase: 'Education',
    t4Text:
      'I write the script, 10 scenes come out ready for Reels. Speed Paint gives that unique effect nobody else has — audience watches until the end.',
    t4UseCase: 'Shorts',
    t5Text:
      'Virtual casting director. The assistant suggests tone and pace tweaks, I generate and listen. Review cycle that took days now takes minutes.',
    t5UseCase: 'Screenwriting',
  },
  es: {
    t0Text:
      'Antes grababa 2h y editaba días. Ahora mi guion se convierte en audio profesional en 15 minutos. La detección de escenas me ahorra 4 horas por video.',
    t0UseCase: 'YouTube',
    t1Text:
      'Entrevistas con 2 voces que parecen grabadas en estudio. El multi-locutor cambió mi flujo completamente — grabo menos, erro menos, el público elogia más.',
    t1UseCase: 'Podcast',
    t2Text:
      'Escalamos de 5 a 15 videos por mes. Mesmo time, mesmo budget. ROI foi inegável no primeiro mês.',
    t2UseCase: 'Marketing',
    t3Text:
      'Alumnos con discapacidad visual ahora tienen audiodescripción de calidad. La claridad de la voz y el control de ritmo hacen diferencia real en su aprendizaje.',
    t3UseCase: 'Educación',
    t4Text:
      'Escribo el guion, salen 10 escenas listas para Reels. Speed Paint da ese efecto único que nadie más tiene — la audiencia mira hasta el final.',
    t4UseCase: 'Shorts',
    t5Text:
      'Director de elenco virtual. El asistente sugiere ajustes de tono y ritmo, genero el audio y escucho. Ciclo de revisión que tomaba días ahora toma minutos.',
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
