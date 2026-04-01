# Vision-Ready Screenshot API — Week 1: Clean-Capture Engine

Clean, high-DPI JPEG screenshots optimized for vision LLMs. Strips cookie banners, modals, and UI noise so models spend tokens on content, not chrome.

## 🚀 What We Have Built So Far (Progress Log)

1. **Initial Project Scaffolding:** Set up the `src/` directory containing TypeScript files for the Core API (`captureForAI.ts`), browser utilities (`cleanPage.ts`, `smartWait.ts`), and the interactive CLI engine (`cli.ts`).
2. **TypeScript & Modern ESM Configuration:** Fully configured the project to run as a native ES Module (`"type": "module"`). Initialized `package.json` and a strict `tsconfig.json`. Migrated the execution engine from the flaky `ts-node` to the bulletproof `tsx` in order to perfectly execute `.js` ES imports inside `.ts` files synchronously.
3. **Dependencies Setup:** Installed Playwright correctly and added compilation setup via `tsc`. 
4. **Refactored WebP to JPEG Native Usage:** Discovered that modern Playwright `page.screenshot` strictly prohibits the `webp` type parameter natively. Safely pivoted the engine, CLI logic, and underlying Typescript models to expect and yield high-quality `jpeg` buffers—which are highly optimized and universally supported by GPT-4o and Claude APIs alike.
5. **CLI & Argument Fixes:** Refined the CLI configuration object dynamically to prevent `undefined` arguments (like `--width`) from overwriting the stable `1280x800` Playwright viewport internal defaults, resolving browser context crashes.
6. **Polished the Build Pipeline:** Configured `tsconfig.json` to actively exclude the mock `src/nextjs-route.stub.ts` file from local compilation. Since the stub simulates an `app/api/...` route that imports Next.js libraries, ignoring it ensures that `npm run build` succeeds immaculately for the independent API package.

## Project structure

```
src/
├── index.ts                  ← public API exports (import from here)
├── captureForAI.ts           ← main capture function + browser singleton
├── cli.ts                    ← local test runner (npx ts-node src/cli.ts <url>)
├── nextjs-route.stub.ts      ← Week 3 API route template
├── types/
│   └── capture.ts            ← all TypeScript types and interfaces
└── utils/
    ├── cleanPage.ts          ← CSS/JS overlay injection
    └── smartWait.ts          ← networkidle + selector wait strategy
```

## Setup

```bash
npm install
npx playwright install chromium   # downloads the browser binary
npm run build                     # compile TypeScript → dist/
```

## Quick test

```bash
# Basic capture — outputs capture.jpeg in current directory
npx tsx src/cli.ts https://example.com

# Full-page capture of a news site, waiting for the headline
npx tsx src/cli.ts https://bbc.co.uk --full-page --wait-for "h1"

# Compare raw vs. clean (useful for tuning selectors)
npx tsx src/cli.ts https://nytimes.com --no-clean --output nyt-raw.jpeg
npx tsx src/cli.ts https://nytimes.com --output nyt-clean.jpeg
```

## Usage in code

```typescript
import { captureForAI } from './src/index';

const result = await captureForAI({
  url: 'https://example.com',
  waitForSelector: 'article h1',   // optional: wait for main content
  fullPage: false,                  // viewport-only is faster
  skipClean: false,                 // true = raw capture for debugging
});

// result.buffer is a Buffer — pass to OpenAI / Anthropic vision APIs
// result.mimeType === 'image/jpeg'
// result.pageTitle, result.resolvedUrl, result.captureTimeMs, result.sizeBytes
```

## Passing to a vision LLM

### Anthropic (Claude)
```typescript
const base64 = result.buffer.toString('base64');

const response = await anthropic.messages.create({
  model: 'claude-opus-4-5',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
      },
      { type: 'text', text: 'Extract the main headline and price from this page.' },
    ],
  }],
});
```

### OpenAI (GPT-4o)
```typescript
const base64 = result.buffer.toString('base64');
const dataUrl = `data:image/jpeg;base64,${base64}`;

const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: dataUrl } },
      { type: 'text', text: 'Extract the main headline and price from this page.' },
    ],
  }],
});
```

## CaptureOptions reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | required | Target URL to capture |
| `viewportWidth` | `number` | `1280` | Logical viewport width |
| `viewportHeight` | `number` | `800` | Logical viewport height |
| `deviceScaleFactor` | `number` | `2` | 2 = Retina/HiDPI output |
| `fullPage` | `boolean` | `false` | Capture full scrollable height |
| `timeoutMs` | `number` | `30000` | Max wait time in ms |
| `waitForSelector` | `string` | — | CSS selector to confirm content loaded |
| `blockResourceTypes` | `ResourceType[]` | `['font','media']` | Resource types to block |
| `skipClean` | `boolean` | `false` | Skip overlay removal (debug mode) |

## Week 2 preview — MCP Server

Once this engine is working, wrap `captureForAI` in an MCP tool:

```typescript
server.registerTool('capture_clean_view', {
  title: 'Capture Clean View',
  description: 'Take a vision-optimized screenshot of any URL, stripped of cookie banners and UI noise.',
  inputSchema: { url: z.string().url(), waitForSelector: z.string().optional() },
}, async ({ url, waitForSelector }) => {
  const result = await captureForAI({ url, waitForSelector });
  return {
    content: [{
      type: 'image',
      data: result.buffer.toString('base64'),
      mimeType: 'image/jpeg',
    }],
  };
});
```

## Week 3 preview — Next.js API route

See `src/nextjs-route.stub.ts` — copy to `app/api/capture/route.ts` in your Next.js project. Add Supabase key auth and S3 upload in the marked TODO sections.