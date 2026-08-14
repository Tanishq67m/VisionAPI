# VisionStream — Working Plan & Shared Language

*The single source of truth for what we're building, how it should feel, and what's next. Living doc — updated as we go.*

---

## 1. Shared language (so we stop talking past each other)

**Domain nouns**
- **Observation** — the structured understanding of a page (headings, buttons, links, forms, tables, images, interactive elements + counts). The core product.
- **Capture** — the cleaned, vision-optimized screenshot operation.
- **Element / bbox** — a detected element and its bounding box (image pixels).
- **Key → Plan → Quota** — the billing chain: an API key belongs to a plan (free/pro/team), which sets a monthly capture quota.
- **Playground** — the public, no-signup demo.
- **Console** — the authenticated dashboard (keys, usage, billing).

**Status labels** (I'll tag everything with these)
- 🟢 done · 🔵 building now · ⚪ planned · 🔴 needs-you (a decision or credential only you can provide)

**Command words** (fast, unambiguous)
- **"lock it"** — decision final, don't revisit · **"ship it"** — go build · **"park it"** — defer · **"grill me"** — ask questions before building

**Feedback-loop rule**
- Every build stays green on `npm run verify` (types + unit + integration + API layer). I flag when a module should be *restructured for testability* instead of patched.

---

## 2. Design DNA (locked via grilling — do not drift from this)

- **Feel:** developer-tool minimal (Linear / Vercel restraint) carrying **ARGUS-style product storytelling** (problem framing + the product shown working, with real motion). Calm surfaces, a few high-quality animated moments.
- **Theme:** dark everywhere. Near-black `#0a0a0b`, refined neutrals, one disciplined accent.
- **Audience:** AI-agent developers first. Copy is concrete, code-forward, specs over adjectives.
- **Anchor reference:** arguslabs.in (adapt the vibe, never the content).
- **Primary CTA:** "Get an API key" (issues a real free/beta key — we already built the flow).
- **Proof strategy:** live engine stats (real numbers from the actual engine — "191 elements from stripe.com", "41% fewer tokens"). No fake logos.
- **Motion:** ARGUS-level — animated product demos across sections, on restrained surfaces.

**Tokens (locked)**
- Accent: violet `#a78bfa` (hover `#8b6ef0`, soft `rgba(167,139,250,.12)`), used sparingly — CTAs, active states, code highlights, key marks.
- Background `#0a0a0b` · panel `#111114` · text `#f4f4f5` / secondary `#a1a1aa` / muted `#6b6b74` · border `#1f1f23`.
- Type: **Space Grotesk** (display headlines) + **Inter** (body) + SF Mono (code).
- Hero layout: centered statement + full-width animated product demo below.

---

## 3. Phase map

We run two tracks in parallel: **Product/Backend** (the plan's Phases A–E) and **UX/Marketing** (the launch surface). Launch = *Site + Playground live*.

### Product / Backend
- 🟢 **Phase A — Security:** SSRF guard, hashed API keys, private signed screenshot storage, test-key removed. *(unit-tested, verified)*
- 🟢 **Phase B — Multi-tenancy + quotas:** per-key plan, monthly quota enforcement (429 + headers), per-key burst limit, key revoke, live plan/usage in Console.
- 🟢 **Phase C — Payments (demo):** provider-agnostic billing layer; mock provider makes upgrade work end-to-end; Stripe + Razorpay adapters stubbed. 🔴 *needs-you: pick Stripe or Razorpay when ready.*
- ⚪ **Phase D — Deploy:** host API + frontend, domain, HTTPS, Supabase Pro, uptime + error monitoring. *(required for launch)*
- ⚪ **Phase E — Dev experience:** publish the JS SDK to npm, real hosted quickstart, decide on Python SDK (build or remove from docs).

### UX / Marketing (the redesign we just planned)
- 🟢 **U0 — Foundations:** violet accent + Space Grotesk applied cohesively across app.
- 🟢 **U1 — Landing rebuild:** centered statement hero, animated console demo (observe pipeline running), trust wall, problem marquee, "messy → one schema" visual, comparison, live-stats proof, pricing, FAQ, fixed footer. Built to the locked DNA. *(awaiting your visual sign-off)*
- ⚪ **U2 — Playground polish:** align to new DNA; make the demo the strongest single artifact.
- ⚪ **U3 — Docs + Console polish:** consistent look; Console shipped as "beta".

### Launch definition (end of month)
Live and polished: **landing + docs + playground**, deployed (Phase D), with the "Get an API key" flow issuing free/beta keys. Payments stay in demo mode. That's the bar.

---

## 4. Immediate next steps

1. 🔵 **U1 — rebuild the landing** to the locked DNA (this is the next build).
2. ⚪ Then U2 (playground) and U3 (docs/console) for visual consistency.
3. ⚪ Then Phase D (deploy) — the last thing between us and a shareable public link.

## 5. 🔴 Needs from you (nothing blocking right now)
- **Payments:** Stripe vs Razorpay — only when we move past demo billing (post-launch is fine).
- **Deploy (Phase D):** a domain + a host account (Fly.io recommended, ~$5/mo) + keeping Supabase awake. I'll give exact click-by-click steps when we get there.
- **Copy check:** you'll review headline/section wording once U1 is drafted.
