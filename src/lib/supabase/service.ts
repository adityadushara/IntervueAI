import { getSupabaseAdminClient } from './admin';
import { hashInvitationToken } from '../security/tokenHash';
import { Database } from './types';
import { 
  InterviewInvitation, 
  JobConfiguration, 
  LinkConfiguration, 
  CandidateInfo,
  InterviewQuestion,
  SeniorityLevel,
  InterviewType,
  InterviewDifficulty,
  StructuredInterviewPlan,
  HiringRecommendation,
  EvaluationStatus,
  GeminiDetailedEvaluation 
} from '@/types/interview';
import { 
  getServerInterviews, 
  getServerInterviewByToken, 
  upsertServerInterview,
  updateServerInterviewToken,
  deleteServerInterview,
  revokeServerInterview 
} from '../serverStore';

type QuestionRow = Database['public']['Tables']['interview_questions']['Row'];
type AnswerRow = Database['public']['Tables']['candidate_answers']['Row'];
type InvitationInsert = Database['public']['Tables']['interview_invitations']['Insert'];
type JobConfigRow = Database['public']['Tables']['job_configurations']['Row'];
type SessionRow = Database['public']['Tables']['interview_sessions']['Row'];
type EvaluationRow = Database['public']['Tables']['recruiter_evaluations']['Row'];

type InvitationRow = Database['public']['Tables']['interview_invitations']['Row'];

type InvitationWithRelations = InvitationRow & {
  job_configurations?: JobConfigRow | null;
  interview_sessions?: SessionRow[] | SessionRow | null;
  interview_questions?: QuestionRow[] | null;
  candidate_answers?: AnswerRow[] | null;
  recruiter_evaluations?: EvaluationRow[] | EvaluationRow | null;
};

/**
 * Checks if Supabase credentials are configured in environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    (
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.SUPABASE_SECRET_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
  );
}

/**
 * Persists an interview invitation to Supabase PostgreSQL.
 * SECURITY GUARANTEE: The raw token is NEVER written to the database.
 * Only the SHA-256 hash (token_hash) is persisted server-side.
 */
export async function createInterviewInDb(
  jobConfig: JobConfiguration,
  linkConfig: LinkConfiguration,
  candidateInfo: CandidateInfo,
  rawToken: string,
  questions: InterviewQuestion[],
  recruiterId: string = '00000000-0000-0000-0000-000000000000',
  customId?: string
): Promise<InterviewInvitation> {
  const tokenHash = hashInvitationToken(rawToken);
  const now = new Date();
  
  let durationMs = 24 * 60 * 60 * 1000;
  if (linkConfig.expiration === '48 hours') {
    durationMs = 48 * 60 * 60 * 1000;
  } else if (linkConfig.expiration === '7 days') {
    durationMs = 7 * 24 * 60 * 60 * 1000;
  }
  const expiresAt = new Date(now.getTime() + durationMs).toISOString();

  const supabase = getSupabaseAdminClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      let targetRecruiterId = recruiterId;
      const isStrict = process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_AUTH === 'true';
      if (targetRecruiterId === '00000000-0000-0000-0000-000000000000') {
        if (isStrict) {
          throw new Error('Unauthorized: A valid authenticated recruiter UUID is required to create interviews in production.');
        }
        const { data: prof } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        if (prof?.id) {
          targetRecruiterId = prof.id;
        }
      }

      // 1. Insert Job Configuration
      const { data: jobData, error: jobErr } = await supabase
        .from('job_configurations')
        .insert({
          recruiter_id: targetRecruiterId,
          company_name: jobConfig.companyName || 'Hiring Team',
          job_title: jobConfig.jobTitle || 'Software Engineer',
          job_description: jobConfig.jobDescription,
          required_skills: Array.isArray(jobConfig.requiredSkills) ? jobConfig.requiredSkills : [],
          required_experience: jobConfig.requiredExperience || '3+ years',
          seniority_level: jobConfig.seniorityLevel || 'Mid-level',
          interview_type: jobConfig.interviewType || 'Technical',
          difficulty: jobConfig.difficulty || 'Intermediate',
          question_count: jobConfig.questionCount || 5,
          expected_duration_minutes: jobConfig.expectedDurationMinutes || 30,
          language: jobConfig.language || 'English',
          structured_plan: (jobConfig.structuredPlan as unknown as Database['public']['Tables']['job_configurations']['Insert']['structured_plan']) || null,
        })
        .select()
        .single();

      if (jobErr || !jobData) {
        throw new Error(`Failed to insert job_configurations: ${jobErr?.message}`);
      }

      // 2. Insert Interview Invitation (STORES ONLY token_hash!)
      const invitationInsertPayload: InvitationInsert = {
        recruiter_id: targetRecruiterId,
        job_config_id: jobData.id,
        token_hash: tokenHash, // HASHED TOKEN ONLY!
        candidate_name: candidateInfo.fullName,
        candidate_email: candidateInfo.email,
        status: 'active',
        expires_at: expiresAt,
      };
      if (customId && customId.length === 36 && customId.includes('-')) {
        invitationInsertPayload.id = customId;
      }

      const { data: invData, error: invErr } = await supabase
        .from('interview_invitations')
        .insert(invitationInsertPayload)
        .select()
        .single();

      if (invErr || !invData) {
        throw new Error(`Failed to insert interview_invitations: ${invErr?.message}`);
      }

      // 3. Insert Configured Questions
      if (questions.length > 0) {
        const questionInserts = questions.map(q => ({
          job_config_id: jobData.id,
          invitation_id: invData.id,
          question_number: q.questionNumber,
          text: q.text,
          category: q.category,
          context: q.context || null,
          sample_hints: q.sampleHints || [],
        }));

        await supabase.from('interview_questions').insert(questionInserts);
      }

      const resultInv: InterviewInvitation = {
        id: invData.id,
        token: rawToken, // Returned to caller in-memory only for link sharing
        jobConfig,
        linkConfig,
        createdAt: invData.created_at,
        expiresAt: invData.expires_at,
        status: 'active',
        candidate: {
          fullName: candidateInfo.fullName,
          email: candidateInfo.email,
        },
        questions,
        answers: [],
      };

      // Keep local store synchronized as backup
      upsertServerInterview(resultInv);

      return resultInv;
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
        throw new Error(`Database error: Failed to persist interview invitation to Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('Supabase insert failed, falling back to serverStore (dev fallback):', err);
    }
  }

  // Failsafe: Never silently fallback to local storage in production
  if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
    throw new Error('Database error: Supabase is unavailable and local fallback is prohibited in production.');
  }

  // Fallback to local server store
  const localInv: InterviewInvitation = {
    id: customId || `intv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`,
    token: rawToken,
    jobConfig,
    linkConfig,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'active',
    candidate: {
      fullName: candidateInfo.fullName,
      email: candidateInfo.email,
    },
    questions,
    answers: [],
  };

  upsertServerInterview(localInv);
  return localInv;
}

/**
 * Retrieves an interview by its RAW token by hashing it and querying by token_hash.
 * SECURITY GUARANTEE: Never performs lookup with raw token string in SQL!
 */
export async function getInterviewByRawTokenFromDb(rawToken: string): Promise<InterviewInvitation | null> {
  const tokenHash = hashInvitationToken(rawToken);
  const supabase = getSupabaseAdminClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      // Lookup by token_hash
      const { data: inv, error: invErr } = await supabase
        .from('interview_invitations')
        .select(`
          *,
          job_configurations (*),
          interview_sessions (*),
          interview_questions (*),
          candidate_answers (*)
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (invErr || !inv) {
        // If PostgREST query completed with 0 rows (PGRST116), the token_hash does not exist in the database
        if (!invErr || invErr.code === 'PGRST116') {
          return null;
        }
        if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true') {
          return null;
        }
        // Fall back to serverStore only if network error or table missing
        return getServerInterviewByToken(rawToken);
      }

      // Format into standard InterviewInvitation interface
      const job = inv.job_configurations;
      const session = Array.isArray(inv.interview_sessions) ? inv.interview_sessions[0] : inv.interview_sessions;

      let currentStatus = inv.status;
      if (currentStatus === 'active' && new Date(inv.expires_at).getTime() < Date.now()) {
        currentStatus = 'expired';
        // Asynchronously update status in DB
        supabase.from('interview_invitations').update({ status: 'expired' }).eq('id', inv.id).then();
      }

      const questions: InterviewQuestion[] = (inv.interview_questions || []).map((q: QuestionRow) => ({
        id: q.id,
        questionNumber: q.question_number,
        text: q.text,
        category: q.category,
        context: q.context || undefined,
        sampleHints: q.sample_hints || [],
      })).sort((a: InterviewQuestion, b: InterviewQuestion) => a.questionNumber - b.questionNumber);

      const answers = (inv.candidate_answers || []).map((a: AnswerRow) => ({
        questionId: a.question_id,
        questionText: a.question_text,
        answerText: a.answer_text,
        timeSpentSeconds: a.time_spent_seconds,
        submittedAt: a.submitted_at,
      }));

      return {
        id: inv.id,
        token: rawToken,
        status: currentStatus,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
        jobConfig: {
          companyName: job?.company_name || 'Acme Global',
          jobTitle: job?.job_title || 'Software Engineer',
          jobDescription: job?.job_description || '',
          requiredSkills: job?.required_skills || [],
          requiredExperience: job?.required_experience || '3-5 years',
          seniorityLevel: (job?.seniority_level as SeniorityLevel) || 'Mid-level',
          interviewType: (job?.interview_type as InterviewType) || 'Technical',
          difficulty: (job?.difficulty as InterviewDifficulty) || 'Intermediate',
          questionCount: job?.question_count || questions.length,
          expectedDurationMinutes: job?.expected_duration_minutes || 30,
          language: job?.language || 'English',
          structuredPlan: (job?.structured_plan as unknown as StructuredInterviewPlan) || undefined,
        },
        linkConfig: {
          expiration: '24 hours',
        },
        candidate: {
          fullName: inv.candidate_name,
          email: inv.candidate_email,
          startedAt: session?.started_at || undefined,
        },
        questions,
        answers,
        completedAt: session?.completed_at || undefined,
        totalDurationSeconds: session?.total_duration_seconds || 0,
        evaluationStatus: (inv.evaluation_status as unknown as EvaluationStatus) || (inv.status === 'completed' ? 'completed' : 'pending'),
        evaluationError: inv.evaluation_error || undefined,
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
        throw new Error(`Database error: Failed to query interview from Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('Supabase query failed, falling back to serverStore:', err);
    }
  }

  // Failsafe: Never silently fallback to local storage in production
  if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
    return null;
  }

  // Fallback to local server store
  return getServerInterviewByToken(rawToken);
}

/**
 * Retrieves all interviews for recruiter dashboard.
 */
export async function getRecruiterInterviewsFromDb(recruiterId?: string): Promise<InterviewInvitation[]> {
  const supabase = getSupabaseAdminClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('interview_invitations')
        .select(`
          *,
          job_configurations (*),
          interview_sessions (*),
          interview_questions (*),
          candidate_answers (*),
          recruiter_evaluations (*)
        `)
        .order('created_at', { ascending: false });

      if (recruiterId && recruiterId !== 'all') {
        query = query.eq('recruiter_id', recruiterId);
      } else if (!recruiterId) {
        // Multi-tenant isolation: Never leak all interviews when recruiterId is missing
        return [];
      }

      query = query.limit(100);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return (data as unknown as InvitationWithRelations[]).map((inv: InvitationWithRelations) => {
          const job = inv.job_configurations;
          const session = Array.isArray(inv.interview_sessions) ? inv.interview_sessions[0] : inv.interview_sessions;
          const evaluation = Array.isArray(inv.recruiter_evaluations) ? inv.recruiter_evaluations[0] : inv.recruiter_evaluations;

          let itemStatus = inv.status;
          if (itemStatus === 'active' && new Date(inv.expires_at).getTime() < Date.now()) {
            itemStatus = 'expired';
          }

          const questions: InterviewQuestion[] = (inv.interview_questions || []).map((q: QuestionRow) => ({
            id: q.id,
            questionNumber: q.question_number,
            text: q.text,
            category: q.category,
            context: q.context || undefined,
            sampleHints: q.sample_hints || [],
          })).sort((a: InterviewQuestion, b: InterviewQuestion) => a.questionNumber - b.questionNumber);

          const answers = (inv.candidate_answers || []).map((a: AnswerRow) => ({
            questionId: a.question_id,
            questionText: a.question_text,
            answerText: a.answer_text,
            timeSpentSeconds: a.time_spent_seconds,
            submittedAt: a.submitted_at,
          }));

          return {
            id: inv.id,
            token: `inv-hash-${inv.token_hash.substring(0, 16)}`,
            status: itemStatus,
            createdAt: inv.created_at,
            expiresAt: inv.expires_at,
            jobConfig: {
              companyName: job?.company_name || '',
              jobTitle: job?.job_title || '',
              jobDescription: job?.job_description || '',
              requiredSkills: job?.required_skills || [],
              requiredExperience: job?.required_experience || '',
              seniorityLevel: (job?.seniority_level as SeniorityLevel) || 'Mid-level',
              interviewType: (job?.interview_type as InterviewType) || 'Technical',
              difficulty: (job?.difficulty as InterviewDifficulty) || 'Intermediate',
              questionCount: job?.question_count || questions.length,
              expectedDurationMinutes: job?.expected_duration_minutes || 30,
              language: job?.language || 'English',
              structuredPlan: (job?.structured_plan as unknown as StructuredInterviewPlan) || undefined,
            },
            linkConfig: { expiration: '24 hours' },
            candidate: {
              fullName: inv.candidate_name,
              email: inv.candidate_email,
              startedAt: session?.started_at || undefined,
            },
            questions,
            answers,
            completedAt: session?.completed_at || undefined,
            totalDurationSeconds: session?.total_duration_seconds || 0,
            recruiterReport: evaluation ? {
              overallAssessment: evaluation.overall_assessment || '',
              technicalCompetency: evaluation.technical_competency || 'Needs Review',
              communicationClarity: evaluation.communication_clarity || 'Good',
              recommendation: (evaluation.recommendation as HiringRecommendation) || 'Hold for Review',
              notableStrengths: evaluation.notable_strengths || [],
              areasToProbeInLiveRound: evaluation.areas_to_probe || [],
              evaluationGeneratedAt: evaluation.evaluation_generated_at,
              overallScore: evaluation.overall_score ?? undefined,
              detailedEvaluation: (evaluation.detailed_evaluation as unknown as GeminiDetailedEvaluation) || undefined,
              evaluationStatus: (evaluation.evaluation_status as unknown as EvaluationStatus) || (inv.evaluation_status as unknown as EvaluationStatus) || 'completed',
              evaluationError: evaluation.evaluation_error || undefined,
            } : undefined,
            evaluationStatus: (evaluation?.evaluation_status as unknown as EvaluationStatus) || (inv.evaluation_status as unknown as EvaluationStatus) || (inv.status === 'completed' ? (evaluation ? 'completed' : 'pending') : 'pending'),
            evaluationError: evaluation?.evaluation_error || inv.evaluation_error || undefined,
          };
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true') {
        throw new Error(`Database error: Failed to query recruiter interviews from Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('Supabase recruiter interviews query failed, using serverStore:', err);
    }
  }

  // Failsafe: Never silently fallback to local storage in production
  if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true') {
    throw new Error('Database error: Supabase is unavailable and local fallback is prohibited in production.');
  }

  // Fallback to local server store
  return getServerInterviews();
}

/**
 * Updates an interview session / answers in Supabase by RAW token hash.
 */
export async function patchInterviewInDb(
  rawToken: string,
  updates: Partial<InterviewInvitation>
): Promise<InterviewInvitation | null> {
  const tokenHash = hashInvitationToken(rawToken);
  const supabase = getSupabaseAdminClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      // 1. Fetch invitation by token_hash
      const { data: inv, error } = await supabase
        .from('interview_invitations')
        .select('*, interview_sessions(*)')
        .eq('token_hash', tokenHash)
        .single();

      if (error || !inv) {
        if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true') {
          return null;
        }
        const existingLocal = getServerInterviewByToken(rawToken);
        if (existingLocal) {
          const mergedLocal: InterviewInvitation = {
            ...existingLocal,
            ...updates,
            evaluationStatus: updates.evaluationStatus || updates.recruiterReport?.evaluationStatus || existingLocal.evaluationStatus || (updates.status === 'completed' ? 'completed' : 'pending'),
            evaluationError: updates.evaluationError !== undefined ? updates.evaluationError : existingLocal.evaluationError,
            candidate: {
              fullName: updates.candidate?.fullName || existingLocal.candidate?.fullName || 'Candidate',
              email: updates.candidate?.email || existingLocal.candidate?.email || 'candidate@example.com',
              startedAt: updates.candidate?.startedAt || existingLocal.candidate?.startedAt,
            },
            jobConfig: existingLocal.jobConfig,
            linkConfig: existingLocal.linkConfig,
            token: existingLocal.token,
            id: existingLocal.id,
          };
          upsertServerInterview(mergedLocal);
          return mergedLocal;
        }
        return null;
      }

      // 2. Update status and evaluation status if valid
      if (updates.status && updates.status !== inv.status) {
        const { error: statusErr } = await supabase
          .from('interview_invitations')
          .update({ status: updates.status })
          .eq('id', inv.id);
        if (statusErr) {
          console.warn('Status update error on interview_invitations:', statusErr.message);
        }
      }

      if (updates.evaluationStatus || updates.evaluationError !== undefined) {
        const evalColUpdates: Record<string, unknown> = {};
        if (updates.evaluationStatus) evalColUpdates.evaluation_status = updates.evaluationStatus;
        if (updates.evaluationError !== undefined) evalColUpdates.evaluation_error = updates.evaluationError;
        // Gracefully attempt update of pending migration columns
        await supabase
          .from('interview_invitations')
          .update(evalColUpdates as unknown as Database['public']['Tables']['interview_invitations']['Update'])
          .eq('id', inv.id);
      }

      // 3. Upsert session
      const existingSession = Array.isArray(inv.interview_sessions) 
        ? inv.interview_sessions[0] 
        : inv.interview_sessions;
      let sessionId: string | undefined = existingSession?.id;

      if (existingSession && sessionId) {
        await supabase
          .from('interview_sessions')
          .update({
            total_duration_seconds: updates.totalDurationSeconds ?? existingSession.total_duration_seconds,
            completed_at: updates.completedAt ?? existingSession.completed_at,
          })
          .eq('id', sessionId);
      } else {
        const { data: newSession } = await supabase
          .from('interview_sessions')
          .insert({
            invitation_id: inv.id,
            total_duration_seconds: updates.totalDurationSeconds || 0,
            completed_at: updates.completedAt || null,
          })
          .select()
          .single();
        sessionId = newSession?.id;
      }

      // 4. Upsert candidate answers if provided
      const targetSessionId = sessionId;
      if (Array.isArray(updates.answers) && targetSessionId) {
        for (const ans of updates.answers) {
          await supabase
            .from('candidate_answers')
            .upsert({
              session_id: targetSessionId,
              invitation_id: inv.id,
              question_id: ans.questionId,
              question_text: ans.questionText,
              answer_text: ans.answerText,
              time_spent_seconds: ans.timeSpentSeconds,
              submitted_at: ans.submittedAt || new Date().toISOString(),
            }, { onConflict: 'session_id, question_id' });
        }
      }

      // 4.5 Upsert dynamic or follow-up questions if provided
      if (Array.isArray(updates.questions)) {
        for (const q of updates.questions) {
          const isUuid = q.id && q.id.length === 36 && q.id.includes('-');
          const questionPayload: Database['public']['Tables']['interview_questions']['Insert'] = {
            job_config_id: inv.job_config_id,
            invitation_id: inv.id,
            question_number: q.questionNumber,
            text: q.text,
            category: q.category,
            context: q.context || null,
            sample_hints: q.sampleHints || [],
          };
          if (isUuid) {
            questionPayload.id = q.id;
          }
          await supabase.from('interview_questions').upsert(questionPayload, { onConflict: 'id' });
        }
      }

      // 5. Upsert recruiter evaluation report if provided
      if (updates.recruiterReport) {
        const rpt = updates.recruiterReport;
        const basePayload: Database['public']['Tables']['recruiter_evaluations']['Insert'] = {
          invitation_id: inv.id,
          recruiter_id: inv.recruiter_id,
          technical_competency: (rpt.technicalCompetency as Database['public']['Tables']['recruiter_evaluations']['Insert']['technical_competency']) || 'Strong',
          communication_clarity: (rpt.communicationClarity as Database['public']['Tables']['recruiter_evaluations']['Insert']['communication_clarity']) || 'Good',
          recommendation: (rpt.recommendation as Database['public']['Tables']['recruiter_evaluations']['Insert']['recommendation']) || 'Advance to Technical Final',
          overall_assessment: rpt.overallAssessment || 'Assessment pending.',
          notable_strengths: rpt.notableStrengths || [],
          areas_to_probe: rpt.areasToProbeInLiveRound || [],
          evaluation_generated_at: rpt.evaluationGeneratedAt || new Date().toISOString(),
          detailed_evaluation: (rpt.detailedEvaluation as unknown as Database['public']['Tables']['recruiter_evaluations']['Insert']['detailed_evaluation']) || null,
          overall_score: rpt.overallScore ?? null,
        };

        const fullPayload = {
          ...basePayload,
          evaluation_status: rpt.evaluationStatus || 'completed',
          evaluation_error: rpt.evaluationError || null,
        } as unknown as Database['public']['Tables']['recruiter_evaluations']['Insert'];

        const { error: upsertErr } = await supabase
          .from('recruiter_evaluations')
          .upsert(fullPayload, { onConflict: 'invitation_id' });

        if (upsertErr) {
          // Fallback to base payload if remote DB lacks evaluation_status column
          await supabase
            .from('recruiter_evaluations')
            .upsert(basePayload, { onConflict: 'invitation_id' });
        }
      }

      // Return updated record
      const updated = await getInterviewByRawTokenFromDb(rawToken);
      if (updated) {
        upsertServerInterview(updated);
      }
      return updated;
    } catch (err) {
      if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
        throw new Error(`Database error: Failed to update interview in Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('Supabase patch failed, falling back to serverStore (dev fallback):', err);
    }
  }

  // Failsafe: Never silently fallback to local storage in production
  if (process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_PERSISTENCE === 'true' || process.env.ENFORCE_STRICT_AUTH === 'true') {
    throw new Error('Database error: Supabase is unavailable and local fallback is prohibited in production.');
  }

  // Fallback to serverStore
  const existing = getServerInterviewByToken(rawToken);
  if (!existing) return null;

  const merged: InterviewInvitation = {
    ...existing,
    ...updates,
    evaluationStatus: updates.evaluationStatus || updates.recruiterReport?.evaluationStatus || existing.evaluationStatus || (updates.status === 'completed' ? 'completed' : 'pending'),
    evaluationError: updates.evaluationError !== undefined ? updates.evaluationError : existing.evaluationError,
    token: existing.token,
    id: existing.id,
  };

  upsertServerInterview(merged);
  return merged;
}

/**
 * Deletes an interview invitation from Supabase with recruiter authorization.
 */
export async function deleteInterviewFromDb(interviewId: string, recruiterId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('interview_invitations').delete().eq('id', interviewId);
      if (recruiterId !== 'all') {
        query = query.eq('recruiter_id', recruiterId);
      }
      const { data, error } = await query.select('id');
      if (error) {
        console.error('Failed to delete interview invitation from DB:', error.message);
        return false;
      }
      if (!data || data.length === 0) {
        return false;
      }
      deleteServerInterview(interviewId);
      return true;
    } catch (err) {
      console.error('Error deleting interview from DB:', err);
      return false;
    }
  }
  deleteServerInterview(interviewId);
  return true;
}

/**
 * Revokes an interview invitation in Supabase with recruiter authorization.
 */
export async function revokeInterviewInDb(interviewId: string, recruiterId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('interview_invitations')
        .update({ status: 'revoked' })
        .eq('id', interviewId)
        .neq('status', 'completed'); // Cannot revoke completed interviews
      if (recruiterId !== 'all') {
        query = query.eq('recruiter_id', recruiterId);
      }
      const { data, error } = await query.select('id');
      if (error) {
        console.error('Failed to revoke interview invitation in DB:', error.message);
        return false;
      }
      if (!data || data.length === 0) {
        return false;
      }
      revokeServerInterview(interviewId);
      return true;
    } catch (err) {
      console.error('Error revoking interview in DB:', err);
      return false;
    }
  }
  revokeServerInterview(interviewId);
  return true;
}

/**
 * Regenerates the invitation token for an active interview with recruiter authorization.
 */
export async function regenerateInterviewTokenInDb(
  interviewId: string, 
  recruiterId: string, 
  newRawToken: string
): Promise<boolean> {
  const tokenHash = hashInvitationToken(newRawToken);
  const supabase = getSupabaseAdminClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('interview_invitations')
        .update({ token_hash: tokenHash, status: 'active' })
        .eq('id', interviewId)
        .neq('status', 'completed'); // Cannot regenerate for completed interviews
      if (recruiterId !== 'all') {
        query = query.eq('recruiter_id', recruiterId);
      }
      const { data, error } = await query.select('id');
      if (error) {
        console.error('Failed to regenerate interview token in DB:', error.message);
        return false;
      }
      if (!data || data.length === 0) {
        return false;
      }
      updateServerInterviewToken(interviewId, newRawToken);
      return true;
    } catch (err) {
      console.error('Error regenerating interview token in DB:', err);
      return false;
    }
  }
  updateServerInterviewToken(interviewId, newRawToken);
  return true;
}
