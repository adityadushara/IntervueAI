import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
import { extractAuthToken, clearSessionCache } from '@/lib/auth/recruiterAuth';
import { logSecurityEvent } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    const token = extractAuthToken(request);

    if (isSupabaseConfigured() && token) {
      try {
        const client = createClient(
          getSupabaseUrl(),
          getSupabaseAnonKey(),
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } }
          }
        );
        await client.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }

    clearSessionCache();
    logSecurityEvent({ event: 'AUTH_LOGOUT' });
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set('sb-access-token', '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
