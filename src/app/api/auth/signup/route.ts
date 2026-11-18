import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
import { 
  validatePayloadSize, 
  isValidEmail, 
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

const devRegisteredEmails = new Set<string>();

export async function POST(request: Request) {
  try {
    // 1. Payload Size Guard
    const sizeCheck = await validatePayloadSize(request, MAX_AUTH_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    const clientIp = extractClientIp(request);
    const body = await request.json();
    const { fullName, email, password, companyName } = body;

    // 2. Validation: Full Name
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
      return NextResponse.json({ error: 'Full name is required (between 2 and 100 characters)' }, { status: 400 });
    }

    // 3. Validation: Email Format
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid work email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 4. Validation: Password Policy
    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      return NextResponse.json({
        error: passCheck.reason || 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
      }, { status: 400 });
    }

    // 5. Rate Limit per IP
    const rateCheck = await checkRateLimit(`auth:signup:ip:${clientIp}`, RATE_LIMIT_POLICIES.signup);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        event: 'RATE_LIMIT_EXCEEDED',
        clientIp,
        reason: 'Too many account registration requests from IP',
      });
      return createRateLimitResponse(rateCheck, 'Registration request limit reached. Please wait before registering again.');
    }

    const cleanCompany = (companyName && typeof companyName === 'string' && companyName.trim()) 
      ? companyName.trim().slice(0, 100)
      : 'Hiring Team';

    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdminClient();
      
      // Check for duplicate account if admin client is available
      if (admin) {
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingProfile) {
          logSecurityEvent({
            event: 'AUTH_SIGNUP_FAILED',
            clientIp,
            reason: `Duplicate registration rejected for: ${cleanEmail}`,
          });
          return NextResponse.json({
            error: 'An account with this email address already exists. Please sign in instead.',
          }, { status: 409 });
        }

        // Use service-role admin to provision user account directly without SMTP rate limit bottlenecks
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
            company_name: cleanCompany,
            role: 'recruiter', // Strictly recruiter
          },
        });

        if (createErr) {
          if (createErr.message.toLowerCase().includes('already registered') || createErr.message.toLowerCase().includes('unique')) {
            return NextResponse.json({
              error: 'An account with this email address already exists. Please sign in instead.',
            }, { status: 409 });
          }
          return NextResponse.json({ error: createErr.message }, { status: 400 });
        }

        if (!created.user) {
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
        }

        // Guarantee is_approved = false in profiles table
        await admin
          .from('profiles')
          .update({ is_approved: false, role: 'recruiter' })
          .eq('id', created.user.id);

        logSecurityEvent({
          event: 'AUTH_SIGNUP_SUBMITTED',
          clientIp,
          userId: created.user.id,
          details: { email: cleanEmail, company: cleanCompany },
        });

        return NextResponse.json({
          success: true,
          requiresApproval: true,
          requiresEmailVerification: false,
          user: {
            id: created.user.id,
            email: cleanEmail,
            fullName: fullName.trim(),
            companyName: cleanCompany,
            role: 'recruiter',
            isApproved: false,
          },
          message: 'Registration successful! Your recruiter account has been created and is pending administrator approval before you can access the platform.',
        }, { status: 201 });
      }

      const authClient = createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      // SECURITY GUARANTEE: Never trust client-submitted roles or approval states.
      // Recruiter role is strictly enforced, and is_approved is defaulted to false.
      const { data, error } = await authClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: cleanCompany,
            role: 'recruiter', // Strictly recruiter
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('unique')) {
          return NextResponse.json({
            error: 'An account with this email address already exists. Please sign in instead.',
          }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (!data.user) {
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }

      // Check whether email confirmation is required
      const requiresEmailVerification = Boolean(!data.session);

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        requiresEmailVerification,
        user: {
          id: data.user.id,
          email: cleanEmail,
          fullName: fullName.trim(),
          companyName: cleanCompany,
          role: 'recruiter',
          isApproved: false,
        },
        message: requiresEmailVerification
          ? 'Registration successful! Please check your email to verify your address. Once verified, your account will await administrator approval.'
          : 'Registration successful! Your recruiter account has been created and is pending administrator approval before you can access the platform.',
      }, { status: 201 });
    }

    // Production security guard: Prohibit mock fallback in production
    const isStrict = process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_AUTH === 'true';
    if (isStrict) {
      return NextResponse.json({
        error: 'Registration failed: Production service unavailable',
      }, { status: 500 });
    }

    // Development / Local Fallback
    if (devRegisteredEmails.has(cleanEmail)) {
      return NextResponse.json({
        error: 'An account with this email address already exists. Please sign in instead.',
      }, { status: 409 });
    }
    devRegisteredEmails.add(cleanEmail);

    return NextResponse.json({
      success: true,
      requiresApproval: true,
      requiresEmailVerification: false,
      user: {
        id: `mock-user-${Date.now()}`,
        email: cleanEmail,
        fullName: fullName.trim(),
        companyName: cleanCompany,
        role: 'recruiter',
        isApproved: false,
      },
      message: 'Account registered (development mode). Awaiting administrator approval.',
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
