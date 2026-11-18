import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
import { 
  validatePayloadSize, 
  isValidEmail, 
  extractClientIp, 
  MAX_AUTH_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';
import { logSecurityEvent } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    // 1. Payload Size Guard
    const sizeCheck = await validatePayloadSize(request, MAX_AUTH_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    const clientIp = extractClientIp(request);

    // 2. Rate Limit per IP
    const ipRateCheck = await checkRateLimit(`auth:login:ip:${clientIp}`, RATE_LIMIT_POLICIES.login);
    if (!ipRateCheck.allowed) {
      logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        clientIp,
        reason: 'Too many login attempts from IP',
      });
      return createRateLimitResponse(ipRateCheck, 'Too many login attempts. Please wait 15 minutes before trying again.');
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid work email format is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 3. Rate Limit per Target Email Account
    const emailRateCheck = await checkRateLimit(`auth:login:email:${cleanEmail}`, RATE_LIMIT_POLICIES.login);
    if (!emailRateCheck.allowed) {
      logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        clientIp,
        reason: `Target account login rate exceeded for: ${cleanEmail}`,
      });
      return createRateLimitResponse(emailRateCheck, 'Too many login attempts for this account. Please wait before retrying.');
    }

    if (isSupabaseConfigured()) {
      const authClient = createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.session) {
        logSecurityEvent({
          event: 'AUTH_LOGIN_FAILED',
          clientIp,
          reason: error?.message || 'Invalid credentials',
        });
        return NextResponse.json({ error: error?.message || 'Authentication failed' }, { status: 401 });
      }

      // Fetch recruiter profile via admin client
      const admin = getSupabaseAdminClient();
      const { data: profile } = admin ? await admin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single() : { data: null };

      // Account approval guard: Unapproved accounts are blocked from logging in
      if (profile && profile.is_approved === false) {
        logSecurityEvent({
          event: 'ACCESS_DENIED',
          clientIp,
          userId: data.user.id,
          reason: 'Unapproved recruiter login attempt',
        });
        return NextResponse.json({
          error: 'Your account is pending administrator approval. Please contact your hiring coordinator before accessing the platform.',
          pendingApproval: true,
        }, { status: 403 });
      }

      logSecurityEvent({
        event: 'AUTH_LOGIN_SUCCESS',
        clientIp,
        userId: data.user.id,
      });

      const response = NextResponse.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Recruiter',
          companyName: profile?.company_name || data.user.user_metadata?.company_name || 'Acme Global',
          role: profile?.role || data.user.user_metadata?.role || 'recruiter',
          isApproved: profile?.is_approved ?? true,
        },
        token: data.session.access_token,
      });

      // Set cookie for browser session
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Production security guard: Prohibit mock fallback in production
    const isStrict = process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_AUTH === 'true';
    if (isStrict) {
      return NextResponse.json({
        error: 'Authentication failed: Production service unavailable',
      }, { status: 401 });
    }

    // Local / Dev Fallback
    const mockToken = `mock-recruiter-jwt-${Buffer.from(cleanEmail).toString('base64')}`;
    const response = NextResponse.json({
      user: {
        id: '00000000-0000-0000-0000-000000000000',
        email: cleanEmail,
        fullName: 'Dev Recruiter',
        companyName: 'Acme Global',
        role: 'recruiter',
        isApproved: true,
      },
      token: mockToken,
      message: 'Logged in with dev credentials (Supabase unconfigured)',
    });

    response.cookies.set('sb-access-token', mockToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
