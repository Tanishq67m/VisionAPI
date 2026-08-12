import type { BillingProvider, CheckoutOptions, CheckoutResult, WebhookResult } from './types.js';
import { PLAN_PRICING } from './types.js';

/**
 * Stripe adapter — STUB. Wire this in only if you choose Stripe.
 *
 * To activate:
 *   1. npm install stripe
 *   2. Set env: BILLING_PROVIDER=stripe, STRIPE_SECRET_KEY=sk_..., STRIPE_WEBHOOK_SECRET=whsec_...
 *   3. Create Products/Prices in the Stripe dashboard, map their price IDs below.
 *   4. Replace the throws with the real calls shown in the comments.
 */
export const stripeProvider: BillingProvider = {
  name: 'stripe',

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY (or use BILLING_PROVIDER=mock).');
    }
    // ── Real implementation (uncomment after `npm install stripe`) ────────────
    // import Stripe from 'stripe';
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const priceId = STRIPE_PRICE_IDS[opts.plan]; // map plan -> Stripe Price ID
    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   success_url: opts.successUrl,
    //   cancel_url: opts.cancelUrl,
    //   client_reference_id: opts.userId,   // so the webhook knows which user
    //   metadata: { userId: opts.userId, plan: opts.plan },
    // });
    // return { url: session.url! };
    void PLAN_PRICING;
    throw new Error('Stripe checkout not implemented yet — this is a stub.');
  },

  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookResult> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET not set.');
    }
    // ── Real implementation ───────────────────────────────────────────────────
    // const event = stripe.webhooks.constructEvent(rawBody, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
    // if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.updated') {
    //   const s = event.data.object as any;
    //   return { handled: true, userId: s.metadata?.userId ?? s.client_reference_id, plan: s.metadata?.plan };
    // }
    // if (event.type === 'customer.subscription.deleted') {
    //   return { handled: true, userId: ..., plan: 'free' };
    // }
    void rawBody; void signature;
    return { handled: false };
  },
};
