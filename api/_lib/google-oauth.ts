// Server-only helpers for the Google OAuth + Calendar API flow.
// Lives under /api/_lib so Vercel doesn't serve this directory as a route
// (Vercel only routes top-level files in /api).
//
// CRITICAL: every export here is intended to run in a Vercel serverless
// function context. The CLIENT_SECRET must never reach the browser.

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  refresh_token?: string;
  scope: string;
  token_type: 'Bearer';
  id_token?: string;
}

export interface GoogleUserInfo {
  email: string;
  id: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export function googleClientId(): string {
  // The browser-injected Vite name is also accepted server-side so a single
  // value in .env covers both (Vite reads VITE_*, our server can read either).
  return requireEnv('VITE_GOOGLE_OAUTH_CLIENT_ID');
}

export function googleClientSecret(): string {
  return requireEnv('GOOGLE_OAUTH_CLIENT_SECRET');
}

/**
 * Exchange an authorization code for refresh + access tokens.
 * Throws if the request fails or Google returns no refresh token.
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

/** Use a refresh token to get a fresh access token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

/** Revoke a refresh or access token at Google. Idempotent. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  }).catch(() => {
    /* best-effort */
  });
}

/** Fetch the email of the connected Google account. */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google userinfo failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}
