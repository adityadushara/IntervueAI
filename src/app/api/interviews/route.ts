import { NextResponse } from 'next/server';
import { InterviewInvitation } from '@/types/interview';
import { verifyRecruiterSession } from '@/lib/auth/recruiterAuth';
import { 
  getRecruiterInterviewsFromDb, 
  createInterviewInDb, 
  deleteInterviewFromDb, 
  revokeInterviewInDb, 
  regenerateInterviewTokenInDb 
} from '@/lib/supabase/service';
import { generateSecureToken } from '@/lib/storage';
import { analyzeJobDescriptionWithGemini } from '@/lib/gemini/analyzer';
import { 
  validatePayloadSize, 
  validateJobConfig, 
  isValidTokenFormat,
  MAX_INTERVIEW_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';
import { logSecurityEvent } from '@/lib/security/logger';

interface CachedInterviews {
  data: InterviewInvitation[];
  expiresAt: number;
}

const interviewsCache: Map<string, CachedInterviews> =
  (globalThis as unknown as { __intervue_recruiter_interviews_cache?: Map<string, CachedInterviews> }).__intervue_recruiter_interviews_cache ||
  new Map<string, CachedInterviews>();

(globalThis as unknown as { __intervue_recruiter_interviews_cache?: Map<string, CachedInterviews> }).__intervue_recruiter_interviews_cache = interviewsCache;

export function invalidateInterviewsCache(recruiterId?: string): void {
  if (recruiterId && recruiterId !== 'all') {
    interviewsCache.delete(recruiterId);
  } else {
    interviewsCache.clear();
  }
}

/**
 * RECRUITER ENDPOINTS: /api/interviews
 * 
 * Security Controls:
 * 1. Recruiter Authentication: Session verified via Supabase Auth JWT / cookie.
 * 2. Account Approval Gate: Unapproved recruiters are blocked with HTTP 403.
 * 3. Multi-Tenant Isolation: Only returns interviews belonging to session.recruiterId.
 * 4. Rate Limiting: Guards creation quotas against abuse.
 * 5. Request Validation: Schema and size constraints enforced on job configs.
 * 6. Hashed Token Storage: Stores ONLY SHA-256 token_hash in database, never raw tokens.
 */
export const maxDuration = 60;

export async function GET(request?: Request) {
  try {
    const session = await verifyRecruiterSession(request);
    if (!session.authenticated) {
      const statusCode = session.isApproved === false ? 403 : 401;
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: statusCode });
    }

    if (session.isApproved === false) {
      return NextResponse.json({
        error: 'Forbidden: Recruiter account is pending administrator approval',
      }, { status: 403 });
    }

    // Rate Limit Recruiter Queries
    if (session.recruiterId) {
      const rateCheck = await checkRateLimit(`recruiter:get:${session.recruiterId}`, RATE_LIMIT_POLICIES.recruiterQuery);
      if (!rateCheck.allowed) {
        return createRateLimitResponse(rateCheck, 'Too many dashboard refresh requests.');
      }
    }

    // Multi-tenant check: Admins can optionally request all interviews via ?scope=all
    let targetRecruiterId = session.recruiterId;
    if (request && session.role === 'admin') {
      try {
        const url = new URL(request.url);
        const scopeParam = url.searchParams.get('scope');
        if (scopeParam === 'all') {
          targetRecruiterId = 'all';
        }
      } catch {
        // Ignored
      }
    }

    const cacheKey = targetRecruiterId || 'all';
    const cached = interviewsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const interviews = await getRecruiterInterviewsFromDb(targetRecruiterId);
    interviewsCache.set(cacheKey, {
      data: interviews,
      expiresAt: Date.now() + 15000,
    });
    return NextResponse.json(interviews);
  } catch (err: unknown) {
    console.error('Failed to retrieve interviews:', err);
    return NextResponse.json({ error: 'Failed to retrieve interviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Payload Size Limit
    const sizeCheck = await validatePayloadSize(request, MAX_INTERVIEW_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    const session = await verifyRecruiterSession(request);
    if (!session.authenticated) {
      const statusCode = session.isApproved === false ? 403 : 401;
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: statusCode });
    }

    if (session.isApproved === false) {
      return NextResponse.json({
        error: 'Forbidden: Recruiter account is pending administrator approval',
      }, { status: 403 });
    }

    // Rate Limit Interview Creation
    const rateCheck = await checkRateLimit(`recruiter:create:${session.recruiterId}`, RATE_LIMIT_POLICIES.recruiterCreate);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck, 'Interview creation limit reached. Please wait before creating more invitations.');
    }

    const body: InterviewInvitation = await request.json();
    if (!body || !body.token || !body.jobConfig) {
      return NextResponse.json({ error: 'Valid token and job configuration are required' }, { status: 400 });
    }

    if (!isValidTokenFormat(body.token)) {
      return NextResponse.json({ error: 'Invalid interview invitation token format' }, { status: 400 });
    }

    // Validate Job Configuration
    const jobValidation = validateJobConfig(body.jobConfig);
    if (!jobValidation.valid) {
      return NextResponse.json({ error: jobValidation.error }, { status: 400 });
    }

    const candidateInfo = body.candidate || {
      fullName: 'Prospective Candidate',
      email: 'candidate@example.com',
    };

    let finalQuestions = body.questions || [];
    let jobConfig = body.jobConfig;

    if (!finalQuestions.length || !jobConfig.structuredPlan) {
      try {
        const analysis = await analyzeJobDescriptionWithGemini(jobConfig);
        if (!finalQuestions.length) {
          finalQuestions = analysis.questions;
        }
        jobConfig = {
          ...jobConfig,
          structuredPlan: jobConfig.structuredPlan || analysis.plan,
        };
      } catch (err) {
        console.warn('Gemini plan analysis skipped, using input as-is:', err);
      }
    }

    const saved = await createInterviewInDb(
      jobConfig,
      body.linkConfig || { expiration: '24 hours' },
      candidateInfo,
      body.token,
      finalQuestions,
      session.recruiterId,
      body.id
    );

    logSecurityEvent({
      event: 'INTERVIEW_CREATED',
      userId: session.recruiterId,
      details: { invitationId: saved.id, jobTitle: jobConfig.jobTitle },
    });

    invalidateInterviewsCache(session.recruiterId);
    invalidateInterviewsCache('all');

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    console.error('Failed to create interview:', err);
    return NextResponse.json({ error: 'Failed to create interview' }, { status: 500 });
  }
}

/**
 * RECRUITER ENDPOINT: DELETE /api/interviews
 * 
 * Permanently deletes an interview invitation and its cascaded records from Supabase.
 * Security: Enforces recruiter session authentication and multi-tenant ownership.
 */
export async function DELETE(request: Request) {
  try {
    const session = await verifyRecruiterSession(request);
    if (!session.authenticated || !session.recruiterId) {
      const statusCode = session.isApproved === false ? 403 : 401;
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: statusCode });
    }

    if (session.isApproved === false) {
      return NextResponse.json({
        error: 'Forbidden: Recruiter account is pending administrator approval',
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing interview ID' }, { status: 400 });
    }

    const success = await deleteInterviewFromDb(
      id, 
      session.role === 'admin' ? 'all' : session.recruiterId
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete interview or unauthorized' }, { status: 404 });
    }

    logSecurityEvent({
      event: 'INTERVIEW_DELETED',
      userId: session.recruiterId,
      details: { invitationId: id },
    });

    invalidateInterviewsCache(session.recruiterId);
    invalidateInterviewsCache('all');

    return NextResponse.json({ success: true, message: 'Interview deleted successfully' });
  } catch (err: unknown) {
    console.error('Failed to delete interview:', err);
    return NextResponse.json({ error: 'Failed to delete interview' }, { status: 500 });
  }
}

/**
 * RECRUITER ENDPOINT: PATCH /api/interviews
 * 
 * Handles recruiter actions on an existing interview invitation:
 * - action: 'revoke' -> Revokes candidate link immediately
 * - action: 'regenerate-token' -> Generates a new secure token for candidate access
 * 
 * Security: Enforces recruiter session authentication and multi-tenant ownership.
 */
export async function PATCH(request: Request) {
  try {
    const session = await verifyRecruiterSession(request);
    if (!session.authenticated || !session.recruiterId) {
      const statusCode = session.isApproved === false ? 403 : 401;
      return NextResponse.json({ error: session.error || 'Unauthorized' }, { status: statusCode });
    }

    if (session.isApproved === false) {
      return NextResponse.json({
        error: 'Forbidden: Recruiter account is pending administrator approval',
      }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body;
    if (!id || !action) {
      return NextResponse.json({ error: 'Interview ID and action are required' }, { status: 400 });
    }

    const targetRecruiterId = session.role === 'admin' ? 'all' : session.recruiterId;

    if (action === 'revoke') {
      const success = await revokeInterviewInDb(id, targetRecruiterId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to revoke interview or already completed' }, { status: 400 });
      }

      logSecurityEvent({
        event: 'INTERVIEW_REVOKED',
        userId: session.recruiterId,
        details: { invitationId: id },
      });

      invalidateInterviewsCache(session.recruiterId);
      invalidateInterviewsCache('all');

      return NextResponse.json({ success: true, status: 'revoked' });
    }

    if (action === 'regenerate-token') {
      const newRawToken = generateSecureToken();
      const success = await regenerateInterviewTokenInDb(id, targetRecruiterId, newRawToken);
      if (!success) {
        return NextResponse.json({ error: 'Failed to regenerate token or interview completed' }, { status: 400 });
      }

      logSecurityEvent({
        event: 'INTERVIEW_TOKEN_REGENERATED',
        userId: session.recruiterId,
        details: { invitationId: id },
      });

      invalidateInterviewsCache(session.recruiterId);
      invalidateInterviewsCache('all');

      return NextResponse.json({
        success: true,
        token: newRawToken,
        message: 'Invitation link regenerated successfully',
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error('Failed to update interview:', err);
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}
