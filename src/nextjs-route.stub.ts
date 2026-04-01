// ─── Next.js App Router API Route — Week 3 stub ──────────────────────────────
//
// File location in your Next.js project:
//   app/api/capture/route.ts
//
// This is a ready-to-use API route that wraps captureForAI.
// In Week 3 you'll add:
//   - Supabase API key auth (validateApiKey)
//   - Credit deduction (deductCredits)
//   - S3/Supabase Storage upload + signed URL return

import { type NextRequest, NextResponse } from 'next/server';
import { captureForAI, CaptureError } from '@/lib/screenshot'; // adjust import path

export const runtime = 'nodejs'; // Required — Playwright needs Node.js runtime
export const maxDuration = 30;   // Vercel Pro: up to 300s; hobby: 10s

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, fullPage, waitForSelector, skipClean } = body;

  // ── Basic validation ───────────────────────────────────────────────────────
  if (typeof url !== 'string' || !url) {
    return NextResponse.json({ error: '`url` is required' }, { status: 422 });
  }

  // TODO (Week 3): authenticate the request
  // const apiKey = request.headers.get('x-api-key');
  // const account = await validateApiKey(apiKey);
  // if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // await deductCredits(account.id, 1);

  try {
    const result = await captureForAI({
      url,
      fullPage: fullPage === true,
      waitForSelector: typeof waitForSelector === 'string' ? waitForSelector : undefined,
      skipClean: skipClean === true,
    });

    // TODO (Week 3): upload to S3/Supabase Storage and return a signed URL
    // const signedUrl = await uploadToStorage(result.buffer, { ttl: 86400 });
    // return NextResponse.json({ url: signedUrl, ...metadata });

    // For now: return the image directly
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Capture-Time-Ms': String(result.captureTimeMs),
        'X-Page-Title': encodeURIComponent(result.pageTitle),
        'X-Image-Width': String(result.width),
        'X-Image-Height': String(result.height),
      },
    });
  } catch (err) {
    if (err instanceof CaptureError) {
      const statusMap: Record<string, number> = {
        INVALID_URL: 422,
        TIMEOUT: 504,
        NAVIGATION_FAILED: 502,
        SELECTOR_NOT_FOUND: 504,
        BROWSER_CRASH: 500,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 500 }
      );
    }

    console.error('[/api/capture] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — health check / capability probe
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'vision-screenshot-api',
    version: '1.0.0',
    status: 'ok',
    capabilities: ['clean-capture', 'reader-mode', 'high-dpi-jpeg'],
  });
}