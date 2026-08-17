# Vision-Ready Screenshot API — Week 2: MCP Server

This turns your Playwright capture engine into a **Universal Plugin** that Claude Desktop,
Cursor, and any MCP-compatible AI agent can call directly.

---

## File structure (new files this week)

```
src/
├── mcp-server.ts          ← NEW: the MCP server (stdio transport)
├── utils/
│   └── cleanPage.ts       ← UPDATED: OVERLAY_SELECTORS now exported
package.json               ← UPDATED: adds @modelcontextprotocol/sdk, zod, tsx
claude_desktop_config.json ← NEW: paste into your Claude config file
```

---

## Step 1: Install new dependencies

```bash
npm install
npx playwright install chromium   # if not already done
```

You should now have:
- `@modelcontextprotocol/sdk` — the official MCP TypeScript SDK
- `zod` — runtime schema validation for tool inputs
- `tsx` — fast TypeScript execution (replaces ts-node for the MCP script)

---

## Step 2: Test the MCP server locally

Before connecting Claude Desktop, verify the server starts cleanly:

```bash
npm run mcp
```

You should see on stderr (not stdout — that's intentional):
```
[vision-mcp] vision-screenshot-mcp-server ready (stdio)
```

The server is now waiting on stdin for MCP protocol messages.
Press `Ctrl+C` to stop it.

### Test with MCP Inspector (recommended)

The MCP Inspector is an interactive browser-based tool to call your tools
without needing Claude Desktop:

```bash
npm run inspector
```

This opens a browser UI where you can:
1. See your registered tools (`capture_clean_view`, `list_clean_selectors`)
2. Call them with test inputs
3. See the full image response

---

## Step 3: Connect to Claude Desktop

### Find your config file

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

If the file doesn't exist yet, create it.

### Edit the config

Open `claude_desktop_config.json` from this project and **replace the path**. We already generated it with the absolute path for this project:

```json
{
  "mcpServers": {
    "vision-api": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/tanishqmohod/VisionAPI/src/mcp-server.ts"
      ]
    }
  }
}
```

### If you already have other MCP servers configured

Merge your `vision-api` entry into the existing `mcpServers` object in Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "existing-server": { ... },
    "vision-api": {
      "command": "npx",
      "args": ["tsx", "/Users/tanishqmohod/VisionAPI/src/mcp-server.ts"]
    }
  }
}
```

### Restart Claude Desktop

Fully quit and reopen Claude Desktop (menu bar → Quit, not just close the window).

### Verify the connection

Look for the 🔨 hammer icon or tool count badge in the Claude Desktop chat input.
Click it to see your tools:
- `capture_clean_view`
- `list_clean_selectors`

---

## Step 4: Test prompts

Once connected, try these in Claude Desktop:

```
Use my Vision API to capture stripe.com/pricing and tell me what the cheapest plan costs.
```

```
Take a clean screenshot of the BBC homepage and summarize the top 3 headlines.
```

```
Use the Vision API to capture amazon.com/deals — what's the featured deal of the day?
```

```
Show me what selectors the Vision API removes from pages.
```

You'll see Claude:
1. Call `capture_clean_view` with the URL
2. Receive the WebP image
3. Analyze it with its own vision and answer your question

---

## Tools reference

### `capture_clean_view`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Target URL (http/https) |
| `full_page` | boolean | false | Capture full scrollable height |
| `wait_for_selector` | string | — | CSS selector to confirm content loaded |
| `viewport_width` | number | 1280 | Logical width (output = 2× this) |
| `skip_clean` | boolean | false | Raw capture for debugging |
| `timeout_ms` | number | 30000 | Max wait in milliseconds |

### `list_clean_selectors`

No parameters. Returns the full list of CSS selectors used to remove overlays.

---

## Troubleshooting

### "Tool not found" in Claude Desktop

Restart Claude Desktop fully (Quit, don't just close). The config is only read at startup.

### Server won't start — `tsx: command not found`

```bash
npm install   # installs tsx locally
npx tsx src/mcp-server.ts   # use npx to run local tsx
```

### "Cannot find module" errors

Make sure all source files from Week 1 are present:
```
src/
├── captureForAI.ts
├── index.ts
├── types/capture.ts
├── utils/cleanPage.ts    ← must have OVERLAY_SELECTORS exported
└── utils/smartWait.ts
```

### Playwright browser not found

```bash
npx playwright install chromium
```

### Image returns but is blank / all white

The page probably blocked Playwright's user agent. Check the `resolved_url` in the
response — if it redirected to a login page or CAPTCHA, that site blocks headless browsers.

### Capture times out on a specific site

Add a `wait_for_selector` hint. For news sites: `"article h1"`. For e-commerce: `".product-title"`.
Also try increasing `timeout_ms` to `45000`.

---

## What's next (Week 3)

- Wrap `captureForAI` in a Next.js App Router API route (see `src/nextjs-route.stub.ts`)
- Add Supabase API key management and usage credits
- Upload screenshots to S3/Supabase Storage with 24h TTL
- Return a signed URL instead of raw base64 (better for high-volume use)
