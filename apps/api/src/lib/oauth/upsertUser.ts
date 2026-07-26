import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { prisma } from '../prisma';
import { hashPassword } from '../password';
import { uniqueUsername } from '../../routes/auth/helpers';
import type { OAuthProfile } from './providers';

export async function upsertOAuthUser(profile: OAuthProfile) {
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingLink?.user) {
    const addressCount = await prisma.address.count({ where: { userId: existingLink.user.id } });
    return { user: existingLink.user, isNew: false, needsAddress: addressCount === 0 };
  }

  let user =
    profile.email != null
      ? await prisma.user.findUnique({ where: { email: profile.email } })
      : null;

  let isNew = false;
  if (!user) {
    isNew = true;
    const usernameSeed =
      profile.email?.split('@')[0] ||
      `${profile.provider}_${profile.providerAccountId}`.slice(0, 24);
    user = await prisma.user.create({
      data: {
        username: await uniqueUsername(usernameSeed),
        email: profile.email,
        emailVerified: profile.emailVerified && Boolean(profile.email),
        passwordHash: await hashPassword(`${randomBytes(24).toString('hex')}A!`),
        firstName: profile.firstName.slice(0, 80) || 'Customer',
        lastName: profile.lastName.slice(0, 80) || 'User',
        role: UserRole.CUSTOMER,
        wallet: { create: {} },
        loyaltyAccount: { create: {} },
      },
    });
  } else if (!user.emailVerified && profile.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
    },
  });

  const addressCount = await prisma.address.count({ where: { userId: user.id } });
  return { user, isNew, needsAddress: isNew || addressCount === 0 };
}
