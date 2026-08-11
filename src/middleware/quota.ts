import type { Request, Response, NextFunction } from 'express';
import { planLimit, monthStartISO, nextMonthStartISO, normalizePlan } from '../lib/plans.js';

// Lazy-load the DB counter so this module doesn't pull supabase.ts (import.meta)
// into unit-test module graphs that only exercise the pure plan math.
type CountFn = (apiKeyId: string, sinceIso: string) => Promise<number>;
let _count: CountFn | null = null;
async function getCounter(): Promise<CountFn> {
  if (!_count) {
    _count = (await import('../lib/supabase.js')).countKeyUsageThisMonth as CountFn;
  }
  return _count;
}

/**
 * Enforce the per-plan monthly capture quota. Must run AFTER requireAuth (which
 * sets req.apiKeyId + req.apiKeyPlan). Adds X-RateLimit-* headers and returns
 * 429 once the plan's monthly limit is reached.
 */
export async function enforceQuota(req: Request, res: Response, next: NextFunction) {
  const apiKeyId = req.apiKeyId;
  const plan = normalizePlan(req.apiKeyPlan);
  const limit = planLimit(plan);

  if (!apiKeyId) {
    // Should never happen if requireAuth ran first, but fail closed.
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  let used = 0;
  try {
    const count = await getCounter();
    used = await count(apiKeyId, monthStartISO());
  } catch (err) {
    // If usage can't be counted, don't hard-block paying traffic — allow and log.
    console.error('[VisionStream] quota check failed (allowing request):', err);
    return next();
  }

  const remaining = Math.max(0, limit - used);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', nextMonthStartISO());

  if (used >= limit) {
    return res.status(429).json({
      error: `Monthly quota reached: ${used}/${limit} captures on the ${plan} plan. Upgrade for more, or wait until the quota resets.`,
      plan,
      limit,
      used,
      resetsAt: nextMonthStartISO(),
    });
  }

  next();
}
