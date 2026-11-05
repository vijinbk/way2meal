import 'server-only';
import type { AuthTokens } from '@way2meal/shared';
import { cookies } from 'next/headers';

/** Server-side base URL of the Way2meal API, e.g. http://localhost:3000/v1. Never exposed to the browser. */
export const API_URL = (process.env.API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

export const ACCESS_COOKIE = 'w2m_access';
export const REFRESH_COOKIE = 'w2m_refresh';

/** Staff roles allowed into the admin panel. M2 pages are ADMIN-only; kitchen/delivery views arrive in M5. */
export const PANEL_ROLES = ['ADMIN'] as const;

const base = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Tokens live only in httpOnly cookies; browser JS never sees them. */
export async function setSession(tokens: AuthTokens): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    expires: new Date(tokens.accessTokenExpiresAt),
  });
  jar.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    expires: new Date(tokens.refreshTokenExpiresAt),
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * Refreshes in flight (or just finished), keyed by the refresh token used.
 * A page fires several requests at once; if the access token has expired they
 * would all refresh with the same token, and the API treats a second use of a
 * rotated token as theft and revokes every session. Sharing one exchange per
 * token (kept for a short grace period for stragglers) avoids that.
 */
const refreshes = new Map<string, Promise<AuthTokens | null>>();
const REFRESH_GRACE_MS = 30_000;

function exchange(refreshToken: string): Promise<AuthTokens | null> {
  let pending = refreshes.get(refreshToken);
  if (!pending) {
    pending = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
      .then(async (res) => (res.ok ? ((await res.json()) as AuthTokens) : null))
      .catch(() => null);
    refreshes.set(refreshToken, pending);
    setTimeout(() => refreshes.delete(refreshToken), REFRESH_GRACE_MS).unref?.();
  }
  return pending;
}

/** Exchanges the refresh cookie for new tokens. Returns the new access token, or null if the session is over. */
export async function refreshSession(): Promise<string | null> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const tokens = await exchange(refreshToken);
  if (!tokens) {
    await clearSession();
    return null;
  }
  await setSession(tokens);
  return tokens.accessToken;
}

/** Calls the API as the signed-in user, refreshing the access token once if it has expired. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const jar = await cookies();
  let access = jar.get(ACCESS_COOKIE)?.value ?? (await refreshSession());
  if (!access) return Response.json({ statusCode: 401, message: 'Not signed in' }, { status: 401 });

  const call = (token: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers)),
        authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

  let res = await call(access);
  if (res.status === 401) {
    access = await refreshSession();
    if (!access) return res;
    res = await call(access);
  }
  return res;
}

/** Mutating requests must carry this header. Browsers can't add it cross-site without CORS, which blocks CSRF. */
export const CSRF_HEADER = 'x-w2m-csrf';
