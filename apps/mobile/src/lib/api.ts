import type { AuthTokens } from '@way2meal/shared';
import { t } from '@/i18n';
import { useAuth } from './auth-store';
import { API_URL } from './config';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageOf(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as { message?: unknown; errors?: { message?: string }[] };
    if (Array.isArray(b.errors) && b.errors[0]?.message) return b.errors[0].message;
    if (typeof b.message === 'string') return b.message;
  }
  return status >= 500 ? t('common.error') : `Request failed (${status})`;
}

async function request(path: string, init: RequestInit, token?: string): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError(0, t('common.offline'));
  }
}

/**
 * One refresh at a time: screens fire queries in parallel, and the API treats
 * a second use of a rotated refresh token as theft (it revokes every session).
 */
let refreshing: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const current = useAuth.getState().tokens;
      if (!current) return null;
      const res = await request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) {
        // Only end the session when the server rejected the token, not on a network blip.
        if (res.status === 401) await useAuth.getState().clear();
        return null;
      }
      const tokens = (await res.json()) as AuthTokens;
      await useAuth.getState().setTokens(tokens);
      return tokens.accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

const isExpired = (tokens: AuthTokens) =>
  Date.parse(tokens.accessTokenExpiresAt) - Date.now() < 30_000;

/** Calls the API; `auth: true` attaches the session and refreshes it when needed. */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  };
  let token: string | undefined;
  if (opts.auth) {
    const tokens = useAuth.getState().tokens;
    token =
      tokens && !isExpired(tokens)
        ? tokens.accessToken
        : ((await refreshAccessToken()) ?? undefined);
    if (!token) throw new ApiError(401, 'Please log in again');
  }

  let res = await request(path, init, token);
  if (res.status === 401 && opts.auth) {
    const fresh = await refreshAccessToken();
    if (!fresh) throw new ApiError(401, 'Please log in again');
    res = await request(path, init, fresh);
  }

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status));
  return body as T;
}

export async function logout(): Promise<void> {
  const tokens = useAuth.getState().tokens;
  if (tokens) {
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => undefined);
  }
  await useAuth.getState().clear();
}
