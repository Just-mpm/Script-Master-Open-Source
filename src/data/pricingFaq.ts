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
      'Sim! O plano Gratuito não exige cartão de crédito e não possui data de expiração. Você pode usar todas as funcionalidades principais — geração de áudio, imagens, vídeos e assistente IA — dentro dos limites do plano, sem custo algum.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Com certeza. Assim que nossos planos pagos estiverem disponíveis, o cancelamento será instantâneo e sem multa. Você continuará tendo acesso ao plano até o fim do ciclo já pago.',
  },
  {
    question: 'Quais as formas de pagamento?',
    answer:
      'Estamos preparando a integração com Stripe para aceitar cartão de crédito (Visa, Mastercard, Elo, Amex), PIX e boleto bancário. Toda a transação será processada com criptografia de ponta a ponta.',
  },
  {
    question: 'O que acontece se exceder os limites do plano?',
    answer:
      'Quando você estiver próximo do limite, exibiremos um aviso no painel. Após atingir o limite, poderá continuar usando no plano Gratuito — suas gerações anteriores permanecem acessíveis na biblioteca.',
  },
  {
    question: 'Existe desconto para pagamento anual?',
    answer:
      'Sim! Planejamos oferecer planos anuais com aproximadamente 20% de desconto em relação ao plano mensal. Fique de olho nas novidades — avisaremos quando estiver disponível.',
  },
  {
    question: 'Posso trocar de plano?',
    answer:
      'Sim, você poderá fazer upgrade ou downgrade a qualquer momento pelo painel de configurações da conta. Ao fazer upgrade, o valor será prorrateado. Ao fazer downgrade, o novo plano entra em vigor no próximo ciclo.',
  },
] as const;
