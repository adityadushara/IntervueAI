/**
 * End-to-End HTTP Browser Flow Smoke Test for IntervueAI
 * Tests the live Next.js server running on http://localhost:3000:
 * - Recruiter login, me, and logout
 * - Interview creation and persistence to Supabase
 * - Candidate invitation link access (HTML & API)
 * - Candidate interview start, answer submission
 * - Page refresh and session state recovery
 * - Interview completion and recruiter report generation
 * - Candidate privacy enforcement (recruiterReport shielded)
 * - Anti-tampering guards and lifecycle verification
 */

import * as fs from 'fs';
import * as path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const nodeProcess = process as unknown as { loadEnvFile?: (path: string) => void };
if (fs.existsSync(envLocalPath) && typeof nodeProcess.loadEnvFile === 'function') {
  nodeProcess.loadEnvFile(envLocalPath);
}

const BASE_URL = 'http://localhost:3000';
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

async function runSmokeTests() {
  console.log('\n======================================================');
  console.log('🌐 RUNNING BROWSER & HTTP API END-TO-END SMOKE TESTS');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. Verify Next.js Web Pages Respond
  console.log('\x1b[36m--- 1. Web Page Route Rendering ---\x1b[0m');
  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, 'GET / renders landing page (HTTP 200)');
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes('IntervueAI') || homeHtml.includes('interviews'), 'Landing page contains IntervueAI content');

  const dashRes = await fetch(`${BASE_URL}/dashboard`);
  assert(dashRes.status === 200, 'GET /dashboard renders recruiter dashboard page (HTTP 200)');

  // 2. Recruiter Authentication Flow
  console.log('\n\x1b[36m--- 2. Recruiter Authentication Flow ---\x1b[0m');
  
  // Bad login
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bad@example.com', password: 'WrongPassword!' })
  });
  assert(badLoginRes.status === 401, 'POST /api/auth/login rejects invalid credentials (HTTP 401)');

  // Valid login
  const recruiterEmail = process.env.TEST_RECRUITER_EMAIL || 'recruiter@techcorp.com';
  const recruiterPassword = process.env.TEST_RECRUITER_PASSWORD || process.env.RECRUITER_DEFAULT_PASSWORD || 'Password123!';
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recruiterEmail, password: recruiterPassword })
  });
  assert(loginRes.status === 200, 'POST /api/auth/login succeeds for recruiter (HTTP 200)');
  const loginJson = await loginRes.json();
  const token = loginJson.token;
  assert(typeof token === 'string' && token.length > 20, 'Login response includes Supabase JWT token');

  // Extract session cookie from login response
  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookieHeader.match(/sb-access-token=([^;]+)/);
  const cookieHeader = cookieMatch ? `sb-access-token=${cookieMatch[1]}` : `sb-access-token=${token}`;

  // Session verification via GET /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookieHeader }
  });
  assert(meRes.status === 200, 'GET /api/auth/me verifies session with auth cookie (HTTP 200)');
  const meJson = await meRes.json();
  assert(meJson.authenticated === true, 'GET /api/auth/me confirms authenticated status');
  assert(meJson.user?.email === recruiterEmail, 'Session matches recruiter email');

  // Unauthenticated check
  const unauthMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'x-mock-auth': 'unauthorized' }
  });
  assert(unauthMeRes.status === 401, 'GET /api/auth/me rejects unauthorized request (HTTP 401)');

  // 3. Interview Creation Flow
  console.log('\n\x1b[36m--- 3. Interview Creation & Database Persistence ---\x1b[0m');
  const testToken = `inv-smoke-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  const interviewPayload = {
    token: testToken,
    jobConfig: {
      companyName: 'TechCorp Cloud',
      jobTitle: 'Senior Infrastructure Engineer',
      jobDescription: 'Architect resilient multi-cloud Kubernetes clusters with Terraform and PostgreSQL.',
      requiredSkills: ['Kubernetes', 'Terraform', 'PostgreSQL', 'Go', 'Docker'],
      requiredExperience: '5+ years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Advanced',
      questionCount: 2,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    linkConfig: { expiration: '48 hours' },
    candidate: { fullName: 'Jordan Vance', email: 'jordan.vance@example.com' },
    questions: [
      { id: 'q-smk-1', questionNumber: 1, text: 'Explain zero-downtime database migration strategies in Kubernetes.', category: 'Database & K8s' },
      { id: 'q-smk-2', questionNumber: 2, text: 'How do you structure declarative Terraform modules for multi-environment deployments?', category: 'Infrastructure as Code' }
    ]
  };

  const createRes = await fetch(`${BASE_URL}/api/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(interviewPayload)
  });
  assert(createRes.status === 201, 'POST /api/interviews creates interview in Supabase (HTTP 201)');
  const createdJson = await createRes.json();
  assert(createdJson.token === testToken, 'Created interview returns raw token for link distribution');
  assert(createdJson.status === 'active', 'Created interview status is "active"');

  // Verify interview appears in recruiter list
  const listRes = await fetch(`${BASE_URL}/api/interviews`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert(listRes.status === 200, 'GET /api/interviews returns recruiter interviews (HTTP 200)');
  const listJson = await listRes.json();
  const matchedInterview = listJson.find((i: { id?: string; token?: string }) => i.id === createdJson.id || i.token === testToken);
  assert(matchedInterview !== undefined, 'Created interview is listed in recruiter dashboard list');

  // 4. Candidate Invitation Access & Privacy
  console.log('\n\x1b[36m--- 4. Candidate Invitation Access & Confidentiality ---\x1b[0m');
  
  // Candidate loads web page
  const candidatePageRes = await fetch(`${BASE_URL}/interview/${testToken}`);
  assert(candidatePageRes.status === 200, 'GET /interview/[token] serves candidate onboarding UI (HTTP 200)');

  // Candidate fetches interview data via API
  const candidateApiRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`);
  assert(candidateApiRes.status === 200, 'Candidate API resolves interview via hashed token (HTTP 200)');
  const candidateData = await candidateApiRes.json();
  assert(candidateData.jobConfig.jobTitle === 'Senior Infrastructure Engineer', 'Candidate receives correct role context');
  assert(candidateData.questions.length === 2, 'Candidate receives configured question set');
  assert(candidateData.candidate.fullName === 'Jordan Vance', 'Candidate name is correctly pre-filled');
  assert(typeof candidateData.recruiterReport === 'undefined', 'SECURITY: recruiterReport is completely stripped from candidate payload');

  // 5. Candidate Interview Progression & Recovery
  console.log('\n\x1b[36m--- 5. Candidate Interview Progression & Recovery ---\x1b[0m');

  // Start interview
  const startRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' })
  });
  assert(startRes.status === 200, 'PATCH /api/interviews/[token] transitions status to "in_progress" (HTTP 200)');

  // Submit Answer 1
  const answer1 = {
    questionId: 'q-smk-1',
    questionText: 'Explain zero-downtime database migration strategies',
    answerText: 'I utilize expand/contract schema design pattern: first add nullable columns or dual-write, migrate data incrementally with backfill scripts, then cut over application reads, and finally remove legacy columns.',
    timeSpentSeconds: 240,
    submittedAt: new Date().toISOString()
  };

  const patchAnswerRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: [answer1],
      totalDurationSeconds: 240
    })
  });
  assert(patchAnswerRes.status === 200, 'PATCH /api/interviews/[token] saves question 1 answer (HTTP 200)');

  // Refresh & Recovery check: Candidate reloads the page
  const recoveryRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`);
  assert(recoveryRes.status === 200, 'Candidate recovers session state upon page reload (HTTP 200)');
  const recoveredData = await recoveryRes.json();
  assert(recoveredData.status === 'in_progress', 'Recovered session maintains "in_progress" status');
  assert(recoveredData.answers.length === 1, 'Recovered session preserves submitted answer');
  assert(recoveredData.answers[0].questionId === 'q-smk-1', 'Recovered answer matches submitted question');

  // 6. Interview Completion & Recruiter Evaluation
  console.log('\n\x1b[36m--- 6. Interview Completion & Confidential Evaluation ---\x1b[0m');

  const answer2 = {
    questionId: 'q-smk-2',
    questionText: 'Structure declarative Terraform modules',
    answerText: 'Modules are decoupled into root composition layer and reusable component modules with strict input validation, remote state locking in S3/DynamoDB, and tfvars separated by environment.',
    timeSpentSeconds: 210,
    submittedAt: new Date().toISOString()
  };

  const completeRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      totalDurationSeconds: 450,
      completedAt: new Date().toISOString(),
      answers: [answer1, answer2],
      recruiterReport: {
        overallAssessment: 'Exceptional infrastructure depth; strong production experience with zero-downtime patterns.',
        technicalCompetency: 'Exceptional',
        communicationClarity: 'Clear & Structured',
        recommendation: 'Advance to Technical Final',
        notableStrengths: ['Expand/contract migration mastery', 'Terraform modularization'],
        areasToProbeInLiveRound: ['Live Kubernetes networking failure triage'],
        evaluationGeneratedAt: new Date().toISOString()
      }
    })
  });
  assert(completeRes.status === 200, 'PATCH /api/interviews/[token] completes interview (HTTP 200)');

  // Candidate checks completed status
  const postCompleteCandidateRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`);
  const postCompleteCandidateData = await postCompleteCandidateRes.json();
  assert(postCompleteCandidateData.status === 'completed', 'Candidate view reflects "completed" status');
  assert(typeof postCompleteCandidateData.recruiterReport === 'undefined', 'Candidate CANNOT view recruiterReport even after completion');

  // Candidate anti-tampering: Attempt to restart or alter completed interview
  const tamperRes = await fetch(`${BASE_URL}/api/interviews/${testToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' })
  });
  assert(tamperRes.status === 403, 'Candidate cannot restart or alter completed interview (HTTP 403 Forbidden)');

  // Recruiter checks completed interview report
  const recruiterCheckRes = await fetch(`${BASE_URL}/api/interviews`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const recruiterInterviews = await recruiterCheckRes.json();
  const completedItem = recruiterInterviews.find((i: { id?: string; status?: string; recruiterReport?: { recommendation?: string } }) => i.id === createdJson.id);
  assert(completedItem?.status === 'completed', 'Recruiter dashboard shows status "completed"');
  assert(completedItem?.recruiterReport?.recommendation === 'Advance to Technical Final', 'Recruiter can access confidential evaluation report');

  // 7. Password Reset & Security Endpoints
  console.log('\n\x1b[36m--- 7. Password Reset & Update Endpoints ---\x1b[0m');
  
  const resetReqRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recruiterEmail })
  });
  assert(resetReqRes.status === 200, 'POST /api/auth/reset-password accepts reset request (HTTP 200)');

  const unauthUpdateRes = await fetch(`${BASE_URL}/api/auth/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword: 'NewSecurePassword123!' })
  });
  assert(unauthUpdateRes.status === 401, 'POST /api/auth/update-password rejects unauthenticated request (HTTP 401)');

  // 8. Recruiter Logout
  console.log('\n\x1b[36m--- 8. Recruiter Logout Flow ---\x1b[0m');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert(logoutRes.status === 200, 'POST /api/auth/logout succeeds (HTTP 200)');

  // Clean up the smoke test interview from database
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!
    );
    await admin.from('interview_invitations').delete().eq('id', createdJson.id);
    console.log('  ✔ Cleaned up smoke test interview from Supabase');
  } catch (cleanErr) {
    console.warn('Note: cleanup warning:', cleanErr);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`📊 SMOKE TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch(err => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});
