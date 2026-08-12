import type { BillingProvider, CheckoutOptions, CheckoutResult, WebhookResult } from './types.js';

/**
 * Razorpay adapter — STUB. Wire this in only if you choose Razorpay.
 *
 * To activate:
 *   1. npm install razorpay
 *   2. Set env: BILLING_PROVIDER=razorpay, RAZORPAY_KEY_ID=..., RAZORPAY_KEY_SECRET=...,
 *      RAZORPAY_WEBHOOK_SECRET=...
 *   3. Create Plans in the Razorpay dashboard, map their plan IDs below.
 *   4. Replace the throws with the real calls shown in the comments.
 *
 * Note: Razorpay's flow differs from Stripe — you typically create a
 * Subscription and open Razorpay Checkout on the client with the subscription
 * id, then confirm via webhook (subscription.charged / subscription.activated).
 */
export const razorpayProvider: BillingProvider = {
  name: 'razorpay',

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID/SECRET (or use BILLING_PROVIDER=mock).');
    }
    // ── Real implementation (uncomment after `npm install razorpay`) ──────────
    // import Razorpay from 'razorpay';
    // const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    // const sub = await rzp.subscriptions.create({
    //   plan_id: RAZORPAY_PLAN_IDS[opts.plan],
    //   total_count: 12,
    //   notes: { userId: opts.userId, plan: opts.plan },
    // });
    // // Return a hosted page, or return sub.id and open Razorpay Checkout on the client.
    // return { url: sub.short_url as string };
    void opts;
    throw new Error('Razorpay checkout not implemented yet — this is a stub.');
  },

  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookResult> {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET not set.');
    }
    // ── Real implementation ───────────────────────────────────────────────────
    // const crypto = await import('crypto');
    // const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');
    // if (expected !== signature) return { handled: false };
    // const event = JSON.parse(rawBody.toString());
    // if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
    //   const notes = event.payload.subscription.entity.notes;
    //   return { handled: true, userId: notes.userId, plan: notes.plan };
    // }
    void rawBody; void signature;
    return { handled: false };
  },
};
