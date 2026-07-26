export type OAuthProviderId = 'google' | 'apple' | 'facebook';

export function apiPublicUrl() {
  return (process.env.API_URL || `http://localhost:${process.env.API_PORT || 4000}`).replace(
    /\/$/,
    '',
  );
}

export function webPublicUrl() {
  return (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function oauthCallbackUrl(provider: OAuthProviderId) {
  return `${apiPublicUrl()}/api/auth/oauth/${provider}/callback`;
}

export function isOAuthProviderConfigured(provider: OAuthProviderId): boolean {
  if (provider === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  if (provider === 'facebook') {
    return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
  }
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  );
}

export function providerDisplayName(provider: OAuthProviderId) {
  if (provider === 'google') return 'Google';
  if (provider === 'facebook') return 'Facebook';
  return 'Apple';
}
