import express from 'express';
import cors from 'cors';
import { captureForAI, closeBrowser } from '../src/index.ts';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/capture', async (req, res) => {
  const { url, fullPage, skipClean, waitForSelector, viewportWidth, timeoutMs } = req.body;

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
        }
      }
    });
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({ error: error.message || 'Capture failed' });
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Playground API Server running at http://localhost:${port}`);
});
