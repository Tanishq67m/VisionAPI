import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { cleanPage } from './utils/cleanPage.js';
import { smartWait } from './utils/smartWait.js';

// ── Pricing (May 2026) ────────────────────────────────────────────────────────
const CLAUDE_SONNET_46_INPUT_PER_M = 3.00;  // claude-sonnet-4-6 input tokens
const GPT4O_INPUT_PER_M = 2.50;             // gpt-4o input tokens

// ── Token math ────────────────────────────────────────────────────────────────

/**
 * Anthropic Claude: ~(width * height) / 750
 * Based on published model card for Claude 3.5/4.x vision
 */
function claudeTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

/**
 * OpenAI GPT-4o High Detail:
 * 1. Resize so shortest side = 768px (maintaining aspect ratio)
 * 2. If longest side > 2048px, scale down so longest side = 2048px
 * 3. Count 512x512 tiles; each tile = 170 tokens + 85 base
 */
function gpt4oTokens(width: number, height: number): number {
  let w = width, h = height;

  // Step 1: scale shortest side to 768
  if (Math.min(w, h) > 768) {
    const scale = 768 / Math.min(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // Step 2: scale longest side to max 2048
  if (Math.max(w, h) > 2048) {
    const scale = 2048 / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const tilesX = Math.ceil(w / 512);
  const tilesY = Math.ceil(h / 512);
  return tilesX * tilesY * 170 + 85;
}

async function runBenchmark(url: string) {
  console.log(`\n🚀 Starting VisionAPI Benchmark for: ${url}\n`);

  const outputDir = path.join('dist', 'benchmark');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
    ],
  });

  let rawBuffer: Buffer, cleanBuffer: Buffer;

  // ── Capture A: Raw ────────────────────────────────────────────────────────
  console.log('📸 Executing Capture A (Raw)...');
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    console.log('   Navigating to URL, waiting for page load...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await smartWait(page, {});
    // Force exact width to prevent horizontal bleed from breaking GPT token math baselines
    await page.addStyleTag({ content: 'html, body { overflow-x: hidden !important; max-width: 100% !important; }' });
    rawBuffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: true });
    fs.writeFileSync(path.join(outputDir, 'raw.jpeg'), rawBuffer);
    console.log('   ✅ Saved to dist/benchmark/raw.jpeg');
    await context.close();
  }

  // ── Capture B: Cleaned ───────────────────────────────────────────────────
  console.log('🧹 Executing Capture B (Cleaned)...');
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    console.log('   Running smartWait and cleanPage overlay removal logic...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await smartWait(page, {});
    await cleanPage(page, { readerMode: true });
    cleanBuffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: true });
    fs.writeFileSync(path.join(outputDir, 'clean.jpeg'), cleanBuffer);
    console.log('   ✅ Saved to dist/benchmark/clean.jpeg');
    await context.close();
  }

  await browser.close();

  // ── Analysis ──────────────────────────────────────────────────────────────
  console.log('\n📏 Analyzing image buffers with sharp...');
  let rawMeta = await sharp(rawBuffer).metadata();
  const cleanMeta = await sharp(cleanBuffer).metadata();

  // Normalize rawBuffer width to 2560 if it expanded due to horizontal overflow
  if (rawMeta.width! > 2560) {
    rawBuffer = await sharp(rawBuffer)
      .extract({ left: 0, top: 0, width: 2560, height: rawMeta.height! })
      .toBuffer();
  }

  const rW = rawMeta.width! > 2560 ? 2560 : rawMeta.width!, rH = rawMeta.height!;
  const cW = cleanMeta.width!, cH = cleanMeta.height!;

  const heightDeltaPx = rH - cH;
  const heightDeltaPct = ((heightDeltaPx / rH) * 100).toFixed(1);
  console.log(`\n🔍 **Height Analysis:**`);
  console.log(`   Height delta: ${heightDeltaPx}px (${heightDeltaPct}% reduction)`);
  console.log(`   Token delta driven by: ${heightDeltaPx > 500 ? 'meaningful DOM collapse ✅' : 'mostly cosmetic hiding ⚠️ — DOM nodes still holding layout'}`);

  const rawClaude = claudeTokens(rW, rH);
  const cleanClaude = claudeTokens(cW, cH);
  const rawGPT = gpt4oTokens(rW, rH);
  const cleanGPT = gpt4oTokens(cW, cH);

  const claudeReduction = (((rawClaude - cleanClaude) / rawClaude) * 100).toFixed(1);
  const gptReduction = rawGPT === cleanGPT ? '0' : (((rawGPT - cleanGPT) / rawGPT) * 100).toFixed(1);

  const rawClaudeCost = (rawClaude / 1_000_000) * CLAUDE_SONNET_46_INPUT_PER_M * 1000;
  const cleanClaudeCost = (cleanClaude / 1_000_000) * CLAUDE_SONNET_46_INPUT_PER_M * 1000;
  const savings = rawClaudeCost - cleanClaudeCost;

  const rawGPTCost = (rawGPT / 1_000_000) * GPT4O_INPUT_PER_M * 1000;
  const cleanGPTCost = (cleanGPT / 1_000_000) * GPT4O_INPUT_PER_M * 1000;
  const gptSavings = rawGPTCost - cleanGPTCost;

  console.log('\n📊 **Benchmark Results**');
  console.log('| Metric | Raw (Original) | Cleaned (VisionAPI) | Payload Reduction |');
  console.log('|--------|----------------|---------------------|-------------------|');
  console.log(`| **Dimensions** | ${rW}x${rH}px | ${cW}x${cH}px | - |`);
  console.log(`| **File Size** | ${(rawBuffer.length / 1024).toFixed(0)} KB | ${(cleanBuffer.length / 1024).toFixed(0)} KB | ⬇️ ${(((rawBuffer.length - cleanBuffer.length) / rawBuffer.length) * 100).toFixed(1)}% |`);
  console.log(`| **Claude Sonnet 4.6 Tokens** | ${rawClaude.toLocaleString()} | ${cleanClaude.toLocaleString()} | **⬇️ ${claudeReduction}%** |`);
  console.log(`| **GPT-4o Tokens** | ${rawGPT.toLocaleString()} | ${cleanGPT.toLocaleString()} | **⬇️ ${gptReduction}%** |`);

  console.log(`\n💰 **Financial Impact @ 1,000 runs:**`);
  console.log(`   Claude Sonnet 4.6 ($${CLAUDE_SONNET_46_INPUT_PER_M}/1M tokens):`);
  console.log(`   - Raw:     $${rawClaudeCost.toFixed(4)}`);
  console.log(`   - Cleaned: $${cleanClaudeCost.toFixed(4)}`);
  console.log(`   - 💵 Saved: $${savings.toFixed(4)}`);
  console.log(`\n   GPT-4o ($${GPT4O_INPUT_PER_M}/1M tokens):`);
  console.log(`   - Raw:     $${rawGPTCost.toFixed(4)}`);
  console.log(`   - Cleaned: $${cleanGPTCost.toFixed(4)}`);
  console.log(`   - 💵 Saved: $${gptSavings.toFixed(4)}\n`);
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: npx tsx src/benchmark.ts <url>');
  process.exit(1);
}
runBenchmark(url).catch(console.error);
