import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { cleanPage } from './utils/cleanPage.js';
import { smartWait } from './utils/smartWait.js';
import { extractInteractiveElements } from './utils/domExtractor.js';
import { observePage } from './utils/observe.js';
import { CaptureError } from './types/capture.js';
import type {
  CaptureOptions,
  CaptureResult,
  ResourceType,
} from './types/capture.js';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  viewportWidth: 1280,
  viewportHeight: 800,
  deviceScaleFactor: 2,       // Retina — vision models read this much better
  fullPage: false,
  timeoutMs: 30_000,
  blockResourceTypes: ['font', 'media'] as ResourceType[],
  skipClean: false,
  extractElements: false,
} satisfies Partial<CaptureOptions>;

// ─── Browser singleton ────────────────────────────────────────────────────────
//
// In a Next.js API route context you'll want to share a single browser
// instance across requests. This module-level singleton handles that.
// It is lazily created and never explicitly closed — Vercel's serverless
// environment recycles the process for you.

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',   // Avoids /dev/shm OOM in containers
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
    ],
  });
  return _browser;
}

// ─── captureForAI ─────────────────────────────────────────────────────────────
//
// The main export. Returns a CaptureResult containing a high-DPI WebP buffer
// ready to be passed directly to a vision LLM (GPT-4o, Claude, Gemini, etc.).
//
// Usage (standalone):
//   const result = await captureForAI({ url: 'https://example.com' });
//   fs.writeFileSync('out.webp', result.buffer);
//
// Usage (Next.js API route):
//   const result = await captureForAI({ url, waitForSelector });
//   return new Response(result.buffer, { headers: { 'Content-Type': 'image/webp' } });

export async function captureForAI(options: CaptureOptions): Promise<CaptureResult> {
  const opts = { ...DEFAULTS, ...options };

  // Validate URL early — fail fast before spinning up a browser context
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(opts.url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http and https URLs are supported');
    }
  } catch (err) {
    throw new CaptureError(
      `Invalid URL: "${opts.url}"`,
      'INVALID_URL',
      opts.url,
      err
    );
  }

  const startTime = Date.now();
  const browser = await getBrowser();

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // ── Browser context ──────────────────────────────────────────────────────
    //
    // A fresh context per request gives us:
    //   - Isolated cookies/storage (no state leakage between captures)
    //   - Ability to set locale, timezone, and user-agent per request
    context = await browser.newContext({
      viewport: {
        width: opts.viewportWidth!,
        height: opts.viewportHeight!,
      },
      deviceScaleFactor: opts.deviceScaleFactor,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
      // Disable JavaScript-based geolocation to avoid permission prompts
      geolocation: undefined,
      permissions: [],
      // Ignore HTTPS errors so we can capture staging/dev sites
      ignoreHTTPSErrors: true,
      // Reduced motion prevents animation-heavy pages from capturing mid-frame
      reducedMotion: 'reduce',
    });

    // ── __name shim ──────────────────────────────────────────────────────────
    //
    // When this code runs through tsx/esbuild, esbuild wraps named functions
    // with a `__name(fn, "name")` helper to preserve Function.name. Inside
    // page.evaluate(), the function is serialized and executed in the browser,
    // where `__name` is undefined → "ReferenceError: __name is not defined".
    // Defining a no-op shim in the page's global scope makes those functions
    // run correctly. Runs before every navigation, in every frame.
    await context.addInitScript(() => {
      // @ts-ignore — augmenting the browser window at runtime
      window.__name = window.__name || ((fn) => fn);
    });

    // ── Resource blocking ────────────────────────────────────────────────────
    //
    // Blocking fonts and media makes captures ~40% faster with no impact
    // on vision model accuracy (they read layout and text, not fonts).
    if (opts.blockResourceTypes && opts.blockResourceTypes.length > 0) {
      const blocked = new Set(opts.blockResourceTypes);
      await context.route('**/*', (route) => {
        if (blocked.has(route.request().resourceType() as ResourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });
    }

    page = await context.newPage();

    // ── Navigation ───────────────────────────────────────────────────────────
    let response;
    try {
      response = await page.goto(opts.url, {
        waitUntil: 'domcontentloaded',   // Fast first paint; smartWait handles the rest
        timeout: opts.timeoutMs,
      });
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.message.includes('Timeout');
      throw new CaptureError(
        `Navigation failed for "${opts.url}": ${err instanceof Error ? err.message : String(err)}`,
        isTimeout ? 'TIMEOUT' : 'NAVIGATION_FAILED',
        opts.url,
        err
      );
    }

    if (!response) {
      throw new CaptureError(
        `No response received for "${opts.url}"`,
        'NAVIGATION_FAILED',
        opts.url
      );
    }

    // ── Smart wait ───────────────────────────────────────────────────────────
    try {
      await smartWait(page, {
        timeoutMs: opts.timeoutMs,
        contentSelector: opts.waitForSelector,
      });
    } catch (err) {
      throw new CaptureError(
        `Timed out waiting for content on "${opts.url}"`,
        'TIMEOUT',
        opts.url,
        err
      );
    }

    // ── Capture metadata ─────────────────────────────────────────────────────
    const pageTitle = await page.title();
    const resolvedUrl = page.url();

    // ── Observe / extract on the REAL page (BEFORE cleaning) ──────────────────
    //
    // Structured understanding must reflect the actual page — its buttons,
    // images, forms and chrome. cleanPage() strips overlays and applies reader
    // mode, which would erase exactly the elements Observe is meant to report.
    // So run extraction first, then clean, then screenshot.
    // Failures here are non-fatal: the screenshot is the primary product.
    let elements;
    if (opts.extractElements) {
      try {
        elements = await extractInteractiveElements(page, opts.deviceScaleFactor!);
      } catch (err) {
        console.error('[VisionStream] element extraction failed (non-fatal):', err);
      }
    }

    let observation;
    if (opts.observe) {
      try {
        observation = await observePage(page, opts.deviceScaleFactor!);
      } catch (err) {
        console.error('[VisionStream] observe failed (non-fatal):', err);
      }
    }

    // ── Clean page (affects the screenshot only) ─────────────────────────────
    if (!opts.skipClean) {
      await cleanPage(page, { readerMode: true });
      // Brief pause to let the DOM settle after style injection
      await page.waitForTimeout(600);
    }

    // ── Screenshot ───────────────────────────────────────────────────────────
    //
    // WebP at quality 90 is the sweet spot:
    //   - Smaller than PNG (~60% size reduction)
    //   - Better detail than JPEG at equivalent size
    //   - Vision models (GPT-4o, Claude, Gemini) all accept WebP natively
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 50,
      fullPage: opts.fullPage,
      animations: 'disabled',   // Freeze CSS animations — avoids blur artifacts
      caret: 'hide',
    });

    const captureTimeMs = Date.now() - startTime;

    // ── Extract actual dimensions from Playwright's screenshot ───────────────
    //
    // The actual pixel dimensions are deviceScaleFactor × viewport dimensions.
    const viewportSize = page.viewportSize();
    const scaleFactor = opts.deviceScaleFactor!;
    const width = (viewportSize?.width ?? opts.viewportWidth!) * scaleFactor;
    let height = (viewportSize?.height ?? opts.viewportHeight!) * scaleFactor;
    if (opts.fullPage) {
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      height = scrollHeight * scaleFactor;
    }

    return {
      buffer: screenshotBuffer,
      mimeType: 'image/jpeg',
      width: Math.round(width),
      height: Math.round(height),
      captureTimeMs,
      sizeBytes: screenshotBuffer.length,
      resolvedUrl,
      pageTitle,
      ...(elements ? { elements } : {}),
      ...(observation ? { observation } : {}),
    };
  } catch (err) {
    // Re-throw CaptureErrors as-is; wrap anything unexpected
    if (err instanceof CaptureError) throw err;
    throw new CaptureError(
      `Unexpected capture failure: ${err instanceof Error ? err.message : String(err)}`,
      'BROWSER_CRASH',
      opts.url,
      err
    );
  } finally {
    // Always close the context — this releases cookies, storage, and routes.
    // Do NOT close the browser; the singleton handles reconnection.
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
  }
}

// ─── Utility: graceful shutdown ───────────────────────────────────────────────
//
// Call this in your Next.js instrumentation.ts or process signal handlers
// to cleanly close the browser before the process exits.

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}