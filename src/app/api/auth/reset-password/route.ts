import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    const rateCheck = await checkRateLimit(`auth:reset:ip:${clientIp}`, RATE_LIMIT_POLICIES.resetPassword);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        clientIp,
        reason: 'Too many password reset requests from IP',
      });
      return createRateLimitResponse(rateCheck, 'Too many password reset requests. Please wait an hour before requesting again.');
    }

    const body = await request.json();
    const email = body?.email;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid work email format is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      const authClient = createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { error } = await authClient.auth.resetPasswordForEmail(cleanEmail);
      if (error) {
        // Log on server for diagnostics; avoid leaking email enumeration details to client
        console.warn('Note: resetPasswordForEmail dispatch:', error.message);
      }

      logSecurityEvent({
        event: 'AUTH_SIGNUP_SUBMITTED',
        clientIp,
        details: { action: 'password_reset_dispatched' },
      });

      // Anti-enumeration guarantee: Return identical neutral confirmation
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset simulated (development mode)',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process password reset request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
