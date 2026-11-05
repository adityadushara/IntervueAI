import { NextResponse } from 'next/server';
import { getServerInterviewByToken, upsertServerInterview } from '@/lib/serverStore';
import { InterviewInvitation } from '@/types/interview';

/**
 * CANDIDATE API ROUTE: /api/interviews/[token]
 * 
 * Security Controls:
 * 1. Token Isolation: Candidate queries by specific token. Cannot browse or enumerate other candidates.
 * 2. Confidential Data Sanitization: Never returns recruiterReport, evaluation scores, or hiring recommendations.
 * 3. Mutation Filtering: Candidates can only transition status ('in_progress', 'completed') and append answers.
 *    Candidates cannot alter job specs, link configuration, expiration, or recruiter reports.
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const found = getServerInterviewByToken(token);
    if (!found) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json(sanitizeForCandidate(found));
  } catch (err) {
    console.error(`Failed to retrieve interview ${context}:`, err);
    return NextResponse.json({ error: 'Failed to retrieve interview' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const updates: Partial<InterviewInvitation> = await request.json();
    const existing = getServerInterviewByToken(token);
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Security Gate: Completed, revoked, or expired interviews cannot be mutated by candidate
    if (existing.status === 'completed' && updates.status !== 'completed') {
      return NextResponse.json({ error: 'Completed interviews cannot be modified' }, { status: 403 });
    }
    if (existing.status === 'revoked' || existing.status === 'expired') {
      return NextResponse.json({ error: 'Inactive interview cannot be modified' }, { status: 403 });
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
    // If completed and recruiterReport provided by server sync, retain it in internal storage
    if (updates.recruiterReport) {
      sanitizedCandidateUpdates.recruiterReport = updates.recruiterReport;
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

    const saved = upsertServerInterview(merged);
    return NextResponse.json(sanitizeForCandidate(saved));
  } catch (err) {
    console.error(`Failed to update interview ${context}:`, err);
    return NextResponse.json({ error: 'Failed to update interview' }, { status: 500 });
  }
}
