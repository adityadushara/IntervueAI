import { NextResponse } from 'next/server';
import { verifyRecruiterSession } from '@/lib/auth/recruiterAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { 
  validatePayloadSize, 
  isValidUuid, 
  extractClientIp, 
  MAX_AUTH_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { logSecurityEvent } from '@/lib/security/logger';

/**
 * ADMIN ENDPOINT: POST /api/auth/approve
 * Approves or revokes recruiter platform access.
 * 
 * Security Controls:
 * 1. Requires active authenticated session.
 * 2. Requires caller profile to have role === 'admin'.
 * 3. Enforces UUID format on target userId.
 * 4. Updates is_approved flag on the target profile using the service-role client.
 */
export async function POST(request: Request) {
  try {
    // 1. Payload Size Guard
    const sizeCheck = await validatePayloadSize(request, MAX_AUTH_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    const clientIp = extractClientIp(request);
    const session = await verifyRecruiterSession(request);
    if (!session.authenticated) {
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      logSecurityEvent({
        event: 'ACCESS_DENIED',
        clientIp,
        userId: session.recruiterId,
        reason: 'Non-admin user attempted to invoke approval endpoint',
      });
      return NextResponse.json({
        error: 'Forbidden: Administrator privileges required to approve recruiter accounts',
      }, { status: 403 });
    }

    const body = await request.json();
    const { userId, approved } = body;

    if (!userId || typeof userId !== 'string' || !isValidUuid(userId)) {
      return NextResponse.json({ error: 'Valid UUID userId format is required' }, { status: 400 });
    }

    const isApproved = approved !== false; // Default true if not explicitly set to false

    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdminClient();
      if (!admin) {
        return NextResponse.json({ error: 'Supabase admin service unavailable' }, { status: 500 });
      }

      const { data, error } = await admin
        .from('profiles')
        .update({ is_approved: isApproved })
        .eq('id', userId)
        .select('id, email, full_name, role, is_approved')
        .single();

      if (error || !data) {
        return NextResponse.json({
          error: error?.message || 'Failed to update user approval status or user not found',
        }, { status: 404 });
      }

      logSecurityEvent({
        event: isApproved ? 'AUTH_APPROVAL_GRANTED' : 'AUTH_APPROVAL_REVOKED',
        clientIp,
        userId: session.recruiterId,
        targetId: userId,
        details: { targetEmail: data.email, targetRole: data.role },
      });

      return NextResponse.json({
        success: true,
        message: isApproved ? 'User account approved successfully' : 'User account access revoked',
        user: {
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: data.role,
          isApproved: data.is_approved,
        },
      });
    }

    // Dev / local fallback
    return NextResponse.json({
      success: true,
      message: isApproved ? 'User account approved successfully (dev mode)' : 'User account access revoked (dev mode)',
      user: {
        id: userId,
        isApproved,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to approve recruiter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
