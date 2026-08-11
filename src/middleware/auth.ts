import type { Request, Response, NextFunction } from 'express';

// Load the Supabase validator lazily. This keeps supabase.ts (which uses
// import.meta) out of the module graph for callers that never authenticate a
// token — e.g. unit tests exercising the header-validation branches — so those
// tests don't need to compile ESM-only syntax under ts-jest.
type ValidateFn = (key: string) => Promise<{ id: string; plan: string } | null>;
let _validateApiKey: ValidateFn | null = null;
async function getValidateApiKey(): Promise<ValidateFn> {
  if (!_validateApiKey) {
    _validateApiKey = (await import('../lib/supabase.js')).validateApiKey as ValidateFn;
  }
  return _validateApiKey;
}

// Extend Express Request interface to hold our API key context
declare global {
  namespace Express {
    interface Request {
      apiKeyId?: string;
      apiKeyPlan?: string;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <key>' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  try {
    const validateApiKey = await getValidateApiKey();
    const key = await validateApiKey(token);

    if (!key) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Attach the key context for logging + quota enforcement
    req.apiKeyId = key.id;
    req.apiKeyPlan = key.plan;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error validating token:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
