import type { BillingProvider, CheckoutOptions, CheckoutResult, WebhookResult } from './types.js';

/**
 * Demo billing provider — no real payment. It applies the requested plan
 * immediately so the whole upgrade flow works end to end for demos and local
 * testing. Swap BILLING_PROVIDER to 'stripe' or 'razorpay' when you're ready
 * to charge real money.
 */
export const mockProvider: BillingProvider = {
  name: 'mock',

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    // Apply the plan right away (there is no payment step in the demo).
    const { applyPlanForUser } = await import('../lib/supabase.js');
    await applyPlanForUser(opts.userId, opts.plan);
    return { url: opts.successUrl, demo: true };
  },

  async handleWebhook(): Promise<WebhookResult> {
    // The mock provider fulfils synchronously in createCheckout, so there is no
    // webhook to process.
    return { handled: false };
  },
};
