import { JSDOM } from 'jsdom';

async function simulateClean(html: string): Promise<Document> {
  const dom = new JSDOM(html, { url: 'https://example.com' });
  const { window } = dom;
  const document = window.document;

  // The evaluate logic from cleanPage.ts
  const WHITELIST_SELECTORS = [
    'main', 'article', '#grid', '[role="main"]', '[id*="main"]', '[id*="content"]', '[class*="product-grid"]', '[class*="story"]', '[class*="article"]'
  ];
  const NOISE_SELECTORS = [
    '[class*="ad-"]', '[id*="ad-"]', '[class*="-ad"]', '[id*="-ad"]', '[class*="Ad"]', '[id*="Ad"]', '[class*="advertisement"]', '[id*="advertisement"]', '[data-ad-unit]', '[data-ad]', '[data-adunit]', 'ins.adsbygoogle',
    '[class*="sponsor"]', '[id*="sponsor"]', '[class*="promo"]', '[id*="promo"]',
    '[class*="social"]', '[class*="share"]', '[class*="follow"]', '[class*="Follow"]',
    '[id*="comments"]', '[id*="disqus"]', '[class*="comment"]',
    '[class*="related"]', '[class*="recommended"]', '[class*="more-stories"]', '[class*="also-read"]',
    '[class*="newsletter"]', '[class*="Newsletter"]', '[class*="subscribe"]', '[class*="Subscribe"]',
    '[id*="cookie"]', '[class*="cookie"]', '[id*="gdpr"]', '[class*="gdpr"]', '[id*="consent"]', '[class*="consent"]',
    '#standalone-footer', '[data-testid="toolbar"]', '[data-testid="nav-bar"]', '[class*="PersistentBar"]', '[class*="Masthead"]',
    'header nav', 'header > nav',
  ];

  NOISE_SELECTORS.forEach(sel => {
    try {
      document.querySelectorAll(sel).forEach(el => {
        let containsWhitelist = false;
        for (const ws of WHITELIST_SELECTORS) {
          if (el.querySelector && el.querySelector(ws)) {
            containsWhitelist = true;
            break;
          }
        }
        if (!containsWhitelist) el.remove();
      });
    } catch (e) {}
  });

  document.querySelectorAll('div, section, aside').forEach(el => {
    let skip = false;
    for (const ws of WHITELIST_SELECTORS) {
      if (el.matches && el.matches(ws) || el.closest && el.closest(ws) || el.querySelector && el.querySelector(ws)) skip = true;
    }
    if (skip) return;

    const style = el.getAttribute('style') || '';
    const hasExplicitHeight = /min-height\s*:\s*\d+px|height\s*:\s*\d+px/.test(style);
    const textContent = (el.textContent || '').trim();
    const hasNoMeaningfulText = textContent.length < 10;
    const hasNoImages = el.querySelectorAll('img, picture, video').length === 0;
    const hasNoLinks = el.querySelectorAll('a').length === 0;

    if (hasExplicitHeight && hasNoMeaningfulText && hasNoImages && hasNoLinks) {
      el.remove();
      return;
    }

    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('advertisement') || ariaLabel.includes('ad slot')) {
      el.remove();
      return;
    }
  });

  return document;
}

test('removes cookie banner', async () => {
  const html = `<div id="cookie-banner" style="min-height:80px">Accept cookies</div><main>Real content</main>`;
  const doc = await simulateClean(html);
  expect(doc.querySelector('#cookie-banner')).toBeNull();
  expect(doc.querySelector('main')).not.toBeNull();
});

test('does not remove whitelisted main element', async () => {
  const html = `<main><article>News</article></main>`;
  const doc = await simulateClean(html);
  expect(doc.querySelector('main')).not.toBeNull();
});
