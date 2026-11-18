import { NextResponse } from 'next/server';
import { verifyRecruiterSession } from '@/lib/auth/recruiterAuth';
import { retryCandidateEvaluation } from '@/lib/gemini/retryEvaluation';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';
import { validatePayloadSize, MAX_INTERVIEW_PAYLOAD_BYTES } from '@/lib/security/validator';

/**
 * RECRUITER EVALUATION RETRY ENDPOINT: POST /api/interviews/evaluate
 * 
 * Security Controls:
 * 1. Recruiter Authentication: Validates JWT / session cookie.
 * 2. Account Approval Gate: Unapproved recruiters are blocked with HTTP 403.
 * 3. Multi-Tenant Authorization: Enforces interview ownership (or admin role).
 * 4. Rate Limiting: Limits retry calls per recruiter to prevent abuse and quota spikes.
 * 5. Concurrency Shield: Prevents duplicate concurrent evaluations on the same candidate.
 * 6. Production Safety: Never generates synthetic mock scores in production.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 1. Payload size check
    const sizeCheck = await validatePayloadSize(request, MAX_INTERVIEW_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    // 2. Recruiter Authentication
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

    // 3. Rate Limit Recruiter Evaluation Invocations
    if (session.recruiterId) {
      const rateCheck = await checkRateLimit(
        `recruiter:evaluate:${session.recruiterId}`,
        RATE_LIMIT_POLICIES.recruiterPlan
      );
      if (!rateCheck.allowed) {
        return createRateLimitResponse(rateCheck, 'Evaluation request limit reached. Please wait before retrying.');
      }
    }

    // 4. Parse request body
    let body: { interviewId?: string; token?: string; force?: boolean } | null = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { interviewId, token, force } = body || {};
    const interviewIdentifier = interviewId || token;

    if (!interviewIdentifier || typeof interviewIdentifier !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: interviewId or token' },
        { status: 400 }
      );
    }

    // 5. Execute secure retry
    const result = await retryCandidateEvaluation({
      interviewIdentifier,
      recruiterId: session.recruiterId!,
      recruiterRole: session.role,
      force: Boolean(force),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation: result.evaluation,
    });
  } catch (err: unknown) {
    console.error('Unhandled error in evaluate endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error processing evaluation' },
      { status: 500 }
    );
  }
}
