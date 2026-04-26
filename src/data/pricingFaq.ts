// ── Tipos ─────────────────────────────────────────────────────────────

/** Item individual de FAQ de preços */
interface PricingFaqItem {
  readonly question: string;
  readonly answer: string;
}

// ── Dados ────────────────────────────────────────────────────────────

/**
 * Perguntas frequentes sobre preços — fonte única (usado em PricingPage e FaqPage).
 * Manter aqui evita duplicação e garante consistência entre as duas páginas.
 */
export const PRICING_FAQ_ITEMS: readonly PricingFaqItem[] = [
  {
    question: 'É realmente grátis?',
    answer:
      'Sim! O plano Gratuito não exige cartão de crédito e não possui data de expiração. Você pode usar quantas vezes quiser dentro dos limites do plano.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Assim que estiver disponível, você poderá cancelar sua assinatura a qualquer momento.',
  },
  {
    question: 'Quais as formas de pagamento?',
    answer:
      'Nosso sistema de pagamentos ainda está em desenvolvimento. Em breve aceitaremos cartão de crédito, PIX e boleto bancário.',
  },
  {
    question: 'O que acontece se exceder os limites do plano?',
    answer:
      'Você será notificado quando estiver próximo do limite. Após exceder, poderá continuar usando no plano Gratuito até o próximo ciclo.',
  },
  {
    question: 'Existe desconto para pagamento anual?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Planos anuais com desconto estarão disponíveis em breve.',
  },
  {
    question: 'Posso trocar de plano?',
    answer:
      'Ainda estamos desenvolvendo nosso sistema de pagamentos. Assim que disponível, você poderá fazer upgrade ou downgrade a qualquer momento.',
  },
] as const;
