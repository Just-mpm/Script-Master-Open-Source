// ---------------------------------------------------------------------------
// Cloud Functions — Stripe Webhook + Checkout + Portal + Genkit Flows
// ---------------------------------------------------------------------------
//
// Funções Firebase v2 para integração Stripe:
//   - stripeWebhook: recebe eventos do Stripe (onRequest + Express)
//   - createCheckoutSession: cria sessão de checkout para assinatura
//   - createPortalSession: cria sessão do Customer Portal
//
// Flows Genkit (IA):
//   - ping: flow de teste — valida auth + App Check + Genkit
// ---------------------------------------------------------------------------

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import express from 'express';
import Stripe from 'stripe';

// Inicialização explícita do Firebase Admin SDK (necessário para Genkit flows)
initializeApp();

// ---------------------------------------------------------------------------
// Verificação de startup — App Check em produção
// ---------------------------------------------------------------------------
//
// Os flows de IA usam enforceAppCheck: true. Em produção, isso exige que
// o frontend tenha VITE_RECAPTCHA_SITE_KEY configurada e que o App Check
// esteja habilitado no Console do Firebase (seção App Check).
//
// Esta verificação NÃO bloqueia o deploy — apenas loga para alertar o
// operador durante o deploy e em cold starts.
// ---------------------------------------------------------------------------

if (process.env.FUNCTIONS_EMULATOR !== 'true') {
  console.log(
    '[index] 🛡️  Ambiente de produção detectado. Verifique:',
  );
  console.log(
    '[index]    → App Check habilitado no Console do Firebase?',
  );
  console.log(
    '[index]    → VITE_RECAPTCHA_SITE_KEY configurada no frontend?',
  );
  console.log(
    '[index]    → Sem App Check, todos os flows (audio, images, assistant, etc.) serão rejeitados.',
  );
}

// ---------------------------------------------------------------------------
// Variáveis de ambiente (.env)
// ---------------------------------------------------------------------------

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Flag que controla o acesso aos flows de IA durante o beta aberto.
 *
 * Quando 'true' (default atual): os flows de IA aceitam chamadas normalmente.
 * Quando !== 'true': o middleware openBetaGuard (genkit.ts) bloqueia as
 *   chamadas com erro 503, permitindo desligar os flows sem redeploy.
 *
 * Esta flag é preparatória para a Fase 5 (cobrança por créditos). Durante
 * o beta, permanece 'true' para acesso gratuito. Após o lançamento, será
 * desabilitada e substituída pela verificação de saldo de créditos.
 *
 * @see genkit.ts — middleware openBetaGuard
 */
const OPEN_BETA_ENABLED = process.env.OPEN_BETA_ENABLED === 'true';

if (!OPEN_BETA_ENABLED) {
  console.warn(
    '[index] OPEN_BETA_ENABLED !== "true" — os flows de IA devem ser protegidos pelo middleware openBetaGuard',
  );
}

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não configurada');
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' });
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Dados da assinatura persistidos no Firestore */
interface SubscriptionData {
  planId: 'free' | 'pro' | 'business';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converte um Stripe price ID em um PlanId do app.
 * Os price IDs devem ser configurados no Stripe Dashboard para cada plano.
 */
function planIdFromPriceId(priceId: string): 'free' | 'pro' | 'business' {
  // Extrai o plano via regex com word boundary: evita falsos positivos
  // quando o priceId contém "business" ou "pro" como substring acidental.
  const match = priceId.match(/\b(business|pro)\b/);
  if (match) {
    return match[1] as 'business' | 'pro';
  }
  return 'free';
}

/**
 * Converte o status da assinatura Stripe em status interno.
 */
function mapSubscriptionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    paused: 'paused',
  };
  return statusMap[status] ?? 'inactive';
}

/**
 * Constroi um objeto SubscriptionData a partir de uma subscription Stripe.
 * Aceita overrides opcionais para cobrir o caso de cancelamento (plano free, status canceled).
 */
function buildSubscriptionData(
  subscription: Stripe.Subscription,
  overrides?: Partial<Pick<SubscriptionData, 'planId' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'stripePriceId' | 'status' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'>>,
): SubscriptionData {
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = priceId ? planIdFromPriceId(priceId) : 'pro';

  return {
    planId,
    stripeCustomerId: typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId ?? null,
    status: mapSubscriptionStatus(subscription.status),
    currentPeriodEnd: subscription.items.data[0]?.current_period_end
      ? subscription.items.data[0].current_period_end * 1000
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Busca um usuario pelo stripeCustomerId no Firestore.
 * Retorna o userId ou null se nao encontrado.
 */
async function findUserByStripeCustomerId(
  db: Firestore,
  stripeCustomerId: string,
): Promise<string | null> {
  const userSnap = await db
    .collection('users')
    .where('stripeCustomerId', '==', stripeCustomerId)
    .limit(1)
    .get();

  if (userSnap.empty) {
    return null;
  }

  return userSnap.docs[0].id;
}

// ---------------------------------------------------------------------------
// Stripe Webhook (onRequest + Express)
// ---------------------------------------------------------------------------

const app = express();

// Handler do webhook — usa req.rawBody injetado pelo Firebase
async function handleWebhook(req: express.Request, res: express.Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  const webhookSecret = STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).send('Webhook secret not configured');
    return;
  }

  const stripeClient = getStripeClient();

  let event: Stripe.Event;

  try {
    // IMPORTANTE: Firebase injeta o raw body em req.rawBody
    // req.body já vem parseado — não usá-lo para verificação de assinatura
    event = stripeClient.webhooks.constructEvent(
      (req as unknown as { rawBody: string }).rawBody,
      sig,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[stripeWebhook] Verificação de assinatura falhou: ${message}`);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  const db = getFirestore();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (!userId) {
          console.error('[stripeWebhook] checkout.session.completed sem client_reference_id');
          break;
        }

        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
        const stripeSubscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (!stripeSubscriptionId) {
          console.error('[stripeWebhook] checkout.session.completed sem subscription');
          break;
        }

        // Busca detalhes da assinatura para obter o priceId
        const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);

        const subscriptionData = buildSubscriptionData(subscription, {
          stripeCustomerId: stripeCustomerId ?? null,
          stripeSubscriptionId,
        });

        await db.doc(`users/${userId}/subscription/current`).set(subscriptionData, { merge: true });

        // Salva stripeCustomerId no documento raiz para queries posteriores
        // (usado por subscription.updated e subscription.deleted)
        await db.doc(`users/${userId}`).set({
          stripeCustomerId: stripeCustomerId ?? null,
          updatedAt: Date.now(),
        }, { merge: true });

        console.log(`[stripeWebhook] Assinatura criada para ${userId}: plano ${subscriptionData.planId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!stripeCustomerId) {
          console.error('[stripeWebhook] subscription.updated sem customer');
          break;
        }

        const userId = await findUserByStripeCustomerId(db, stripeCustomerId);

        if (!userId) {
          console.error(`[stripeWebhook] Nenhum usuário encontrado com stripeCustomerId=${stripeCustomerId}`);
          break;
        }

        const subscriptionData = buildSubscriptionData(subscription);

        await db.doc(`users/${userId}/subscription/current`).set(subscriptionData, { merge: true });
        console.log(`[stripeWebhook] Assinatura atualizada para ${userId}: plano ${subscriptionData.planId}, status ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!stripeCustomerId) {
          console.error('[stripeWebhook] subscription.deleted sem customer');
          break;
        }

        const userId = await findUserByStripeCustomerId(db, stripeCustomerId);

        if (!userId) {
          console.error(`[stripeWebhook] Nenhum usuário encontrado com stripeCustomerId=${stripeCustomerId}`);
          break;
        }

        // Reverte para plano free — override dos campos calculados
        const subscriptionData = buildSubscriptionData(subscription, {
          planId: 'free',
          stripeSubscriptionId: null,
          stripePriceId: null,
          status: 'canceled',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });

        await db.doc(`users/${userId}/subscription/current`).set(subscriptionData, { merge: true });
        console.log(`[stripeWebhook] Assinatura cancelada para ${userId}: reverted para free`);
        break;
      }

      default:
        console.log(`[stripeWebhook] Evento não tratado: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Erro ao processar evento:', error);
    res.status(500).send('Internal Server Error');
  }
}

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

async function handleCreateCheckout(req: express.Request, res: express.Response): Promise<void> {
  // Verifica autenticação via token do Firebase Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized');
    return;
  }

  let decodedToken: { uid: string; email?: string | null };
  try {
    const auth = getAuth();
    decodedToken = await auth.verifyIdToken(authHeader.slice(7));
  } catch {
    res.status(401).send('Invalid token');
    return;
  }

  const { priceId, locale } = req.body as { priceId?: string; locale?: string };

  if (!priceId) {
    res.status(400).send('priceId is required');
    return;
  }

  const stripeClient = getStripeClient();
  const db = getFirestore();

  // Verifica se o usuário já tem um customer no Stripe
  const subSnap = await db.doc(`users/${decodedToken.uid}/subscription/current`).get();
  const existingCustomerId = subSnap.exists
    ? (subSnap.data() as SubscriptionData).stripeCustomerId
    : null;

  // Busca email do usuário para o checkout
  let customerEmail: string | undefined;
  try {
    const userRecord = await getAuth().getUser(decodedToken.uid);
    customerEmail = userRecord.email ?? undefined;
  } catch {
    // Se não conseguir buscar, continua sem email
  }

  const origin = req.headers.origin ?? 'https://script-master.pro';

  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: decodedToken.uid,
      customer: existingCustomerId ?? undefined,
      customer_email: existingCustomerId ? undefined : customerEmail,
      success_url: `${origin}/app/estudio?checkout=success`,
      cancel_url: `${origin}/app/estudio?checkout=canceled`,
      locale: locale === 'es' ? 'es' : locale === 'en' ? 'en' : 'pt-BR',
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[createCheckout] Erro ao criar sessão:', error);
    res.status(500).send('Failed to create checkout session');
  }
}

// ---------------------------------------------------------------------------
// Portal Session
// ---------------------------------------------------------------------------

async function handleCreatePortal(req: express.Request, res: express.Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).send('Unauthorized');
    return;
  }

  let decodedToken: { uid: string };
  try {
    const auth = getAuth();
    decodedToken = await auth.verifyIdToken(authHeader.slice(7));
  } catch {
    res.status(401).send('Invalid token');
    return;
  }

  const db = getFirestore();
  const subSnap = await db.doc(`users/${decodedToken.uid}/subscription/current`).get();

  if (!subSnap.exists) {
    res.status(404).send('No subscription found');
    return;
  }

  const data = subSnap.data() as SubscriptionData;

  if (!data.stripeCustomerId) {
    res.status(404).send('No Stripe customer found');
    return;
  }

  const stripeClient = getStripeClient();

  const origin = req.headers.origin ?? 'https://script-master.pro';

  try {
    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: data.stripeCustomerId,
      return_url: `${origin}/app/estudio`,
    });

    res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('[createPortal] Erro ao criar sessão do portal:', error);
    res.status(500).send('Failed to create portal session');
  }
}

// ---------------------------------------------------------------------------
// Rotas Express
// ---------------------------------------------------------------------------

// Middleware de guard: bloqueia todas as rotas quando billing está desabilitado
app.use((req, res, next) => {
  if (process.env.BILLING_ENABLED !== 'true') {
    res.status(503).json({ error: 'Billing is currently disabled' });
    return;
  }
  next();
});

app.post('/webhook', handleWebhook);
app.post('/checkout', handleCreateCheckout);
app.post('/portal', handleCreatePortal);

// ---------------------------------------------------------------------------
// Export — Cloud Function v2
// ---------------------------------------------------------------------------

export const stripeApi = onRequest(
  {
    cors: true,
    region: 'southamerica-east1',
  },
  app,
);

// ---------------------------------------------------------------------------
// Genkit Flows
// ---------------------------------------------------------------------------

export { ping } from './flows/ping.js';
export { assistant } from './flows/assistant.js';
export { inlineAssistant } from './flows/inline-assistant.js';
export { audio } from './flows/audio.js';
export { images } from './flows/images.js';
export { scenePrompts } from './flows/scene-prompts.js';
export { chunking } from './flows/chunking.js';
export { feedback } from './flows/feedback.js';
