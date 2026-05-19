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
      'Cada geração de áudio, imagem ou interação com o assistente IA consome uma quantidade de créditos do seu saldo. Você recebe 1.000 créditos gratuitos todo início de mês. O saldo é exibido no header após o login.',
    faq1Question: 'O que acontece quando meus créditos acabam?',
    faq1Answer:
      'Quando seus créditos chegarem a zero, você não conseguirá gerar novos conteúdos até a renovação mensal. Mas não se preocupe — seus projetos, áudios e imagens anteriores continuam acessíveis na biblioteca.',
    faq2Question: 'Posso comprar mais créditos?',
    faq2Answer:
      'Ainda não. Os pagamentos e assinaturas estão temporariamente pausados enquanto focamos em melhorar o produto com feedback real. Planos pagos e compra de créditos voltarão no futuro.',
    faq3Question: 'O beta é realmente gratuito?',
    faq3Answer:
      'Sim! O beta aberto é 100% gratuito. Você recebe 1.000 créditos por mês sem precisar de cartão de crédito. Nenhuma cobrança será feita durante o período de beta.',
    faq4Question: 'Como ganhar créditos bônus?',
    faq4Answer:
      'Você pode ganhar 250 créditos extras ao enviar feedback construtivo pelo formulário de contato (área logada). O bônus é concedido automaticamente ao enviar o feedback. Fique de olho em outras formas de ganhar créditos no futuro.',
    faq5Question: 'Os créditos acumulam?',
    faq5Answer:
      'Não. Os créditos são renovados para 1.000 todo início de mês. Créditos não utilizados no mês anterior não acumulam para o mês seguinte. Aproveite seus créditos mensais!',
  },
  en: {
    faq0Question: 'How do credits work?',
    faq0Answer:
      'Each audio generation, image generation, or AI assistant interaction consumes credits from your balance. You receive 1,000 free credits at the beginning of each month. Your balance is displayed in the header after login.',
    faq1Question: 'What happens when I run out of credits?',
    faq1Answer:
      'When your credits reach zero, you won\'t be able to generate new content until the monthly renewal. But don\'t worry — your previous projects, audios, and images remain accessible in the library.',
    faq2Question: 'Can I buy more credits?',
    faq2Answer:
      'Not yet. Payments and subscriptions are temporarily paused while we focus on improving the product with real feedback. Paid plans and credit purchases will return in the future.',
    faq3Question: 'Is the beta really free?',
    faq3Answer:
      'Yes! The open beta is 100% free. You get 1,000 credits per month with no credit card required. No charges will be made during the beta period.',
    faq4Question: 'How do I earn bonus credits?',
    faq4Answer:
      'You can earn 250 extra credits by sending constructive feedback through the contact form (logged-in area). The bonus is granted automatically upon submitting your feedback. Stay tuned for more ways to earn credits in the future.',
    faq5Question: 'Do credits accumulate?',
    faq5Answer:
      'No. Credits reset to 1,000 at the beginning of each month. Unused credits from the previous month do not carry over to the next month. Make the most of your monthly credits!',
  },
  es: {
    faq0Question: '¿Cómo funcionan los créditos?',
    faq0Answer:
      'Cada generación de audio, imagen o interacción con el asistente IA consume créditos de tu saldo. Recibes 1.000 créditos gratuitos al inicio de cada mes. El saldo se muestra en el encabezado después de iniciar sesión.',
    faq1Question: '¿Qué pasa cuando se acaban mis créditos?',
    faq1Answer:
      'Cuando tus créditos lleguen a cero, no podrás generar nuevo contenido hasta la renovación mensual. Pero no te preocupes — tus proyectos, audios e imágenes anteriores permanecen accesibles en la biblioteca.',
    faq2Question: '¿Puedo comprar más créditos?',
    faq2Answer:
      'Todavía no. Los pagos y suscripciones están temporalmente pausados mientras nos enfocamos en mejorar el producto con feedback real. Los planes de pago y la compra de créditos volverán en el futuro.',
    faq3Question: '¿El beta es realmente gratuito?',
    faq3Answer:
      '¡Sí! El beta abierto es 100% gratuito. Recibes 1.000 créditos por mes sin necesidad de tarjeta de crédito. No se realizará ningún cobro durante el período beta.',
    faq4Question: '¿Cómo ganar créditos extra?',
    faq4Answer:
      'Puedes ganar 250 créditos adicionales enviando feedback constructivo a través del formulario de contacto (área de usuarios registrados). El bono se concede automáticamente al enviar el feedback. Estate atento a más formas de ganar créditos en el futuro.',
    faq5Question: '¿Los créditos se acumulan?',
    faq5Answer:
      'No. Los créditos se renuevan a 1.000 al inicio de cada mes. Los créditos no utilizados del mes anterior no se acumulan para el siguiente. ¡Aprovecha tus créditos mensuales!',
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
