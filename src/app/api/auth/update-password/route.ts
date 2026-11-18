import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
import { verifyRecruiterSession, extractAuthToken } from '@/lib/auth/recruiterAuth';
import { 
  validatePayloadSize, 
  isValidPassword, 
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

    const session = await verifyRecruiterSession(request);
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const clientIp = extractClientIp(request);
    const targetKey = session.recruiterId || clientIp;

    // 2. Rate Limit Password Updates
    const rateCheck = await checkRateLimit(`auth:updatePassword:${targetKey}`, RATE_LIMIT_POLICIES.updatePassword);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        clientIp,
        userId: session.recruiterId,
        reason: 'Too many password update requests',
      });
      return createRateLimitResponse(rateCheck, 'Too many password update requests. Please wait before attempting again.');
    }

    const token = extractAuthToken(request);
    const body = await request.json();
    const newPassword = body?.newPassword;

    // 3. Password Complexity Validation
    const passCheck = isValidPassword(newPassword);
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.reason || 'Password does not meet complexity requirements' }, { status: 400 });
    }

    if (isSupabaseConfigured() && token) {
      const authClient = createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } }
        }
      );

      const { error } = await authClient.auth.updateUser({ password: newPassword });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      logSecurityEvent({
        event: 'AUTH_LOGIN_SUCCESS',
        clientIp,
        userId: session.recruiterId,
        details: { action: 'password_updated' },
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully (development mode)' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
