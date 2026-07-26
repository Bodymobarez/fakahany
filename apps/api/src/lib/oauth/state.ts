import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { OAuthProviderId } from './config';

export type OAuthStatePayload = {
  provider: OAuthProviderId;
  locale: string;
  nonce: string;
  returnTo?: string;
  exp: number;
};

function secret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_REFRESH_SECRET || 'dev-oauth-state';
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function createOAuthState(input: {
  provider: OAuthProviderId;
  locale?: string;
  returnTo?: string;
}) {
  const payload: OAuthStatePayload = {
    provider: input.provider,
    locale: input.locale === 'ar' ? 'ar' : 'en',
    nonce: randomBytes(16).toString('hex'),
    returnTo: input.returnTo,
    exp: Math.floor(Date.now() / 1000) + 60 * 10,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function parseOAuthState(raw: string | undefined | null): OAuthStatePayload {
  if (!raw || !raw.includes('.')) throw new Error('Invalid OAuth state');
  const [body, sig] = raw.split('.');
  if (!body || !sig) throw new Error('Invalid OAuth state');
  const expected = b64url(createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }
  const payload = JSON.parse(fromB64url(body).toString('utf8')) as OAuthStatePayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('OAuth state expired');
  }
  return payload;
}
