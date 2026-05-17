import type { Page } from 'playwright';
import type { CleanPageOptions } from '../types/capture.js';

const READER_MODE_CSS = `
  [style*="position: fixed"],
  [style*="position:fixed"],
  [style*="position: sticky"],
  [style*="position:sticky"] {
    position: static !important;
  }
`;

export async function cleanPage(
  page: Page,
  options: CleanPageOptions = {}
): Promise<void> {
  const { readerMode = true } = options;

  await page.evaluate(() => {
    // ── Whitelisted structural containers (never hidden) ──────────────────
    const WHITELIST_SELECTORS = [
      'main',
      'article',
      '#grid',
      '[role="main"]',
      '[id*="main"]',
      '[id*="content"]',
      '[class*="product-grid"]',
      '[class*="story"]',
      '[class*="article"]',
    ];

    // ── Definite noise — always remove ───────────────────────────────────
    const NOISE_SELECTORS = [
      // Ads
      '[class*="ad-"]', '[id*="ad-"]', '[class*="-ad"]', '[id*="-ad"]',
      '[class*="Ad"]', '[id*="Ad"]',
      '[class*="advertisement"]', '[id*="advertisement"]',
      '[data-ad-unit]', '[data-ad]', '[data-adunit]',
      'ins.adsbygoogle',
      // Sponsors/promos
      '[class*="sponsor"]', '[id*="sponsor"]',
      '[class*="promo"]', '[id*="promo"]',
      // Social/share
      '[class*="social"]', '[class*="share"]',
      '[class*="follow"]', '[class*="Follow"]',
      // Comments
      '[id*="comments"]', '[id*="disqus"]', '[class*="comment"]',
      // Related/recommended
      '[class*="related"]', '[class*="recommended"]',
      '[class*="more-stories"]', '[class*="also-read"]',
      // Newsletter modals
      '[class*="newsletter"]', '[class*="Newsletter"]',
      '[class*="subscribe"]', '[class*="Subscribe"]',
      // Cookie banners
      '[id*="cookie"]', '[class*="cookie"]',
      '[id*="gdpr"]', '[class*="gdpr"]',
      '[id*="consent"]', '[class*="consent"]',
      // NYTimes specific
      '#standalone-footer',
      '[data-testid="toolbar"]',
      '[data-testid="nav-bar"]',
      '[class*="PersistentBar"]',
      '[class*="Masthead"]',
      // Generic sticky navs (not main content)
      'header nav', 'header > nav',
    ];

    const hostname = window.location.hostname;

    // ── Site-specific surgical removal ───────────────────────────────────
    if (hostname.includes('nytimes')) {
      const nytSelectors = [
        '[data-testid="standalone-footer"]',
        '[data-testid="nav-bar"]',
        '[class*="HeaderBaseline"]',
        '[class*="navigation-edge"]',
        '.css-1ed3yvj', // subscription bar
        '[class*="Paywall"]',
        '[class*="paywall"]',
        '[class*="gate"]',
        '[class*="Gate"]',
      ];
      nytSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    }

    if (hostname.includes('amazon')) {
      document.querySelectorAll(
        '.a-popover-wrapper, #a-popover-root, .a-declarative[data-action="a-popover"]'
      ).forEach(el => el.remove());
      document.querySelectorAll('.a-scroller, #a-page').forEach(el => {
        (el as HTMLElement).style.setProperty('overflow', 'initial', 'important');
      });
    }

    if (hostname.includes('apple.com')) {
      document.querySelectorAll(
        '.ac-localnav, .ac-gn-sticky, [class*="globalnavplaceholder"]'
      ).forEach(el => el.remove());
    }

    // ── Pass 1: Remove definite noise selectors ───────────────────────────
    NOISE_SELECTORS.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          let containsWhitelist = false;
          for (const ws of WHITELIST_SELECTORS) {
            if ((el as HTMLElement).querySelector?.(ws)) {
              containsWhitelist = true;
              break;
            }
          }
          if (!containsWhitelist) (el as HTMLElement).style.setProperty('display', 'none', 'important');
        });
      } catch (e) { /* ignore invalid selectors */ }
    });

    // ── Pass 2: Remove empty ad placeholder containers ────────────────────
    // These are divs with explicit height/min-height in inline style but no text
    // content — the #1 source of wasted tokens in NYTimes/news sites
    document.querySelectorAll<HTMLElement>('div, section, aside').forEach(el => {
      // Skip if it's a whitelisted container or has whitelisted children
      for (const ws of WHITELIST_SELECTORS) {
        try {
          if (el.matches(ws) || el.closest(ws) || el.querySelector(ws)) return;
        } catch (e) {}
      }

      const style = el.getAttribute('style') || '';
      const hasExplicitHeight = /min-height\s*:\s*\d+px|height\s*:\s*\d+px/.test(style);
      const textContent = (el.textContent || '').trim();
      const hasNoMeaningfulText = textContent.length < 10;
      const hasNoImages = el.querySelectorAll('img, picture, video').length === 0;
      const hasNoLinks = el.querySelectorAll('a').length === 0;

      if (hasExplicitHeight && hasNoMeaningfulText && hasNoImages && hasNoLinks) {
        el.style.setProperty('display', 'none', 'important');
        return;
      }

      // Also kill zero-content divs with data-ad attributes or aria-label "advertisement"
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('advertisement') || ariaLabel.includes('ad slot')) {
        el.style.setProperty('display', 'none', 'important');
        return;
      }
    });

    // ── Pass 3: Floating overlay heuristic ────────────────────────────────
    const KEYWORDS = ['cookie', 'privacy', 'shipping to', 'subscribe', 'sign in', 'sign up', 'newsletter'];

    document.querySelectorAll<HTMLElement>('*').forEach(el => {
      // Skip protected
      for (const ws of WHITELIST_SELECTORS) {
        try { if (el.matches(ws) || el.closest(ws)) return; } catch (e) {}
      }
      if (el === document.body || el === document.documentElement) return;

      const style = window.getComputedStyle(el);
      const position = style.position;
      if (position !== 'fixed' && position !== 'absolute') return;

      const zIndex = parseInt(style.zIndex, 10);
      const isHighZIndex = !isNaN(zIndex) && zIndex > 50;
      if (!isHighZIndex) return;

      const rect = el.getBoundingClientRect();
      const isFullViewport =
        rect.width >= window.innerWidth * 0.8 &&
        rect.height >= window.innerHeight * 0.5;

      const bg = style.backgroundColor;
      let isSemiTransparent = false;
      if (bg.startsWith('rgba')) {
        const alpha = parseFloat(bg.split(',')[3]);
        if (alpha > 0 && alpha < 1) isSemiTransparent = true;
      }

      const text = (el.textContent || '').toLowerCase();
      const hasKeyword = KEYWORDS.some(k => text.includes(k));

      if (isFullViewport || isSemiTransparent || hasKeyword) {
        let containsWhitelist = false;
        for (const ws of WHITELIST_SELECTORS) {
          try { if (el.querySelector(ws)) { containsWhitelist = true; break; } } catch (e) {}
        }
        if (!containsWhitelist) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });

    // ── Unlock scroll ─────────────────────────────────────────────────────
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  });

  if (readerMode) {
    await page.addStyleTag({ content: READER_MODE_CSS });
  }
}