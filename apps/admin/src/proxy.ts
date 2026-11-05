import { type NextRequest, NextResponse } from 'next/server';

/** Sends visitors without a session to /login. The API still authorises every request itself. */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has('w2m_refresh');
  const onLogin = request.nextUrl.pathname === '/login';
  if (!signedIn && !onLogin) return NextResponse.redirect(new URL('/login', request.url));
  if (signedIn && onLogin) return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
