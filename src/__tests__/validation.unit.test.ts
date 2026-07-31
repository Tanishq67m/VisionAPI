import { captureForAI } from '../index.js';
import { CaptureError } from '../types/capture.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Fast unit tests — no browser, no network. These validate the guard rails that
 * run before any expensive work.
 */

describe('URL validation (fails before launching a browser)', () => {
  test('rejects a non-URL string', async () => {
    await expect(captureForAI({ url: 'not a real url' })).rejects.toBeInstanceOf(CaptureError);
  });

  test('rejects non-http(s) protocols', async () => {
    await expect(captureForAI({ url: 'ftp://example.com/file' })).rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  test('rejects file:// URLs (SSRF-adjacent)', async () => {
    await expect(captureForAI({ url: 'file:///etc/passwd' })).rejects.toMatchObject({ code: 'INVALID_URL' });
  });
});

describe('requireAuth middleware', () => {
  const mockRes = () => {
    const r: any = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
  };

  test('returns 401 when the Authorization header is missing', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ headers: {} } as any, res, next as any);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when the scheme is not Bearer', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Token abc123' } } as any, res, next as any);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when the Bearer token is empty', async () => {
    const res = mockRes();
    const next = jest.fn();
    await requireAuth({ headers: { authorization: 'Bearer ' } } as any, res, next as any);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
