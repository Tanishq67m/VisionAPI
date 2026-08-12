import express from 'express';
import cors from 'cors';
import { captureForAI, closeBrowser } from './index.js';
import { CaptureError } from './types/capture.js';
import { requireAuth } from './middleware/auth.js';
import { enforceQuota } from './middleware/quota.js';
import { requireUser } from './middleware/requireUser.js';
import { logRequest, uploadToStorage, applyPlanForUser } from './lib/supabase.js';
import { getBillingProvider, PLAN_PRICING, isPaidPlan } from './billing/index.js';
import PQueue from 'p-queue';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';

export const app = express();
// Default to 8787 so the API can run alongside the Vite UI (which uses 3000).
const port = process.env.PORT || 8787;

app.use(cors());
// Parse JSON for everything except the billing webhook, which needs the raw
// request body for signature verification.
app.use((req, res, next) => {
  if (req.originalUrl === '/billing/webhook') return next();
  return express.json()(req, res, next);
});

// Coarse per-IP guard against abuse across the whole service.
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use(ipLimiter);

// Per-KEY burst limiter for the capture endpoints — keeps one noisy key from
// starving others. Keyed by the bearer token (falls back to IP if absent).
// (In-memory: fine for a single instance; use a shared store when you scale out.)
const BURST_PER_MIN = Number(process.env.BURST_PER_MIN || 60);
const keyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: BURST_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization || '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : (req.ip ?? 'unknown');
  },
  message: { error: `Rate limit: max ${BURST_PER_MIN} requests/minute per key. Slow down and retry.` },
});

// Concurrency queue (In-Memory Queue for Phase 2)
// This ensures we only run a few browser contexts at a time to prevent OOM/crashes
const queue = new PQueue({ concurrency: 2 });

// Health Check
app.get('/', (req, res) => {
  res.json({
    service: 'vision-stream-api',
    status: 'ok',
    version: '1.0.0'
  });
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /capture:
 *   post:
 *     summary: Capture a clean, AI-optimized screenshot of a URL
 *     description: Navigates to a URL, waits for it to load, cleans popups, and returns an optimized image.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *               fullPage:
 *                 type: boolean
 *               skipClean:
 *                 type: boolean
 *               waitForSelector:
 *                 type: string
 *               extractElements:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully captured
 *       400:
 *         description: Missing or invalid URL
 *       401:
 *         description: Unauthorized (invalid API key)
 */
app.post('/capture', keyLimiter, requireAuth, enforceQuota, async (req, res) => {
  const { url, fullPage, skipClean, waitForSelector, viewportWidth, timeoutMs, extractElements } = req.body;
  const apiKeyId = req.apiKeyId || null;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  const startTime = Date.now();
  let status: 'success' | 'error' = 'success';
  let sizeBytes = 0;
  let tokensSaved = 0;
  let costSaved = 0;

  try {
    // Wrap the core capture process in the concurrency queue
    const result = await queue.add(async () => {
      return await captureForAI({
        url,
        fullPage: !!fullPage,
        skipClean: !!skipClean,
        waitForSelector: waitForSelector || undefined,
        viewportWidth: viewportWidth || 1280,
        timeoutMs: timeoutMs || 30000,
        extractElements: !!extractElements,
      });
    });

    if (!result) {
      throw new Error('Capture failed internally');
    }

    sizeBytes = result.sizeBytes;
    
    // Upload the captured buffer to Supabase Storage
    const filename = `capture_${Date.now()}_${Math.random().toString(36).substring(7)}.jpeg`;
    const imageUrl = await uploadToStorage(result.buffer, filename);
    
    // Rough estimate logic for metering
    const baseTokens = 85;
    const tokens = Math.ceil(result.width / 512) * Math.ceil(result.height / 512) * 170 + baseTokens;
    
    // Calculate tokens saved (assume cleaning saves ~30% tokens heuristically for now)
    if (!skipClean) {
      tokensSaved = Math.floor(tokens * 0.3);
      costSaved = (tokensSaved / 1000) * 0.005; // Assuming $0.005 per 1K vision tokens
    }

    res.json({
      success: true,
      data: {
        image_url: imageUrl,
        metadata: {
          width: result.width,
          height: result.height,
          sizeBytes: result.sizeBytes,
          tokens_used: tokens,
          title: result.pageTitle,
          resolvedUrl: result.resolvedUrl,
          ...(result.elements ? { elements: result.elements } : {})
        },
        processing_time: result.captureTimeMs
      }
    });

  } catch (error: any) {
    status = 'error';
    console.error('Capture error:', error);
    
    const statusCode = error instanceof CaptureError ? 422 : 500;
    res.status(statusCode).json({ error: error.message || 'Capture failed' });
  } finally {
    // Log usage metering asynchronously
    const latencyMs = Date.now() - startTime;
    logRequest({
      apiKeyId,
      url,
      latencyMs,
      sizeBytes,
      tokensSaved,
      costSaved,
      status
    }).catch(err => console.error('Logging failed:', err));
  }
});

/**
 * @openapi
 * /observe:
 *   post:
 *     summary: Return a structured understanding of a web page (Observe API)
 *     description: >
 *       Navigates to a URL, cleans it, and returns structured page intelligence —
 *       headings, buttons, links, forms, tables, inputs, images, and a flat list of
 *       interactive elements with bounding boxes — so an AI agent can understand the
 *       page without inferring everything from pixels. Optionally includes the screenshot.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *               includeScreenshot:
 *                 type: boolean
 *               waitForSelector:
 *                 type: string
 *     responses:
 *       200:
 *         description: Structured page observation
 *       400:
 *         description: Missing or invalid URL
 *       401:
 *         description: Unauthorized (invalid API key)
 */
app.post('/observe', keyLimiter, requireAuth, enforceQuota, async (req, res) => {
  const { url, includeScreenshot, waitForSelector, viewportWidth, timeoutMs, fullPage } = req.body;
  const apiKeyId = req.apiKeyId || null;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  const startTime = Date.now();
  let status: 'success' | 'error' = 'success';
  let sizeBytes = 0;

  try {
    const result = await queue.add(async () => {
      return await captureForAI({
        url,
        fullPage: !!fullPage,
        skipClean: false,
        observe: true,
        waitForSelector: waitForSelector || undefined,
        viewportWidth: viewportWidth || 1280,
        timeoutMs: timeoutMs || 30000,
      });
    });

    if (!result) {
      throw new Error('Observe failed internally');
    }

    sizeBytes = result.sizeBytes;

    // Only upload/return the image if the caller explicitly asked for it.
    let imageUrl: string | null = null;
    if (includeScreenshot) {
      const filename = `observe_${Date.now()}_${Math.random().toString(36).substring(7)}.jpeg`;
      imageUrl = await uploadToStorage(result.buffer, filename);
    }

    res.json({
      success: true,
      data: {
        ...(imageUrl ? { image_url: imageUrl } : {}),
        observation: result.observation,
        metadata: {
          title: result.pageTitle,
          resolvedUrl: result.resolvedUrl,
        },
        processing_time: result.captureTimeMs,
      },
    });
  } catch (error: any) {
    status = 'error';
    console.error('Observe error:', error);
    const statusCode = error instanceof CaptureError ? 422 : 500;
    res.status(statusCode).json({ error: error.message || 'Observe failed' });
  } finally {
    const latencyMs = Date.now() - startTime;
    logRequest({
      apiKeyId,
      url,
      latencyMs,
      sizeBytes,
      tokensSaved: 0,
      costSaved: 0,
      status,
    }).catch(err => console.error('Logging failed:', err));
  }
});

// ── Billing (provider-agnostic: mock | stripe | razorpay) ────────────────────
app.get('/billing/plans', (_req, res) => {
  res.json({ provider: getBillingProvider().name, plans: PLAN_PRICING });
});

// Start a checkout for the logged-in user (authenticated by Supabase session JWT).
app.post('/billing/checkout', requireUser, async (req, res) => {
  const plan = String(req.body?.plan || '');
  if (!isPaidPlan(plan)) {
    return res.status(400).json({ error: 'Choose a paid plan: "pro" or "team".' });
  }
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  try {
    const provider = getBillingProvider();
    const result = await provider.createCheckout({
      userId: req.userId!,
      plan,
      successUrl: `${appUrl}/dashboard?upgraded=1`,
      cancelUrl: `${appUrl}/dashboard`,
    });
    res.json({ provider: provider.name, ...result });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
});

// Provider webhook (Stripe/Razorpay). The mock provider fulfils synchronously,
// so this is a no-op for demos.
app.post('/billing/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const provider = getBillingProvider();
    const sigHeader = req.headers['stripe-signature'] || req.headers['x-razorpay-signature'];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    const result = await provider.handleWebhook(req.body as Buffer, signature);
    if (result.handled && result.userId && result.plan) {
      await applyPlanForUser(result.userId, result.plan);
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message || 'Webhook error' });
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await closeBrowser();
  process.exit(0);
});

// Only auto-listen when run directly (not when imported by a test).
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`🚀 VisionStream API running on http://localhost:${port}`);
    console.log(`Generate a key in the dashboard, then: curl -X POST http://localhost:${port}/observe -H "Authorization: Bearer <YOUR_KEY>" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`);
  });
}
