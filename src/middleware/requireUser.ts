import type { Request, Response, NextFunction } from 'express';

// Account-level actions (billing) are authenticated by the logged-in user's
// Supabase session JWT, not by an API key. Lazy-load the verifier so this file
// doesn't pull supabase.ts into unit-test module graphs.
type GetUserFn = (jwt: string) => Promise<string | null>;
let _getUser: GetUserFn | null = null;
async function getUserFromToken(): Promise<GetUserFn> {
  if (!_getUser) {
    _getUser = (await import('../lib/supabase.js')).getUserFromToken as GetUserFn;
  }
  return _getUser;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing user session token' });
  }
  const token = authHeader.slice(7);
  try {
    const verify = await getUserFromToken();
    const userId = await verify(token);
    if (!userId) return res.status(401).json({ error: 'Invalid or expired session' });
    req.userId = userId;
    next();
  } catch (err) {
    console.error('[requireUser] verification error:', err);
    return res.status(500).json({ error: 'Session verification failed' });
  }
}
