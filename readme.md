<div align="center">

# VisionStream

**The perception layer for AI agents.**

One API call returns a cleaned screenshot **and** the page's structure — every link, form, table, and button with a bounding box — so an agent can *see* any web interface and act on it.

`beta` · `Node 20+` · `TypeScript` · `Playwright` · `MCP`

</div>

---

## Why it exists

Most tools turn the web into text (markdown) for a model to read. That's the right call for research, RAG, and summarizing. But agents are moving from *reading* the web to *operating* it — logging in, clicking, filling forms, verifying what's on screen. Two common approaches each give you half of what that needs:

- **Screenshot only** — the model guesses from pixels: wasted vision tokens, wrong coordinates, hallucinated buttons.
- **Text / markdown only** — clean to read, but blind to layout, coordinates, and interactivity.

VisionStream returns **both halves of perception**: the cleaned image *and* the coordinate-grounded structure of the interface.

## What you get

| | |
|---|---|
| **Observe API** | Structured JSON — headings, buttons, links, forms, tables, images, and interactive elements, each with a bounding box, plus a `counts` summary. |
| **Capture API** | A clean, vision-optimized screenshot with cookie banners, ads, and chrome stripped (typically 30–60% fewer vision tokens). |
| **MCP server** | Call VisionStream directly from Claude Desktop, Cursor, and other MCP clients. |
| **TypeScript SDK** | A typed client for the REST API. |

## Quickstart (local)

```bash
# Prerequisites: Node 20+
npm install
npx playwright install chromium

# Try the playground (no signup)
npm run playground:server   # engine backend  → :3001
npm run playground:ui       # web UI          → :3000
# open http://localhost:3000/playground

# Or run the REST API
npm run start:api           # → http://localhost:8787
```

Then:

```bash
curl -s -X POST http://localhost:8787/observe \
  -H "Authorization: Bearer <YOUR_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://news.ycombinator.com"}'
```

## API

**`POST /observe`** — structured understanding of a page.

```json
{
  "success": true,
  "data": {
    "observation": {
      "buttons": [{ "id": "btn-1", "text": "Login", "bbox": { "x": 24, "y": 12, "width": 80, "height": 32 } }],
      "links": [{ "text": "Pricing", "href": "https://…" }],
      "tables": [{ "headers": ["Rank", "Title"], "rowCount": 92 }],
      "counts": { "links": 196, "buttons": 34, "interactiveElements": 227 }
    },
    "metadata": { "title": "…", "resolvedUrl": "https://…" },
    "processing_time": 2310
  }
}
```

**`POST /capture`** — a clean, vision-optimized screenshot (`image_url` is a short-lived signed URL).

Both endpoints authenticate with a Bearer API key. See [`docs`](http://localhost:3000/docs) for the full reference.

## Architecture

```
src/
  captureForAI.ts     Playwright capture + orchestration (SSRF-guarded)
  utils/observe.ts    Structured page extraction (the Observe engine)
  utils/cleanPage.ts  Overlay/chrome stripping
  utils/smartWait.ts  DOM-settle wait strategy
  utils/ssrfGuard.ts  Private/loopback/metadata address blocking
  server.ts           REST API (/observe, /capture, /billing)
  mcp-server.ts       MCP server
  middleware/         auth (hashed keys), quota, requireUser
  lib/                supabase (auth/db/storage), plans
  billing/            provider-agnostic billing (mock | stripe | razorpay)
sdk/                  TypeScript SDK
playground/           React app (landing, playground, docs, console)
```

Backing services: **Supabase** (auth, Postgres, storage). Frontend: **React + Vite**.

## Testing

```bash
npm run verify
```

Runs typechecks, unit tests (SSRF guard, plan/quota math, billing, URL validation, auth), a **deterministic engine test** (exact structure from a fixed HTML fixture, plus a regression guard), a live-site sanity test, an MCP smoke test, and an HTTP-layer check.

## Security

SSRF protection on the initial URL and redirects; API keys stored as SHA-256 hashes; screenshots in a private bucket behind short-lived signed URLs; row-level security on all user data. Details in [`VISIONSTREAM_PLAN.md`](./docs/internal/VISIONSTREAM_PLAN.md).

## Status

Beta / customer-finding. The **playground is live**; hosted API keys, the Console, payments, and deploy are in progress — tracked in [`VISIONSTREAM_PLAN.md`](./docs/internal/VISIONSTREAM_PLAN.md). Positioning lives in [`STORY.md`](./docs/internal/STORY.md).

## License

Private beta — licensing TBD. Contact **hello@visionstream.dev**.
