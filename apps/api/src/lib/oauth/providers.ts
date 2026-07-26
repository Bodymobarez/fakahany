import { createSign, randomBytes } from 'crypto';
import {
  isOAuthProviderConfigured,
  oauthCallbackUrl,
  type OAuthProviderId,
} from './config';

export type OAuthProfile = {
  provider: OAuthProviderId;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

function applePrivateKey() {
  return requireEnv('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
}

/** Apple requires a short-lived ES256 client_secret JWT. */
function appleClientSecret() {
  const teamId = requireEnv('APPLE_TEAM_ID');
  const clientId = requireEnv('APPLE_CLIENT_ID');
  const keyId = requireEnv('APPLE_KEY_ID');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 60 * 50,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const signer = createSign('SHA256');
  signer.update(data);
  signer.end();
  const sig = signer.sign({ key: applePrivateKey(), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${data}.${sig}`;
}

export function buildAuthorizeUrl(provider: OAuthProviderId, state: string): string {
  if (!isOAuthProviderConfigured(provider)) {
    throw new Error(`${provider} OAuth is not configured`);
  }
  const redirectUri = oauthCallbackUrl(provider);

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (provider === 'facebook') {
    const params = new URLSearchParams({
      client_id: requireEnv('FACEBOOK_APP_ID'),
      redirect_uri: redirectUri,
      state,
      scope: 'email,public_profile',
      response_type: 'code',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  }

  const params = new URLSearchParams({
    client_id: requireEnv('APPLE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce: randomBytes(16).toString('hex'),
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

async function exchangeGoogle(code: string): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl('google');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error('Google access token missing');

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`Google profile failed (${profileRes.status})`);
  const p = (await profileRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    name?: string;
  };
  const parts = (p.name || '').trim().split(/\s+/);
  return {
    provider: 'google',
    providerAccountId: p.sub,
    email: p.email?.toLowerCase() || null,
    emailVerified: Boolean(p.email_verified ?? p.email),
    firstName: p.given_name || parts[0] || 'Google',
    lastName: p.family_name || parts.slice(1).join(' ') || 'User',
  };
}

async function exchangeFacebook(code: string): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl('facebook');
  const tokenParams = new URLSearchParams({
    client_id: requireEnv('FACEBOOK_APP_ID'),
    client_secret: requireEnv('FACEBOOK_APP_SECRET'),
    redirect_uri: redirectUri,
    code,
  });
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams}`,
  );
  if (!tokenRes.ok) throw new Error(`Facebook token exchange failed (${tokenRes.status})`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error('Facebook access token missing');

  const meParams = new URLSearchParams({
    fields: 'id,email,first_name,last_name,name',
    access_token: tokenJson.access_token,
  });
  const meRes = await fetch(`https://graph.facebook.com/me?${meParams}`);
  if (!meRes.ok) throw new Error(`Facebook profile failed (${meRes.status})`);
  const p = (await meRes.json()) as {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  const parts = (p.name || '').trim().split(/\s+/);
  return {
    provider: 'facebook',
    providerAccountId: p.id,
    email: p.email?.toLowerCase() || null,
    emailVerified: Boolean(p.email),
    firstName: p.first_name || parts[0] || 'Facebook',
    lastName: p.last_name || parts.slice(1).join(' ') || 'User',
  };
}

function decodeJwtPayload(idToken: string) {
  const part = idToken.split('.')[1];
  if (!part) throw new Error('Invalid Apple id_token');
  const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json) as {
    sub: string;
    email?: string;
    email_verified?: boolean | string;
  };
}

async function exchangeApple(
  code: string,
  userJson?: string | null,
): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl('apple');
  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireEnv('APPLE_CLIENT_ID'),
      client_secret: appleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error(`Apple token exchange failed (${tokenRes.status})`);
  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  if (!tokenJson.id_token) throw new Error('Apple id_token missing');

  const claims = decodeJwtPayload(tokenJson.id_token);
  let firstName = 'Apple';
  let lastName = 'User';
  if (userJson) {
    try {
      const u = JSON.parse(userJson) as {
        name?: { firstName?: string; lastName?: string };
      };
      if (u.name?.firstName) firstName = u.name.firstName;
      if (u.name?.lastName) lastName = u.name.lastName;
    } catch {
      /* Apple user payload optional after first login */
    }
  }

  return {
    provider: 'apple',
    providerAccountId: claims.sub,
    email: claims.email?.toLowerCase() || null,
    emailVerified:
      claims.email_verified === true ||
      claims.email_verified === 'true' ||
      Boolean(claims.email),
    firstName,
    lastName,
  };
}

export async function exchangeAuthorizationCode(
  provider: OAuthProviderId,
  code: string,
  appleUserJson?: string | null,
): Promise<OAuthProfile> {
  if (provider === 'google') return exchangeGoogle(code);
  if (provider === 'facebook') return exchangeFacebook(code);
  return exchangeApple(code, appleUserJson);
}
