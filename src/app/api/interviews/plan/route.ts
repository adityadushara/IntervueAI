import { NextResponse } from 'next/server';
import { verifyRecruiterSession } from '@/lib/auth/recruiterAuth';
import { analyzeJobDescriptionWithGemini } from '@/lib/gemini/analyzer';
import { JobConfiguration } from '@/types/interview';
import { 
  validatePayloadSize, 
  validateJobConfig, 
  MAX_INTERVIEW_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';

/**
 * RECRUITER ENDPOINT: POST /api/interviews/plan
 * 
 * Analyzes the job description and generates a structured interview plan
 * with tailored questions and competency distribution.
 * 
 * Security Controls:
 * 1. Requires authenticated recruiter session.
 * 2. Blocks unapproved accounts with HTTP 403.
 * 3. Rate limits requests per recruiter to protect Gemini quotas.
 * 4. Enforces request size and jobConfig schema limits.
 */
export const maxDuration = 60;

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

    // Rate Limit Gemini Plan Generations
    const rateCheck = await checkRateLimit(`recruiter:plan:${session.recruiterId}`, RATE_LIMIT_POLICIES.recruiterPlan);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck, 'AI interview plan generation quota exceeded. Please wait before analyzing more job descriptions.');
    }

    const body = await request.json();
    const jobConfig: JobConfiguration = body?.jobConfig || body;

    const validation = validateJobConfig(jobConfig);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const analysis = await analyzeJobDescriptionWithGemini(jobConfig);

    return NextResponse.json({
      success: true,
      plan: analysis.plan,
      questions: analysis.questions,
      isAiGenerated: analysis.isAiGenerated,
    });
  } catch (err: unknown) {
    console.error('Failed to generate interview plan:', err);
    return NextResponse.json({ error: 'Failed to generate interview plan' }, { status: 500 });
  }
}
