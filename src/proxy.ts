import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection proxy (Next.js 16 file convention replacing deprecated middleware.ts).
 * 
 * Protects recruiter-only routes:
 * - /dashboard
 * - /config
 * 
 * Unauthenticated requests are redirected to /login with a return URL.
 * All candidate routes (/interview/*), public assets, and auth APIs are excluded.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Check for the Supabase access token cookie
  const tokenCookie = request.cookies.get('sb-access-token') || 
                      request.cookies.get('sb_auth_token');

  const tokenValue = tokenCookie?.value?.trim() || '';
  const isLikelyValidToken = tokenValue.length > 0 && (
    tokenValue.split('.').length === 3 || 
    (process.env.NODE_ENV !== 'production' && tokenValue.startsWith('mock-'))
  );

  // If attempting to access protected recruiter routes without an active or valid session token:
  if (!isLikelyValidToken) {
    const loginUrl = new URL('/login', request.url);
    const returnPath = pathname + search;
    if (returnPath !== '/' && returnPath !== '/dashboard') {
      loginUrl.searchParams.set('redirect', returnPath);
    }
    const response = NextResponse.redirect(loginUrl);
    // Clear malformed or empty token cookies to prevent repetitive 401 loops
    if (tokenCookie) {
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb_auth_token');
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/config',
    '/config/:path*',
  ],
};
