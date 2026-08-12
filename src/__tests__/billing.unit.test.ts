import { PLAN_PRICING, isPaidPlan } from '../billing/types.js';
import { getBillingProvider } from '../billing/index.js';

describe('billing pricing', () => {
  test('pro and team are paid; free is not', () => {
    expect(isPaidPlan('pro')).toBe(true);
    expect(isPaidPlan('team')).toBe(true);
    expect(isPaidPlan('free')).toBe(false);
    expect(isPaidPlan('nonsense')).toBe(false);
  });

  test('prices and quotas are defined', () => {
    expect(PLAN_PRICING.free.amount).toBe(0);
    expect(PLAN_PRICING.pro.amount).toBe(2900);
    expect(PLAN_PRICING.team.amount).toBe(9900);
    expect(PLAN_PRICING.pro.captures).toBe(10_000);
    expect(PLAN_PRICING.team.captures).toBe(50_000);
  });
});

describe('billing provider selection', () => {
  const original = process.env.BILLING_PROVIDER;
  afterEach(() => {
    if (original === undefined) delete process.env.BILLING_PROVIDER;
    else process.env.BILLING_PROVIDER = original;
  });

  test('defaults to the mock provider', () => {
    delete process.env.BILLING_PROVIDER;
    expect(getBillingProvider().name).toBe('mock');
  });

  test('selects stripe or razorpay by env', () => {
    process.env.BILLING_PROVIDER = 'stripe';
    expect(getBillingProvider().name).toBe('stripe');
    process.env.BILLING_PROVIDER = 'razorpay';
    expect(getBillingProvider().name).toBe('razorpay');
  });
});
