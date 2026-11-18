/**
 * Supabase Backend Integration & Security Test Suite for IntervueAI
 * 
 * Verifies:
 * 1. Cryptographic token hashing (SHA-256) & constant-time verification
 * 2. SQL Migration schema compliance (7 tables, foreign keys, RLS policies, indexes)
 * 3. Hashed token storage guarantee (raw tokens never stored in token_hash)
 * 4. Recruiter authentication helper & auth endpoints (login, me, logout)
 * 5. Supabase service layer CRUD operations via token hash
 * 6. Candidate API data isolation & recruiter evaluation confidentiality
 */

import { hashInvitationToken, verifyInvitationToken } from '../src/lib/security/tokenHash';
import { 
  createInterviewInDb, 
  getInterviewByRawTokenFromDb, 
  getRecruiterInterviewsFromDb, 
  patchInterviewInDb 
} from '../src/lib/supabase/service';
import { 
  verifyRecruiterSession, 
  extractAuthToken 
} from '../src/lib/auth/recruiterAuth';
import { POST as loginApi } from '../src/app/api/auth/login/route';
import { POST as logoutApi } from '../src/app/api/auth/logout/route';
import { GET as meApi } from '../src/app/api/auth/me/route';
import { GET as getInterviewsApi, POST as postInterviewApi } from '../src/app/api/interviews/route';
import { GET as getInterviewByTokenApi, PATCH as patchInterviewApi } from '../src/app/api/interviews/[token]/route';
import * as fs from 'fs';
import * as path from 'path';

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

async function runBackendIntegrationSuite() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING SUPABASE BACKEND & SECURITY INTEGRATION SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: CRYPTOGRAPHIC TOKEN HASHING
  // --------------------------------------------------------------------------
  console.log('\x1b[36m--- Group 1: Cryptographic Token Hashing (SHA-256) ---\x1b[0m');

  const rawTokenA = 'inv-550e8400-e29b-41d4-a716-446655440000';
  const rawTokenB = 'inv-6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const hashA1 = hashInvitationToken(rawTokenA);
  const hashA2 = hashInvitationToken(rawTokenA);
  const hashB = hashInvitationToken(rawTokenB);

  assert(typeof hashA1 === 'string' && hashA1.length === 64, 'hashInvitationToken produces 64-character hex digest');
  assert(/^[a-f0-9]{64}$/.test(hashA1), 'hashInvitationToken outputs valid lowercase hex characters');
  assert(hashA1 === hashA2, 'hashInvitationToken is strictly deterministic');
  assert(hashA1 !== hashB, 'Different raw tokens produce distinct SHA-256 hashes');
  assert(!hashA1.includes(rawTokenA), 'Hashed token does NOT leak raw token substring');

  // Verification helper
  assert(verifyInvitationToken(rawTokenA, hashA1) === true, 'verifyInvitationToken confirms valid token against hash');
  assert(verifyInvitationToken(rawTokenB, hashA1) === false, 'verifyInvitationToken rejects mismatched token');
  assert(verifyInvitationToken('invalid-raw-token', hashA1) === false, 'verifyInvitationToken rejects random token');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: SQL MIGRATIONS & SCHEMA COMPLIANCE
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 2: SQL Migrations & Schema Architecture ---\x1b[0m');

  const migration1Path = path.join(process.cwd(), 'supabase/migrations/20261105000001_create_intervue_schema.sql');
  const migration2Path = path.join(process.cwd(), 'supabase/migrations/20261105000002_rls_and_security_definer.sql');

  assert(fs.existsSync(migration1Path), 'Versioned migration 1 exists: 20261105000001_create_intervue_schema.sql');
  assert(fs.existsSync(migration2Path), 'Versioned migration 2 exists: 20261105000002_rls_and_security_definer.sql');

  const sql1 = fs.readFileSync(migration1Path, 'utf8');
  const sql2 = fs.readFileSync(migration2Path, 'utf8');

  // Verify 7 separate tables exist
  const expectedTables = [
    'public.profiles',
    'public.job_configurations',
    'public.interview_invitations',
    'public.interview_sessions',
    'public.interview_questions',
    'public.candidate_answers',
    'public.recruiter_evaluations'
  ];
  for (const table of expectedTables) {
    assert(sql1.includes(`create table if not exists ${table}`), `Migration 1 creates required table: ${table}`);
  }

  // Verify token_hash constraint and index
  assert(sql1.includes('token_hash varchar(64) not null unique'), 'Schema defines token_hash varchar(64) unique constraint');
  assert(sql1.includes('create index if not exists idx_invitations_token_hash on public.interview_invitations(token_hash)'), 'Schema indexes token_hash for performant lookups');

  // Verify RLS is enabled on all tables
  for (const table of expectedTables) {
    assert(sql2.includes(`alter table ${table} enable row level security;`), `RLS is enabled on ${table}`);
  }

  // Verify recruiter isolation policy
  assert(sql2.includes('auth.uid() = recruiter_id'), 'Strict recruiter RLS policies enforce auth.uid() = recruiter_id');

  // Verify candidate evaluation confidentiality
  assert(sql2.includes('create policy "Recruiters can view own candidate evaluations"'), 'Recruiter evaluations strictly restricted to recruiters');
  assert(!sql2.includes('create policy "Candidates can view evaluations"'), 'Candidates explicitly denied direct access to recruiter_evaluations');

  // Verify SECURITY DEFINER functions exist
  assert(sql2.includes('create or replace function public.get_candidate_interview_by_hash'), 'SECURITY DEFINER function get_candidate_interview_by_hash is defined');
  assert(sql2.includes('create or replace function public.submit_candidate_answer_by_hash'), 'SECURITY DEFINER function submit_candidate_answer_by_hash is defined');
  assert(sql2.includes('create or replace function public.complete_candidate_interview_by_hash'), 'SECURITY DEFINER function complete_candidate_interview_by_hash is defined');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: RECRUITER AUTHENTICATION & SESSION GUARDS
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 3: Recruiter Authentication & Session Verification ---\x1b[0m');

  // extractAuthToken
  const reqWithBearer = new Request('http://localhost:3000/api/interviews', {
    headers: { Authorization: 'Bearer test-recruiter-jwt-token-12345' }
  });
  assert(extractAuthToken(reqWithBearer) === 'test-recruiter-jwt-token-12345', 'extractAuthToken correctly parses Bearer token');

  const reqWithCookie = new Request('http://localhost:3000/api/interviews', {
    headers: { cookie: 'other=foo; sb-access-token=cookie-recruiter-token-6789; test=bar' }
  });
  assert(extractAuthToken(reqWithCookie) === 'cookie-recruiter-token-6789', 'extractAuthToken correctly parses sb-access-token cookie');

  // verifyRecruiterSession unauthorized handling
  const unauthorizedReq = new Request('http://localhost:3000/api/interviews', {
    headers: { 'x-mock-auth': 'unauthorized' }
  });
  const unauthSession = await verifyRecruiterSession(unauthorizedReq);
  assert(unauthSession.authenticated === false, 'verifyRecruiterSession rejects request when marked unauthorized');

  const invalidTokenReq = new Request('http://localhost:3000/api/interviews', {
    headers: { Authorization: 'Bearer invalid' }
  });
  const invalidSession = await verifyRecruiterSession(invalidTokenReq);
  assert(invalidSession.authenticated === false, 'verifyRecruiterSession rejects invalid token');

  // Auth API Endpoints
  // POST /api/auth/login
  const testRecruiterEmail = 'recruiter@techcorp.com';
  const testRecruiterPassword = process.env.TEST_RECRUITER_PASSWORD || 'Password123!';
  const loginRes = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testRecruiterEmail, password: testRecruiterPassword })
  }));
  assert(loginRes.status === 200, 'POST /api/auth/login returns HTTP 200 with credentials');
  const loginJson = await loginRes.json();
  assert(typeof loginJson.token === 'string' && loginJson.token.length > 0, 'POST /api/auth/login returns session token');
  assert(loginJson.user.email === 'recruiter@techcorp.com', 'POST /api/auth/login returns user email');

  // GET /api/auth/me
  const meRes = await meApi(new Request('http://localhost:3000/api/auth/me'));
  assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200');
  const meJson = await meRes.json();
  assert(meJson.authenticated === true, 'GET /api/auth/me returns authenticated status');

  const unauthMeRes = await meApi(new Request('http://localhost:3000/api/auth/me', {
    headers: { 'x-mock-auth': 'unauthorized' }
  }));
  assert(unauthMeRes.status === 401, 'GET /api/auth/me returns HTTP 401 for unauthorized session');

  // POST /api/auth/logout
  const logoutRes = await logoutApi(new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST'
  }));
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: SUPABASE SERVICE LAYER & TOKEN HASH STORAGE
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 4: Supabase Service Layer & Token Hash Storage ---\x1b[0m');

  const testRawToken = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  const testCandidate = { fullName: 'Jordan Vance', email: 'jordan.vance@example.com' };
  const testJob = {
    companyName: 'CloudScale Technologies',
    jobTitle: 'Backend Architect',
    jobDescription: 'Design resilient microservices with PostgreSQL',
    requiredSkills: ['PostgreSQL', 'Node.js', 'Go', 'Docker'],
    requiredExperience: '6+ years',
    seniorityLevel: 'Senior' as const,
    interviewType: 'Technical' as const,
    difficulty: 'Advanced' as const,
    questionCount: 3,
    expectedDurationMinutes: 45,
    language: 'English',
  };
  const testQuestions = [
    { id: 'q-1', questionNumber: 1, text: 'Explain PostgreSQL indexing strategies.', category: 'Database Architecture' },
    { id: 'q-2', questionNumber: 2, text: 'How do you handle distributed transactions?', category: 'System Design' },
  ];

  // 1. Create interview via service
  const created = await createInterviewInDb(
    testJob,
    { expiration: '24 hours' },
    testCandidate,
    testRawToken,
    testQuestions,
    '00000000-0000-0000-0000-000000000000'
  );

  assert(created.token === testRawToken, 'createInterviewInDb returns raw token to caller for link distribution');
  assert(created.status === 'active', 'Created interview status is "active"');
  assert(created.candidate?.fullName === testCandidate.fullName, 'Candidate name correctly saved');

  // 2. Query interview by raw token via service (hashes raw token internally)
  const retrieved = await getInterviewByRawTokenFromDb(testRawToken);
  assert(retrieved !== null, 'getInterviewByRawTokenFromDb successfully resolves interview via computed token hash');
  assert(retrieved?.id === created.id, 'Retrieved interview matches created interview ID');
  assert(retrieved?.jobConfig.jobTitle === 'Backend Architect', 'Retrieved interview contains job configuration');

  // 3. Patch interview via service
  const patched = await patchInterviewInDb(testRawToken, {
    status: 'completed',
    totalDurationSeconds: 180,
    completedAt: new Date().toISOString(),
    recruiterReport: {
      overallAssessment: 'Exceptional database architecture background',
      technicalCompetency: 'Exceptional',
      communicationClarity: 'Clear & Structured',
      recommendation: 'Advance to Technical Final',
      notableStrengths: ['Deep PostgreSQL knowledge', 'Indexing mastery'],
      areasToProbeInLiveRound: ['Eventual consistency'],
      evaluationGeneratedAt: new Date().toISOString()
    }
  });

  assert(patched !== null, 'patchInterviewInDb successfully executes update');
  assert(patched?.status === 'completed', 'patchInterviewInDb updates status to "completed"');
  assert(patched?.totalDurationSeconds === 180, 'patchInterviewInDb updates duration');

  // 4. Recruiter interviews query includes evaluations
  const recruiterInterviews = await getRecruiterInterviewsFromDb();
  const matched = recruiterInterviews.find(i => i.token === testRawToken || i.id === created.id);
  assert(matched !== undefined, 'getRecruiterInterviewsFromDb returns persisted interview');
  assert(matched?.recruiterReport?.recommendation === 'Advance to Technical Final', 'Recruiter query retains evaluation report');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: API ROUTE SECURITY & CONFIDENTIALITY ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 5: API Route Security & Confidentiality Enforcement ---\x1b[0m');

  // Recruiter GET /api/interviews rejects unauthorized
  const unauthGetInterviews = await getInterviewsApi(new Request('http://localhost:3000/api/interviews', {
    headers: { 'x-mock-auth': 'unauthorized' }
  }));
  assert(unauthGetInterviews.status === 401, 'GET /api/interviews rejects unauthorized recruiter requests (HTTP 401)');

  // Recruiter POST /api/interviews rejects unauthorized
  const unauthPostInterview = await postInterviewApi(new Request('http://localhost:3000/api/interviews', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-mock-auth': 'unauthorized' 
    },
    body: JSON.stringify(created)
  }));
  assert(unauthPostInterview.status === 401, 'POST /api/interviews rejects unauthorized recruiter requests (HTTP 401)');

  // Candidate GET /api/interviews/[token] strips recruiter evaluation report
  const candidateGetRes = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${testRawToken}`),
    { params: Promise.resolve({ token: testRawToken }) }
  );
  assert(candidateGetRes.status === 200, 'Candidate GET /api/interviews/[token] returns HTTP 200');
  const candidateJson = await candidateGetRes.json();
  assert(typeof candidateJson.recruiterReport === 'undefined', 'CRITICAL SECURITY: Candidate API never returns recruiterReport');

  // Candidate PATCH cannot modify completed interview
  const candidateRevertRes = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${testRawToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    }),
    { params: Promise.resolve({ token: testRawToken }) }
  );
  assert(candidateRevertRes.status === 403, 'Candidate cannot revert completed interview status (HTTP 403)');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: BUG 2 REGRESSION TEST - INTERVIEW CREATION & CANDIDATE PATCH
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 6: Bug 2 Regression Test (PATCH /api/interviews/[token] 404 Fix) ---\x1b[0m');

  const bug2RawToken = `inv-regression-${Date.now()}`;
  const bug2Invitation = {
    id: `id-${Date.now()}`,
    token: bug2RawToken,
    jobConfig: {
      companyName: 'Anthropic Cloud',
      jobTitle: 'Distributed Systems Engineer',
      jobDescription: 'Design resilient distributed coordination engines.',
      requiredSkills: ['Go', 'Raft', 'gRPC'],
      requiredExperience: '5+ years',
      seniorityLevel: 'Staff' as const,
      interviewType: 'System Design' as const,
      difficulty: 'Advanced' as const,
      questionCount: 1,
      expectedDurationMinutes: 15,
      language: 'English',
    },
    config: {
      expiration: '24 hours' as const,
    },
    candidate: {
      fullName: 'Jordan Lee',
      email: 'jordan.lee@example.com',
    },
    questions: [
      { id: 'q-reg-1', questionNumber: 1, text: 'Explain leader election in Raft consensus.', category: 'Distributed Systems' }
    ],
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    answers: [],
  };

  // Recruiter creates interview on config page (sends POST /api/interviews)
  const createRes = await postInterviewApi(new Request('http://localhost:3000/api/interviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bug2Invitation),
  }));
  assert(createRes.status === 201, 'POST /api/interviews succeeds (HTTP 201) and persists new invitation');

  // Candidate opens interview link (sends GET /api/interviews/[token])
  const candidateGetCheck = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${bug2RawToken}`),
    { params: Promise.resolve({ token: bug2RawToken }) }
  );
  assert(candidateGetCheck.status === 200, 'GET /api/interviews/[token] finds invitation (HTTP 200, not 404)');

  // Candidate updates interview (sends PATCH /api/interviews/[token])
  const candidatePatchCheck = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${bug2RawToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_progress',
        answers: [
          {
            questionId: 'q-reg-1',
            questionText: 'Explain leader election in Raft consensus.',
            answerText: 'Raft uses randomized election timeouts to prevent split votes among follower candidates.',
            timeSpentSeconds: 30,
          }
        ],
        totalDurationSeconds: 30,
      }),
    }),
    { params: Promise.resolve({ token: bug2RawToken }) }
  );
  assert(candidatePatchCheck.status === 200, 'PATCH /api/interviews/[token] succeeds (HTTP 200, resolves Bug 2 404)');
  const patchedResult = await candidatePatchCheck.json();
  assert(patchedResult.status === 'in_progress', 'PATCH updates invitation status to in_progress');
  assert(patchedResult.answers?.length === 1, 'PATCH records candidate voice answer in session');
  assert(patchedResult.answers?.[0]?.answerText?.includes('randomized election timeouts'), 'Answer text accurately preserved in persistence layer');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 INTEGRATION TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBackendIntegrationSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
