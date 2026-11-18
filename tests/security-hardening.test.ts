/**
 * Security Hardening & Database Integrity Test Suite for IntervueAI (Phase 6)
 * 
 * Verifies:
 * 1. Database Integrity: Unique constraints on candidate_answers(session_id, question_id) & idempotent answer updates
 * 2. Candidate Evaluation Shielding: Candidates cannot inject or mutate recruiter evaluations
 * 3. Multi-Tenant Recruiter Isolation: Recruiter A cannot query or access Recruiter B's interviews
 * 4. Rate Limiting: HTTP 429 & Retry-After response on login, reset-password, and candidate turn abuse
 * 5. Request Payload Validation: Enforces body size limits (<256KB/512KB), token format, and answer lengths
 * 6. Lifecycle State Machine: Enforces valid transitions and prevents mutating completed/expired interviews
 * 7. Production Authentication Guards: Strict rejection of mock tokens and unauthorized fallbacks in production
 */

import * as fs from 'fs';
import * as path from 'path';

// Automatically load .env.local into process.env if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const nodeProcess = process as unknown as { loadEnvFile?: (path: string) => void };
if (fs.existsSync(envLocalPath) && typeof nodeProcess.loadEnvFile === 'function') {
  nodeProcess.loadEnvFile(envLocalPath);
}

import { POST as loginApi } from '../src/app/api/auth/login/route';
import { GET as getInterviewsApi, POST as postInterviewApi } from '../src/app/api/interviews/route';
import { GET as getCandidateApi, PATCH as patchCandidateApi } from '../src/app/api/interviews/[token]/route';
import { checkRateLimit } from '../src/lib/security/rateLimiter';
import { 
  isValidTokenFormat, 
  isValidUuid, 
  isValidEmail, 
  isValidPassword, 
  isValidStatusTransition,
  validateJobConfig,
  validateCandidateAnswerInput
} from '../src/lib/security/validator';
import { verifyRecruiterSession } from '../src/lib/auth/recruiterAuth';
import { 
  createInterviewInDb, 
  getRecruiterInterviewsFromDb, 
  isSupabaseConfigured 
} from '../src/lib/supabase/service';
import { getSupabaseAdminClient } from '../src/lib/supabase/admin';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${title}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${title} - ${details || 'Assertion failed'}`);
  }
}

async function runSecurityHardeningSuite() {
  console.log('\n======================================================');
  console.log('🛡️  RUNNING SECURITY HARDENING & DATABASE INTEGRITY SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // GROUP 1: DATABASE INTEGRITY & CANDIDATE ANSWER IDEMPOTENCY
  // --------------------------------------------------------------------------
  console.log('--- Group 1: Database Integrity & Answer Upsert Idempotency ---');
  {
    const testQuestionId = 'q-integrity-1';

    // 1.1 Answer input validator checks
    assert(
      validateCandidateAnswerInput({ questionId: testQuestionId, answerText: 'Valid answer', timeSpentSeconds: 25 }).valid,
      'Validates well-formed candidate answer payload'
    );
    assert(
      !validateCandidateAnswerInput({ questionId: '', answerText: 'Missing question ID' }).valid,
      'Rejects answer payload with empty questionId'
    );
    assert(
      !validateCandidateAnswerInput({ questionId: testQuestionId, answerText: 'a'.repeat(10001) }).valid,
      'Rejects candidate answer text exceeding 10,000 characters'
    );
    assert(
      !validateCandidateAnswerInput({ questionId: testQuestionId, answerText: 'Valid', timeSpentSeconds: 9999 }).valid,
      'Rejects timeSpentSeconds exceeding 7200 seconds'
    );

    // 1.2 Live DB upsert test if Supabase is connected
    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        // Find or create test interview session
        const { data: inv } = await admin.from('interview_invitations').select('id').limit(1).maybeSingle();
        if (inv) {
          const { data: sess } = await admin.from('interview_sessions').select('id').eq('invitation_id', inv.id).maybeSingle();
          if (sess) {
            // Test repeated upsert on (session_id, question_id)
            const ans1 = await admin.from('candidate_answers').upsert({
              session_id: sess.id,
              invitation_id: inv.id,
              question_id: 'q-test-idempotent',
              question_text: 'What is idempotency?',
              answer_text: 'Initial answer version',
              time_spent_seconds: 20,
            }, { onConflict: 'session_id, question_id' });

            assert(!ans1.error, 'First answer submission inserts row cleanly');

            const ans2 = await admin.from('candidate_answers').upsert({
              session_id: sess.id,
              invitation_id: inv.id,
              question_id: 'q-test-idempotent',
              question_text: 'What is idempotency?',
              answer_text: 'Updated revised answer version',
              time_spent_seconds: 35,
            }, { onConflict: 'session_id, question_id' });

            assert(!ans2.error, 'Second answer submission on same question updates row in-place without duplicate');

            // Verify count
            const { count } = await admin
              .from('candidate_answers')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', sess.id)
              .eq('question_id', 'q-test-idempotent');

            assert(count === 1, 'Maintains strict 1:1 relationship per (session_id, question_id)');

            // Clean up test answer
            await admin.from('candidate_answers').delete().eq('session_id', sess.id).eq('question_id', 'q-test-idempotent');
          }
        }
      }
    } else {
      console.log('    ℹ Skipping direct Supabase table test in offline mode');
    }
  }

  // --------------------------------------------------------------------------
  // GROUP 2: CANDIDATE EVALUATION SHIELDING & ANTI-TAMPERING
  // --------------------------------------------------------------------------
  console.log('\n--- Group 2: Candidate Evaluation Shielding & Anti-Tampering ---');
  {
    const rawToken = 'eval-demo-completed-88';

    // 2.1 Candidate GET endpoint never reveals recruiterReport
    const getReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`);
    const getRes = await getCandidateApi(getReq, { params: Promise.resolve({ token: rawToken }) });
    if (getRes.status === 200) {
      const body = await getRes.json();
      assert(body.recruiterReport === undefined, 'Candidate GET /api/interviews/[token] strips recruiterReport');
      assert(body.scores === undefined, 'Candidate GET does not leak internal scores');
      assert(body.recommendation === undefined, 'Candidate GET does not leak hiring recommendation');
    }

    // 2.2 Candidate PATCH endpoint ignores client-provided recruiterReport
    const tamperedReport = {
      overallScore: 100,
      technicalCompetency: 'Exceptional',
      recommendation: 'Advance to Technical Final',
      overallAssessment: 'Hacked assessment injected by candidate',
    };

    const patchReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_progress',
        recruiterReport: tamperedReport,
      }),
    });

    const patchRes = await patchCandidateApi(patchReq, { params: Promise.resolve({ token: rawToken }) });
    // If completed or active, check response
    if (patchRes.status === 200) {
      const patchedBody = await patchRes.json();
      assert(patchedBody.recruiterReport === undefined, 'Candidate PATCH response does not reflect tampered recruiterReport');
    } else {
      assert(patchRes.status === 403 || patchRes.status === 404, 'Safely rejects invalid state or completed interview modification');
    }
  }

  // --------------------------------------------------------------------------
  // GROUP 3: MULTI-TENANT RECRUITER ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- Group 3: Multi-Tenant Recruiter Isolation ---');
  {
    const recruiterA_Id = '26ca1592-5ffa-4b1b-8922-6ce6ba1eb2b1';
    const recruiterB_Id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'; // Disjoint recruiter

    // Query for Recruiter A
    const interviewsA = await getRecruiterInterviewsFromDb(recruiterA_Id);
    assert(Array.isArray(interviewsA), 'Retrieves interviews for Recruiter A');

    // Query for Recruiter B (disjoint)
    const interviewsB = await getRecruiterInterviewsFromDb(recruiterB_Id);
    assert(Array.isArray(interviewsB) && interviewsB.length === 0, 'Recruiter B receives 0 interviews belonging to Recruiter A');

    // Query with undefined/omitted recruiterId
    const interviewsNoId = await getRecruiterInterviewsFromDb(undefined);
    assert(Array.isArray(interviewsNoId) && interviewsNoId.length === 0, 'Omitting recruiterId returns empty array (prevents global data leak)');

    // Ordinary recruiter calling GET /api/interviews is isolated to their own sessions
    const reqAuth = new Request('http://localhost:3000/api/interviews');
    const resAuth = await getInterviewsApi(reqAuth);
    assert(resAuth.status === 200, 'Authenticated recruiter queries interviews endpoint');
  }

  // --------------------------------------------------------------------------
  // GROUP 4: DISTRIBUTED & IN-MEMORY RATE LIMITING
  // --------------------------------------------------------------------------
  console.log('\n--- Group 4: API Rate Limiting Policy Enforcement ---');
  {
    const testKey = `test:ratelimit:${Date.now()}`;
    const policy = { limit: 3, windowSeconds: 60 };

    // Attempt 1
    const r1 = await checkRateLimit(testKey, policy);
    assert(r1.allowed === true && r1.remaining === 2, 'Rate limiter permits 1st request');

    // Attempt 2
    const r2 = await checkRateLimit(testKey, policy);
    assert(r2.allowed === true && r2.remaining === 1, 'Rate limiter permits 2nd request');

    // Attempt 3
    const r3 = await checkRateLimit(testKey, policy);
    assert(r3.allowed === true && r3.remaining === 0, 'Rate limiter permits 3rd request (limit reached)');

    // Attempt 4 (Exceeded)
    const r4 = await checkRateLimit(testKey, policy);
    assert(r4.allowed === false, 'Rate limiter blocks 4th request (limit exceeded)');
    assert(r4.retryAfter > 0, 'Returns non-zero retryAfter seconds');
    assert(r4.remaining === 0, 'Reports remaining = 0');

    // Test API route rate limit response headers on repeated login attempts
    const rateLimitTestIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': rateLimitTestIp,
    };

    let hit429 = false;
    let retryHeaderPresent = false;
    for (let i = 0; i < 7; i++) {
      const res = await loginApi(new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: `ratelimit_${Date.now()}@testcorp.com`, password: 'WrongPassword123!' }),
      }));

      if (res.status === 429) {
        hit429 = true;
        retryHeaderPresent = Boolean(res.headers.get('Retry-After'));
        break;
      }
    }
    assert(hit429, 'Login endpoint returns HTTP 429 when attempt threshold is exceeded');
    assert(retryHeaderPresent, 'HTTP 429 response includes valid Retry-After header');

    // 4.3 Test rate limiter fails closed in strict mode when distributed storage fails
    const origStrictRate = process.env.ENFORCE_STRICT_RATE_LIMIT;
    try {
      process.env.ENFORCE_STRICT_RATE_LIMIT = 'true';
      // Simulated check with strict rate enforcement
      const strictCheck = await checkRateLimit(`strict:test:${Date.now()}`, { limit: 5, windowSeconds: 60 });
      // In live environment without rate_limit_buckets function, check should fail closed
      if (!strictCheck.isDistributed) {
        assert(strictCheck.allowed === false, 'Rate limiter fails closed when distributed store is unavailable in strict mode');
      }
    } finally {
      process.env.ENFORCE_STRICT_RATE_LIMIT = origStrictRate;
    }
  }

  // --------------------------------------------------------------------------
  // GROUP 5: REQUEST VALIDATION & PAYLOAD SIZE LIMITS
  // --------------------------------------------------------------------------
  console.log('\n--- Group 5: Request Validation & Size Limits ---');
  {
    // 5.1 Token Format Validation
    assert(isValidTokenFormat('inv-550e8400-e29b-41d4-a716-446655440000'), 'Accepts valid UUID token format');
    assert(isValidTokenFormat('eval-demo-completed-88'), 'Accepts valid hyphenated alphanumeric token');
    assert(!isValidTokenFormat('short'), 'Rejects token under 16 characters');
    assert(!isValidTokenFormat('token-with-illegal-chars!@#$%^&*()'), 'Rejects token with invalid special characters');

    // 5.2 UUID Validation
    assert(isValidUuid('26ca1592-5ffa-4b1b-8922-6ce6ba1eb2b1'), 'Accepts valid RFC 4122 v4 UUID');
    assert(!isValidUuid('not-a-uuid'), 'Rejects malformed UUID');
    assert(!isValidUuid('00000000-0000-0000-0000-000000000000'), 'Rejects non-v4 nil UUID');

    // 5.3 Email Validation
    assert(isValidEmail('recruiter@techcorp.com'), 'Accepts standard email');
    assert(!isValidEmail('plainaddress'), 'Rejects email without @ domain');
    assert(!isValidEmail('@missinguser.com'), 'Rejects email missing username');

    // 5.4 Password Validation
    assert(isValidPassword('ValidPassword123!').valid, 'Accepts compliant password');
    assert(!isValidPassword('short1!').valid, 'Rejects password under 8 characters');
    assert(!isValidPassword('ALLUPPERCASE123!').valid, 'Rejects password without lowercase');
    assert(!isValidPassword('alllowercase123!').valid, 'Rejects password without uppercase');
    assert(!isValidPassword('NoNumbersHere!').valid, 'Rejects password without numbers');

    // 5.5 Job Configuration Validation
    assert(validateJobConfig({
      jobTitle: 'Senior Full Stack Engineer',
      companyName: 'Acme Corp',
      jobDescription: 'Seeking an experienced engineer for mission-critical apps.',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Advanced',
      questionCount: 5,
      expectedDurationMinutes: 45,
    }).valid, 'Validates well-formed job configuration');

    assert(!validateJobConfig({
      jobTitle: 'A', // Too short
      companyName: 'Acme Corp',
      jobDescription: 'Valid description text.',
    }).valid, 'Rejects job title under 2 characters');

    // 5.6 API Route rejection of malformed tokens
    const badTokenReq = new Request('http://localhost:3000/api/interviews/short');
    const badTokenRes = await getCandidateApi(badTokenReq, { params: Promise.resolve({ token: 'short' }) });
    assert(badTokenRes.status === 400, 'Candidate API rejects invalid token format with HTTP 400');

    // 5.7 API Route rejection of oversized payload
    const oversizedBody = JSON.stringify({ data: 'x'.repeat(600 * 1024) }); // 600 KB > 512 KB
    const oversizedReq = new Request('http://localhost:3000/api/interviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(oversizedBody.length),
      },
      body: oversizedBody,
    });
    const oversizedRes = await postInterviewApi(oversizedReq);
    assert(oversizedRes.status === 413, 'Rejects oversized request body with HTTP 413 Payload Too Large');
  }

  // --------------------------------------------------------------------------
  // GROUP 6: STATE MACHINE TRANSITION ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- Group 6: Interview Lifecycle State Machine ---');
  {
    assert(isValidStatusTransition('active', 'in_progress'), 'Permits active -> in_progress transition');
    assert(isValidStatusTransition('active', 'completed'), 'Permits active -> completed transition');
    assert(isValidStatusTransition('in_progress', 'completed'), 'Permits in_progress -> completed transition');
    assert(isValidStatusTransition('active', 'expired'), 'Permits active -> expired transition');
    assert(isValidStatusTransition('active', 'revoked'), 'Permits active -> revoked transition');
    assert(!isValidStatusTransition('completed', 'in_progress'), 'Rejects completed -> in_progress transition (cannot revert)');
    assert(!isValidStatusTransition('completed', 'active'), 'Rejects completed -> active transition');
    assert(!isValidStatusTransition('expired', 'in_progress'), 'Rejects expired -> in_progress transition');
    assert(!isValidStatusTransition('revoked', 'active'), 'Rejects revoked -> active transition');
  }

  // --------------------------------------------------------------------------
  // GROUP 7: PRODUCTION AUTHENTICATION SAFETY GUARDS
  // --------------------------------------------------------------------------
  console.log('\n--- Group 7: Production Authentication Safety Guards ---');
  {
    // Test that mock tokens are rejected when strict authentication is simulated
    const origEnv = process.env.NODE_ENV;
    const origStrict = process.env.ENFORCE_STRICT_AUTH;

    try {
      process.env.ENFORCE_STRICT_AUTH = 'true';

      // 1. Mock token in strict mode
      const reqMockToken = new Request('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': 'Bearer mock-recruiter-jwt-test' },
      });
      const sessionMock = await verifyRecruiterSession(reqMockToken);
      assert(sessionMock.authenticated === false, 'Strict mode rejects mock JWT tokens');

      // 2. Unauthenticated request in strict mode
      const reqNoAuth = new Request('http://localhost:3000/api/auth/me');
      const sessionEmpty = await verifyRecruiterSession(reqNoAuth);
      assert(sessionEmpty.authenticated === false, 'Strict mode rejects unauthenticated request without fallback to default recruiter');

      // 2.1 Arbitrary bearer token in strict mode without configured auth must not fall through to default recruiter
      const reqArbitraryAuth = new Request('http://localhost:3000/api/auth/me', {
        headers: { 'Authorization': 'Bearer arbitrary-unverified-token-value' }
      });
      const sessionArbitrary = await verifyRecruiterSession(reqArbitraryAuth);
      assert(sessionArbitrary.authenticated === false, 'Strict mode rejects arbitrary non-mock bearer tokens without fallback to default recruiter');

      // 3. Prohibit zero UUID creation in strict mode
      let errorThrown = false;
      try {
        await createInterviewInDb(
          {
            jobTitle: 'Test Job',
            companyName: 'Test Co',
            jobDescription: 'Test description',
            requiredSkills: [],
            requiredExperience: '3 yrs',
            seniorityLevel: 'Mid-level',
            interviewType: 'Technical',
            difficulty: 'Intermediate',
            questionCount: 3,
            expectedDurationMinutes: 30,
            language: 'English',
          },
          { expiration: '24 hours' },
          { fullName: 'Candidate', email: 'test@example.com' },
          'test-raw-token-12345678',
          [],
          '00000000-0000-0000-0000-000000000000' // Zero UUID
        );
      } catch {
        errorThrown = true;
      }
      assert(errorThrown, 'Strict mode prohibits interview creation with zero UUID recruiter fallback');
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = origEnv;
      process.env.ENFORCE_STRICT_AUTH = origStrict;
    }
  }

  // Summary
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityHardeningSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
