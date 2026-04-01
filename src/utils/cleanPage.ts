import type { Page } from 'playwright';
import type { CleanPageOptions } from '../types/capture.js';

// ─── Selectors that commonly match cookie banners, modals, and UI noise ───────
//
// Strategy: broad attribute-based selectors catch most dynamic class names.
// Order matters — more specific selectors first.

const OVERLAY_SELECTORS: string[] = [
  // Cookie / GDPR banners
  '[class*="cookie"]',
  '[id*="cookie"]',
  '[class*="gdpr"]',
  '[id*="gdpr"]',
  '[class*="consent"]',
  '[id*="consent"]',
  '[class*="privacy-banner"]',
  '[id*="privacy-banner"]',
  '[class*="cc-banner"]',
  '[id*="cc-"]',

  // Generic modals & overlays
  '[class*="modal"]',
  '[id*="modal"]',
  '[class*="overlay"]',
  '[id*="overlay"]',
  '[class*="popup"]',
  '[id*="popup"]',
  '[class*="lightbox"]',
  '[id*="lightbox"]',
  '[role="dialog"]',
  '[aria-modal="true"]',

  // Newsletter / subscribe
  '[class*="newsletter"]',
  '[id*="newsletter"]',
  '[class*="subscribe"]',
  '[id*="subscribe"]',

  // Paywalls
  '[class*="paywall"]',
  '[id*="paywall"]',
  '[class*="gate"]',
  '[id*="subscription-gate"]',

  // Chat widgets & live support
  '[id="intercom-container"]',
  '[class*="intercom"]',
  '[id*="drift"]',
  '[class*="drift"]',
  '[id*="hubspot"]',
  '#hubspot-messages-iframe-container',
  '[class*="livechat"]',
  '[id*="livechat"]',
  '[class*="crisp-client"]',
  '#crisp-chatbox',

  // Sticky headers & floating nav (kept minimal — headers can carry context)
  // Only hide if they obscure content below
  '[class*="sticky-header"]',
  '[class*="fixed-header"]',

  // Notification / alert bars (top-of-page banners)
  '[class*="announcement-bar"]',
  '[class*="top-banner"]',
  '[class*="promo-bar"]',

  // GDPR overlay backdrops
  '[class*="cookie-overlay"]',
  '[id*="cookie-overlay"]',
  '.fc-consent-root',
  '#onetrust-consent-sdk',
  '#CybotCookiebotDialog',
  '.optanon-alert-box-wrapper',
  '.qc-cmp2-container',
];

// ─── Reader Mode styles ───────────────────────────────────────────────────────
//
// Stripped-down typography that helps vision models focus on content,
// not design chrome. Intentionally opinionated.

const READER_MODE_CSS = `
  body {
    font-family: Georgia, 'Times New Roman', serif !important;
    font-size: 18px !important;
    line-height: 1.8 !important;
    color: #1a1a1a !important;
    background: #ffffff !important;
    max-width: 720px !important;
    margin: 0 auto !important;
    padding: 2rem !important;
  }

  /* Kill multi-column layouts */
  * {
    column-count: unset !important;
    column-width: unset !important;
    float: none !important;
  }

  /* Remove busy background images from containers */
  div, section, article, header, main {
    background-image: none !important;
  }

  /* Ensure links are readable without hover */
  a { color: #0066cc !important; text-decoration: underline !important; }

  /* Kill fixed/sticky positioning on everything — prevents elements
     from covering content when we scroll/resize */
  [style*="position: fixed"],
  [style*="position:fixed"],
  [style*="position: sticky"],
  [style*="position:sticky"] {
    position: static !important;
  }
`;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * cleanPage
 *
 * Injects CSS and JS into the given Playwright page to:
 * 1. Hide common overlay/banner selectors via display:none
 * 2. (Optionally) apply Reader Mode typography for maximum content clarity
 *
 * Safe to call before or after navigation. Uses `addStyleTag` + `evaluate`
 * so it runs in the page context and survives SPA re-renders triggered by
 * the `waitForLoadState` call that follows.
 */
export async function cleanPage(
  page: Page,
  options: CleanPageOptions = {}
): Promise<void> {
  const { readerMode = true } = options;

  // 1. Hide overlays via injected <style> block —
  //    Using !important ensures we override inline styles too.
  const overlayCSS = OVERLAY_SELECTORS.map(
    (selector) => `${selector} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`
  ).join('\n');

  await page.addStyleTag({ content: overlayCSS });

  // 2. JS-based removal for elements that resist CSS hiding
  //    (e.g. elements rendered via Shadow DOM or canvas overlays)
  await page.evaluate((selectors: string[]) => {
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });
    }

    // Also remove any <body> overflow:hidden that modals love to inject
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }, OVERLAY_SELECTORS);

  // 3. Reader Mode (optional)
  if (readerMode) {
    await page.addStyleTag({ content: READER_MODE_CSS });
  }
}