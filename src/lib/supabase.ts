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

// Helper function to check if a key is valid
export async function validateApiKey(key: string) {
  if (!supabase) {
    console.error('[vision-mcp] Missing Supabase URL or Service Key. Cannot validate API key.');
    return null;
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, is_active')
    .eq('key_value', key)
    .single();

  if (error || !data || !data.is_active) {
    return null; // Key is either missing or blocked
  }
  return data.id; // Return the internal ID for logging later
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

// Upload image buffer to Supabase Storage and return public URL
export async function uploadToStorage(buffer: Buffer, filename: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .storage
      .from('captures')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('[VisionStream] Storage upload error:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('captures')
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[VisionStream] Failed to upload to storage:', err);
    return null;
  }
}