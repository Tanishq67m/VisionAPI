import type { Page } from 'playwright';
import type { SmartWaitOptions } from '../types/capture.js';

// ─── smartWait ────────────────────────────────────────────────────────────────
//
// A two-stage wait strategy that balances speed vs. completeness:
//
//   Stage 1 — networkidle: wait until there have been no more than 0 in-flight
//             network requests for 500ms. Catches XHR-heavy SPAs.
//
//   Stage 2 — selector check: if a `contentSelector` is provided, wait for
//             that element to be visible in the DOM. This is your escape hatch
//             for sites whose main content loads via JS after networkidle.
//
// Both stages respect the shared `timeoutMs` budget.

export async function smartWait(
  page: Page,
  options: SmartWaitOptions = {}
): Promise<void> {
  const { timeoutMs = 15_000, contentSelector } = options;

  const deadline = Date.now() + timeoutMs;

  // Stage 1 — networkidle
  // 'networkidle' in Playwright means ≤0 connections for 500ms.
  // We use a try/catch because some pages never truly go idle (e.g. sites
  // with polling or SSE streams). In that case we fall through to stage 2.
  try {
    const remaining = deadline - Date.now();
    await page.waitForLoadState('networkidle', { timeout: remaining });
  } catch {
    // networkidle timed out — not fatal, content may still be present.
    // We'll catch it in stage 2 or take whatever's on screen.
  }

  // Stage 2 — optional content selector confirmation
  if (contentSelector) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        `smartWait: timed out before reaching selector check (selector: "${contentSelector}")`
      );
    }

    await page.waitForSelector(contentSelector, {
      state: 'visible',
      timeout: remaining,
    });
  }

  // Small fixed settle delay — lets React/Vue/Svelte finish any
  // final paint after data loads.
  // We use 800ms to let CSS reflow after heavy DOM mutations.
  await page.waitForTimeout(800); // let CSS reflow after DOM mutations
}