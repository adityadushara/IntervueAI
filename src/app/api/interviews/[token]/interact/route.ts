import { NextResponse } from 'next/server';
import { getInterviewByRawTokenFromDb, patchInterviewInDb } from '@/lib/supabase/service';
import { processAdaptiveInterviewerTurn } from '@/lib/gemini/interviewer';
import { evaluateCandidateInterviewWithGemini } from '@/lib/gemini/evaluator';
import { CandidateAnswer, EvaluationStatus } from '@/types/interview';
import { hashInvitationToken } from '@/lib/security/tokenHash';
import { 
  isValidTokenFormat, 
  validatePayloadSize, 
  validateCandidateAnswerInput,
  MAX_INTERACT_PAYLOAD_BYTES 
} from '@/lib/security/validator';
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  RATE_LIMIT_POLICIES 
} from '@/lib/security/rateLimiter';
import { logSecurityEvent } from '@/lib/security/logger';

/**
 * CANDIDATE ADAPTIVE INTERACTION ENDPOINT: POST /api/interviews/[token]/interact
 * 
 * Handles turn-by-turn conversational interaction with the Gemini AI interviewer:
 * 1. Validates token format and token hash against active session state.
 * 2. Rate limits turns per candidate token to prevent Gemini quota exhaustion.
 * 3. Enforces payload size limits (< 256KB) and answer string length limits.
 * 4. Records candidate answer with validated timestamp and duration.
 * 5. Evaluates answer semantically using Gemini.
 * 6. Adaptively generates follow-up question if gaps/misconceptions are identified,
 *    or advances to next competency question.
 * 7. Concludes interview if duration or question limits are reached.
 */
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token || !isValidTokenFormat(token)) {
      return NextResponse.json({ error: 'Valid interview token format is required' }, { status: 400 });
    }

    // Payload Size Limit
    const sizeCheck = await validatePayloadSize(request, MAX_INTERACT_PAYLOAD_BYTES);
    if (!sizeCheck.valid && sizeCheck.errorResponse) {
      return sizeCheck.errorResponse;
    }

    // Rate Limit Candidate Interaction Turns
    const tokenHash = hashInvitationToken(token);
    const rateCheck = await checkRateLimit(`candidate:interact:${tokenHash}`, RATE_LIMIT_POLICIES.candidateInteract);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck, 'Too many interaction requests. Please pause before your next response.');
    }

    const existing = await getInterviewByRawTokenFromDb(token);
    if (!existing) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (existing.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 403 });
    }
    if (existing.status === 'revoked' || existing.status === 'expired') {
      return NextResponse.json({ error: 'Interview is not active' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateCandidateAnswerInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { questionId, answerText, timeSpentSeconds = 30, totalElapsedSeconds } = body;
    const trimmedAnswer = answerText.trim();
    const questions = existing.questions || [];
    const currentQ = questions.find(q => q.id === questionId) || questions[0];

    const currentAnswer: CandidateAnswer = {
      questionId,
      questionText: currentQ?.text || 'Interview Question',
      answerText: trimmedAnswer,
      timeSpentSeconds,
      submittedAt: new Date().toISOString(),
    };

    // Update answers list
    const updatedAnswers = [...(existing.answers || [])];
    const existingAnsIndex = updatedAnswers.findIndex(a => a.questionId === questionId);
    if (existingAnsIndex >= 0) {
      updatedAnswers[existingAnsIndex] = currentAnswer;
    } else {
      updatedAnswers.push(currentAnswer);
    }

    const elapsedSeconds = typeof totalElapsedSeconds === 'number' 
      ? totalElapsedSeconds 
      : (existing.totalDurationSeconds || 0) + timeSpentSeconds;

    const maxDurationSeconds = (existing.jobConfig.expectedDurationMinutes || 30) * 60;
    const currentQuestionIndex = questions.findIndex(q => q.id === questionId);

    // Call Adaptive Gemini Interviewer
    const interactionResult = await processAdaptiveInterviewerTurn({
      jobConfig: existing.jobConfig,
      currentQuestion: currentQ,
      candidateAnswerText: trimmedAnswer,
      allQuestions: questions,
      previousAnswers: updatedAnswers,
      currentQuestionIndex: currentQuestionIndex >= 0 ? currentQuestionIndex : updatedAnswers.length - 1,
      totalQuestions: questions.length,
      elapsedSeconds,
      maxDurationSeconds,
    });

    currentAnswer.interviewerFeedback = interactionResult.interviewerFeedback;

    const updatedQuestions = [...questions];
    if (interactionResult.hasFollowUp && interactionResult.followUpQuestion) {
      // Insert follow-up immediately after the current question
      const insertAt = currentQuestionIndex >= 0 ? currentQuestionIndex + 1 : updatedQuestions.length;
      updatedQuestions.splice(insertAt, 0, interactionResult.followUpQuestion);
    }

    const isComplete = interactionResult.isInterviewComplete;
    let recruiterReport = existing.recruiterReport;
    let evaluationStatus: EvaluationStatus | undefined = existing.evaluationStatus;
    let evaluationError: string | undefined = existing.evaluationError;

    if (isComplete) {
      try {
        const evalResult = await evaluateCandidateInterviewWithGemini({
          jobConfig: existing.jobConfig,
          candidateInfo: existing.candidate || { fullName: 'Candidate', email: 'candidate@example.com' },
          questions: updatedQuestions,
          answers: updatedAnswers,
          totalDurationSeconds: elapsedSeconds,
        });
        recruiterReport = {
          ...evalResult.evaluation,
          evaluationStatus: 'completed',
        };
        evaluationStatus = 'completed';
        evaluationError = undefined;
        logSecurityEvent({
          event: 'INTERVIEW_COMPLETED',
          tokenHash,
          details: { durationSeconds: elapsedSeconds, answerCount: updatedAnswers.length },
        });
      } catch (evalErr) {
        console.warn('Evaluation on complete failed:', evalErr);
        const errorMessage = evalErr instanceof Error ? evalErr.message : String(evalErr);
        evaluationStatus = 'failed';
        evaluationError = errorMessage;
        recruiterReport = {
          overallAssessment: 'Automated AI evaluation could not be completed during interview completion. Recruiter can trigger evaluation retry.',
          technicalCompetency: 'Needs Review',
          communicationClarity: 'Good',
          recommendation: 'Hold for Review',
          notableStrengths: [],
          areasToProbeInLiveRound: ['Automated AI evaluation failed; manual recruiter review or evaluation retry required.'],
          evaluationGeneratedAt: new Date().toISOString(),
          evaluationStatus: 'failed',
          evaluationError: errorMessage,
        };
      }
    }

    // Persist to Supabase
    await patchInterviewInDb(token, {
      status: isComplete ? 'completed' : 'in_progress',
      answers: updatedAnswers,
      questions: updatedQuestions,
      totalDurationSeconds: elapsedSeconds,
      completedAt: isComplete ? new Date().toISOString() : undefined,
      recruiterReport,
      evaluationStatus: isComplete ? (evaluationStatus || 'completed') : 'pending',
      evaluationError,
    });

    return NextResponse.json({
      success: true,
      interviewerFeedback: interactionResult.interviewerFeedback,
      hasFollowUp: interactionResult.hasFollowUp,
      followUpQuestion: interactionResult.followUpQuestion ? {
        id: interactionResult.followUpQuestion.id,
        questionNumber: interactionResult.followUpQuestion.questionNumber,
        text: interactionResult.followUpQuestion.text,
        category: interactionResult.followUpQuestion.category,
        context: interactionResult.followUpQuestion.context,
        sampleHints: interactionResult.followUpQuestion.sampleHints,
      } : undefined,
      isInterviewComplete: isComplete,
      isAiGenerated: interactionResult.isAiGenerated,
      totalQuestions: updatedQuestions.length,
      nextQuestionIndex: currentQuestionIndex + 1,
    });
  } catch (err: unknown) {
    console.error('Failed to process interview interaction:', err);
    return NextResponse.json({ error: 'Failed to process interaction' }, { status: 500 });
  }
}
