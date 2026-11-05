import { type NextRequest } from 'next/server';
import { CSRF_HEADER, apiFetch } from '@/lib/server/session';

/**
 * Same-origin gateway to the API. The browser calls /api/v1/<path>; this adds
 * the bearer token from the httpOnly cookie and forwards the request.
 */
async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (request.method !== 'GET' && request.headers.get(CSRF_HEADER) !== '1') {
    return Response.json({ statusCode: 403, message: 'Missing CSRF header' }, { status: 403 });
  }
  const body =
    request.method === 'GET' || request.method === 'DELETE' ? undefined : await request.text();
  const res = await apiFetch(
    `/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
    {
      method: request.method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body,
    },
  );
  return new Response(res.status === 204 ? null : await res.text(), {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT };
