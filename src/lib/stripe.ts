// ---------------------------------------------------------------------------
// Cliente Stripe — wrapper seguro para @stripe/stripe-js
// ---------------------------------------------------------------------------
//
// Carrega o Stripe.js de forma lazy (só quando necessário).
// Se VITE_STRIPE_PUBLISHABLE_KEY não estiver definida, o app funciona
// normalmente no plano Free (sem funcionalidades de pagamento).
//
// O checkout e o portal usam redirecionamento direto via URL
// retornada pela Cloud Function — sem necessidade de redirectToCheckout.
// ---------------------------------------------------------------------------

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { createLogger } from './logger';

const log = createLogger('stripe');

/** Instância singleton do Stripe */
let stripePromise: Promise<Stripe | null>;

/**
 * Inicializa (ou retorna) a promise do Stripe.js.
 * Retorna null se a chave pública não estiver configurada — o app
 * continua funcionando no modo gratuito.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

    if (!publishableKey) {
      log.info('VITE_STRIPE_PUBLISHABLE_KEY não definida — Stripe desabilitado');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }

  return stripePromise;
}

/**
 * Redireciona o usuário para o checkout do Stripe.
 *
 * Chama a Cloud Function `createCheckout` para gerar uma sessão
 * e redireciona o browser para a página de pagamento.
 *
 * @returns URL do checkout ou null se Stripe não estiver configurado.
 */
export async function redirectToCheckout(params: {
  priceId: string;
  userId: string;
  locale: string;
  firebaseToken: string;
}): Promise<string | null> {
  const stripe = await getStripe();

  if (!stripe) {
    log.warn('Checkout solicitado, mas Stripe não está configurado');
    return null;
  }

  try {
    // Chama a Cloud Function para criar a sessão de checkout
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;
    const response = await fetch(
      `https://southamerica-east1-${projectId}.cloudfunctions.net/stripeApi/checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.firebaseToken}`,
        },
        body: JSON.stringify({
          priceId: params.priceId,
          locale: params.locale,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Erro ao criar sessão de checkout', { status: response.status, error: errorText });
      throw new Error(`Erro ao criar sessão de checkout: ${response.status}`);
    }

    const data = await response.json() as { url: string };

    // Redireciona para a URL do checkout retornada pelo Stripe
    window.location.href = data.url;

    return data.url;
  } catch (error) {
    log.error('Falha no checkout', { error });
    throw error;
  }
}

/**
 * Redireciona o usuário para o Customer Portal do Stripe.
 *
 * @returns URL do portal ou null se Stripe não estiver configurado.
 */
export async function redirectToPortal(params: {
  userId: string;
  firebaseToken: string;
}): Promise<string | null> {
  const stripe = await getStripe();

  if (!stripe) {
    log.warn('Portal solicitado, mas Stripe não está configurado');
    return null;
  }

  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;
    const response = await fetch(
      `https://southamerica-east1-${projectId}.cloudfunctions.net/stripeApi/portal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.firebaseToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Erro ao criar sessão do portal', { status: response.status, error: errorText });
      throw new Error(`Erro ao criar sessão do portal: ${response.status}`);
    }

    const data = await response.json() as { url: string };
    window.location.href = data.url;

    return data.url;
  } catch (error) {
    log.error('Falha no portal', { error });
    throw error;
  }
}
