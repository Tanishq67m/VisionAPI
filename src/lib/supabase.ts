import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Provide absolute path to .env since MCP Server runs from different CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize the master connection safely
export const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any;

import crypto from 'crypto';

/** SHA-256 → lowercase hex. Must match the browser's sha256Hex used at key creation. */
export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Helper function to check if a key is valid. Keys are stored as a SHA-256 hash;
// we hash the incoming token and look it up by hash (never by plaintext).
export async function validateApiKey(key: string) {
  if (!supabase) {
    console.error('[vision-mcp] Missing Supabase URL or Service Key. Cannot validate API key.');
    return null;
  }

  const keyHash = hashApiKey(key);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, is_active, plan')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data || !data.is_active) {
    return null; // Key is either missing or blocked
  }
  return { id: data.id as string, plan: (data.plan as string) || 'free' };
}

// Verify a Supabase user session JWT and return the user id (for account-level
// actions like billing, which are authenticated by the logged-in user — not an
// API key).
export async function getUserFromToken(jwt: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user.id;
}

// Apply a plan to all of a user's API keys (used by billing). Runs with the
// service role, so it bypasses RLS. Returns true on success.
export async function applyPlanForUser(userId: string, plan: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('api_keys').update({ plan }).eq('user_id', userId);
  if (error) {
    console.error('[VisionStream] Failed to apply plan:', error.message);
    return false;
  }
  return true;
}

// Count how many requests this key has made in the current billing period.
export async function countKeyUsageThisMonth(apiKeyId: string, sinceIso: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', sinceIso);
  if (error) {
    console.error('[VisionStream] Failed to count usage:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Log metering data for billing and dashboard
export async function logRequest(data: {
  apiKeyId: string | null;
  url: string;
  latencyMs: number;
  sizeBytes: number;
  tokensSaved?: number;
  costSaved?: number;
  status: 'success' | 'error';
}) {
  if (!supabase) return;

  const { error } = await supabase.from('requests').insert([{
    api_key_id: data.apiKeyId,
    url: data.url,
    latency_ms: data.latencyMs,
    size_bytes: data.sizeBytes,
    tokens_saved: data.tokensSaved,
    cost_saved: data.costSaved,
    status: data.status,
  }]);

  if (error) {
    console.error('[VisionStream] Failed to log request:', error.message);
  }
}

// How long a capture's signed URL stays valid (seconds). Default 1 hour.
const CAPTURE_URL_TTL_SECONDS = Number(process.env.CAPTURE_URL_TTL_SECONDS || 3600);

// Upload an image buffer to the (PRIVATE) `captures` bucket and return a
// short-lived signed URL. Captures can contain sensitive content (a user's own
// logged-in pages), so we never expose them via a public, permanent URL.
export async function uploadToStorage(buffer: Buffer, filename: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { error } = await supabase
      .storage
      .from('captures')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[VisionStream] Storage upload error:', error.message);
      return null;
    }

    const { data: signed, error: signErr } = await supabase
      .storage
      .from('captures')
      .createSignedUrl(filename, CAPTURE_URL_TTL_SECONDS);

    if (signErr || !signed) {
      console.error('[VisionStream] Failed to sign capture URL:', signErr?.message);
      return null;
    }

    return signed.signedUrl;
  } catch (err) {
    console.error('[VisionStream] Failed to upload to storage:', err);
    return null;
  }
}