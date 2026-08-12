# Billing — provider-agnostic (Phase C)

The app never talks to a payment provider directly. It talks to a `BillingProvider`
interface (`src/billing/types.ts`). You pick the implementation with one env var:

```
BILLING_PROVIDER=mock        # default — demo, applies plans instantly, no charge
BILLING_PROVIDER=stripe      # after you implement src/billing/stripeProvider.ts
BILLING_PROVIDER=razorpay    # after you implement src/billing/razorpayProvider.ts
```

## What works today (mock)

- Dashboard → **Plan & quota** → **Upgrade to Pro / Team**.
- The button calls `POST /billing/checkout` (authenticated by the user's Supabase
  session). The mock provider applies the plan immediately and the dashboard
  refreshes — the quota you built lifts from 100 to 10,000 (Pro) or 50,000 (Team).
- No money changes hands; it's a demo of the full loop.

Requires the main API running: `npm run start:api` (port 8787).

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/billing/plans` | none | Returns the active provider + `PLAN_PRICING` |
| POST | `/billing/checkout` | user session JWT | Starts checkout; returns `{ url, demo? }` |
| POST | `/billing/webhook` | provider signature | Applies plan on payment (real providers) |

## The money flow (any provider)

```
Dashboard "Upgrade"
      │  POST /billing/checkout  (Bearer <supabase session jwt>)
      ▼
provider.createCheckout()  ──▶  mock: apply plan now, return dashboard URL
      │                         real: create session, return hosted checkout URL
      ▼
(real providers) user pays ──▶ provider webhook ──▶ /billing/webhook
      │                                                   │ verify signature
      ▼                                                   ▼
                                        applyPlanForUser(userId, plan)
                                        → api_keys.plan updated
                                        → quota middleware lifts the cap
```

## To switch to Stripe

1. `npm install stripe`
2. Fill in `src/billing/stripeProvider.ts` (the real calls are in the comments).
3. Create Products/Prices in the Stripe dashboard; map plan → price id.
4. Env: `BILLING_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`.
5. Point a Stripe webhook at `/billing/webhook`.

## To switch to Razorpay

1. `npm install razorpay`
2. Fill in `src/billing/razorpayProvider.ts`.
3. Create Plans in the Razorpay dashboard; map plan → plan id.
4. Env: `BILLING_PROVIDER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `APP_URL`.
5. Point a Razorpay webhook at `/billing/webhook`.

Because both live behind the same interface, nothing else in the app changes when
you pick one — the dashboard, quota enforcement, and plan storage stay identical.
