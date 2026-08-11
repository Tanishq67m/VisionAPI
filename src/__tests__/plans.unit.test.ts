import { PLAN_LIMITS, planLimit, normalizePlan, quotaStatus, monthStartISO, nextMonthStartISO } from '../lib/plans.js';

describe('plan limits', () => {
  test('known plans map to their limits', () => {
    expect(planLimit('free')).toBe(100);
    expect(planLimit('pro')).toBe(10_000);
    expect(planLimit('team')).toBe(50_000);
  });
  test('unknown / null plans default to free', () => {
    expect(planLimit('enterprise')).toBe(PLAN_LIMITS.free);
    expect(planLimit(null)).toBe(PLAN_LIMITS.free);
    expect(planLimit(undefined)).toBe(PLAN_LIMITS.free);
  });
  test('normalizePlan clamps to a known plan', () => {
    expect(normalizePlan('pro')).toBe('pro');
    expect(normalizePlan('nonsense')).toBe('free');
  });
});

describe('quotaStatus', () => {
  test('under the limit is not exceeded', () => {
    const s = quotaStatus('free', 40);
    expect(s).toMatchObject({ plan: 'free', limit: 100, used: 40, remaining: 60, exceeded: false });
  });
  test('at the limit is exceeded', () => {
    expect(quotaStatus('free', 100).exceeded).toBe(true);
    expect(quotaStatus('free', 100).remaining).toBe(0);
  });
  test('over the limit clamps remaining to 0', () => {
    const s = quotaStatus('pro', 12_000);
    expect(s.exceeded).toBe(true);
    expect(s.remaining).toBe(0);
  });
});

describe('billing period boundaries', () => {
  test('monthStartISO is the 1st at 00:00:00 UTC', () => {
    const d = new Date(Date.UTC(2026, 2, 17, 9, 30, 0)); // 2026-03-17
    expect(monthStartISO(d)).toBe('2026-03-01T00:00:00.000Z');
  });
  test('nextMonthStartISO rolls the year over in December', () => {
    const d = new Date(Date.UTC(2026, 11, 25, 12, 0, 0)); // 2026-12-25
    expect(nextMonthStartISO(d)).toBe('2027-01-01T00:00:00.000Z');
  });
});
