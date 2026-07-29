/**
 * Standalone verification for the Observe engine.
 *
 *   npm run smoke:observe
 *   npm run smoke:observe https://news.ycombinator.com
 *
 * Captures a page with observe enabled and prints the structured result.
 * If this prints counts (and no "__name is not defined" error), the Observe
 * pipeline works end to end.
 */
import { captureForAI, closeBrowser } from './index.js';

const url = process.argv[2] || 'https://example.com';

async function main() {
  console.log(`\n▶ Observing ${url} ...\n`);
  const start = Date.now();
  const result = await captureForAI({ url, observe: true });

  console.log('✓ Capture OK');
  console.log('  page title :', result.pageTitle);
  console.log('  resolved   :', result.resolvedUrl);
  console.log('  image      :', `${result.width}x${result.height}, ${(result.sizeBytes / 1024).toFixed(0)} KB`);
  console.log('  time       :', `${Date.now() - start} ms`);

  if (result.observation) {
    console.log('\n✓ Observe OK — structured page understanding:');
    console.table(result.observation.counts);
    console.log('  sample buttons :', result.observation.buttons.slice(0, 5).map((b) => b.text));
    console.log('  sample links   :', result.observation.links.slice(0, 5).map((l) => l.text));
  } else {
    console.log('\n⚠ Observe returned no structured data (non-fatal). Check logs above.');
  }

  await closeBrowser();
  console.log('\nDone.\n');
}

main().catch(async (err) => {
  console.error('\n✗ FAILED:', err?.message || err);
  await closeBrowser().catch(() => {});
  process.exit(1);
});
