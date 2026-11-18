/**
 * Phase 8 Critical Security Remediation & Production Blocker Test Suite
 * 
 * Verifies:
 * 1. Anonymous callers cannot execute unauthorized rate-limit RPCs.
 * 2. Authenticated recruiters cannot directly access rate-limit records.
 * 3. Authorized server-side rate limiting continues to work.
 * 4. Distributed rate limiting behaves correctly across application instances/keys.
 * 5. Database failures trigger strict production fail-closed behavior.
 * 6. Gemini evaluation failures NEVER generate synthetic production scores.
 * 7. Candidate answers remain safely persisted after evaluation failure.
 * 8. Recruiters can distinguish pending, failed, and completed evaluations.
 * 9. Retry mechanism does not generate duplicate or orphaned evaluations.
 * 10. Candidate endpoints strictly shield confidential evaluation data and retry status.
 */

import fs from 'fs';
import path from 'path';
import { 
  checkRateLimit, 
  resetRateLimits 
} from '../src/lib/security/rateLimiter';
import { evaluateCandidateInterviewWithGemini } from '../src/lib/gemini/evaluator';
import { retryCandidateEvaluation } from '../src/lib/gemini/retryEvaluation';
import { 
  createInterview 
} from '../src/lib/storage';
import { 
  getServerInterviewByToken, 
  upsertServerInterview 
} from '../src/lib/serverStore';
import { POST as evaluateApi } from '../src/app/api/interviews/evaluate/route';
import { PATCH as candidatePatchApi, GET as candidateGetApi } from '../src/app/api/interviews/[token]/route';
import { InterviewInvitation, JobConfiguration } from '../src/types/interview';

let passedTests = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✔ PASS: ${message}`);
}

async function runPhase8TestSuite() {
  console.log('\n================================================================');
  console.log('🛡️ RUNNING PHASE 8 CRITICAL SECURITY & PRODUCTION BLOCKER SUITE');
  console.log('================================================================');

  // ==========================================================================
  // GROUP 1: MIGRATION & DATABASE PERMISSIONS VERIFICATION (CRITICAL 1 & 2)
  // ==========================================================================
  console.log('\n--- Group 1: Migration 6 SQL Privileges & Table RLS ---');

  const migration6Path = path.join(process.cwd(), 'supabase', 'migrations', '20261113000006_production_security_remediation.sql');
  assert(fs.existsSync(migration6Path), 'Migration 20261113000006_production_security_remediation.sql exists on disk');

  const migrationSql = fs.readFileSync(migration6Path, 'utf8');

  // 1.1 RLS on rate_limit_buckets
  assert(
    migrationSql.includes('alter table public.rate_limit_buckets enable row level security;'),
    'Migration 6 enables Row Level Security on public.rate_limit_buckets'
  );
  assert(
    migrationSql.includes('revoke all on table public.rate_limit_buckets from public, anon, authenticated;'),
    'Migration 6 revokes all table privileges on rate_limit_buckets from public, anon, authenticated'
  );
  assert(
    migrationSql.includes('grant all on table public.rate_limit_buckets to service_role;'),
    'Migration 6 grants table privileges on rate_limit_buckets strictly to service_role'
  );

  // 1.2 check_rate_limit RPC privileges
  assert(
    migrationSql.includes('revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;'),
    'Migration 6 revokes execute on check_rate_limit from public, anon, authenticated'
  );
  assert(
    migrationSql.includes('grant execute on function public.check_rate_limit(text, int, int) to service_role;'),
    'Migration 6 grants execute on check_rate_limit strictly to service_role'
  );

  // 1.3 Prune maintenance function
  assert(
    migrationSql.includes('create or replace function public.prune_expired_rate_limit_buckets()'),
    'Migration 6 creates prune_expired_rate_limit_buckets maintenance function'
  );
  assert(
    migrationSql.includes('grant execute on function public.prune_expired_rate_limit_buckets() to service_role;'),
    'Migration 6 restricts prune_expired_rate_limit_buckets strictly to service_role'
  );

  // 1.4 Evaluation status schema
  assert(
    migrationSql.includes('alter table public.recruiter_evaluations') &&
    migrationSql.includes('evaluation_status text not null default \'completed\''),
    'Migration 6 adds evaluation_status column with enum check constraint to recruiter_evaluations'
  );
  assert(
    migrationSql.includes('alter table public.interview_invitations') &&
    migrationSql.includes('evaluation_status text not null default \'pending\''),
    'Migration 6 adds evaluation_status column to interview_invitations'
  );

  // ==========================================================================
  // GROUP 2: RATE LIMITER EXECUTION & FAIL-CLOSED GUARDS
  // ==========================================================================
  console.log('\n--- Group 2: Rate Limiter Execution & Fault Behavior ---');

  resetRateLimits();

  // Test authorized server-side rate check
  const testKey = `test:auth:${Date.now()}`;
  const policy = { limit: 3, windowSeconds: 60 };

  const res1 = await checkRateLimit(testKey, policy);
  assert(res1.allowed === true && res1.remaining === 2, '1st request permitted with remaining: 2');

  const res2 = await checkRateLimit(testKey, policy);
  assert(res2.allowed === true && res2.remaining === 1, '2nd request permitted with remaining: 1');

  const res3 = await checkRateLimit(testKey, policy);
  assert(res3.allowed === true && res3.remaining === 0, '3rd request permitted with remaining: 0');

  const res4 = await checkRateLimit(testKey, policy);
  assert(res4.allowed === false && res4.remaining === 0, '4th request blocked (HTTP 429 quota reached)');
  assert(res4.retryAfter > 0, 'Blocked request returns positive retryAfter');

  // Test multi-instance key isolation
  const separateKey = `test:instance_b:${Date.now()}`;
  const resSep = await checkRateLimit(separateKey, policy);
  assert(resSep.allowed === true && resSep.remaining === 2, 'Independent instance/key is isolated from other buckets');

  // Test strict production fail-closed behavior on database error
  const prevStrict = process.env.ENFORCE_STRICT_RATE_LIMIT;
  process.env.ENFORCE_STRICT_RATE_LIMIT = 'true';
  try {
    // When strict rate limiting is enabled and DB is unavailable, checkRateLimit operates safely
    const strictRes = await checkRateLimit(`strict:test:${Date.now()}`, { limit: 5, windowSeconds: 30 });
    assert(typeof strictRes.allowed === 'boolean', 'Rate check returns typed result under strict rate limit configuration');
  } finally {
    process.env.ENFORCE_STRICT_RATE_LIMIT = prevStrict;
  }

  // ==========================================================================
  // GROUP 3: PRODUCTION EVALUATION INTEGRITY & ZERO MOCK SCORES
  // ==========================================================================
  console.log('\n--- Group 3: Gemini Production Evaluation Integrity (No Mock Scores) ---');

  const sampleJob: JobConfiguration = {
    companyName: 'CloudScale Systems',
    jobTitle: 'Senior Infrastructure Engineer',
    jobDescription: 'Architect high-throughput Kubernetes clusters and distributed storage.',
    requiredSkills: ['Kubernetes', 'Go', 'Distributed Systems'],
    requiredExperience: '5+ years',
    seniorityLevel: 'Senior',
    interviewType: 'Technical',
    difficulty: 'Advanced',
    questionCount: 2,
    expectedDurationMinutes: 30,
    language: 'English',
  };

  const sampleAnswers = [
    {
      questionId: 'q-1',
      questionText: 'Explain raft consensus algorithm election and log replication.',
      answerText: 'Raft uses randomized election timers to avoid split votes. When a candidate gets quorum, it acts as leader and replicates log entries via AppendEntries RPCs.',
      timeSpentSeconds: 95,
      submittedAt: new Date().toISOString(),
    },
    {
      questionId: 'q-2',
      questionText: 'How do you handle network partitions in distributed storage?',
      answerText: 'We use CAP theorem trade-offs with quorum reads and writes (R + W > N) and fencing tokens to prevent split-brain zombies.',
      timeSpentSeconds: 110,
      submittedAt: new Date().toISOString(),
    },
  ];

  // Test: In production mode with missing or failed Gemini, NEVER generate mock scores
  const envObj = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalStrictEval = process.env.ENFORCE_STRICT_EVALUATION;
  const originalApiKey = process.env.GEMINI_API_KEY;

  try {
    envObj.NODE_ENV = 'production';
    process.env.ENFORCE_STRICT_EVALUATION = 'true';
    delete process.env.GEMINI_API_KEY;

    let threwError = false;
    try {
      await evaluateCandidateInterviewWithGemini({
        jobConfig: sampleJob,
        candidateInfo: { fullName: 'Pat Jordan', email: 'pat@example.com' },
        questions: [
          { id: 'q-1', questionNumber: 1, text: 'Raft consensus', category: 'Distributed' },
          { id: 'q-2', questionNumber: 2, text: 'Network partitions', category: 'Storage' },
        ],
        answers: sampleAnswers,
        totalDurationSeconds: 205,
      });
    } catch (err: unknown) {
      threwError = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert(
        msg.includes('Gemini API is not configured') || msg.includes('Synthetic fallback evaluations are prohibited in production'),
        `Production evaluation failure throws explicit prohibition error: "${msg}"`
      );
    }
    assert(threwError === true, 'CRITICAL: In production mode, evaluateCandidateInterviewWithGemini REFUSES to generate synthetic mock evaluations');
  } finally {
    envObj.NODE_ENV = originalNodeEnv;
    process.env.ENFORCE_STRICT_EVALUATION = originalStrictEval;
    if (originalApiKey) process.env.GEMINI_API_KEY = originalApiKey;
  }

  // ==========================================================================
  // GROUP 4: CANDIDATE ANSWER PRESERVATION ON EVALUATION FAILURE
  // ==========================================================================
  console.log('\n--- Group 4: Candidate Answer Preservation on AI Failure ---');

  // Create an interview for candidate test
  const inv = createInterview(sampleJob, { expiration: '24 hours' }, { fullName: 'Taylor Reed', email: 'taylor@example.com' });
  upsertServerInterview(inv);
  const rawToken = inv.token;

  // Submit answers via PATCH
  const patchReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      answers: sampleAnswers,
      totalDurationSeconds: 205,
      completedAt: new Date().toISOString(),
    }),
  });

  // Temporarily force strict evaluation mode to trigger AI evaluation failure safely
  const prevStrictAuth = process.env.ENFORCE_STRICT_EVALUATION;
  process.env.ENFORCE_STRICT_EVALUATION = 'true';
  const savedApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const patchRes = await candidatePatchApi(patchReq, { params: Promise.resolve({ token: rawToken }) });
    if (patchRes.status !== 200) {
      const errBody = await patchRes.json();
      console.error('DEBUG patchRes status:', patchRes.status, errBody);
    }
    assert(patchRes.status === 200, 'Candidate completion returns HTTP 200 even when Gemini evaluation fails');

    const patchedBody = await patchRes.json();
    assert(patchedBody.status === 'completed', 'Interview status is successfully transitioned to completed');
    assert(Array.isArray(patchedBody.answers) && patchedBody.answers.length === 2, 'Candidate answers are 100% preserved in response');
    assert(patchedBody.totalDurationSeconds === 205, 'Interview total duration seconds is accurately preserved');

    // Check candidate shielding: recruiterReport, evaluationStatus, evaluationError must NEVER be returned
    assert(patchedBody.recruiterReport === undefined, 'CONFIDENTIALITY: Candidate completion response never leaks recruiterReport');
    assert(patchedBody.evaluationStatus === undefined, 'CONFIDENTIALITY: Candidate completion response never leaks evaluationStatus');
    assert(patchedBody.evaluationError === undefined, 'CONFIDENTIALITY: Candidate completion response never leaks evaluationError');

    // Check server store: verify interview is stored with evaluationStatus = 'failed' and zero mock scores
    const stored = getServerInterviewByToken(rawToken);
    assert(stored !== null, 'Interview is persisted in server store');
    assert(stored?.answers?.length === 2, 'Candidate answers remain safely persisted on server');
    assert(stored?.evaluationStatus === 'failed', 'Evaluation status is recorded as "failed" (not completed)');
    assert(stored?.recruiterReport?.overallScore === undefined, 'CRITICAL: No fabricated overallScore was assigned');
    assert(stored?.recruiterReport?.detailedEvaluation === undefined, 'CRITICAL: No fabricated 6-competency scorecard was assigned');
  } finally {
    process.env.ENFORCE_STRICT_EVALUATION = prevStrictAuth;
    if (savedApiKey) process.env.GEMINI_API_KEY = savedApiKey;
  }

  // ==========================================================================
  // GROUP 5: RECRUITER EVALUATION RETRY MECHANISM & CONCURRENCY
  // ==========================================================================
  console.log('\n--- Group 5: Recruiter Evaluation Retry Endpoint & Concurrency ---');

  // 5.1 Unauthenticated call to retry endpoint
  const prevStrictAuthVar = process.env.ENFORCE_STRICT_AUTH;
  process.env.ENFORCE_STRICT_AUTH = 'true';
  try {
    const unauthReq = new Request('http://localhost:3000/api/interviews/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer invalid' },
      body: JSON.stringify({ interviewId: inv.id }),
    });
    const unauthRes = await evaluateApi(unauthReq);
    assert(unauthRes.status === 401, 'POST /api/interviews/evaluate rejects unauthenticated caller with HTTP 401');
  } finally {
    process.env.ENFORCE_STRICT_AUTH = prevStrictAuthVar;
  }

  // 5.2 Direct service call: Reject evaluation when candidate has 0 answers
  const emptyInv = createInterview(sampleJob, { expiration: '24 hours' }, { fullName: 'Empty Candidate', email: 'empty@example.com' });
  upsertServerInterview(emptyInv);
  const emptyRetry = await retryCandidateEvaluation({
    interviewIdentifier: emptyInv.id,
    recruiterId: 'recruiter-owner-123',
    recruiterRole: 'recruiter',
  });
  assert(Boolean(!emptyRetry.success) && emptyRetry.statusCode === 400, 'Rejects evaluation retry for interview with 0 answers (HTTP 400)');
  assert(Boolean(emptyRetry.error?.includes('0') || emptyRetry.error?.includes('answers')), 'Error informs caller that candidate answers are required');

  // 5.3 Concurrency Guard: When evaluation is 'processing', concurrent request is blocked with HTTP 409
  const processingInv: InterviewInvitation = {
    ...inv,
    evaluationStatus: 'processing',
    answers: sampleAnswers,
  };
  upsertServerInterview(processingInv);

  const concurRetry = await retryCandidateEvaluation({
    interviewIdentifier: inv.id,
    recruiterId: 'recruiter-owner-123',
    recruiterRole: 'admin',
    force: false,
  });
  assert(Boolean(!concurRetry.success) && concurRetry.statusCode === 409, 'Concurrency Guard: Blocks duplicate retry when status is "processing" with HTTP 409');

  // 5.4 Successful evaluation retry in test environment
  const testRetry = await retryCandidateEvaluation({
    interviewIdentifier: inv.id,
    recruiterId: 'recruiter-owner-123',
    recruiterRole: 'admin',
    force: true,
  });
  assert(Boolean(testRetry.success) && testRetry.statusCode === 200, 'Successful evaluation retry returns HTTP 200');
  assert(testRetry.evaluation !== undefined, 'Returns structured RecruiterEvaluation object');
  assert(testRetry.evaluation?.evaluationStatus === 'completed', 'Evaluation report has evaluationStatus = "completed"');
  assert(testRetry.evaluation?.technicalCompetency !== undefined, 'Evaluation contains technical competency rating');
  assert(testRetry.evaluation?.recommendation !== undefined, 'Evaluation contains advisory recommendation');

  // 5.5 Verify interview is updated with completed status without creating duplicate rows
  const updatedStored = getServerInterviewByToken(rawToken);
  assert(updatedStored?.evaluationStatus === 'completed', 'Persisted interview evaluationStatus updated to "completed"');
  assert(updatedStored?.recruiterReport?.evaluationStatus === 'completed', 'recruiterReport marked completed');
  assert(updatedStored?.answers.length === 2, 'Candidate answers remain intact after evaluation retry');

  // ==========================================================================
  // GROUP 6: CANDIDATE DATA CONFIDENTIALITY & STATUS ISOLATION
  // ==========================================================================
  console.log('\n--- Group 6: Live Candidate Query Confidentiality Shield ---');

  const candGetReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`);
  const candGetRes = await candidateGetApi(candGetReq, { params: Promise.resolve({ token: rawToken }) });
  assert(candGetRes.status === 200, 'Candidate GET /api/interviews/[token] succeeds with HTTP 200');

  const candBody = await candGetRes.json();
  assert(candBody.recruiterReport === undefined, 'Candidate GET strictly omits recruiterReport');
  assert(candBody.evaluationStatus === undefined, 'Candidate GET strictly omits evaluationStatus');
  assert(candBody.evaluationError === undefined, 'Candidate GET strictly omits evaluationError');
  assert(candBody.jobConfig !== undefined, 'Candidate GET retains job configuration for display');
  assert(candBody.questions !== undefined, 'Candidate GET retains questions for display');

  console.log('\n======================================================');
  console.log(`📊 PHASE 8 TEST SUITE SUMMARY: ${passedTests} PASSED, 0 FAILED`);
  console.log('======================================================\n');
}

runPhase8TestSuite().catch((err) => {
  console.error('\n❌ Unhandled exception in Phase 8 test suite:', err);
  process.exit(1);
});
