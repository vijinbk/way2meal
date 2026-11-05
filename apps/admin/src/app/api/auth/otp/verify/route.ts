import type { AuthTokens, Role } from '@way2meal/shared';
import { API_URL, PANEL_ROLES, setSession } from '@/lib/server/session';

interface VerifyResponse {
  tokens: AuthTokens;
  user: { id: string; phone: string; name: string | null; role: Role };
}

/** Verifies the OTP with the API and, for staff accounts only, starts a cookie session. */
export async function POST(request: Request) {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { tokens, user } = (await res.json()) as VerifyResponse;
  if (!(PANEL_ROLES as readonly string[]).includes(user.role)) {
    // Don't leave a usable session behind for a customer who found the admin URL.
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    return Response.json(
      { statusCode: 403, message: 'This number does not have admin access.' },
      { status: 403 },
    );
  }

  await setSession(tokens);
  return Response.json({ user });
}
