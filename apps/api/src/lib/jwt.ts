import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
}

const accessSecret = () => process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me!!';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me!';
const accessExpires = () => process.env.JWT_ACCESS_EXPIRES || '15m';
const refreshExpires = () => process.env.JWT_REFRESH_EXPIRES || '7d';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: accessExpires() } as jwt.SignOptions);
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, refreshSecret(), { expiresIn: refreshExpires() } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret()) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, refreshSecret()) as { sub: string };
}

export function refreshExpiresAt(): Date {
  const raw = refreshExpires();
  const match = /^(\d+)([dhms])$/.exec(raw);
  const now = Date.now();
  if (!match) {
    return new Date(now + 7 * 24 * 60 * 60 * 1000);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 'd' ? 24 * 60 * 60 * 1000 : unit === 'h' ? 60 * 60 * 1000 : unit === 'm' ? 60 * 1000 : 1000;
  return new Date(now + amount * mult);
}
