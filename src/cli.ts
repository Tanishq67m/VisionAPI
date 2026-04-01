#!/usr/bin/env tsx
//
// Quick CLI to test your capture engine without spinning up a server.
//
// Usage:
//   npx ts-node src/cli.ts https://example.com
//   npx ts-node src/cli.ts https://example.com --full-page --no-clean
//   npx ts-node src/cli.ts https://news.ycombinator.com --wait-for ".athing"

import * as fs from 'fs';
import * as path from 'path';
import { captureForAI, closeBrowser, CaptureError } from './index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Vision-Ready Screenshot API — CLI test runner

Usage:
  npx ts-node src/cli.ts <url> [options]

Options:
  --full-page          Capture full scrollable page (default: viewport only)
  --no-clean           Skip overlay removal and Reader Mode injection
  --wait-for <sel>     CSS selector to wait for before capturing
  --output <path>      Output file path (default: ./capture.jpeg)
  --width <px>         Viewport width (default: 1280)
  --height <px>        Viewport height (default: 800)

Examples:
  npx ts-node src/cli.ts https://example.com
  npx ts-node src/cli.ts https://bbc.co.uk --wait-for "article h1" --full-page
  npx ts-node src/cli.ts https://news.ycombinator.com --no-clean --output hn-raw.jpeg
`);
    process.exit(0);
  }

  const url = args[0];
  const fullPage = args.includes('--full-page');
  const skipClean = args.includes('--no-clean');

  const waitForIdx = args.indexOf('--wait-for');
  const waitForSelector = waitForIdx !== -1 ? args[waitForIdx + 1] : undefined;

  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : './capture.jpeg';

  const widthIdx = args.indexOf('--width');
  const viewportWidth = widthIdx !== -1 ? parseInt(args[widthIdx + 1], 10) : undefined;

  const heightIdx = args.indexOf('--height');
  const viewportHeight = heightIdx !== -1 ? parseInt(args[heightIdx + 1], 10) : undefined;

  console.log(`\n🔍  Capturing: ${url}`);
  console.log(`    fullPage=${fullPage} | skipClean=${skipClean} | waitFor=${waitForSelector ?? 'none'}\n`);

  try {
    const captureOptions: any = { url, fullPage, skipClean };
    if (waitForSelector !== undefined) captureOptions.waitForSelector = waitForSelector;
    if (viewportWidth !== undefined) captureOptions.viewportWidth = viewportWidth;
    if (viewportHeight !== undefined) captureOptions.viewportHeight = viewportHeight;

    const result = await captureForAI(captureOptions);

    const absOutput = path.resolve(outputPath);
    fs.writeFileSync(absOutput, result.buffer);

    console.log('✅  Capture complete');
    console.log(`    Title:       ${result.pageTitle}`);
    console.log(`    Resolved URL:${result.resolvedUrl}`);
    console.log(`    Dimensions:  ${result.width}×${result.height}px`);
    console.log(`    Size:        ${(result.sizeBytes / 1024).toFixed(1)} KB`);
    console.log(`    Time:        ${result.captureTimeMs}ms`);
    console.log(`    Saved to:    ${absOutput}\n`);
  } catch (err) {
    if (err instanceof CaptureError) {
      console.error(`❌  CaptureError [${err.code}]: ${err.message}`);
    } else {
      console.error('❌  Unexpected error:', err);
    }
    process.exit(1);
  } finally {
    await closeBrowser();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});