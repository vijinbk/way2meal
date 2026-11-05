import { cookies } from 'next/headers';
import { API_URL, CSRF_HEADER, REFRESH_COOKIE, clearSession } from '@/lib/server/session';

export async function POST(request: Request) {
  if (request.headers.get(CSRF_HEADER) !== '1') {
    return Response.json({ statusCode: 403, message: 'Missing CSRF header' }, { status: 403 });
  }
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearSession();
  return new Response(null, { status: 204 });
}
