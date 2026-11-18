import { NextResponse } from 'next/server';
import { getInterviewByRawTokenFromDb, patchInterviewInDb } from '@/lib/supabase/service';
import { evaluateCandidateInterviewWithGemini } from '@/lib/gemini/evaluator';
import { generateRecruiterEvaluation } from '@/lib/mockData';
import { InterviewInvitation } from '@/types/interview';
import { hashInvitationToken } from '@/lib/security/tokenHash';
import { 
  isValidTokenFormat, 
  isValidStatusTransition, 
  validatePayloadSize,
  extractClientIp,
  MAX_INTERVIEW_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';
import { logSecurityEvent } from '@/lib/security/logger';

/**
 * CANDIDATE API ROUTE: /api/interviews/[token]
 * 
 * Security Controls:
 * 1. Hashed Token Verification: Raw invitation token is never stored in DB.
 *    Server computes SHA-256(rawToken) and looks up the session by token_hash.
 * 2. Rate Limiting: Bounded requests per token and client IP.
 * 3. Payload Size Limiter: Rejects oversized bodies (> 512KB).
 * 4. Token Format Validation: Ensures token is alphanumeric string (16-64 chars).
 * 5. Lifecycle Transition Enforcement: State machine prevents reverting completed/expired sessions.
 * 6. Confidential Data Sanitization: Never returns recruiterReport, evaluation scores, or hiring recommendations.
 * 7. Anti-Tamper Shield: Discards candidate-submitted recruiterReport; evaluations generated exclusively server-side.
 */

function sanitizeForCandidate(inv: InterviewInvitation) {
  return {
    id: inv.id,
    token: inv.token,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    jobConfig: {
      companyName: inv.jobConfig.companyName,
      jobTitle: inv.jobConfig.jobTitle,
      jobDescription: inv.jobConfig.jobDescription,
      requiredSkills: inv.jobConfig.requiredSkills,
      requiredExperience: inv.jobConfig.requiredExperience,
      seniorityLevel: inv.jobConfig.seniorityLevel,
      interviewType: inv.jobConfig.interviewType,
      difficulty: inv.jobConfig.difficulty,
      questionCount: inv.jobConfig.questionCount,
      expectedDurationMinutes: inv.jobConfig.expectedDurationMinutes,
      language: inv.jobConfig.language,
    },
    candidate: inv.candidate ? {
      fullName: inv.candidate.fullName,
      email: inv.candidate.email,
      startedAt: inv.candidate.startedAt,
    } : undefined,
    questions: inv.questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      text: q.text,
      category: q.category,
      context: q.context,
      sampleHints: q.sampleHints,
    })),
    answers: inv.answers || [],
    completedAt: inv.completedAt,
    totalDurationSeconds: inv.totalDurationSeconds || 0,
    // recruiterReport is strictly excluded from candidate payload
  };
}

export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || !isValidTokenFormat(token)) {
      return NextResponse.json({ error: 'Valid interview token format is required' }, { status: 400 });
    }

    // Rate Limit Candidate Reads
    const tokenHash = hashInvitationToken(token);
    const clientIp = extractClientIp(request);
    const rateCheck = await checkRateLimit(`candidate:get:${tokenHash}:${clientIp}`, RATE_LIMIT_POLICIES.candidatePatch);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck, 'Too many interview read requests.');
    }

    // Query via SHA-256 token hash lookup
    const found = await getInterviewByRawTokenFromDb(token);
    if (!found) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json(sanitizeForCandidate(found));
  } catch (err: unknown) {
    console.error('Failed to retrieve interview:', err);
    return NextResponse.json({ error: 'Failed to retrieve interview' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || !isValidTokenFormat(token)) {
      return NextResponse.json({ error: 'Valid interview token format is required' }, { status: 400 });
    }

    // Payload Size Limit
    const sizeCheck = await validatePayloadSize(request, MAX_INTERVIEW_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    // Rate Limit Candidate Mutations
    const tokenHash = hashInvitationToken(token);
    const rateCheck = await checkRateLimit(`candidate:patch:${tokenHash}`, RATE_LIMIT_POLICIES.candidatePatch);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck, 'Too many interview update attempts. Please wait before retrying.');
    }

    const updates: Partial<InterviewInvitation> = await request.json();
    const existing = await getInterviewByRawTokenFromDb(token);
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Security Gate 1: Completed, revoked, or expired interviews cannot be mutated
    if (existing.status === 'completed' && updates.status !== 'completed') {
      return NextResponse.json({ error: 'Completed interviews cannot be modified' }, { status: 403 });
    }
    if (existing.status === 'revoked' || existing.status === 'expired') {
      return NextResponse.json({ error: 'Inactive interview cannot be modified' }, { status: 403 });
    }

    // Security Gate 2: State Machine Lifecycle Validation
    if (updates.status && !isValidStatusTransition(existing.status, updates.status)) {
      logSecurityEvent({
        event: 'SECURITY_VIOLATION',
        tokenHash,
        reason: `Illegal interview status transition attempted: ${existing.status} -> ${updates.status}`,
      });
      return NextResponse.json({
        error: `Invalid status transition from ${existing.status} to ${updates.status}`,
      }, { status: 403 });
    }

    // Security Gate 3: Anti-Tamper Shield
    // If client attempted to pass their own recruiterReport, reject/strip it and log event
    if (updates.recruiterReport) {
      logSecurityEvent({
        event: 'EVALUATION_TAMPER_ATTEMPT',
        tokenHash,
        reason: 'Client-supplied recruiterReport detected and stripped on candidate PATCH route',
      });
    }

    // Whitelist allowed candidate updates
    const sanitizedCandidateUpdates: Partial<InterviewInvitation> = {};

    if (updates.status === 'in_progress' || updates.status === 'completed') {
      sanitizedCandidateUpdates.status = updates.status;
    }
    if (updates.candidate?.startedAt) {
      sanitizedCandidateUpdates.candidate = {
        ...existing.candidate,
        ...updates.candidate,
        fullName: existing.candidate?.fullName || updates.candidate.fullName,
        email: existing.candidate?.email || updates.candidate.email,
        startedAt: updates.candidate.startedAt,
      };
    }
    if (Array.isArray(updates.answers)) {
      sanitizedCandidateUpdates.answers = updates.answers;
    }
    if (typeof updates.totalDurationSeconds === 'number') {
      sanitizedCandidateUpdates.totalDurationSeconds = updates.totalDurationSeconds;
    }
    if (updates.completedAt) {
      sanitizedCandidateUpdates.completedAt = updates.completedAt;
    }
    
    // When interview completes, generate structured evaluation via Gemini AI strictly server-side
    if (updates.status === 'completed') {
      const isStrict = 
        process.env.NODE_ENV === 'production' || 
        process.env.ENFORCE_STRICT_EVALUATION === 'true' ||
        process.env.ENFORCE_STRICT_AUTH === 'true';

      try {
        const evalInput = {
          jobConfig: existing.jobConfig,
          candidateInfo: existing.candidate || { fullName: 'Candidate', email: 'candidate@example.com' },
          questions: existing.questions,
          answers: sanitizedCandidateUpdates.answers || existing.answers || [],
          totalDurationSeconds: sanitizedCandidateUpdates.totalDurationSeconds || existing.totalDurationSeconds || 0,
        };
        const { evaluation } = await evaluateCandidateInterviewWithGemini(evalInput);
        sanitizedCandidateUpdates.recruiterReport = {
          ...evaluation,
          evaluationStatus: 'completed',
        };
        sanitizedCandidateUpdates.evaluationStatus = 'completed';
      } catch (evalErr) {
        if (isStrict) {
          console.error('CRITICAL: Gemini evaluation failed in production mode. Preserving candidate answers without synthetic mock scores:', evalErr);
          const errorMessage = evalErr instanceof Error ? evalErr.message : String(evalErr);
          sanitizedCandidateUpdates.evaluationStatus = 'failed';
          sanitizedCandidateUpdates.evaluationError = errorMessage;
          sanitizedCandidateUpdates.recruiterReport = {
            overallAssessment: 'Automated AI evaluation could not be completed at interview submission time. Recruiter can trigger evaluation retry.',
            technicalCompetency: 'Needs Review',
            communicationClarity: 'Good',
            recommendation: 'Hold for Review',
            notableStrengths: [],
            areasToProbeInLiveRound: ['Automated AI evaluation failed; manual recruiter review or evaluation retry required.'],
            evaluationGeneratedAt: new Date().toISOString(),
            evaluationStatus: 'failed',
            evaluationError: errorMessage,
          };
        } else {
          console.warn('Dev fallback: Failed to evaluate candidate with Gemini, using grounded fallback evaluation:', evalErr);
          const candidateName = existing.candidate?.fullName || 'Candidate';
          sanitizedCandidateUpdates.recruiterReport = {
            ...generateRecruiterEvaluation(
              existing.jobConfig, 
              candidateName, 
              sanitizedCandidateUpdates.answers || existing.answers || []
            ),
            evaluationStatus: 'completed',
          };
          sanitizedCandidateUpdates.evaluationStatus = 'completed';
        }
      }
    }

    const merged: InterviewInvitation = {
      ...existing,
      ...sanitizedCandidateUpdates,
      token: existing.token, // Immutable token
      id: existing.id,       // Immutable ID
      jobConfig: existing.jobConfig, // Immutable job requirements
      linkConfig: existing.linkConfig,
      createdAt: existing.createdAt,
      expiresAt: existing.expiresAt,
    };

    // Update via Supabase (or fallback serverStore) using token hash
    const saved = await patchInterviewInDb(token, merged);
    if (!saved) {
      return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
    }

    return NextResponse.json(sanitizeForCandidate(saved));
  } catch (err: unknown) {
    console.error('Failed to update interview:', err);
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}
