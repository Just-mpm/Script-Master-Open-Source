import type { ElementType } from 'react';
import type { Locale } from '../features/i18n/types';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import SchoolIcon from '@mui/icons-material/School';
import CampaignIcon from '@mui/icons-material/Campaign';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Caso de uso do produto com ícone e descrição */
export interface UseCaseItem {
  readonly icon: ElementType;
  readonly title: string;
  readonly description: string;
  readonly anchor: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings de casos de uso por idioma */
const useCasesStrings = {
  'pt-BR': {
    uc0Title: 'Vídeos para YouTube',
    uc0Desc:
      'Transforme um roteiro longo em vídeo com voz, cenas e legendas. Publique mais, edite menos.',
    uc1Title: 'Podcasts e audiobooks',
    uc1Desc:
      'Simule conversas com duas vozes e menos retrabalho. Episódios claros sem montar estúdio.',
    uc2Title: 'Material educacional',
    uc2Desc:
      'Aulas narradas, audiodescrição e legendas acessíveis. Alunos engajados, conteúdo claro.',
    uc3Title: 'Marketing e campanhas',
    uc3Desc:
      'Escala de produção com IA. Mais vídeos, mais campanhas, mesmo time.',
    uc4Title: 'Storytelling e narrativas',
    uc4Desc:
      'Do roteiro à imagem: cenas visuais, narração e transições. Histórias que prendem.',
    uc5Title: 'Acessibilidade',
    uc5Desc:
      'Audiodescrição profissional, legendas precisas e múltiplos formatos de exportação.',
  },
  en: {
    uc0Title: 'YouTube Videos',
    uc0Desc:
      'Turn a long script into a video with voice, scenes, and subtitles. Publish more, edit less.',
    uc1Title: 'Podcasts & Audiobooks',
    uc1Desc:
      'Simulate conversations with two voices and less rework. Clear episodes without setting up a studio.',
    uc2Title: 'Educational Content',
    uc2Desc:
      'Narrated lessons, audio descriptions, and accessible subtitles. Engaged students, clear content.',
    uc3Title: 'Marketing & Campaigns',
    uc3Desc:
      'Production scale with AI. More videos, more campaigns, same team.',
    uc4Title: 'Storytelling & Narratives',
    uc4Desc:
      'From script to image: visual scenes, narration, and transitions. Stories that captivate.',
    uc5Title: 'Accessibility',
    uc5Desc:
      'Professional audio descriptions, accurate subtitles, and multiple export formats.',
  },
  es: {
    uc0Title: 'Videos para YouTube',
    uc0Desc:
      'Transforma un guion largo en video con voz, escenas y subtítulos. Publica más, edita menos.',
    uc1Title: 'Podcasts y audiolibros',
    uc1Desc:
      'Simula conversaciones con dos voces y menos retrabajo. Episodios claros sin montar estudio.',
    uc2Title: 'Material educativo',
    uc2Desc:
      'Clases narradas, audiodescripción y subtítulos accesibles. Alumnos comprometidos, contenido claro.',
    uc3Title: 'Marketing y campañas',
    uc3Desc:
      'Escala de producción con IA. Más videos, más campañas, mismo equipo.',
    uc4Title: 'Storytelling y narrativas',
    uc4Desc:
      'Del guion a la imagen: escenas visuales, narración y transiciones. Historias que atrapan.',
    uc5Title: 'Accesibilidad',
    uc5Desc:
      'Audiodescripción profesional, subtítulos precisos y múltiples formatos de exportación.',
  },
} as const;

type UseCasesStrings = (typeof useCasesStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de casos de uso a partir das strings localizadas */
function buildUseCases(strings: UseCasesStrings): UseCaseItem[] {
  return [
    {
      icon: YouTubeIcon,
      title: strings.uc0Title,
      description: strings.uc0Desc,
      anchor: 'audio',
    },
    {
      icon: PodcastsIcon,
      title: strings.uc1Title,
      description: strings.uc1Desc,
      anchor: 'audio',
    },
    {
      icon: SchoolIcon,
      title: strings.uc2Title,
      description: strings.uc2Desc,
      anchor: 'assistant',
    },
    {
      icon: CampaignIcon,
      title: strings.uc3Title,
      description: strings.uc3Desc,
      anchor: 'video',
    },
    {
      icon: AutoStoriesIcon,
      title: strings.uc4Title,
      description: strings.uc4Desc,
      anchor: 'images',
    },
    {
      icon: AccessibilityNewIcon,
      title: strings.uc5Title,
      description: strings.uc5Desc,
      anchor: 'video',
    },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna os casos de uso no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedUseCases(locale: Locale): UseCaseItem[] {
  const strings = useCasesStrings[locale] ?? useCasesStrings['pt-BR'];
  return buildUseCases(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Casos de uso do Script Master — fonte única para UseCasesSection.
 * Cada item inclui um anchor que aponta para seção correspondente em /funcionalidades.
 */
export const USE_CASES: readonly UseCaseItem[] = getLocalizedUseCases('pt-BR');
