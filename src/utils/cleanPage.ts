import type { Page } from 'playwright';
import type { CleanPageOptions } from '../types/capture.js';

// ─── Reader Mode styles ───────────────────────────────────────────────────────
//
// Stripped-down typography that helps vision models focus on content,
// not design chrome. Intentionally opinionated.

const READER_MODE_CSS = `
  /* 
    Aggressively force all elements to drop fixed positioning to flow naturally, 
    but without corrupting flex/grid max-widths that cause vertical inflation.
  */
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
 * Injects JS into the given Playwright page to:
 * 1. Hide common overlay/banner selectors using smart heuristics and whitelist
 * 2. (Optionally) apply Reader Mode typography for maximum content clarity
 */
export async function cleanPage(
  page: Page,
  options: CleanPageOptions = {}
): Promise<void> {
  const { readerMode = true } = options;

  // 1 & 2 & 3 & 4: JS-based removal with whitelist and smart targeting
  // Using inline logic to avoid Playwright evaluate serialization errors with transpilers
  await page.evaluate(() => {
    // 4. Preserve Apple Navigation & Structural Navigation
    const WHITELIST_SELECTORS = [
      'main',
      'article',
      '#grid',
      'header',
      'nav',
      '.chapternav',
      '[role="banner"]',
      '[role="navigation"]',
      '[id*="main"]',
      '[id*="content"]',
      '[class*="product-grid"]'
    ];
    const KEYWORDS = ['cookie', 'privacy', 'shipping to', 'subscribe', 'sign in'];
    
    // 2. Isolate Ads and Interceptors Instead
    const NOISE_SELECTORS = [
      '[class*="ad-"]',
      '[id*="ad-"]',
      '[class*="sponsor"]',
      '[id*="sponsor"]',
      '[class*="related"]',
      '[class*="social"]',
      '[class*="share"]',
      '[id*="comments"]'
    ];

    // 3. Convert Footers/Sidebars to "Secondary Verification"
    const SECONDARY_SELECTORS = [
      'footer',
      'aside',
      '[role="contentinfo"]',
      '[role="complementary"]',
      '[class*="footer"]',
      '[id*="footer"]',
      '[class*="sidebar"]',
      '[id*="sidebar"]'
    ];

    // 1. Direct DOM Stripping for Known Interceptors
    if (window.location.hostname.includes('amazon')) {
      const amazonPopovers = document.querySelectorAll('.a-popover-wrapper, #a-popover-root, .a-declarative[data-action="a-popover"]');
      for (let i = 0; i < amazonPopovers.length; i++) {
        amazonPopovers[i].remove();
      }
      
      const amazonScrollers = document.querySelectorAll('.a-scroller, #a-page');
      for (let i = 0; i < amazonScrollers.length; i++) {
        (amazonScrollers[i] as HTMLElement).style.setProperty('overflow', 'initial', 'important');
      }
    }

    const allElements = document.querySelectorAll('*');
    
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      if (!el.tagName) continue;

      // 1. Protect Main Elements Explicitly
      let isProtected = false;
      if (el === document.body || el === document.documentElement) {
        isProtected = true;
      } else {
        try {
          for (let w = 0; w < WHITELIST_SELECTORS.length; w++) {
            if (el.matches(WHITELIST_SELECTORS[w]) || el.closest(WHITELIST_SELECTORS[w])) {
              isProtected = true;
              break;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (isProtected) continue;

      const style = window.getComputedStyle(el);
      const position = style.position;
      
      let shouldHide = false;
      
      // Check absolute noise (ads, social)
      try {
        for (let n = 0; n < NOISE_SELECTORS.length; n++) {
          if (el.matches(NOISE_SELECTORS[n])) {
            shouldHide = true;
            break;
          }
        }
      } catch (e) {}

      // Secondary verification for footers/sidebars
      if (!shouldHide) {
        try {
          for (let s = 0; s < SECONDARY_SELECTORS.length; s++) {
            if (el.matches(SECONDARY_SELECTORS[s])) {
              // Does it contain structured textual anchors or navigation trees?
              const anchors = el.querySelectorAll('a');
              let validLinks = 0;
              for (let a = 0; a < anchors.length; a++) {
                if ((anchors[a].textContent || '').trim().length > 0) {
                  validLinks++;
                }
              }
              const navs = el.querySelectorAll('nav, [role="navigation"]');
              
              // Only apply display: none if it's explicitly empty or just 1-2 tracking/social links
              if (validLinks < 3 && navs.length === 0) {
                shouldHide = true;
              }
              break;
            }
          }
        } catch (e) {}
      }

      // Floating heuristic
      if (!shouldHide && (position === 'fixed' || position === 'absolute')) {
        const zIndex = parseInt(style.zIndex, 10);
        const isHighZIndex = !isNaN(zIndex) && zIndex > 50;
        
        const rect = el.getBoundingClientRect();
        const isFullViewport = rect.width >= window.innerWidth * 0.9 && rect.height >= window.innerHeight * 0.9;
        
        const bg = style.backgroundColor;
        let isSemiTransparent = false;
        if (bg.startsWith('rgba')) {
          const parts = bg.substring(5, bg.length - 1).split(',');
          if (parts.length === 4) {
            const alpha = parseFloat(parts[3]);
            if (alpha > 0 && alpha < 1) {
              isSemiTransparent = true;
            }
          }
        }
        
        // Dark backdrops
        if (isFullViewport && (isSemiTransparent || isHighZIndex)) {
          shouldHide = true;
        } else if (isHighZIndex) {
          // High z-index with specific keywords
          const text = (el.textContent || '').toLowerCase();
          for (let k = 0; k < KEYWORDS.length; k++) {
            if (text.includes(KEYWORDS[k])) {
              shouldHide = true;
              break;
            }
          }
        }
      }

      // Apply heuristic fix: display none only if no whitelist children
      if (shouldHide) {
        let containsWhitelist = false;
        try {
          for (let w = 0; w < WHITELIST_SELECTORS.length; w++) {
            if (el.querySelector(WHITELIST_SELECTORS[w])) {
              containsWhitelist = true;
              break;
            }
          }
        } catch(e) {}

        if (!containsWhitelist) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    }

    // Reset overflow on body/html in case modals locked scrolling
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  });

  // Apply Reader Mode (optional)
  if (readerMode) {
    await page.addStyleTag({ content: READER_MODE_CSS });
  }
}