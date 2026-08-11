import { isPrivateIp, assertUrlAllowed } from '../utils/ssrfGuard.js';
import { CaptureError } from '../types/capture.js';

describe('isPrivateIp — pure classification', () => {
  const priv = ['0.0.0.0', '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '100.64.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1'];
  const pub = ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '99.63.255.255', '2606:4700:4700::1111', '::ffff:8.8.8.8'];

  test.each(priv)('%s is private', (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  test.each(pub)('%s is public', (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
  test('a non-IP string is treated as unsafe', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true);
  });
});

describe('assertUrlAllowed — blocks SSRF targets', () => {
  const blocked = [
    'http://169.254.169.254/latest/meta-data/', // cloud metadata
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'http://localhost/',
    'http://metadata.google.internal/',
    'http://foo.internal/',
    'http://user:pass@example.com/', // embedded credentials
  ];
  test.each(blocked)('rejects %s', async (url) => {
    await expect(assertUrlAllowed(url)).rejects.toBeInstanceOf(CaptureError);
  });

  test('rejects non-http(s) protocol', async () => {
    await expect(assertUrlAllowed('ftp://example.com')).rejects.toMatchObject({ code: 'INVALID_URL' });
  });

  test('allows a public IP literal', async () => {
    await expect(assertUrlAllowed('http://8.8.8.8/')).resolves.toBeUndefined();
  });
});
