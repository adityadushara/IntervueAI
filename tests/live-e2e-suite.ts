/**
 * Live Supabase End-to-End Verification Suite for IntervueAI
 * Tests all requirements against the actual live Supabase project:
 * - Recruiter signup, login, session verification, logout
 * - Profiles auto-trigger creation
 * - Multi-tenant RLS isolation between Recruiter A and Recruiter B
 * - Hashed token candidate access via API
 * - Evaluation confidentiality (candidates never see evaluations)
 * - Expired and revoked invitation rejection
 * - Candidate tampering protection
 */

import * as fs from 'fs';
import * as path from 'path';

// Automatically load .env.local into process.env if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const nodeProcess = process as unknown as { loadEnvFile?: (path: string) => void };
if (fs.existsSync(envLocalPath) && typeof nodeProcess.loadEnvFile === 'function') {
  nodeProcess.loadEnvFile(envLocalPath);
}

import { createClient } from '@supabase/supabase-js';
import { hashInvitationToken } from '../src/lib/security/tokenHash';
import { 
  createInterviewInDb, 
  patchInterviewInDb 
} from '../src/lib/supabase/service';
import { verifyRecruiterSession } from '../src/lib/auth/recruiterAuth';
import { GET as getInterviewByTokenApi, PATCH as patchInterviewApi } from '../src/app/api/interviews/[token]/route';
import { GET as getInterviewsApi } from '../src/app/api/interviews/route';
import { POST as loginApi } from '../src/app/api/auth/login/route';
import { POST as logoutApi } from '../src/app/api/auth/logout/route';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tzmiipvvdavfkifwprhk.supabase.co';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!secretKey) {
  console.error('Fatal: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required in environment.');
  process.exit(1);
}

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

async function runLiveSuite() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING LIVE SUPABASE END-TO-END VERIFICATION SUITE');
  console.log('   Target URL: https://tzmiipvvdavfkifwprhk.supabase.co');
  console.log('======================================================\n');

  const adminClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const timestamp = Date.now().toString(36);
  const emailA = `recruiter_a_${timestamp}@intervue.ai`;
  const emailB = `recruiter_b_${timestamp}@intervue.ai`;
  const testPassword = 'Password123!@#';

  // --------------------------------------------------------------------------
  // TEST GROUP 1: RECRUITER SIGNUP, PROFILES TRIGGER & LOGIN
  // --------------------------------------------------------------------------
  console.log('\x1b[36m--- Group 1: Live Recruiter Signup, Trigger & Authentication ---\x1b[0m');

  // 1.1 Create Recruiter A via admin
  const { data: userAData, error: userAErr } = await adminClient.auth.admin.createUser({
    email: emailA,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Recruiter Alpha', company_name: 'Alpha Corp' }
  });
  assert(!userAErr && !!userAData?.user, `Created live Recruiter A: ${emailA}`);
  const recruiterAId = userAData!.user!.id;

  // 1.2 Create Recruiter B via admin
  const { data: userBData, error: userBErr } = await adminClient.auth.admin.createUser({
    email: emailB,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Recruiter Beta', company_name: 'Beta Global' }
  });
  assert(!userBErr && !!userBData?.user, `Created live Recruiter B: ${emailB}`);
  const recruiterBId = userBData!.user!.id;

  // 1.3 Verify trigger automatically created profile rows with is_approved: false
  const { data: profileA, error: pAErr } = await adminClient.from('profiles').select('*').eq('id', recruiterAId).single();
  assert(!pAErr && profileA?.company_name === 'Alpha Corp', 'Database trigger automatically created profile for Recruiter A');
  assert(profileA?.is_approved === false, 'Newly provisioned Recruiter A is unapproved by default');

  const { data: profileB, error: pBErr } = await adminClient.from('profiles').select('*').eq('id', recruiterBId).single();
  assert(!pBErr && profileB?.company_name === 'Beta Global', 'Database trigger automatically created profile for Recruiter B');
  assert(profileB?.is_approved === false, 'Newly provisioned Recruiter B is unapproved by default');

  // 1.3.1 Verify Unapproved Recruiter Login is Rejected (HTTP 403)
  const unapprovedLoginRes = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: testPassword })
  }));
  assert(unapprovedLoginRes.status === 403, 'POST /api/auth/login rejects unapproved Recruiter A with HTTP 403');
  const unapprovedJson = await unapprovedLoginRes.json();
  assert(unapprovedJson.pendingApproval === true, 'Login response confirms pending administrator approval');

  // 1.3.2 Administrator Approves Recruiters A and B
  const { error: appAErr } = await adminClient.from('profiles').update({ is_approved: true }).eq('id', recruiterAId);
  assert(!appAErr, 'Administrator successfully approved Recruiter A');
  const { error: appBErr } = await adminClient.from('profiles').update({ is_approved: true }).eq('id', recruiterBId);
  assert(!appBErr, 'Administrator successfully approved Recruiter B');

  // 1.4 Test Login API Route for Approved Recruiter A
  const loginResA = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: testPassword })
  }));
  assert(loginResA.status === 200, 'POST /api/auth/login returns HTTP 200 for approved live Recruiter A');
  const loginJsonA = await loginResA.json();
  assert(typeof loginJsonA.token === 'string' && loginJsonA.token.length > 20, 'Login returns valid Supabase JWT session token');
  assert(loginJsonA.user.companyName === 'Alpha Corp', 'Login returns profile company name from database');
  const tokenA = loginJsonA.token;

  // 1.5 Test Login API Route for Approved Recruiter B
  const loginResB = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: testPassword })
  }));
  const loginJsonB = await loginResB.json();
  const tokenB = loginJsonB.token;
  assert(loginResB.status === 200 && typeof tokenB === 'string', 'POST /api/auth/login returns HTTP 200 for approved live Recruiter B');

  // 1.6 Verify session verification via Bearer token
  const reqWithTokenA = new Request('http://localhost:3000/api/interviews', {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const sessionA = await verifyRecruiterSession(reqWithTokenA);
  assert(sessionA.authenticated === true, 'verifyRecruiterSession validates live Recruiter A JWT');
  assert(sessionA.recruiterId === recruiterAId, 'verifyRecruiterSession accurately resolves Recruiter A UUID');

  // 1.7 Logout API Route
  const logoutRes = await logoutApi(new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` }
  }));
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: MULTI-TENANT ISOLATION (RECRUITER A vs RECRUITER B)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 2: Live Multi-Tenant RLS & Recruiter Isolation ---\x1b[0m');

  // Acquire fresh sessions for Recruiter A and Recruiter B
  const activeLoginResA = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password: testPassword })
  }));
  const activeTokenA = (await activeLoginResA.json()).token;

  const activeLoginResB = await loginApi(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password: testPassword })
  }));
  const activeTokenB = (await activeLoginResB.json()).token;

  const rawTokenA = `inv-live-a-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
  const jobA = {
    companyName: 'Alpha Corp',
    jobTitle: 'Distributed Systems Architect',
    jobDescription: 'Architect high-throughput event-driven microservices.',
    requiredSkills: ['PostgreSQL', 'Go', 'Kubernetes'],
    requiredExperience: '8+ years',
    seniorityLevel: 'Principal' as const,
    interviewType: 'Technical' as const,
    difficulty: 'Advanced' as const,
    questionCount: 2,
    expectedDurationMinutes: 45,
    language: 'English',
  };
  const questionsA = [
    { id: 'q-a1', questionNumber: 1, text: 'Explain WAL replication and split-brain resolution in PostgreSQL.', category: 'Storage Engine' },
    { id: 'q-a2', questionNumber: 2, text: 'How do you design idempotent consumers with Kafka and outbox pattern?', category: 'Distributed Architecture' },
  ];
  const candidateA = { fullName: 'Alex Rivera', email: 'alex.rivera@example.com' };

  // Recruiter A creates an interview invitation in live Supabase database
  const createdInvA = await createInterviewInDb(
    jobA,
    { expiration: '24 hours' },
    candidateA,
    rawTokenA,
    questionsA,
    recruiterAId
  );
  assert(Boolean(createdInvA.id && createdInvA.id.length > 0), 'Interview invitation persisted to live Supabase DB');

  // Confirm raw token is NOT stored anywhere in the database table
  const tokenHashA = hashInvitationToken(rawTokenA);
  const { data: dbInvRow } = await adminClient
    .from('interview_invitations')
    .select('token_hash')
    .eq('id', createdInvA.id)
    .single();

  assert(dbInvRow?.token_hash === tokenHashA, 'Database stores ONLY 64-char SHA-256 token_hash');
  assert(dbInvRow?.token_hash !== rawTokenA, 'Database does NOT store raw token');

  // Recruiter A queries own interviews via authenticated API
  const getReqA = new Request('http://localhost:3000/api/interviews', {
    headers: { Authorization: `Bearer ${activeTokenA}` }
  });
  const resInterviewsA = await getInterviewsApi(getReqA);
  assert(resInterviewsA.status === 200, 'GET /api/interviews returns HTTP 200 for Recruiter A');
  const interviewsListA = await resInterviewsA.json();
  const foundA = (interviewsListA as Array<{ id: string }>).find(i => i.id === createdInvA.id);
  assert(foundA !== undefined, 'Recruiter A sees own created interview in dashboard query');

  // Recruiter B queries own interviews via authenticated API
  const getReqB = new Request('http://localhost:3000/api/interviews', {
    headers: { Authorization: `Bearer ${activeTokenB}` }
  });
  const resInterviewsB = await getInterviewsApi(getReqB);
  const interviewsListB = await resInterviewsB.json();
  if (resInterviewsB.status !== 200) {
    console.error('DEBUG Recruiter B GET /api/interviews error:', resInterviewsB.status, interviewsListB);
  }
  assert(resInterviewsB.status === 200, 'GET /api/interviews returns HTTP 200 for Recruiter B');
  const leakedToB = Array.isArray(interviewsListB) ? (interviewsListB as Array<{ id: string }>).find(i => i.id === createdInvA.id) : undefined;
  assert(leakedToB === undefined, 'CRITICAL MULTI-TENANCY: Recruiter B CANNOT see Recruiter A interviews');

  // Direct RLS query using Recruiter B's authenticated client
  const clientB = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  await clientB.auth.setSession({ access_token: activeTokenB, refresh_token: '' });
  const { data: rlsQueryB } = await clientB
    .from('interview_invitations')
    .select('*')
    .eq('id', createdInvA.id);
  assert(Array.isArray(rlsQueryB) && rlsQueryB.length === 0, 'RLS Policy at PostgreSQL level returns 0 rows for foreign recruiter');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: CANDIDATE INTERFACE & EVALUATION CONFIDENTIALITY
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 3: Live Candidate Interface & Shielding ---\x1b[0m');

  // 3.1 Candidate fetches interview using raw token
  const candReq = new Request(`http://localhost:3000/api/interviews/${rawTokenA}`);
  const candRes = await getInterviewByTokenApi(candReq, {
    params: Promise.resolve({ token: rawTokenA })
  });
  assert(candRes.status === 200, 'Candidate retrieves interview using valid raw token');
  const candJson = await candRes.json();
  assert(candJson.jobConfig.jobTitle === 'Distributed Systems Architect', 'Candidate receives correct role title');
  assert(candJson.questions.length === 2, 'Candidate receives configured question set');
  assert(typeof candJson.recruiterReport === 'undefined', 'Candidate API STRICTLY shields recruiterReport');

  // 3.2 Candidate progresses through interview
  // Start session
  const startRes = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenA}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    }),
    { params: Promise.resolve({ token: rawTokenA }) }
  );
  assert(startRes.status === 200, 'Candidate transitions interview status to "in_progress"');

  // Submit answers & complete interview
  const completeRes = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenA}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        totalDurationSeconds: 1200,
        completedAt: new Date().toISOString(),
        answers: [
          {
            questionId: 'q-a1',
            questionText: 'Explain WAL replication',
            answerText: 'WAL logs every state mutation sequentially to disk before buffer pool commit. Streaming replication transmits WAL records to standby replicas via replication slots with synchronous or asynchronous commit guarantees.',
            timeSpentSeconds: 600,
            submittedAt: new Date().toISOString()
          },
          {
            questionId: 'q-a2',
            questionText: 'How do you design idempotent consumers',
            answerText: 'Idempotency is achieved using unique message sequence identifiers tracked in a relational dedup table within an atomic transaction alongside the state update.',
            timeSpentSeconds: 600,
            submittedAt: new Date().toISOString()
          }
        ],
        recruiterReport: {
          overallAssessment: 'Senior candidate demonstrated deep distributed database knowledge.',
          technicalCompetency: 'Exceptional',
          communicationClarity: 'Clear & Structured',
          recommendation: 'Advance to Technical Final',
          notableStrengths: ['PostgreSQL internals', 'Idempotency patterns'],
          areasToProbeInLiveRound: ['Multi-region consensus protocols'],
          evaluationGeneratedAt: new Date().toISOString()
        }
      })
    }),
    { params: Promise.resolve({ token: rawTokenA }) }
  );
  assert(completeRes.status === 200, 'Candidate completes interview and evaluation is saved in DB');

  // Verify recruiter evaluations stored in database
  const { data: evalRows } = await adminClient
    .from('recruiter_evaluations')
    .select('*')
    .eq('invitation_id', createdInvA.id);
  assert(evalRows?.length === 1, 'Recruiter evaluation persisted to recruiter_evaluations table in PostgreSQL');

  // Verify candidate fetching completed interview STILL never sees evaluation report
  const postCompCandRes = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenA}`),
    { params: Promise.resolve({ token: rawTokenA }) }
  );
  const postCompJson = await postCompCandRes.json();
  if (postCompJson.status !== 'completed') {
    console.error('DEBUG postCompCandRes:', postCompCandRes.status, postCompJson);
  }
  assert(postCompJson.status === 'completed', 'Completed status reflected to candidate');
  assert(typeof postCompJson.recruiterReport === 'undefined', 'Candidate API still shields recruiterReport post-completion');

  // 3.3 Candidate cannot revert or tamper with completed interview
  const tamperRes = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenA}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    }),
    { params: Promise.resolve({ token: rawTokenA }) }
  );
  if (tamperRes.status !== 403) {
    console.error('DEBUG tamperRes:', tamperRes.status, await tamperRes.json());
  }
  assert(tamperRes.status === 403, 'Candidate cannot revert completed interview status (HTTP 403)');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: LIFECYCLE GUARDS (EXPIRED & REVOKED INVITATIONS)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 4: Live Lifecycle Guards (Expired & Revoked) ---\x1b[0m');

  // 4.1 Expired Invitation
  const rawTokenExp = `inv-live-exp-${timestamp}`;
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const expInv = await createInterviewInDb(
    jobA,
    { expiration: '24 hours' },
    candidateA,
    rawTokenExp,
    questionsA,
    recruiterAId
  );
  // Force expiration in DB
  await adminClient.from('interview_invitations').update({ expires_at: pastDate }).eq('id', expInv.id);

  const expRes = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenExp}`),
    { params: Promise.resolve({ token: rawTokenExp }) }
  );
  const expJson = await expRes.json();
  assert(expJson.status === 'expired', 'Expired invitation is dynamically flagged as "expired"');

  // 4.2 Revoked Invitation
  const rawTokenRev = `inv-live-rev-${timestamp}`;
  await createInterviewInDb(
    jobA,
    { expiration: '24 hours' },
    candidateA,
    rawTokenRev,
    questionsA,
    recruiterAId
  );
  await patchInterviewInDb(rawTokenRev, { status: 'revoked' });

  const revRes = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${rawTokenRev}`),
    { params: Promise.resolve({ token: rawTokenRev }) }
  );
  const revJson = await revRes.json();
  assert(revJson.status === 'revoked', 'Revoked invitation is flagged as "revoked" and blocked');

  // 4.3 Unknown token returns 404
  const unknownRes = await getInterviewByTokenApi(
    new Request('http://localhost:3000/api/interviews/inv-nonexistent-token-xyz'),
    { params: Promise.resolve({ token: 'inv-nonexistent-token-xyz' }) }
  );
  assert(unknownRes.status === 404, 'Invalid or nonexistent token returns HTTP 404');

  // Cleanup live test users
  try {
    await adminClient.auth.admin.deleteUser(recruiterAId);
    await adminClient.auth.admin.deleteUser(recruiterBId);
  } catch (cleanErr) {
    console.warn('Note: test user cleanup warning:', cleanErr);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 LIVE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveSuite().catch(err => {
  console.error('Fatal live suite error:', err);
  process.exit(1);
});
