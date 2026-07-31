import { captureForAI, closeBrowser } from '../index.js';

/**
 * Live-site sanity checks. These prove the engine works against real, changing
 * websites. We assert on things that are actually invariant — a valid JPEG with
 * real dimensions, and genuine byte savings on a reliably noisy site — rather
 * than page height, which reader-mode reflow can legitimately change.
 */

afterAll(async () => {
  await closeBrowser();
});

const SITES = ['https://www.cnn.com', 'https://news.ycombinator.com', 'https://example.com'];

for (const url of SITES) {
  test(`${url}: raw and clean captures return valid JPEGs`, async () => {
    const [raw, clean] = await Promise.all([
      captureForAI({ url, skipClean: true }),
      captureForAI({ url, skipClean: false }),
    ]);
    for (const r of [raw, clean]) {
      expect(r.buffer.length).toBeGreaterThan(1000);
      expect(r.buffer[0]).toBe(0xff); // JPEG magic bytes
      expect(r.buffer[1]).toBe(0xd8);
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
      expect(r.mimeType).toBe('image/jpeg');
    }
  }, 60_000);
}

test('cleaning yields real byte savings on a noisy site (CNN, full page)', async () => {
  const [raw, clean] = await Promise.all([
    captureForAI({ url: 'https://www.cnn.com', skipClean: true, fullPage: true }),
    captureForAI({ url: 'https://www.cnn.com', skipClean: false, fullPage: true }),
  ]);
  expect(clean.sizeBytes).toBeLessThan(raw.sizeBytes);
}, 90_000);
