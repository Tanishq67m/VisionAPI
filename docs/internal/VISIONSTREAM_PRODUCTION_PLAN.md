# VisionStream — Production & Monetization Plan

*Prepared July 2026 · Budget target: under $30/month · Focus: harden what exists, then charge for it*

---

## 1. The honest starting point

You are much further along than the vision doc implies. This is not a prototype — it is a working V1 that already has the skeleton of a real SaaS. Before spending a rupee or writing a new feature, it's worth being precise about what you actually have:

**Already built and working**

- A real capture engine: Playwright + stealth, DOM settle waits (`smartWait`), aggressive overlay stripping (`cleanPage`), interactive-element extraction (`domExtractor`), high-DPI JPEG output tuned for vision models.
- A REST API (`src/server.ts`) with `/capture`, bearer-token auth, an in-memory concurrency queue, IP rate limiting, and Swagger docs at `/docs`.
- Supabase wired in: `api_keys` and `requests` tables, request metering (latency, bytes, tokens saved, cost saved), and image upload to Supabase Storage.
- An MCP server (`src/mcp-server.ts`) exposing `capture_clean_view` — this is a genuine differentiator; most screenshot APIs have no MCP story.
- A TypeScript SDK (`sdk/index.ts`) with a `VisionStream` class.
- A React dashboard/playground (Supabase Auth login, dashboard, live playground).
- Dockerfile + Render deploy config, a benchmark tool, and a Jest test suite.

**The gap between "works on my machine" and "someone pays for it"** is almost entirely *hardening, trust, and billing* — not features. That matches your instinct to harden first. The Observe/Act/Session/Workflow APIs from the vision doc are real and worth building, but they are V2+. None of them matter if a customer can't sign up, get a key that isn't stored in plaintext, hit a quota, and be charged.

So this plan does two things: (1) a concrete, prioritized hardening roadmap to make the *current* product safe to sell, and (2) the exact, cheapest stack to run and monetize it.

---

## 2. Production gaps found in the current code

I read through `server.ts`, `middleware/auth.ts`, `lib/supabase.ts`, and `captureForAI.ts`. These are the real gaps, ordered by how much they should worry you. The first three are the ones that can actually hurt you.

### Critical — fix before any public launch

**SSRF (server-side request forgery) — the single most important fix.** `captureForAI` accepts any `http`/`https` URL and navigates a real browser to it. Right now nothing stops a user from sending `http://169.254.169.254/latest/meta-data/` (cloud metadata / credentials), `http://localhost:port`, or private ranges like `10.x`, `192.168.x`, `172.16.x`. A screenshot service is a classic SSRF vector because it fetches URLs *on your infrastructure* and hands the result back. You must resolve the hostname and reject any URL that points at private, loopback, link-local, or metadata IP ranges — before the browser navigates, and again on redirects. This is non-negotiable for a hosted product.

**API keys stored in plaintext.** `api_keys.key_value` holds the raw key and auth does an exact-string lookup (`.eq('key_value', key)`). If your database is ever leaked or read by anyone with access, every customer key is exposed. The fix: generate a key like `vs_live_<random>`, show it to the user exactly once, and store only a SHA-256 hash plus a short non-secret prefix (e.g. `vs_live_a1b2…`) for display. Look up by hash. Also remove the hardcoded `vs_test_123456789` key from the schema before launch.

**No per-customer quota or plan enforcement.** The `requests` table logs usage beautifully but nothing reads it back to *stop* a user who has blown past their plan. Without this there is no Free vs Pro distinction and nothing to meter billing against. You need a cheap check on each request: count this key's usage in the current period, compare to the plan limit, return `429` with an upgrade message when over.

### High — fix before you take money

**No billing at all.** There is no Stripe, no plans table, no way to collect payment. Covered in section 5.

**Rate limiting is global, not per-key.** `express-rate-limit` currently limits by IP across the whole service (100 / 15 min). One noisy user throttles everyone; a distributed caller bypasses it. Rate limits should be per API key and ideally per plan tier.

**Row-Level Security is enabled but the API uses the service-role key**, which bypasses RLS entirely. That's fine for the server, but it means all multi-tenant safety currently lives in your application code, which is thin. The dashboard (anon key) needs real RLS policies so a logged-in user can only ever read their own keys and requests. Also, `api_keys.user_id` is nullable and unlinked to `auth.users`, so the dashboard isn't truly multi-tenant yet.

**Captures are uploaded to a public Storage bucket with permanent, guessable-ish URLs.** Screenshots can contain sensitive content (a customer capturing their own logged-in dashboards, for example). Use a private bucket with short-lived signed URLs, and set a retention/expiry policy so images don't accumulate forever (also protects your 1 GB free storage limit).

### Medium — fix in the first few weeks

- **Error tracking / structured logging.** Right now errors go to `console.error` and vanish. You can't run a paid API blind. Add Sentry (free tier) and structured request logs.
- **CORS is wide open** (`app.use(cors())`). The public `/capture` endpoint being open is fine, but lock down any dashboard/account endpoints to your own origin.
- **Browser resilience.** One browser singleton per instance with `concurrency: 2`. If Chromium crashes, add auto-relaunch; add a hard per-capture timeout and a cap on `fullPage` height so one giant page can't exhaust memory. Consider blocking huge downloads.
- **Auth tests.** You have tests for `cleanPage`, capture integration, and MCP smoke, but none for auth/quota/billing — exactly the money-critical paths. Add them.
- **Secret hygiene.** `.env` is correctly gitignored and not tracked (good). Before going public, rotate the Supabase service-role key once (it's been in a local `.env` through a lot of commits) and store production secrets only in the host's secret manager.

### Low — nice to have

- Request ID on every response for support/debugging.
- A real `/health` readiness check that verifies the browser can launch, not just returns `ok`.
- OpenAPI/Swagger kept in sync with real responses so the SDK and docs never drift.

---

## 3. The hardening roadmap (phased)

This is the sequence I'd follow. Each phase is shippable on its own.

**Phase A — Make it safe (week 1).** SSRF allow/deny on URL resolution and redirects; hash API keys and migrate the schema; private Storage bucket with signed URLs + expiry; remove the test key; rotate the service-role key. After this, the API is safe to expose publicly even before billing.

**Phase B — Make it multi-tenant (week 1–2).** Link `api_keys.user_id` to `auth.users`; write RLS policies so dashboard users see only their own data; build key create/rotate/revoke in the dashboard (show the raw key once); per-key rate limiting.

**Phase C — Make it meterable (week 2).** A `plans` concept (Free / Pro / Team) and a usage-check middleware that reads `requests` for the current billing period and enforces the plan's monthly cap with a clean `429` + upgrade path. This is the bridge to billing.

**Phase D — Make it billable (week 2–3).** Stripe Checkout + Customer Portal + webhooks; map Stripe subscription status to the user's plan; self-serve upgrade/downgrade. Section 5 details this.

**Phase E — Make it observable (week 3).** Sentry, structured logs, uptime monitor, a status page. Add the money-path tests.

Realistically this is 2–4 focused weeks of work for the current single-endpoint product. When you want, I can implement any phase — Phase A (security) is the one I'd do first and is mostly self-contained.

---

## 4. What to actually buy — the under-$30 bootstrap stack

Your budget is the real constraint, and the good news is a browser-based API can run *very* cheap pre-revenue. The one thing that costs real money here is **RAM**, because headless Chromium wants roughly 1 GB to be reliable. That single fact drives the hosting choice.

### Hosting — where the current Render setup falls short

Render is a fine platform, but its pricing is awkward for browser workloads. The **Starter instance ($7/mo) only has 512 MB RAM**, which is not enough for reliable Chromium — you'll hit out-of-memory crashes. The next tier up that gives you ~2 GB is **Standard at $25/mo**, which eats almost your entire budget on hosting alone. So I'd move off Render for the API.

| Option | ~1 GB always-on cost | Notes |
|---|---|---|
| **Fly.io** (recommended) | **~$3–5/mo** | `shared-cpu-1x` with 1 GB ≈ $3.18/mo always-on. Pay-per-second, scale-to-zero possible. Cheapest reliable option for a browser box. |
| Railway Hobby | ~$5–10/mo | $5/mo plan includes $5 usage; RAM is ~$10/GB-month, so a 1 GB always-on service can exceed the included credit. Simplest DX. |
| Render Starter | $7/mo | 512 MB — **too small for Chromium**, will crash. Only viable if you offload the browser elsewhere. |
| Render Standard | $25/mo | Works, but blows the budget. |

**Recommendation: Fly.io.** ~$3–5/mo for a 1 GB machine, and you can add a second machine later for concurrency without re-architecting. Railway is the runner-up if you prefer its simpler dashboard.

### Database, Auth, Storage — Supabase

You're already on Supabase, so stay. **Start on the Free tier ($0):** 500 MB database, 1 GB file storage, 50k monthly active users, Auth included. One important catch — **free projects auto-pause after ~1 week of no API traffic.** For a live product that's unacceptable, but the fix is free: a scheduled uptime ping every few minutes (see monitoring) keeps it awake. Upgrade to **Supabase Pro ($25/mo)** only when you have paying customers — at that point $25 is trivial and it removes the pause, adds daily backups, and raises limits.

### Payments — Stripe

No monthly fee. You pay only when you get paid: **2.9% + 30¢ per transaction**, plus **0.7% for Stripe Billing** (subscriptions). On a $29 Pro subscription that's roughly **$1.36 total in fees** — you keep ~$27.64. There is no cheaper way to start collecting recurring payments with proper invoices, tax handling, and a self-serve customer portal.

### The rest — all free to start

- **Domain:** ~$10–13/year via Cloudflare Registrar or Namecheap (≈ $1/mo amortized). Get `visionstream.dev` or similar.
- **DNS + CDN:** Cloudflare, free.
- **Error monitoring:** Sentry Developer plan, free (5k errors/mo, plenty pre-scale).
- **Uptime + keep-Supabase-awake:** UptimeRobot or cron-job.org, free — pings your `/health` and a Supabase endpoint every 5 minutes.
- **Transactional email** (API-key emails, receipts, password resets beyond Supabase's built-in): Resend free tier (~3k emails/mo).

### Bottom line

| Item | Now (pre-revenue) | After first paying customers |
|---|---|---|
| Hosting (Fly.io, 1 GB) | ~$5 | ~$5–15 (add machines for concurrency) |
| Supabase | $0 (Free + keep-awake ping) | $25 (Pro) |
| Stripe | $0 fixed (per-txn only) | per-txn only |
| Domain (amortized) | ~$1 | ~$1 |
| Sentry / Uptime / Email | $0 | $0 |
| **Total fixed** | **~$6/month** | **~$30–40/month** |

You can run the whole thing **for about $6/month until you have revenue**, which is well inside your target. The jump to ~$30–40 only happens *after* customers exist, and by then it pays for itself.

---

## 5. Monetization — how to actually charge

Your pricing tiers from the vision doc are sensible. I'd tighten them slightly for launch:

- **Free** — 100 captures/month, public browser pool, community support. This is your funnel; make signup frictionless.
- **Pro — $29/month** — 10,000 captures, full API + MCP, dashboard, metrics, email support. This is your core revenue tier.
- **Team — $99/month** — shared projects, usage analytics, webhooks, team keys.
- **Enterprise — "contact us"** — dedicated infra, SSO, SLA. No self-serve; just a form.

**Pricing mechanics that matter:**

- **Meter on captures**, and enforce the cap with the Phase C usage check. Decide up front what happens at the limit: hard stop (`429`, cleaner, protects your costs) vs. soft overage billing (more revenue, more complexity). For launch, **hard stop with a one-click upgrade** is simpler and safer.
- **Know your unit cost.** At ~$5/mo Fly hosting you can serve a lot of captures, but each capture uses CPU/RAM for a few seconds. Roughly estimate captures-per-month your single machine handles, and make sure the Pro tier's 10k captures is comfortably within one machine's capacity (add a second $5 machine if not). The point of metering is that your worst-case customer can't cost you more than they pay.
- **The token-savings story is your marketing.** Your benchmark tool already computes how many vision tokens the cleaning saves. Put "saved you $X in model costs this month" on the dashboard — that's a concrete, quantified reason to stay subscribed that competitors don't have.

**How Stripe wires in (Phase D), concretely:**

1. Create 3 Products/Prices in Stripe (Free is just "no subscription").
2. "Upgrade" button → Stripe **Checkout** session → user pays.
3. Stripe **webhook** (`checkout.session.completed`, `customer.subscription.updated/deleted`) → your endpoint updates the user's `plan` in Supabase.
4. "Manage billing" button → Stripe **Customer Portal** (Stripe hosts the whole upgrade/downgrade/cancel/invoice UI — you build almost nothing).
5. Your usage-check middleware reads `plan` to pick the right monthly cap.

That's the entire billing system. Stripe Checkout + Portal means you don't build payment forms, dunning, invoices, or tax — Stripe does it.

---

## 6. Launch checklist

Before you flip it public and share the link:

- [ ] SSRF protection live and tested against `169.254.169.254`, `localhost`, and private ranges (incl. redirect hops).
- [ ] API keys hashed at rest; test key removed; service-role key rotated.
- [ ] RLS policies verified — log in as user A, confirm you cannot read user B's keys or requests.
- [ ] Private Storage bucket + signed URLs + image expiry.
- [ ] Per-plan quota enforced with a clean `429` + upgrade message.
- [ ] Stripe live mode: buy your own Pro plan end-to-end, confirm the webhook flips your plan.
- [ ] Sentry receiving errors; UptimeRobot pinging `/health` and keeping Supabase awake.
- [ ] Domain live over HTTPS; docs page (`/docs`) reachable; SDK README points at the real base URL.
- [ ] A 5-minute "hello world" in the docs: sign up → get key → first `curl` capture. First impressions are the whole game for a developer tool.
- [ ] Terms of Service + acceptable-use (you're fetching arbitrary URLs on users' behalf — spell out prohibited targets).

---

## 7. Beyond launch — the vision roadmap, sequenced

Your four-version plan is good. Mapped against effort and differentiation:

- **V1 (you're ~80% here):** hardened Capture API + dashboard + billing + MCP + SDK. Finish this. Ship it. Get 5 paying users.
- **V2 — Observe API:** return structured page understanding (buttons, forms, tables, headings, links with bounding boxes). You already have `domExtractor` — this is the closest, highest-value next feature and it's your real wedge vs. plain screenshot APIs. Do this *right after launch.*
- **V2.5 — Act API + Sessions:** persistent browser sessions (cookies/login) and `click`/`type`/`scroll`. This is the big lift — it turns you from "screenshots" into "agents can operate websites." Higher infra cost (long-lived browsers), so gate it behind Pro/Team.
- **V3 — Intelligence layer:** cleaning profiles per model, change detection / visual diffs, accessibility tree. Incremental on top of what you have.
- **V4 — Agent OS:** workflows, memory, framework integrations (LangGraph, CrewAI, OpenAI Agents SDK). This is where the "layer above Browserbase/Playwright" positioning becomes real — but it's a year out and only worth it once V1–V2 have traction.

**The one strategic note:** your sharpest, cheapest differentiator right now is the combination of *clean vision output + structured Observe data + a first-class MCP server.* That bundle is genuinely hard to find in one product. Lead with it. Don't try to out-scale Browserbase on raw browser infra — be the intelligence layer, exactly as your vision doc says.

---

## 8. Immediate next steps

1. **This week:** implement Phase A (security). It's self-contained and it's the thing standing between you and a public link you'd be embarrassed by. I can build it for you next session.
2. **Move the API to Fly.io** (~$5/mo) and put a keep-awake ping on Supabase so you can stay on the free tier honestly.
3. **Then Phases B→D** to get to a real signup → key → quota → payment loop.
4. Keep everything runnable locally for your own testing exactly as it is today — none of this removes the local dev flow.

When you're ready to build, tell me which phase and I'll start with the code.
