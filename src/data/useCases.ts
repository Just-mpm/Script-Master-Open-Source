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
      'Roteiros longos divididos em cenas, narração profissional e vídeo com legendas automáticas. Tudo em um fluxo.',
    uc1Title: 'Podcasts e áudios',
    uc1Desc:
      'Multi-speaker com vozes distintas, controle de pace e perfil de áudio. Ideal para episódios e audiobooks.',
    uc2Title: 'Conteúdo educacional',
    uc2Desc:
      'Audiodescrição, aulas narradas e material acessível. Controle total sobre clareza e ritmo da fala.',
    uc3Title: 'Marketing digital',
    uc3Desc:
      'Escalabilidade para campanhas com vídeos, áudios e imagens gerados a partir de scripts de marketing.',
    uc4Title: 'Storytelling e narrativas',
    uc4Desc:
      'Do roteiro à cena: imagens, narração e vídeo com transições. Perfeito para narrativas visuais.',
    uc5Title: 'Acessibilidade',
    uc5Desc:
      'Audiodescrição de qualidade profissional, legendas automáticas com Whisper e múltiplos formatos de exportação.',
  },
  en: {
    uc0Title: 'YouTube Videos',
    uc0Desc:
      'Long scripts split into scenes, professional narration, and video with automatic subtitles. All in one workflow.',
    uc1Title: 'Podcasts & Audio',
    uc1Desc:
      'Multi-speaker with distinct voices, pace and audio profile control. Ideal for episodes and audiobooks.',
    uc2Title: 'Educational Content',
    uc2Desc:
      'Audio descriptions, narrated lessons, and accessible material. Full control over speech clarity and pace.',
    uc3Title: 'Digital Marketing',
    uc3Desc:
      'Scalability for campaigns with videos, audios, and images generated from marketing scripts.',
    uc4Title: 'Storytelling & Narratives',
    uc4Desc:
      'From script to scene: images, narration, and video with transitions. Perfect for visual narratives.',
    uc5Title: 'Accessibility',
    uc5Desc:
      'Professional-quality audio descriptions, automatic subtitles with Whisper, and multiple export formats.',
  },
  es: {
    uc0Title: 'Videos para YouTube',
    uc0Desc:
      'Guiones largos divididos en escenas, narración profesional y video con subtítulos automáticos. Todo en un flujo.',
    uc1Title: 'Podcasts y audios',
    uc1Desc:
      'Multi-locutor con voces distintas, control de ritmo y perfil de audio. Ideal para episodios y audiolibros.',
    uc2Title: 'Contenido educacional',
    uc2Desc:
      'Audiodescripción, clases narradas y material accesible. Control total sobre claridad y ritmo del habla.',
    uc3Title: 'Marketing digital',
    uc3Desc:
      'Escalabilidad para campañas con videos, audios e imágenes generados a partir de scripts de marketing.',
    uc4Title: 'Storytelling y narrativas',
    uc4Desc:
      'Del guion a la escena: imágenes, narración y video con transiciones. Perfecto para narrativas visuales.',
    uc5Title: 'Accesibilidad',
    uc5Desc:
      'Audiodescripción de calidad profesional, subtítulos automáticos con Whisper y múltiples formatos de exportación.',
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
