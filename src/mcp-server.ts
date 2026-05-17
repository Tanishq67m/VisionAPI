import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { captureForAI, closeBrowser, CaptureError } from "./index.js";

// ─── IMPORTANT: stdio servers must NEVER write to stdout ─────────────────────
// All logging goes to stderr. stdout is the MCP communication channel.
const log = (...args: unknown[]) => process.stderr.write(`[vision-mcp] ${args.join(' ')}\n`);

// ─── Server init ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "vision-screenshot-mcp-server",
  version: "1.0.0",
});

// ─── Tool: capture_clean_view ─────────────────────────────────────────────────
//
// Primary tool — full clean capture with all options exposed.

const CaptureSchema = z.object({
  url: z
    .string()
    .url("Must be a valid http/https URL")
    .describe("The URL to capture. Must start with http:// or https://."),

  full_page: z
    .boolean()
    .default(false)
    .describe(
      "If true, captures the full scrollable page height. " +
      "If false (default), captures only the visible viewport (faster, sufficient for most tasks)."
    ),

  wait_for_selector: z
    .string()
    .optional()
    .describe(
      "Optional CSS selector to wait for before capturing. " +
      "Use when the page's main content loads asynchronously. " +
      "Example: 'article h1', '.product-price', '#main-content'"
    ),

  viewport_width: z
    .number()
    .int()
    .min(320)
    .max(3840)
    .default(1280)
    .describe("Viewport width in logical pixels. Default 1280. Output is 2× this (high-DPI)."),

  skip_clean: z
    .boolean()
    .default(false)
    .describe(
      "If true, skips overlay removal and Reader Mode injection. " +
      "Useful for comparing raw vs. clean captures. Default false."
    ),

  timeout_ms: z
    .number()
    .int()
    .min(3000)
    .max(60000)
    .default(30000)
    .describe("Max milliseconds to wait for the page to load. Default 30000."),
});

server.registerTool(
  "capture_clean_view",
  {
    title: "Capture Clean View",
    description: `
Take a vision-optimized, high-DPI JPEG screenshot of any URL, with cookie banners,
modals, chat widgets, and UI noise automatically removed.

Designed for AI Vision pipelines. The output is a high-DPI JPEG image (2× viewport
resolution) with Reader Mode typography applied, making it significantly easier for
vision LLMs to extract text, prices, headlines, and structured data.

Cleaning removes: cookie/GDPR banners, modal overlays, newsletter popups, chat widgets
(Intercom, Drift, HubSpot), sticky headers, announcement bars, and paywall gates.

Returns the image as base64 JPEG along with metadata (title, resolved URL, dimensions,
capture time, file size).

Args:
  - url (string, required): The target URL. Must be http or https.
  - full_page (boolean, default false): Capture full scrollable height vs. viewport only.
  - wait_for_selector (string, optional): CSS selector to confirm content is loaded.
  - viewport_width (number, default 1280): Logical viewport width. Output is 2× this.
  - skip_clean (boolean, default false): Skip cleaning — useful for debugging.
  - timeout_ms (number, default 30000): Max wait time in milliseconds.

Returns:
  {
    "image_base64": string,      // base64-encoded JPEG image
    "mime_type": "image/jpeg",
    "page_title": string,        // <title> of the captured page
    "resolved_url": string,      // final URL after redirects
    "width_px": number,          // actual pixel width of output image
    "height_px": number,         // actual pixel height of output image
    "size_kb": number,           // file size in KB (rounded)
    "capture_time_ms": number,   // total capture duration
    "cleaned": boolean           // whether overlay removal was applied
  }

Examples:
  - "Take a screenshot of stripe.com pricing page" →
      { url: "https://stripe.com/pricing" }
  - "What's the top deal on Amazon today?" →
      { url: "https://amazon.com/deals", wait_for_selector: ".deal-card" }
  - "Capture the full BBC homepage" →
      { url: "https://bbc.co.uk", full_page: true }
  - "Show me what this staging URL looks like (raw, no cleaning)" →
      { url: "https://staging.example.com", skip_clean: true }

Error codes:
  - INVALID_URL: URL is malformed or not http/https
  - NAVIGATION_FAILED: Page could not be loaded (DNS, 4xx/5xx, blocked)
  - TIMEOUT: Page did not settle within timeout_ms
  - SELECTOR_NOT_FOUND: wait_for_selector not found within timeout
  - BROWSER_CRASH: Unexpected Playwright failure
`.trim(),

    inputSchema: CaptureSchema,

    annotations: {
      readOnlyHint: true,       // We read the web, never write to it
      destructiveHint: false,
      idempotentHint: true,     // Same URL = same screenshot (deterministic enough)
      openWorldHint: true,      // We access arbitrary external URLs
    },
  },

  async (params) => {
    const {
      url,
      full_page,
      wait_for_selector,
      viewport_width,
      skip_clean,
      timeout_ms,
    } = params;

    log(`capture_clean_view called: ${url} fullPage=${full_page} skipClean=${skip_clean}`);
    const t0 = Date.now();

    try {
      const result = await captureForAI({
        url,
        fullPage: full_page,
        waitForSelector: wait_for_selector,
        viewportWidth: viewport_width,
        skipClean: skip_clean,
        timeoutMs: timeout_ms,
      });

      log(`capture complete in ${Date.now() - t0}ms — ${(result.sizeBytes / 1024).toFixed(1)}KB`);

      const structured = {
        image_base64: result.buffer.toString("base64"),
        mime_type: result.mimeType,
        page_title: result.pageTitle,
        resolved_url: result.resolvedUrl,
        width_px: result.width,
        height_px: result.height,
        size_kb: Math.round(result.sizeBytes / 1024),
        capture_time_ms: result.captureTimeMs,
        cleaned: !skip_clean,
      };

      return {
        content: [
          // Text summary — gives the LLM metadata context before processing the image
          {
            type: "text" as const,
            text: [
              `✓ Captured: ${result.pageTitle}`,
              `  URL: ${result.resolvedUrl}`,
              `  Dimensions: ${result.width}×${result.height}px`,
              `  Size: ${structured.size_kb}KB | Time: ${result.captureTimeMs}ms`,
              `  Cleaned: ${!skip_clean}`,
            ].join("\n"),
          },
          // The actual image — the vision LLM processes this
          {
            type: "image" as const,
            data: structured.image_base64,
            mimeType: "image/jpeg" as const,
          },
        ],
        structuredContent: structured,
      };
    } catch (err) {
      const message =
        err instanceof CaptureError
          ? `[${err.code}] ${err.message}`
          : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;

      log(`capture_clean_view error: ${message}`);

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Capture failed: ${message}\n\nTips:\n` +
              `  - Check the URL is publicly accessible\n` +
              `  - Try increasing timeout_ms (e.g. 45000) for slow sites\n` +
              `  - If the page requires login, it cannot be captured\n` +
              `  - For SPAs, try adding a wait_for_selector (e.g. "main h1")`,
          },
        ],
      };
    }
  }
);

// ─── Tool: list_clean_selectors ───────────────────────────────────────────────
//
// Utility tool — lets developers inspect what the cleaner targets.
// Useful for debugging and for building client-side tooling.

server.registerTool(
  "list_clean_selectors",
  {
    title: "List Clean Selectors",
    description:
      "Returns the list of CSS selectors used to remove overlays and UI noise " +
      "during the clean-capture pass. Use this to understand what gets removed " +
      "and to verify coverage for a specific site.",
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    // Dynamically import to avoid circular deps
    const { OVERLAY_SELECTORS } = await import("./utils/cleanPage.js");
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Vision-MCP removes ${OVERLAY_SELECTORS.length} overlay selectors:\n\n` +
            OVERLAY_SELECTORS.map((s: string) => `  ${s}`).join("\n"),
        },
      ],
      structuredContent: { selectors: OVERLAY_SELECTORS, count: OVERLAY_SELECTORS.length },
    };
  }
);

// ─── Startup & transport ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();

  // Graceful shutdown — close the Playwright browser cleanly
  const shutdown = async (signal: string) => {
    log(`received ${signal}, shutting down...`);
    await closeBrowser();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await server.connect(transport);
  log("vision-screenshot-mcp-server ready (stdio)");
}

main().catch((err) => {
  process.stderr.write(`[vision-mcp] Fatal startup error: ${err}\n`);
  process.exit(1);
});
