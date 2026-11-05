import { API_URL } from '@/lib/server/session';

export async function POST(request: Request) {
  const res = await fetch(`${API_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
