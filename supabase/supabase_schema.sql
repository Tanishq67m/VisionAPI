-- ─── VisionStream Phase 1 Supabase Schema ──────────────────────────────

-- 1. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- In a real app, this would link to auth.users, but we can leave it as text for now or UUID if using Supabase Auth
    user_id UUID, 
    key_value TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 2. Create requests table for metering
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    tokens_saved INTEGER,
    cost_saved NUMERIC,
    status TEXT DEFAULT 'success', -- 'success', 'error'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 3. Create a dummy API key for testing
INSERT INTO public.api_keys (key_value, name) 
VALUES ('vs_test_123456789', 'Test Key') 
ON CONFLICT (key_value) DO NOTHING;
