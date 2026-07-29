import express from 'express';
import cors from 'cors';
import { captureForAI, closeBrowser } from '../src/index.ts';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In production we serve the built Vite app from ./dist. In development the UI
// is served by Vite (npm run playground:ui) on its own port, so dist won't
// exist yet — only serve it when it's actually there.
const distDir = path.join(__dirname, 'dist');
const distIndex = path.join(distDir, 'index.html');
const hasBuiltUI = fs.existsSync(distIndex);
if (hasBuiltUI) {
  app.use(express.static(distDir));
}

// Simple health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ui: hasBuiltUI ? 'built' : 'dev' }));

app.post('/api/capture', async (req, res) => {
  const { url, fullPage, skipClean, waitForSelector, viewportWidth, timeoutMs, observe } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const result = await captureForAI({
      url,
      fullPage: !!fullPage,
      skipClean: !!skipClean,
      waitForSelector: waitForSelector || undefined,
      viewportWidth: viewportWidth || 1280,
      timeoutMs: timeoutMs || 30000,
      observe: observe !== false, // Observe on by default in the playground
    });

    const base64Image = result.buffer.toString('base64');
    
    // Calculate approximate tokens (OpenAI vision pricing rule of thumb: 170 tokens for base image + 85 per 512x512 tile)
    const baseTokens = 85;
    const tokens = Math.ceil(result.width / 512) * Math.ceil(result.height / 512) * 170 + baseTokens;

    res.json({
      success: true,
      data: {
        image: `data:image/jpeg;base64,${base64Image}`,
        metadata: {
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
          tokens: tokens,
          timeMs: result.captureTimeMs,
          title: result.pageTitle,
          resolvedUrl: result.resolvedUrl
        },
        observation: result.observation || null
      }
    });
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({ error: error.message || 'Capture failed' });
  }
});

// Catch-all: serve the SPA in production, or a helpful hint in development.
app.use((req, res) => {
  if (hasBuiltUI) {
    return res.sendFile(distIndex);
  }
  res.status(200).json({
    service: 'visionstream-playground-api',
    message:
      'API is running. The UI is served separately by Vite in dev — open the Vite URL (http://localhost:3000/playground). To serve the UI from this server instead, run `npm run build` in the playground folder first.',
    endpoints: ['POST /api/capture', 'GET /health'],
  });
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Playground API Server running at http://localhost:${port}`);
});
