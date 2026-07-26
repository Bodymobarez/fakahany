import type { Request } from 'express';

function isLocalHost(hostOrUrl: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(hostOrUrl);
}

/** Public API origin for absolute media links (tunnel / production / local). */
export function apiPublicOrigin(req?: Request) {
  const fromEnv = (process.env.API_URL || process.env.PUBLIC_API_URL || '').replace(/\/$/, '');

  // Prefer the request's public host (Cloudflare tunnel, reverse proxy) over a localhost API_URL.
  if (req) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0]!.trim();
    if (host && !isLocalHost(host)) {
      const proto = (req.get('x-forwarded-proto') || req.protocol || 'https')
        .split(',')[0]!
        .trim();
      return `${proto}://${host}`;
    }
  }

  if (fromEnv && !isLocalHost(fromEnv)) return fromEnv;
  if (fromEnv) return fromEnv;

  if (req) {
    const host = req.get('host');
    if (host) {
      const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0]!.trim();
      return `${proto}://${host}`;
    }
  }

  return `http://localhost:${process.env.API_PORT || 4000}`;
}

const LOCAL_UPLOAD =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/uploads\//i;

/** Turn stored /uploads or localhost upload URLs into a public absolute URL. */
export function toPublicMediaUrl(raw: string | null | undefined, origin: string): string | null {
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (/example\.com/i.test(raw) || /\/cat\.jpg/i.test(raw)) return null;

  if (LOCAL_UPLOAD.test(raw)) {
    return raw.replace(LOCAL_UPLOAD, `${origin}/uploads/`);
  }
  if (raw.startsWith('/uploads/')) {
    return `${origin}${raw}`;
  }
  return raw;
}

/** Deep-rewrite upload / localhost media strings inside JSON payloads. */
export function rewriteMediaInJson<T>(value: T, origin: string): T {
  if (typeof value === 'string') {
    const next = toPublicMediaUrl(value, origin);
    return (next ?? value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteMediaInJson(item, origin)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteMediaInJson(child, origin);
    }
    return out as T;
  }
  return value;
}
