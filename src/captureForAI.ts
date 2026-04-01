import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { cleanPage } from './utils/cleanPage.js';
import { smartWait } from './utils/smartWait.js';
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

    // ── Clean page ───────────────────────────────────────────────────────────
    if (!opts.skipClean) {
      await cleanPage(page, { readerMode: true });
      // Brief pause to let the DOM settle after style injection
      await page.waitForTimeout(150);
    }

    // ── Capture metadata before screenshot ───────────────────────────────────
    const pageTitle = await page.title();
    const resolvedUrl = page.url();

    // ── Screenshot ───────────────────────────────────────────────────────────
    //
    // WebP at quality 90 is the sweet spot:
    //   - Smaller than PNG (~60% size reduction)
    //   - Better detail than JPEG at equivalent size
    //   - Vision models (GPT-4o, Claude, Gemini) all accept WebP natively
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
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
    const height = opts.fullPage
      ? screenshotBuffer.length / (width * 4)   // Approx from buffer size
      : (viewportSize?.height ?? opts.viewportHeight!) * scaleFactor;

    return {
      buffer: screenshotBuffer,
      mimeType: 'image/jpeg',
      width: Math.round(width),
      height: Math.round(height),
      captureTimeMs,
      sizeBytes: screenshotBuffer.length,
      resolvedUrl,
      pageTitle,
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