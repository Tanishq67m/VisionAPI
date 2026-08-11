import net from 'net';
import dns from 'dns/promises';
import { CaptureError } from '../types/capture.js';

/**
 * SSRF protection.
 *
 * A screenshot/observe service fetches arbitrary URLs *on our infrastructure*,
 * which is a classic SSRF vector: without guarding, a caller could point us at
 * cloud metadata (169.254.169.254), localhost, or private ranges and read
 * internal resources. We resolve the host and reject any private / loopback /
 * link-local / reserved address — for both the initial URL and any redirect.
 */

// ── IPv4 ─────────────────────────────────────────────────────────────────────
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b, c, d] = parts;
  if (a === 0) return true;                         // 0.0.0.0/8 "this network"
  if (a === 10) return true;                        // 10/8 private
  if (a === 127) return true;                       // 127/8 loopback
  if (a === 169 && b === 254) return true;          // 169.254/16 link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 private
  if (a === 192 && b === 168) return true;          // 192.168/16 private
  if (a === 100 && b >= 64 && b <= 127) return true;// 100.64/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0/24 IETF
  if (a === 255 && b === 255 && c === 255 && d === 255) return true; // broadcast
  return false;
}

// ── IPv6 ─────────────────────────────────────────────────────────────────────
function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::1' || addr === '::') return true;                 // loopback / unspecified
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped
  if (mapped) return isPrivateIpv4(mapped[1]);
  if (/^f[cd]/.test(addr)) return true;                            // fc00::/7 unique-local
  if (/^fe[89ab]/.test(addr)) return true;                         // fe80::/10 link-local
  return false;
}

/** Pure, network-free classification of a single IP address. */
export function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIpv4(ip);
  if (type === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP → treat as unsafe
}

const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.lan'];

/**
 * Throw a CaptureError('BLOCKED_URL' | 'INVALID_URL') if the URL is unsafe to
 * fetch. Resolves DNS and checks every returned address.
 */
export async function assertUrlAllowed(rawUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new CaptureError(`Invalid URL: "${rawUrl}"`, 'INVALID_URL', rawUrl);
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new CaptureError('Only http and https URLs are supported', 'INVALID_URL', rawUrl);
  }
  if (u.username || u.password) {
    throw new CaptureError('URLs with embedded credentials are not allowed', 'BLOCKED_URL', rawUrl);
  }

  const host = u.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  const lower = host.toLowerCase();

  if (lower === 'localhost' || lower === 'metadata.google.internal' || BLOCKED_HOST_SUFFIXES.some((s) => lower.endsWith(s))) {
    throw new CaptureError(`Blocked internal host: ${host}`, 'BLOCKED_URL', rawUrl);
  }

  let addresses: string[];
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      const resolved = await dns.lookup(host, { all: true });
      addresses = resolved.map((r) => r.address);
    } catch {
      throw new CaptureError(`Could not resolve host: ${host}`, 'BLOCKED_URL', rawUrl);
    }
  }

  if (addresses.length === 0) {
    throw new CaptureError(`Could not resolve host: ${host}`, 'BLOCKED_URL', rawUrl);
  }
  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new CaptureError(`Blocked private address for ${host}: ${ip}`, 'BLOCKED_URL', rawUrl);
    }
  }
}
