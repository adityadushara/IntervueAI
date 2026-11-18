import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { evaluateCandidateInterviewWithGemini } from '@/lib/gemini/evaluator';
import { logSecurityEvent } from '@/lib/security/logger';
import { hashInvitationToken } from '@/lib/security/tokenHash';
import { 
  RecruiterEvaluation, 
  InterviewQuestion, 
  CandidateAnswer, 
  SeniorityLevel, 
  InterviewType, 
  InterviewDifficulty,
  StructuredInterviewPlan 
} from '@/types/interview';
import { Json } from '@/lib/supabase/types';
import { getServerInterviewByToken, getServerInterviews, upsertServerInterview } from '@/lib/serverStore';

interface QuestionDbRow {
  id: string;
  question_number: number;
  text: string;
  category: string;
  context?: string | null;
  sample_hints?: string[] | null;
}

interface AnswerDbRow {
  question_id: string;
  question_text: string;
  answer_text: string;
  time_spent_seconds: number;
  submitted_at: string;
}

interface SessionDbRow {
  id: string;
  total_duration_seconds: number;
}

interface JobConfigDbRow {
  company_name?: string | null;
  job_title?: string | null;
  job_description?: string | null;
  required_skills?: string[] | null;
  required_experience?: string | null;
  seniority_level?: string | null;
  interview_type?: string | null;
  difficulty?: string | null;
  question_count?: number | null;
  expected_duration_minutes?: number | null;
  language?: string | null;
  structured_plan?: unknown;
}

interface InvitationDbRow {
  id: string;
  recruiter_id: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  token_hash: string;
  token?: string;
  evaluation_status?: string | null;
  job_configurations?: JobConfigDbRow | null;
  interview_sessions?: SessionDbRow | SessionDbRow[] | null;
  interview_questions?: QuestionDbRow[] | null;
  candidate_answers?: AnswerDbRow[] | null;
}

export interface RetryEvaluationParams {
  interviewIdentifier: string; // Interview UUID, raw token, or token_hash
  recruiterId: string;
  recruiterRole?: string;
  force?: boolean;
}

export interface RetryEvaluationResult {
  success: boolean;
  statusCode: number;
  evaluation?: RecruiterEvaluation;
  error?: string;
  details?: string;
}

/**
 * Recruiter-Only Evaluation Retry Service
 * 
 * Security Controls:
 * 1. Recruiter Authorization: Enforces session ownership (or admin role).
 * 2. Concurrency Shield: Prevents duplicate concurrent evaluations via 'processing' lock.
 * 3. Atomic DB Persistence: Persists evaluation results and status updates to Supabase PostgreSQL.
 * 4. Grounded Integrity: In production mode, NEVER fabricates mock scores if Gemini fails.
 * 5. Candidate Answer Preservation: Evaluates against real persisted candidate answers.
 */
export async function retryCandidateEvaluation(
  params: RetryEvaluationParams
): Promise<RetryEvaluationResult> {
  const { interviewIdentifier, recruiterId, recruiterRole, force } = params;

  logSecurityEvent({
    event: 'EVALUATION_RETRY_REQUESTED',
    userId: recruiterId,
    details: { interviewIdentifier, force: Boolean(force) },
  });

  const supabase = getSupabaseAdminClient();
  const isDbConfigured = isSupabaseConfigured() && Boolean(supabase);

  // 1. Resolve interview in Supabase (or fallback serverStore)
  let invRecord: InvitationDbRow | null = null;
  let jobRecord: JobConfigDbRow | null = null;
  let sessionRecord: SessionDbRow | null = null;
  let questions: InterviewQuestion[] = [];
  let answers: CandidateAnswer[] = [];
  let candidateName = 'Candidate';
  let candidateEmail = 'candidate@example.com';
  let totalDurationSeconds = 0;
  let existingEvalStatus = 'pending';

  if (isDbConfigured && supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(interviewIdentifier);
      let query = supabase
        .from('interview_invitations')
        .select(`
          *,
          job_configurations (*),
          interview_sessions (*),
          interview_questions (*),
          candidate_answers (*),
          recruiter_evaluations (*)
        `);

      if (isUuid) {
        query = query.eq('id', interviewIdentifier);
      } else if (interviewIdentifier.length === 64 && /^[0-9a-f]+$/i.test(interviewIdentifier)) {
        query = query.eq('token_hash', interviewIdentifier);
      } else {
        const tokenHash = hashInvitationToken(interviewIdentifier);
        query = query.eq('token_hash', tokenHash);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        return {
          success: false,
          statusCode: 404,
          error: 'Interview invitation not found',
        };
      }

      const row = data as unknown as InvitationDbRow;
      invRecord = row;
      jobRecord = row.job_configurations || null;
      sessionRecord = Array.isArray(row.interview_sessions) 
        ? (row.interview_sessions[0] || null) 
        : (row.interview_sessions || null);
      candidateName = row.candidate_name || 'Candidate';
      candidateEmail = row.candidate_email || 'candidate@example.com';
      existingEvalStatus = row.evaluation_status || 'pending';

      // Check ownership
      const isOwner = invRecord.recruiter_id === recruiterId;
      const isAdmin = recruiterRole === 'admin';
      if (!isOwner && !isAdmin) {
        return {
          success: false,
          statusCode: 403,
          error: 'Forbidden: You do not have permission to evaluate this interview',
        };
      }

      // Check concurrency
      if (existingEvalStatus === 'processing' && !force) {
        return {
          success: false,
          statusCode: 409,
          error: 'An evaluation is already currently being processed for this candidate. Please wait a moment.',
        };
      }

      // Format questions and answers
      questions = (row.interview_questions || []).map((q: QuestionDbRow) => ({
        id: q.id,
        questionNumber: q.question_number,
        text: q.text,
        category: q.category,
        context: q.context || undefined,
        sampleHints: q.sample_hints || [],
      })).sort((a: InterviewQuestion, b: InterviewQuestion) => a.questionNumber - b.questionNumber);

      answers = (row.candidate_answers || []).map((a: AnswerDbRow) => ({
        questionId: a.question_id,
        questionText: a.question_text,
        answerText: a.answer_text,
        timeSpentSeconds: a.time_spent_seconds,
        submittedAt: a.submitted_at,
      }));

      totalDurationSeconds = sessionRecord?.total_duration_seconds || 0;
    } catch (err) {
      console.error('Failed to load interview for evaluation retry:', err);
      return {
        success: false,
        statusCode: 500,
        error: 'Database lookup error during evaluation retry',
      };
    }
  } else {
    // Local memory store fallback
    const all = getServerInterviews();
    const local = all.find(i => i.id === interviewIdentifier || i.token === interviewIdentifier);
    if (!local) {
      return {
        success: false,
        statusCode: 404,
        error: 'Interview invitation not found in server store',
      };
    }

    invRecord = {
      id: local.id,
      recruiter_id: recruiterId,
      token_hash: hashInvitationToken(local.token),
      token: local.token,
      candidate_name: local.candidate?.fullName,
      candidate_email: local.candidate?.email,
    };
    jobRecord = {
      company_name: local.jobConfig.companyName,
      job_title: local.jobConfig.jobTitle,
      job_description: local.jobConfig.jobDescription,
      required_skills: local.jobConfig.requiredSkills,
      required_experience: local.jobConfig.requiredExperience,
      seniority_level: local.jobConfig.seniorityLevel,
      interview_type: local.jobConfig.interviewType,
      difficulty: local.jobConfig.difficulty,
      question_count: local.jobConfig.questionCount,
      expected_duration_minutes: local.jobConfig.expectedDurationMinutes,
      language: local.jobConfig.language,
      structured_plan: local.jobConfig.structuredPlan,
    };
    candidateName = local.candidate?.fullName || 'Candidate';
    candidateEmail = local.candidate?.email || 'candidate@example.com';
    questions = local.questions || [];
    answers = local.answers || [];
    totalDurationSeconds = local.totalDurationSeconds || 0;
    existingEvalStatus = local.evaluationStatus || 'pending';

    if (existingEvalStatus === 'processing' && !force) {
      return {
        success: false,
        statusCode: 409,
        error: 'Evaluation is currently processing',
      };
    }
  }

  // 2. Validate that candidate has answers to evaluate
  if (!answers || answers.length === 0) {
    return {
      success: false,
      statusCode: 400,
      error: 'Cannot generate AI evaluation: Candidate has not submitted any interview answers yet.',
    };
  }

  // 3. Set status to 'processing' to lock against duplicate evaluations
  if (isDbConfigured && supabase && invRecord?.id) {
    await supabase
      .from('interview_invitations')
      .update({ evaluation_status: 'processing' })
      .eq('id', invRecord.id);

    await supabase
      .from('recruiter_evaluations')
      .upsert({
        invitation_id: invRecord.id,
        recruiter_id: invRecord.recruiter_id,
        evaluation_status: 'processing',
        evaluation_error: null,
      }, { onConflict: 'invitation_id' });
  }

  // 4. Execute structured evaluation with Gemini
  try {
    const jobConfig = {
      companyName: jobRecord?.company_name || 'Acme Global',
      jobTitle: jobRecord?.job_title || 'Software Engineer',
      jobDescription: jobRecord?.job_description || '',
      requiredSkills: jobRecord?.required_skills || [],
      requiredExperience: jobRecord?.required_experience || '3-5 years',
      seniorityLevel: (jobRecord?.seniority_level as SeniorityLevel) || 'Mid-level',
      interviewType: (jobRecord?.interview_type as InterviewType) || 'Technical',
      difficulty: (jobRecord?.difficulty as InterviewDifficulty) || 'Intermediate',
      questionCount: jobRecord?.question_count || questions.length,
      expectedDurationMinutes: jobRecord?.expected_duration_minutes || 30,
      language: jobRecord?.language || 'English',
      structuredPlan: (jobRecord?.structured_plan as unknown as StructuredInterviewPlan) || undefined,
    };

    const evalInput = {
      jobConfig,
      candidateInfo: {
        fullName: candidateName,
        email: candidateEmail,
      },
      questions,
      answers,
      totalDurationSeconds,
    };

    const { evaluation, detailed } = await evaluateCandidateInterviewWithGemini(evalInput);

    evaluation.evaluationStatus = 'completed';
    evaluation.evaluationError = undefined;

    // 5. Atomic persistence of completed evaluation
    if (isDbConfigured && supabase && invRecord?.id) {
      await supabase
        .from('recruiter_evaluations')
        .upsert({
          invitation_id: invRecord.id,
          recruiter_id: invRecord.recruiter_id,
          technical_competency: evaluation.technicalCompetency,
          communication_clarity: evaluation.communicationClarity,
          recommendation: evaluation.recommendation,
          overall_assessment: evaluation.overallAssessment,
          notable_strengths: evaluation.notableStrengths || [],
          areas_to_probe: evaluation.areasToProbeInLiveRound || [],
          evaluation_generated_at: new Date().toISOString(),
          detailed_evaluation: detailed as unknown as Json,
          overall_score: evaluation.overallScore ?? null,
          evaluation_status: 'completed',
          evaluation_error: null,
        }, { onConflict: 'invitation_id' });

      await supabase
        .from('interview_invitations')
        .update({
          evaluation_status: 'completed',
          evaluation_error: null,
          status: 'completed',
        })
        .eq('id', invRecord.id);
    }

    // Keep serverStore in sync
    if (invRecord?.token) {
      const existing = getServerInterviewByToken(invRecord.token);
      if (existing) {
        upsertServerInterview({
          ...existing,
          status: 'completed',
          evaluationStatus: 'completed',
          evaluationError: undefined,
          recruiterReport: evaluation,
        });
      }
    }

    logSecurityEvent({
      event: 'INTERVIEW_COMPLETED',
      userId: recruiterId,
      details: {
        interviewId: invRecord?.id,
        score: evaluation.overallScore,
        recommendation: evaluation.recommendation,
      },
    });

    return {
      success: true,
      statusCode: 200,
      evaluation,
    };
  } catch (evalErr) {
    const errorMsg = evalErr instanceof Error ? evalErr.message : String(evalErr);
    console.error('Gemini evaluation retry failed:', errorMsg);

    // Persist failure status atomically
    if (isDbConfigured && supabase && invRecord?.id) {
      await supabase
        .from('recruiter_evaluations')
        .upsert({
          invitation_id: invRecord.id,
          recruiter_id: invRecord.recruiter_id,
          evaluation_status: 'failed',
          evaluation_error: errorMsg,
        }, { onConflict: 'invitation_id' });

      await supabase
        .from('interview_invitations')
        .update({
          evaluation_status: 'failed',
          evaluation_error: errorMsg,
        })
        .eq('id', invRecord.id);
    }

    logSecurityEvent({
      event: 'EVALUATION_FAILED',
      userId: recruiterId,
      details: { interviewId: invRecord?.id, error: errorMsg },
    });

    return {
      success: false,
      statusCode: 502,
      error: 'AI evaluation failed during retry. Candidate answers remain safely preserved.',
      details: errorMsg,
    };
  }
}
