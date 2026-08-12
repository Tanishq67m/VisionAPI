/**
 * Provider-agnostic billing layer.
 *
 * The rest of the app talks to a BillingProvider, never to Stripe/Razorpay
 * directly. To switch providers you set BILLING_PROVIDER and implement the two
 * methods below — nothing else in the codebase changes.
 */

export type PlanId = 'free' | 'pro' | 'team';

export interface PlanPrice {
  /** Amount in the smallest currency unit (cents / paise). 0 = free. */
  amount: number;
  currency: string;
  label: string;
  /** Monthly capture quota — mirrors src/lib/plans.ts. */
  captures: number;
}

export const PLAN_PRICING: Record<PlanId, PlanPrice> = {
  free: { amount: 0, currency: 'usd', label: 'Free', captures: 100 },
  pro: { amount: 2900, currency: 'usd', label: 'Pro', captures: 10_000 },
  team: { amount: 9900, currency: 'usd', label: 'Team', captures: 50_000 },
};

export function isPaidPlan(plan: string): plan is PlanId {
  return plan === 'pro' || plan === 'team';
}

export interface CheckoutOptions {
  userId: string;
  plan: PlanId;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  /** Where to send the user to complete payment (or, for the demo, straight back). */
  url: string;
  /** True when the plan was applied immediately without a real payment (mock only). */
  demo?: boolean;
}

export interface WebhookResult {
  handled: boolean;
  userId?: string;
  plan?: PlanId;
}

export interface BillingProvider {
  readonly name: string;
  /** Create a checkout session and return a URL to redirect the user to. */
  createCheckout(opts: CheckoutOptions): Promise<CheckoutResult>;
  /** Verify + parse a provider webhook. Returns the plan change to apply, if any. */
  handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<WebhookResult>;
}
