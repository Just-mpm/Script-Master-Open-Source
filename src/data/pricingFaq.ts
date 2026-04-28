import type { Locale } from '../features/i18n/types';

// ── Tipos ─────────────────────────────────────────────────────────────

/** Item individual de FAQ de preços */
export interface PricingFaqItem {
  readonly question: string;
  readonly answer: string;
}

// ── Strings localizadas ───────────────────────────────────────────────

/** Strings do FAQ de preços por idioma */
const pricingFaqStrings = {
  'pt-BR': {
    faq0Question: 'É realmente grátis?',
    faq0Answer:
      'Sim! O plano Gratuito não exige cartão de crédito e não possui data de expiração. Você pode usar todas as funcionalidades principais — geração de áudio, imagens, vídeos e assistente IA — dentro dos limites do plano, sem custo algum.',
    faq1Question: 'Posso cancelar a qualquer momento?',
    faq1Answer:
      'Com certeza. Assim que nossos planos pagos estiverem disponíveis, o cancelamento será instantâneo e sem multa. Você continuará tendo acesso ao plano até o fim do ciclo já pago.',
    faq2Question: 'Quais as formas de pagamento?',
    faq2Answer:
      'Estamos preparando a integração com Stripe para aceitar cartão de crédito (Visa, Mastercard, Elo, Amex), PIX e boleto bancário. Toda a transação será processada com criptografia de ponta a ponta.',
    faq3Question: 'O que acontece se exceder os limites do plano?',
    faq3Answer:
      'Quando você estiver próximo do limite, exibiremos um aviso no painel. Após atingir o limite, poderá continuar usando no plano Gratuito — suas gerações anteriores permanecem acessíveis na biblioteca.',
    faq4Question: 'Existe desconto para pagamento anual?',
    faq4Answer:
      'Sim! Planejamos oferecer planos anuais com aproximadamente 20% de desconto em relação ao plano mensal. Fique de olho nas novidades — avisaremos quando estiver disponível.',
    faq5Question: 'Posso trocar de plano?',
    faq5Answer:
      'Sim, você poderá fazer upgrade ou downgrade a qualquer momento pelo painel de configurações da conta. Ao fazer upgrade, o valor será prorrateado. Ao fazer downgrade, o novo plano entra em vigor no próximo ciclo.',
  },
  en: {
    faq0Question: 'Is it really free?',
    faq0Answer:
      'Yes! The Free plan requires no credit card and has no expiration date. You can use all main features — audio generation, images, videos, and AI assistant — within plan limits, at no cost.',
    faq1Question: 'Can I cancel at any time?',
    faq1Answer:
      'Absolutely. Once our paid plans are available, cancellation will be instant with no penalty. You\'ll continue to have access to the plan until the end of the paid cycle.',
    faq2Question: 'What payment methods are available?',
    faq2Answer:
      'We\'re preparing Stripe integration to accept credit cards (Visa, Mastercard, Elo, Amex), PIX, and bank slip. All transactions will be processed with end-to-end encryption.',
    faq3Question: 'What happens if I exceed plan limits?',
    faq3Answer:
      'When you\'re close to the limit, we\'ll display a warning on the dashboard. After reaching the limit, you can continue using the Free plan — your previous generations remain accessible in the library.',
    faq4Question: 'Is there a discount for annual payment?',
    faq4Answer:
      'Yes! We plan to offer annual plans with approximately 20% discount compared to the monthly plan. Stay tuned for news — we\'ll notify you when it\'s available.',
    faq5Question: 'Can I switch plans?',
    faq5Answer:
      'Yes, you can upgrade or downgrade at any time from your account settings. When upgrading, the amount will be prorated. When downgrading, the new plan takes effect on the next cycle.',
  },
  es: {
    faq0Question: '¿Es realmente gratis?',
    faq0Answer:
      '¡Sí! El plan Gratuito no requiere tarjeta de crédito y no tiene fecha de expiración. Puedes usar todas las funcionalidades principales — generación de audio, imágenes, videos y asistente IA — dentro de los límites del plan, sin costo alguno.',
    faq1Question: '¿Puedo cancelar en cualquier momento?',
    faq1Answer:
      '¡Por supuesto! Una vez que nuestros planes de pago estén disponibles, la cancelación será instantánea y sin multa. Seguirás teniendo acceso al plan hasta el final del ciclo ya pagado.',
    faq2Question: '¿Cuáles son los métodos de pago?',
    faq2Answer:
      'Estamos preparando la integración con Stripe para aceptar tarjetas de crédito (Visa, Mastercard, Elo, Amex), PIX y boleto bancario. Toda la transacción será procesada con cifrado de extremo a extremo.',
    faq3Question: '¿Qué pasa si excedo los límites del plan?',
    faq3Answer:
      'Cuando estés cerca del límite, mostraremos una advertencia en el panel. Al alcanzar el límite, podrás continuar usando el plan Gratuito — tus generaciones anteriores permanecen accesibles en la biblioteca.',
    faq4Question: '¿Hay descuento para pago anual?',
    faq4Answer:
      '¡Sí! Planeamos ofrecer planes anuales con aproximadamente 20% de descuento respecto al plan mensual. Estate atento a las novedades — te avisaremos cuando esté disponible.',
    faq5Question: '¿Puedo cambiar de plan?',
    faq5Answer:
      'Sí, podrás hacer upgrade o downgrade en cualquier momento desde la configuración de tu cuenta. Al hacer upgrade, el valor será prorrateado. Al hacer downgrade, el nuevo plan entra en vigor en el próximo ciclo.',
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
 * Retorna as perguntas frequentes de preços no idioma solicitado.
 * Fallback para pt-BR se o locale não for reconhecido.
 */
export function getLocalizedPricingFaq(locale: Locale): PricingFaqItem[] {
  const strings = pricingFaqStrings[locale] ?? pricingFaqStrings['pt-BR'];
  return buildPricingFaq(strings);
}

// ── Dados (backward compat) ──────────────────────────────────────────

/**
 * Perguntas frequentes sobre preços — fonte única (usado em PricingPage e FaqPage).
 * Manter aqui evita duplicação e garante consistência entre as duas páginas.
 */
export const PRICING_FAQ_ITEMS: readonly PricingFaqItem[] = getLocalizedPricingFaq('pt-BR');
