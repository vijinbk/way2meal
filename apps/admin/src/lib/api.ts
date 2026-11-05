'use client';

/** Error from the API, with the message the API produced (already user-readable). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

function messageOf(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as { message?: unknown; errors?: { path?: unknown[]; message?: string }[] };
    if (Array.isArray(b.errors) && b.errors.length > 0) {
      return b.errors
        .map((e) => [e.path?.join('.'), e.message].filter(Boolean).join(': '))
        .join('; ');
    }
    if (typeof b.message === 'string') return b.message;
    if (Array.isArray(b.message)) return b.message.join('; ');
  }
  return `Request failed (${status})`;
}

/** Calls the API through the same-origin gateway (/api/v1/...), which attaches the session. */
export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? 'GET';
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(method !== 'GET' ? { 'x-w2m-csrf': '1' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) {
    // Full reload on purpose: drops every cached query from the ended session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
    throw new ApiError(401, 'Your session has ended. Please sign in again.');
  }
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status), body);
  return body as T;
}

export async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-w2m-csrf': '1' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, messageOf(parsed, res.status), parsed);
  return parsed as T;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
