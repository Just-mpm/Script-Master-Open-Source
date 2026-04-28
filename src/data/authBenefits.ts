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
    b0Title: 'Voz com IA',
    b0Desc: 'Roteiros em áudio profissional com Gemini TTS',
    b1Title: 'Vídeo Automático',
    b1Desc: 'Renderização client-side com legendas',
    b2Title: 'Imagens',
    b2Desc: 'Geração com 8 aspect ratios e referência',
    b3Title: 'Assistente IA',
    b3Desc: 'Chat com memória e integração ao estúdio',
  },
  en: {
    b0Title: 'AI Voice',
    b0Desc: 'Professional audio from scripts with Gemini TTS',
    b1Title: 'Automatic Video',
    b1Desc: 'Client-side rendering with subtitles',
    b2Title: 'Images',
    b2Desc: 'Generation with 8 aspect ratios and reference',
    b3Title: 'AI Assistant',
    b3Desc: 'Chat with memory and studio integration',
  },
  es: {
    b0Title: 'Voz con IA',
    b0Desc: 'Audio profesional a partir de guiones con Gemini TTS',
    b1Title: 'Video Automático',
    b1Desc: 'Renderización del lado del cliente con subtítulos',
    b2Title: 'Imágenes',
    b2Desc: 'Generación con 8 aspect ratios y referencia',
    b3Title: 'Asistente IA',
    b3Desc: 'Chat con memoria e integración al estudio',
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
