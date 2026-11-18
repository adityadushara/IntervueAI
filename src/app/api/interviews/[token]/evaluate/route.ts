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
 * RECRUITER EVALUATION RETRY BY TOKEN/ID: POST /api/interviews/[token]/evaluate
 */
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Missing interview token' }, { status: 400 });
    }

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

    // 3. Rate Limit Recruiter
    if (session.recruiterId) {
      const rateCheck = await checkRateLimit(
        `recruiter:evaluate:${session.recruiterId}`,
        RATE_LIMIT_POLICIES.recruiterPlan
      );
      if (!rateCheck.allowed) {
        return createRateLimitResponse(rateCheck, 'Evaluation request limit reached. Please wait before retrying.');
      }
    }

    // 4. Optional body for force flag
    let force = false;
    try {
      const body = await request.json();
      force = Boolean(body?.force);
    } catch {
      // Empty or non-JSON body is acceptable
    }

    // 5. Execute secure retry
    const result = await retryCandidateEvaluation({
      interviewIdentifier: token,
      recruiterId: session.recruiterId!,
      recruiterRole: session.role,
      force,
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
    console.error('Unhandled error in /api/interviews/[token]/evaluate:', err);
    return NextResponse.json(
      { error: 'Internal server error processing evaluation' },
      { status: 500 }
    );
  }
}
