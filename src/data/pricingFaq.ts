import type { Locale } from '../features/i18n/types';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Item individual de FAQ do beta */
export interface PricingFaqItem {
  readonly question: string;
  readonly answer: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings do FAQ do beta por idioma */
const pricingFaqStrings = {
'pt-BR': {
    faq0Question: 'Como funcionam os créditos?',
    faq0Answer:
      'Cada geração de áudio, imagem ou interação com o assistente usa créditos do seu saldo. Você recebe 1.000 créditos grátis todo início de mês. Saldo exibido no header.',
    faq1Question: 'E quando os créditos acabarem?',
    faq1Answer:
      'Você não consegue gerar novo conteúdo até a renovação mensal. Mas seus projetos, áudios e imagens anteriores continuam acessíveis na biblioteca.',
    faq2Question: 'Posso comprar mais créditos?',
    faq2Answer:
      'Ainda não. Pagamentos estão pausados enquanto melhoramos o produto. Planos pagos e compra avulsa voltam no futuro.',
    faq3Question: 'O beta é mesmo gratuito?',
    faq3Answer:
      '100% gratuito. 1.000 créditos por mês, sem cartão de crédito. Nenhuma cobrança durante o beta.',
    faq4Question: 'Como ganhar créditos extras?',
    faq4Answer:
      'Envie feedback construtivo pela área logada e ganhe 250 créditos bônus. O bônus é creditado automaticamente.',
    faq5Question: 'Créditos não usados acumulam?',
    faq5Answer:
      'Não. O saldo renova para 1.000 no início de cada mês. Créditos não utilizados expirem.',
  },
  en: {
    faq0Question: 'How do credits work?',
    faq0Answer:
      'Each audio, image, or assistant interaction uses credits from your balance. You get 1,000 free credits at the start of each month. Balance shown in the header.',
    faq1Question: 'What happens when credits run out?',
    faq1Answer:
      'You can\'t generate new content until monthly renewal. But your previous projects, audio, and images stay accessible in the library.',
    faq2Question: 'Can I buy more credits?',
    faq2Answer:
      'Not yet. Payments are paused while we improve the product. Paid plans and credit packs will return in the future.',
    faq3Question: 'Is the beta really free?',
    faq3Answer:
      '100% free. 1,000 credits per month, no credit card. No charges during beta.',
    faq4Question: 'How do I earn bonus credits?',
    faq4Answer:
      'Send constructive feedback from your logged-in area and earn 250 bonus credits. Credited automatically.',
    faq5Question: 'Do unused credits accumulate?',
    faq5Answer:
      'No. Balance resets to 1,000 at the start of each month. Unused credits expire.',
  },
  es: {
    faq0Question: '¿Cómo funcionan los créditos?',
    faq0Answer:
      'Cada generación de audio, imagen o interacción con el asistente usa créditos de tu saldo. Recibes 1.000 créditos gratis al inicio de cada mes. Saldo mostrado en el header.',
    faq1Question: '¿Qué pasa cuando se acaban los créditos?',
    faq1Answer:
      'No podrás generar nuevo contenido hasta la renovación mensual. Pero tus proyectos, audios e imágenes anteriores seguirán accesibles en la biblioteca.',
    faq2Question: '¿Puedo comprar más créditos?',
    faq2Answer:
      'Todavía no. Los pagos están pausados mientras mejoramos el producto. Planes pagos y compra de créditos volverán en el futuro.',
    faq3Question: '¿El beta es realmente gratuito?',
    faq3Answer:
      '100% gratuito. 1.000 créditos por mes, sin tarjeta de crédito. Sin cobros durante el beta.',
    faq4Question: '¿Cómo ganar créditos extra?',
    faq4Answer:
      'Envía feedback constructivo desde tu área conectada y gana 250 créditos de bonus. Acreditados automáticamente.',
    faq5Question: '¿Los créditos no utilizados se acumulan?',
    faq5Answer:
      'No. El saldo se renueva a 1.000 al inicio de cada mes. Los créditos no utilizados caducan.',
  },
} as const;

type PricingFaqStrings = (typeof pricingFaqStrings)[Locale];

// ── Builder ───────────────────────────────────────────────────────────

/** Monta o array de FAQ a partir das strings localizadas */
function buildPricingFaq(strings: PricingFaqStrings): PricingFaqItem[] {
  return [
    { question: strings.faq0Question, answer: strings.faq0Answer },
    { question: strings.faq1Question, answer: strings.faq1Answer },
    { question: strings.faq2Question, answer: strings.faq2Answer },
    { question: strings.faq3Question, answer: strings.faq3Answer },
    { question: strings.faq4Question, answer: strings.faq4Answer },
    { question: strings.faq5Question, answer: strings.faq5Answer },
  ];
}

// ── Função locale-aware ───────────────────────────────────────────────

/**
 * Retorna as perguntas frequentes do beta no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedPricingFaq(locale: Locale): PricingFaqItem[] {
  const strings = pricingFaqStrings[locale] ?? pricingFaqStrings['pt-BR'];
  return buildPricingFaq(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Perguntas frequentes sobre o beta — fonte única (usado em PricingPage e FaqPage).
 * Manter aqui evita duplicação e garante consistência entre as duas páginas.
 */
export const PRICING_FAQ_ITEMS: readonly PricingFaqItem[] = getLocalizedPricingFaq('pt-BR');
