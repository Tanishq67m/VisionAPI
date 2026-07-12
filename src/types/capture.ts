// ─── Core types for the Vision-Ready Screenshot API ───────────────────────────

export interface CaptureOptions {
  /** Target URL to capture */
  url: string;

  /** Viewport width in logical pixels (default: 1280) */
  viewportWidth?: number;

  /** Viewport height in logical pixels (default: 800) */
  viewportHeight?: number;

  /**
   * Device scale factor — 2 = high-DPI / Retina output.
   * Vision models benefit from sharper images. (default: 2)
   */
  deviceScaleFactor?: number;

  /**
   * Capture the full scrollable page height instead of just the viewport.
   * (default: false — viewport only is faster and sufficient for most agent tasks)
   */
  fullPage?: boolean;

  /**
   * Max ms to wait for the page to settle before giving up. (default: 30000)
   */
  timeoutMs?: number;

  /**
   * Optional CSS selector to wait for before capturing.
   * Useful when the critical content is loaded asynchronously.
   */
  waitForSelector?: string;

  /**
   * Block these resource types to speed up capture and reduce noise.
   * (default: ['font', 'media'])
   */
  blockResourceTypes?: ResourceType[];

  /**
   * Skip the clean-page pass (useful for debugging raw vs. clean diffs).
   */
  skipClean?: boolean;

  /**
   * Extract interactive elements and their bounding boxes (Phase 3 DOM Understanding).
   */
  extractElements?: boolean;
}

export interface InteractiveElement {
  id: string;
  tagName: string;
  role?: string;
  text?: string;
  href?: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type ResourceType =
  | 'stylesheet'
  | 'image'
  | 'media'
  | 'font'
  | 'script'
  | 'texttrack'
  | 'xhr'
  | 'fetch'
  | 'eventsource'
  | 'websocket'
  | 'manifest'
  | 'other';

export interface CaptureResult {
  /** Raw WebP image buffer — pass directly to a vision LLM */
  buffer: Buffer;

  /** MIME type (always image/jpeg) */
  mimeType: 'image/jpeg';

  /** Actual pixel dimensions of the output image */
  width: number;
  height: number;

  /** How long the full capture took in milliseconds */
  captureTimeMs: number;

  /** Approximate file size in bytes */
  sizeBytes: number;

  /** The final URL after any redirects */
  resolvedUrl: string;

  /** Page title extracted at capture time */
  pageTitle: string;

  /** Extracted interactive elements if extractElements was true */
  elements?: InteractiveElement[];
}

export interface CleanPageOptions {
  /** Inject Reader Mode styles (larger text, white background, no columns) */
  readerMode?: boolean;
}

export interface SmartWaitOptions {
  /** Max ms to wait (default: 15000) */
  timeoutMs?: number;

  /** Optional selector to confirm main content is present */
  contentSelector?: string;
}

export class CaptureError extends Error {
  constructor(
    message: string,
    public readonly code: CaptureErrorCode,
    public readonly url: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CaptureError';
  }
}

export type CaptureErrorCode =
  | 'NAVIGATION_FAILED'
  | 'TIMEOUT'
  | 'SELECTOR_NOT_FOUND'
  | 'BROWSER_CRASH'
  | 'INVALID_URL';