/**
 * Plan definitions and quota math. Pure and dependency-free so it can be
 * unit-tested deterministically. The database counting lives in the middleware.
 */

export type Plan = 'free' | 'pro' | 'team';

/** Monthly capture quota per plan. */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: 100,
  pro: 10_000,
  team: 50_000,
};

/** Resolve a (possibly unknown) plan string to its monthly limit, defaulting to free. */
export function planLimit(plan: string | null | undefined): number {
  if (plan && plan in PLAN_LIMITS) return PLAN_LIMITS[plan as Plan];
  return PLAN_LIMITS.free;
}

/** Normalize an arbitrary plan string to a known Plan, defaulting to 'free'. */
export function normalizePlan(plan: string | null | undefined): Plan {
  return plan && plan in PLAN_LIMITS ? (plan as Plan) : 'free';
}

/** ISO timestamp for the start of the current UTC calendar month (the billing period). */
export function monthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** ISO timestamp for the start of next month — when the quota resets. */
export function nextMonthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export interface QuotaStatus {
  plan: Plan;
  limit: number;
  used: number;
  remaining: number;
  exceeded: boolean;
}

/** Compute quota status from a raw usage count and plan. */
export function quotaStatus(plan: string | null | undefined, used: number): QuotaStatus {
  const p = normalizePlan(plan);
  const limit = PLAN_LIMITS[p];
  const remaining = Math.max(0, limit - used);
  return { plan: p, limit, used, remaining, exceeded: used >= limit };
}
