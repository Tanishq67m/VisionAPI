import type { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../lib/supabase.js';

// Extend Express Request interface to hold our API key ID
declare global {
  namespace Express {
    interface Request {
      apiKeyId?: string;
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
    const apiKeyId = await validateApiKey(token);
    
    if (!apiKeyId) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Attach the internal ID to the request for logging
    req.apiKeyId = apiKeyId;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error validating token:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
