import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  refreshExpiresAt,
  signAccessToken,
  signRefreshToken,
} from '../../lib/jwt';

export const otpStore = new Map<string, { code: string; expires: number }>();
export const resetStore = new Map<string, { token: string; expires: number }>();

export async function uniqueUsername(seed?: string | null) {
  const cleaned = (seed || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
  const base =
    cleaned.length >= 3
      ? cleaned
      : `u${cleaned}${Date.now().toString().slice(-6)}`.slice(0, 24);
  let candidate = base.length >= 3 ? base : `u${Date.now().toString().slice(-8)}`;
  for (let i = 0; i < 20; i++) {
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${base.slice(0, 20)}${Math.floor(10 + Math.random() * 89)}`;
  }
  return `u${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
}

export function publicUser(user: {
  id: string;
  username?: string | null;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  marketingOptIn: boolean;
}) {
  return {
    id: user.id,
    username: user.username ?? null,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    locale: user.locale,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    marketingOptIn: user.marketingOptIn,
  };
}

export async function issueTokens(user: {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
}) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiresAt(),
    },
  });
  return { accessToken, refreshToken };
}

export async function assertTotp(secret: string | null | undefined, totp?: string) {
  if (!secret) return { ok: true as const, requires2fa: false as const };
  if (!totp) return { ok: false as const, requires2fa: true as const };
  const { verifyTotp } = await import('../../lib/totp');
  if (!verifyTotp(secret, totp)) return { ok: false as const, requires2fa: false as const, invalid: true as const };
  return { ok: true as const, requires2fa: false as const };
}
