import type { ElementType } from 'react';
import type { Locale } from '../features/i18n/types';
import Mic from '@mui/icons-material/Mic';
import PlayCircle from '@mui/icons-material/PlayCircle';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesome from '@mui/icons-material/AutoAwesome';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Benefício de autenticação exibido nas páginas de login e cadastro */
export interface AuthBenefitItem {
  readonly icon: ElementType;
  readonly title: string;
  readonly description: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings de benefícios de autenticação por idioma */
const authBenefitsStrings = {
  'pt-BR': {
    b0Title: 'Narração sem gravar',
    b0Desc: 'Roteiros viram áudio claro para vídeos',
    b1Title: 'Vídeo montado no navegador',
    b1Desc: 'Cenas, voz e legendas em um fluxo simples',
    b2Title: 'Cenas com IA',
    b2Desc: 'Imagens para YouTube, Shorts e Reels',
    b3Title: 'Assistente criativo',
    b3Desc: 'Ideias, revisão e direção de cena',
  },
  en: {
    b0Title: 'Narration without recording',
    b0Desc: 'Scripts become clear audio for videos',
    b1Title: 'Video assembled in the browser',
    b1Desc: 'Scenes, voice, and subtitles in one simple flow',
    b2Title: 'AI scenes',
    b2Desc: 'Images for YouTube, Shorts, and Reels',
    b3Title: 'Creative assistant',
    b3Desc: 'Ideas, review, and scene direction',
  },
  es: {
    b0Title: 'Narración sin grabar',
    b0Desc: 'Guiones se convierten en audio claro para videos',
    b1Title: 'Video montado en el navegador',
    b1Desc: 'Escenas, voz y subtítulos en un flujo simple',
    b2Title: 'Escenas con IA',
    b2Desc: 'Imágenes para YouTube, Shorts y Reels',
    b3Title: 'Asistente creativo',
    b3Desc: 'Ideas, revisión y dirección de escena',
  },
} as const;

type AuthBenefitsStrings = (typeof authBenefitsStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de benefícios a partir das strings localizadas */
function buildAuthBenefits(strings: AuthBenefitsStrings): AuthBenefitItem[] {
  return [
    { icon: Mic, title: strings.b0Title, description: strings.b0Desc },
    { icon: PlayCircle, title: strings.b1Title, description: strings.b1Desc },
    { icon: ImageIcon, title: strings.b2Title, description: strings.b2Desc },
    { icon: AutoAwesome, title: strings.b3Title, description: strings.b3Desc },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna os benefícios de autenticação no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedAuthBenefits(locale: Locale): AuthBenefitItem[] {
  const strings = authBenefitsStrings[locale] ?? authBenefitsStrings['pt-BR'];
  return buildAuthBenefits(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/** Benefícios exibidos nas páginas de login/cadastro */
export const AUTH_BENEFITS: readonly AuthBenefitItem[] = getLocalizedAuthBenefits('pt-BR');
