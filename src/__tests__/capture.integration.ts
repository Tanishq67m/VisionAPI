import { captureForAI } from '../index';

const TEST_URLS = [
  { url: 'https://www.cnn.com', expectedReduction: 0.20 },
  { url: 'https://www.bbc.co.uk', expectedReduction: 0.10 },
  { url: 'https://www.apple.com/mac/', expectedReduction: 0.08 },
  { url: 'https://news.ycombinator.com', expectedReduction: 0.02 }, // minimal noise — low bar
];

for (const { url, expectedReduction } of TEST_URLS) {
  test(`${url} reduces height by at least ${expectedReduction * 100}%`, async () => {
    const [raw, clean] = await Promise.all([
      captureForAI({ url, skipClean: true, fullPage: true }),
      captureForAI({ url, skipClean: false, fullPage: true }),
    ]);
    const reduction = (raw.height - clean.height) / raw.height;
    expect(reduction).toBeGreaterThan(expectedReduction);
    expect(clean.sizeBytes).toBeLessThan(raw.sizeBytes);
  }, 60_000);
}
