# VisionAPI — Vision-Ready Screenshot Engine & MCP Server

Clean, high-DPI JPEG screenshots optimized for vision LLMs. Strips cookie banners, modals, and UI noise so models spend tokens on content, not chrome. Now fully integrated as an **MCP (Model Context Protocol) Server** for seamless integration into Claude Desktop and other AI agents.

## 🚀 What We Have Built

1. **Clean-Capture Engine (Phase 1):** Built a high-performance Playwright-based engine (`captureForAI.ts`) that navigates to URLs, waits for the DOM to settle (`smartWait.ts`), and aggressively strips overlays (`cleanPage.ts`).
2. **Optimized for AI:** Outputs natively in high-quality JPEG to significantly reduce token sizes and file weight—universally supported by GPT-4o, Claude 3.5 Sonnet, and Gemini Pro Vision APIs.
3. **Model Context Protocol (MCP) Server (Phase 2):** Packaged the engine into a standard MCP server using the `@modelcontextprotocol/sdk`. This allows local AI agents (like Claude Desktop) to organically request vision-optimized screenshots on the fly.

## Project Structure

```text
src/
├── index.ts                  ← public API exports (import from here)
├── mcp-server.ts             ← 🚀 The MCP Server entry point
├── captureForAI.ts           ← main capture function + browser singleton
├── cli.ts                    ← local test runner (npx ts-node src/cli.ts <url>)
├── nextjs-route.stub.ts      ← API route template
├── types/
│   └── capture.ts            ← TypeScript definitions and interfaces
└── utils/
    ├── cleanPage.ts          ← CSS/JS overlay injection & "Janitor" logic
    └── smartWait.ts          ← networkidle + selector wait strategy
```

## Setup & Installation

Clone the repository, then install dependencies:

```bash
npm install
npx playwright install chromium   # downloads the browser binary
npm run build                     # compile TypeScript → dist/
```

## 🔨 Using the MCP Server (Claude Desktop)

We built an MCP server wrapping the capture engine, exposing two tools:
- **`capture_clean_view`**: Navigates to a URL, cleans the UI of cookie banners/modals, and returns a high-res image back to the Agent.
- **`list_clean_selectors`**: Exposes the CSS selectors used to strip elements securely.

**To connect your local VisionAPI to Claude Desktop:**
1. Determine your Claude desktop config location:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
2. Open the JSON file and paste the following configuration (replace `/absolute/path/to/VisionAPI` with your actual directory path):

```json
{
  "mcpServers": {
    "vision-api": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/VisionAPI/src/mcp-server.ts"]
    }
  }
}
```

3. **Restart Claude Desktop**. You should see a small `Hammer` icon 🔨 confirming `vision-api` is attached. You can now prompt Claude:
   - *"Use my Vision API to take a clean screenshot of the front page of Amazon and tell me what the top 'Deal of the Day' is."*

> [!WARNING]
> Because it is an STDIO-backed MCP Server, the application communicates securely via standard output. All custom server logs are tracked through `stderr` (`console.error`).

---

## 🛠 Usage in CLI (Quick Tests)

The engine can be run rapidly from the command line:

```bash
# Basic capture — outputs capture.jpeg in current directory
npx tsx src/cli.ts https://example.com

# Full-page capture of a news site, waiting for the headline
npx tsx src/cli.ts https://bbc.co.uk --full-page --wait-for "h1"

# Compare raw vs. clean (useful for tuning selectors)
npx tsx src/cli.ts https://nytimes.com --no-clean --output nyt-raw.jpeg
npx tsx src/cli.ts https://nytimes.com --output nyt-clean.jpeg
```

## 💻 Usage in Code (As a Library)

You can import the core engine dynamically inside other projects or routers.

```typescript
import { captureForAI } from './src/index';

const result = await captureForAI({
  url: 'https://example.com',
  waitForSelector: 'article h1',   // optional: wait for main content
  fullPage: false,                 // viewport-only is faster
  skipClean: false,                // true = raw capture for debugging
});

// result.buffer is a built-in Node Buffer
// result.mimeType === 'image/jpeg'
```

### Passing to a vision LLM

#### Anthropic (Claude)
```typescript
const base64 = result.buffer.toString('base64');

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-latest',
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

#### OpenAI (GPT-4o)
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

## CaptureOptions Reference

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

## Phase 3 Preview — Next.js API route

See `src/nextjs-route.stub.ts` — copy to `app/api/capture/route.ts` in your Next.js project. Add Supabase key auth and S3 upload in the marked TODO sections to securely host and store your images remotely.