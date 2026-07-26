import { createHash, randomBytes } from 'crypto';
import { Router } from 'express';
import type { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/password';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/error';
import {
  isOAuthProviderConfigured,
  providerDisplayName,
  webPublicUrl,
  type OAuthProviderId,
} from '../../lib/oauth/config';
import { buildAuthorizeUrl, exchangeAuthorizationCode } from '../../lib/oauth/providers';
import { createOAuthState, parseOAuthState } from '../../lib/oauth/state';
import { consumeOAuthTicket, createOAuthTicket } from '../../lib/oauth/tickets';
import { upsertOAuthUser } from '../../lib/oauth/upsertUser';
import { assertTotp, issueTokens, publicUser, uniqueUsername } from './helpers';
import { oauthSchema } from './schemas';

export const oauthRouter = Router();

const PROVIDERS = new Set<OAuthProviderId>(['google', 'apple', 'facebook']);

function asProvider(raw: string): OAuthProviderId {
  if (!PROVIDERS.has(raw as OAuthProviderId)) {
    throw new AppError(400, 'Unsupported OAuth provider', 'INVALID_PROVIDER');
  }
  return raw as OAuthProviderId;
}

function loginErrorRedirect(locale: string, code: string) {
  const url = new URL(`${webPublicUrl()}/${locale}/auth/login`);
  url.searchParams.set('oauthError', code);
  return url.toString();
}

function finishRedirect(opts: {
  locale: string;
  ticket: string;
  needsAddress: boolean;
  returnTo?: string;
}) {
  const path = opts.needsAddress
    ? `/${opts.locale}/auth/complete-profile`
    : `/${opts.locale}/auth/oauth/callback`;
  const url = new URL(`${webPublicUrl()}${path}`);
  url.searchParams.set('ticket', opts.ticket);
  if (opts.returnTo) url.searchParams.set('returnTo', opts.returnTo);
  return url.toString();
}

async function completeProviderLogin(opts: {
  provider: OAuthProviderId;
  code: string;
  stateRaw: string;
  appleUserJson?: string | null;
  res: import('express').Response;
}) {
  const state = parseOAuthState(opts.stateRaw);
  if (state.provider !== opts.provider) {
    throw new Error('OAuth state provider mismatch');
  }

  const profile = await exchangeAuthorizationCode(
    opts.provider,
    opts.code,
    opts.appleUserJson,
  );
  const { user, isNew, needsAddress } = await upsertOAuthUser(profile);
  if (!user.isActive) throw new AppError(403, 'Account disabled', 'DISABLED');

  const tokens = await issueTokens(user);
  const ticket = createOAuthTicket({
    ...tokens,
    user: publicUser(user),
    isNew,
    needsAddress,
    provider: opts.provider,
  });

  opts.res.redirect(
    302,
    finishRedirect({
      locale: state.locale,
      ticket,
      needsAddress,
      returnTo: state.returnTo,
    }),
  );
}

/** Exchange one-time ticket for session tokens (web callback / complete-profile). */
oauthRouter.post('/exchange', async (req, res, next) => {
  try {
    const ticketId = String((req.body as { ticket?: string })?.ticket || '');
    if (!ticketId || ticketId.length < 16) {
      throw new AppError(400, 'Invalid OAuth ticket', 'INVALID_TICKET');
    }
    const ticket = consumeOAuthTicket(ticketId);
    if (!ticket) throw new AppError(400, 'OAuth ticket expired or used', 'TICKET_EXPIRED');
    res.json({
      user: ticket.user,
      accessToken: ticket.accessToken,
      refreshToken: ticket.refreshToken,
      isNew: ticket.isNew,
      needsAddress: ticket.needsAddress,
      provider: ticket.provider,
    });
  } catch (err) {
    next(err);
  }
});

/** Start browser OAuth — redirects to Google / Facebook / Apple. */
oauthRouter.get('/:provider', (req, res) => {
  try {
    const provider = asProvider(String(req.params.provider));
    const locale = req.query.locale === 'ar' ? 'ar' : 'en';
    const returnTo =
      typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
        ? req.query.returnTo
        : undefined;

    if (!isOAuthProviderConfigured(provider)) {
      res.redirect(
        302,
        loginErrorRedirect(locale, `${provider}_not_configured`),
      );
      return;
    }

    const state = createOAuthState({ provider, locale, returnTo });
    res.redirect(302, buildAuthorizeUrl(provider, state));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth start failed';
    res.redirect(302, loginErrorRedirect('en', encodeURIComponent(message)));
  }
});

/** OAuth callback (Google/Facebook GET, Apple form_post). */
oauthRouter.get('/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider);
  const localeGuess = 'en';
  try {
    const p = asProvider(provider);
    if (req.query.error) {
      res.redirect(
        302,
        loginErrorRedirect(localeGuess, String(req.query.error_description || req.query.error)),
      );
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !stateRaw) {
      res.redirect(302, loginErrorRedirect(localeGuess, 'missing_code'));
      return;
    }
    await completeProviderLogin({ provider: p, code, stateRaw, res });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oauth_failed';
    res.redirect(302, loginErrorRedirect(localeGuess, encodeURIComponent(message)));
  }
});

oauthRouter.post('/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider);
  try {
    const p = asProvider(provider);
    const body = req.body as {
      code?: string;
      state?: string;
      user?: string;
      error?: string;
      error_description?: string;
    };
    if (body.error) {
      res.redirect(
        302,
        loginErrorRedirect('en', String(body.error_description || body.error)),
      );
      return;
    }
    if (!body.code || !body.state) {
      res.redirect(302, loginErrorRedirect('en', 'missing_code'));
      return;
    }
    await completeProviderLogin({
      provider: p,
      code: body.code,
      stateRaw: body.state,
      appleUserJson: body.user,
      res,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oauth_failed';
    res.redirect(302, loginErrorRedirect('en', encodeURIComponent(message)));
  }
});

/**
 * Legacy/mobile stub — deviceId hash when provider OAuth is not used.
 * Prefer GET /api/auth/oauth/:provider for browser social login.
 */
oauthRouter.post('/', validate(oauthSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof oauthSchema>;
    const allowStub = process.env.NODE_ENV !== 'production' || process.env.OAUTH_STUB === '1';
    if (!body.idToken && !allowStub) {
      throw new AppError(501, 'OAuth provider not configured', 'OAUTH_NOT_CONFIGURED');
    }
    if (!body.idToken && !body.deviceId) {
      throw new AppError(400, 'deviceId required for stub OAuth', 'DEVICE_REQUIRED');
    }

    const identitySource = body.idToken
      ? `${body.provider}:token:${body.idToken}`
      : `${body.provider}:device:${body.deviceId}`;
    const identityHash = createHash('sha256').update(identitySource).digest('hex').slice(0, 16);
    const email = `${body.provider}.${identityHash}@oauth.freshharvest.ae`;
    const firstName = body.firstName || providerDisplayName(body.provider);
    const lastName = body.lastName || 'User';

    let user = await prisma.user.findUnique({ where: { email } });
    let isNew = false;
    if (!user) {
      isNew = true;
      user = await prisma.user.create({
        data: {
          username: await uniqueUsername(`${body.provider}_${identityHash}`),
          email,
          emailVerified: true,
          passwordHash: await hashPassword(`${randomBytes(24).toString('hex')}A!`),
          firstName,
          lastName,
          role: UserRole.CUSTOMER,
          wallet: { create: {} },
          loyaltyAccount: { create: {} },
        },
      });
    }

    if (!user.isActive) throw new AppError(403, 'Account disabled', 'DISABLED');

    const totp = await assertTotp(user.twoFactorSecret, body.totp);
    if (totp.requires2fa) {
      res.json({ requires2fa: true, message: 'Enter authenticator code', provider: body.provider });
      return;
    }
    if ('invalid' in totp && totp.invalid) {
      throw new AppError(401, 'Invalid 2FA code', 'INVALID_2FA');
    }

    const addressCount = await prisma.address.count({ where: { userId: user.id } });
    const tokens = await issueTokens(user);
    res.json({
      user: publicUser(user),
      ...tokens,
      stub: !body.idToken,
      provider: body.provider,
      isNew,
      needsAddress: isNew || addressCount === 0,
    });
  } catch (err) {
    next(err);
  }
});
