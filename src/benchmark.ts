import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { captureForAI, closeBrowser } from './captureForAI.js';

/**
 * Calculates Claude 3.5/4.6 Sonnet token count for an image.
 * Formula: Tokens = (Width * Height) / 750
 */
function calculateClaudeTokens(width: number, height: number): number {
    return Math.ceil((width * height) / 750);
}

/**
 * Calculates GPT-4o high-res vision token count for an image.
 * Formula: Shortest side scaled to 768px, broken into 512x512 tiles 
 * (170 tokens per tile) + 85 tokens base penalty.
 */
function calculateGpt4oTokens(width: number, height: number): number {
    const shortSide = Math.min(width, height);
    const scale = 768 / shortSide;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    const tilesWidth = Math.ceil(scaledWidth / 512);
    const tilesHeight = Math.ceil(scaledHeight / 512);
    
    return (tilesWidth * tilesHeight * 170) + 85;
}

/**
 * Main Benchmark Execution
 */
async function runBenchmark() {
    const targetUrl = process.argv[2];

    if (!targetUrl) {
        console.error("❌ Error: Please provide a target URL.");
        console.error("💡 Usage: npx tsx src/benchmark.ts <URL>");
        process.exit(1);
    }

    try {
        new URL(targetUrl);
    } catch {
        console.error(`❌ Error: Invalid URL provided: "${targetUrl}"`);
        process.exit(1);
    }

    const outDir = path.resolve('dist/benchmark');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`\n🚀 Starting VisionAPI Benchmark for: ${targetUrl}\n`);

    try {
        // ─── Capture A: Raw ────────────────────────────────────────────────────────
        console.log(`📸 Executing Capture A (Raw)...`);
        console.log(`   Navigating to URL, waiting for networkidle...`);
        const rawResult = await captureForAI({
            url: targetUrl,
            skipClean: true, // No janitor logic
            fullPage: true,
        });
        
        const rawPath = path.join(outDir, 'raw.jpeg');
        fs.writeFileSync(rawPath, rawResult.buffer);
        console.log(`   ✅ Saved to dist/benchmark/raw.jpeg`);

        // ─── Capture B: Cleaned ────────────────────────────────────────────────────
        console.log(`\n🧹 Executing Capture B (Cleaned)...`);
        console.log(`   Running smartWait and cleanPage overlay removal logic...`);
        const cleanResult = await captureForAI({
            url: targetUrl,
            skipClean: false, // Apply aggressive janitor logic
            fullPage: true,
        });

        const cleanPath = path.join(outDir, 'clean.jpeg');
        fs.writeFileSync(cleanPath, cleanResult.buffer);
        console.log(`   ✅ Saved to dist/benchmark/clean.jpeg\n`);

        // ─── Measure dimensions using sharp ────────────────────────────────────────
        console.log(`📏 Analyzing image buffers with sharp...`);
        const rawMetadata = await sharp(rawResult.buffer).metadata();
        const cleanMetadata = await sharp(cleanResult.buffer).metadata();

        if (!rawMetadata.width || !rawMetadata.height || !cleanMetadata.width || !cleanMetadata.height) {
            throw new Error("Failed to read image dimensions with sharp from the generated buffer.");
        }

        const rawWidth = rawMetadata.width;
        const rawHeight = rawMetadata.height;
        const cleanWidth = cleanMetadata.width;
        const cleanHeight = cleanMetadata.height;

        // ─── Token calculations ────────────────────────────────────────────────────
        const rawClaudeTokens = calculateClaudeTokens(rawWidth, rawHeight);
        const cleanClaudeTokens = calculateClaudeTokens(cleanWidth, cleanHeight);
        
        const rawGpt4oTokens = calculateGpt4oTokens(rawWidth, rawHeight);
        const cleanGpt4oTokens = calculateGpt4oTokens(cleanWidth, cleanHeight);

        // ─── Percentages ───────────────────────────────────────────────────────────
        const claudReduction = ((rawClaudeTokens - cleanClaudeTokens) / rawClaudeTokens) * 100;
        const gpt4oReduction = ((rawGpt4oTokens - cleanGpt4oTokens) / rawGpt4oTokens) * 100;

        const formatReduction = (pct: number) => {
            if (pct > 0) return `**⬇️ ${pct.toFixed(1)}%**`;
            if (pct < 0) return `**⬆️ ${Math.abs(pct).toFixed(1)}%**`;
            return `**0%**`;
        };

        // ─── Financial calculations ────────────────────────────────────────────────
        // Claude Sonnet input cost: $3.00 per Million tokens.
        const COST_PER_MILLION = 3.00;
        const rawCostPerRun = (rawClaudeTokens / 1_000_000) * COST_PER_MILLION;
        const cleanCostPerRun = (cleanClaudeTokens / 1_000_000) * COST_PER_MILLION;
        const savingsPerRun = rawCostPerRun - cleanCostPerRun;
        const savings1kRuns = savingsPerRun * 1000;

        // ─── Output Markdown Table ─────────────────────────────────────────────────
        console.log(`\n📊 **Benchmark Results**\n`);
        console.log(`| Metric | Raw (Original) | Cleaned (VisionAPI) | Payload Reduction |`);
        console.log(`|--------|----------------|---------------------|-------------------|`);
        console.log(`| **Dimensions** | ${rawWidth}x${rawHeight}px | ${cleanWidth}x${cleanHeight}px | - |`);
        console.log(`| **Claude 3.5 Sonnet Tokens** | ${rawClaudeTokens.toLocaleString()} | ${cleanClaudeTokens.toLocaleString()} | ${formatReduction(claudReduction)} |`);
        console.log(`| **GPT-4o Tokens** | ${rawGpt4oTokens.toLocaleString()} | ${cleanGpt4oTokens.toLocaleString()} | ${formatReduction(gpt4oReduction)} |`);
        
        console.log(`\n💰 **Financial Impact (Claude 3.5 Sonnet @ $3.00/1M Tokens):**`);
        console.log(`   - Raw Cost per 1,000 runs:      $${(rawCostPerRun * 1000).toFixed(4)}`);
        console.log(`   - Cleaned Cost per 1,000 runs:  $${(cleanCostPerRun * 1000).toFixed(4)}`);
        
        if (savings1kRuns > 0) {
            console.log(`   - **Total Savings (per 1,000 runs)**: 💵 **$${savings1kRuns.toFixed(4)}**\n`);
        } else {
            console.log(`   - **Total Cost Difference (per 1,000 runs)**: $${savings1kRuns.toFixed(4)}\n`);
        }

    } catch (err) {
        console.error("\n❌ Error during benchmark execution:");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    } finally {
        // Ensure Playwright browser is closed gracefully
        await closeBrowser();
    }
}

// Execute the benchmark
runBenchmark().catch(err => {
    console.error("Unhandled top-level error:", err);
    process.exit(1);
});
