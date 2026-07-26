import { getAccessToken, getRefreshToken } from './session';

function configuredAdminBase(): string | null {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_URL || '').replace(/\/$/, '');
  if (!raw) return null;
  if (/localhost|127\.0\.0\.1/i.test(raw)) return null;
  return raw;
}

function isLocalBrowserHost() {
  if (typeof window === 'undefined') return true;
  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

/** Open admin in a new tab — never opens localhost from the live storefront. */
export function openAdminPanel() {
  const productionAdmin = configuredAdminBase();
  const adminBase =
    productionAdmin || (isLocalBrowserHost() ? 'http://localhost:3001' : null);

  if (!adminBase) {
    window.alert(
      'Admin panel is not deployed for this site yet. Set NEXT_PUBLIC_ADMIN_URL to your public admin URL.',
    );
    return;
  }

  const token = getAccessToken();
  const refresh = getRefreshToken();
  if (!token) {
    window.open(`${adminBase}/login`, '_blank', 'noopener,noreferrer');
    return;
  }
  const hash = new URLSearchParams({ token });
  if (refresh) hash.set('refresh', refresh);
  window.open(`${adminBase}/handoff#${hash.toString()}`, '_blank', 'noopener,noreferrer');
}
