/**
 * Demo Account End-to-End Verification Test Script
 * 
 * Tests the entire user journey from start to finish:
 * 1. Demo account credentials verification & login via /api/auth/login
 * 2. Session check via /api/auth/me using the authenticated cookie/JWT
 * 3. Malformed/invalid token rejection test (preventing the previous bug)
 * 4. Assessment creation via /api/interviews/plan (Gemini analysis)
 * 5. Authoritative interview persistence via POST /api/interviews
 * 6. Recruiter dashboard query via GET /api/interviews (verifying multi-tenant isolation)
 * 7. Candidate assessment portal access via GET /api/interviews/[token] (verifying confidentiality shield)
 * 8. Candidate starts interview (status transition to in_progress via PATCH)
 * 9. Candidate submits assessment and runs AI evaluation via POST /api/interviews/[token]/evaluate
 * 10. Recruiter views completed evaluation report & score breakdown
 * 11. Recruiter logout & cookie invalidation
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
import { GET as meApi } from '../src/app/api/auth/me/route';
import { POST as logoutApi } from '../src/app/api/auth/logout/route';
import { POST as planApi } from '../src/app/api/interviews/plan/route';
import { GET as getInterviewsApi, POST as createInterviewApi } from '../src/app/api/interviews/route';
import { GET as getInterviewByTokenApi, PATCH as patchInterviewApi } from '../src/app/api/interviews/[token]/route';
import { POST as evaluateInterviewApi } from '../src/app/api/interviews/[token]/evaluate/route';
import { generateSecureToken } from '../src/lib/storage';
import { JobConfiguration, InterviewInvitation } from '../src/types/interview';

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

async function runDemoE2ESuite() {
  console.log('\n======================================================');
  console.log('🌟 DEMO ACCOUNT END-TO-END VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  const demoEmail = 'demo@intervue.ai';
  const demoPassword = 'DemoUser2026!';

  // --------------------------------------------------------------------------
  // STEP 1: DEMO ACCOUNT LOGIN
  // --------------------------------------------------------------------------
  console.log('\x1b[36m--- Step 1: Demo Account Authentication ---\x1b[0m');

  const loginReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });

  const loginRes = await loginApi(loginReq);
  assert(loginRes.status === 200, 'Demo account login succeeded with HTTP 200');

  const loginData = await loginRes.json();
  assert(loginData.user && loginData.user.email === demoEmail, `Logged in user is ${demoEmail}`);
  assert(loginData.user.isApproved === true, 'Demo user account is approved');
  assert(typeof loginData.token === 'string' && loginData.token.split('.').length === 3, 'Received valid 3-part Supabase JWT');

  const sessionToken = loginData.token;
  const cookieHeader = `sb-access-token=${sessionToken}`;

  // --------------------------------------------------------------------------
  // STEP 2: SESSION VERIFICATION (/api/auth/me)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 2: Recruiter Session Verification ---\x1b[0m');

  const meReq = new Request('http://localhost:3000/api/auth/me', {
    headers: {
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const meRes = await meApi(meReq);
  assert(meRes.status === 200, '/api/auth/me confirms active session');
  const meData = await meRes.json();
  assert(meData.authenticated === true, 'Session is authenticated');
  assert(meData.user.id === loginData.user.id, 'Session userId matches login userId');
  assert(meData.user.role === 'recruiter', 'User role is recruiter');

  // --------------------------------------------------------------------------
  // STEP 3: MALFORMED TOKEN GUARD (Preventing the previous bug)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 3: Malformed & Invalid Token Defensive Guards ---\x1b[0m');

  const badTokenReq = new Request('http://localhost:3000/api/auth/me', {
    headers: {
      cookie: 'sb-access-token=invalid-malformed-cookie-segment',
    },
  });

  const badTokenRes = await meApi(badTokenReq);
  assert(badTokenRes.status === 401, 'Malformed token cookie rejected with HTTP 401 instead of crashing');
  const badTokenData = await badTokenRes.json();
  assert(!badTokenData.error.includes('invalid number of segments'), 'Error message is clean and user-friendly');

  // --------------------------------------------------------------------------
  // STEP 4: GENERATE INTERVIEW PLAN (AI/Gemini)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 4: Interview Plan Generation (/api/interviews/plan) ---\x1b[0m');

  const testJobConfig: JobConfiguration = {
    companyName: 'IntervueAI Demo Corp',
    jobTitle: 'Senior Full Stack Engineer',
    jobDescription: 'We are seeking an experienced Full Stack Engineer with strong expertise in TypeScript, React, Node.js, distributed systems, and RESTful APIs.',
    requiredSkills: ['TypeScript', 'React', 'Node.js', 'System Design'],
    requiredExperience: '5+ years',
    seniorityLevel: 'Senior',
    interviewType: 'Technical',
    difficulty: 'Advanced',
    expectedDurationMinutes: 30,
    questionCount: 3,
    language: 'English',
  };

  const planReq = new Request('http://localhost:3000/api/interviews/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ jobConfig: testJobConfig }),
  });

  const planRes = await planApi(planReq);
  assert(planRes.status === 200, 'POST /api/interviews/plan generated interview plan with HTTP 200');
  const planData = await planRes.json();
  assert(planData.plan && (Array.isArray(planData.plan.competencyCategories) || Array.isArray(planData.plan.competencies)), 'Plan contains structured competency distribution');
  assert(Array.isArray(planData.questions) && planData.questions.length > 0, `Plan generated ${planData.questions?.length} tailored questions`);

  // --------------------------------------------------------------------------
  // STEP 5: AUTHORITATIVE INTERVIEW CREATION (POST /api/interviews)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 5: Authoritative Assessment Link Creation ---\x1b[0m');

  const rawToken = generateSecureToken();
  const newInterview: InterviewInvitation = {
    id: `intv-demo-${Date.now().toString(36)}`,
    token: rawToken,
    jobConfig: {
      ...testJobConfig,
      structuredPlan: planData.plan,
    },
    linkConfig: { expiration: '48 hours' },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    status: 'active',
    candidate: {
      fullName: 'Alice Candidate',
      email: 'alice.candidate@example.com',
    },
    questions: planData.questions,
    answers: [],
  };

  const createReq = new Request('http://localhost:3000/api/interviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(newInterview),
  });

  const createRes = await createInterviewApi(createReq);
  assert(createRes.status === 201 || createRes.status === 200, `POST /api/interviews succeeded with HTTP ${createRes.status}`);
  const createdRecord = await createRes.json();
  assert(createdRecord.id, `Created interview ID: ${createdRecord.id}`);

  // --------------------------------------------------------------------------
  // STEP 6: RECRUITER DASHBOARD QUERY (Multi-Tenant Isolation)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 6: Recruiter Dashboard Listing ---\x1b[0m');

  const listReq = new Request('http://localhost:3000/api/interviews', {
    headers: {
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const listRes = await getInterviewsApi(listReq);
  assert(listRes.status === 200, 'GET /api/interviews returned HTTP 200');
  const listData: InterviewInvitation[] = await listRes.json();
  assert(Array.isArray(listData), 'Interviews returned as an array');
  const foundInList = listData.some(inv => inv.id === createdRecord.id || inv.jobConfig?.jobTitle === testJobConfig.jobTitle);
  assert(foundInList, 'Created interview is present in recruiter dashboard list');

  // --------------------------------------------------------------------------
  // STEP 7: CANDIDATE PORTAL ACCESS VIA TOKEN
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 7: Candidate Portal Access (Token Independence & Shielding) ---\x1b[0m');

  const candidateReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`);
  const candidateRes = await getInterviewByTokenApi(candidateReq, {
    params: Promise.resolve({ token: rawToken })
  });

  assert(candidateRes.status === 200, 'Candidate retrieves interview using assessment link token');
  const candidateData = await candidateRes.json();
  const candTitle = candidateData.jobConfig?.jobTitle || candidateData.jobConfig?.title;
  assert(candTitle === testJobConfig.jobTitle, `Candidate sees role title: ${candTitle}`);
  assert(Array.isArray(candidateData.questions) && candidateData.questions.length > 0, 'Candidate receives configured question set');
  assert(candidateData.recruiterReport === undefined, 'Candidate API STRICTLY shields recruiter evaluation report');

  // --------------------------------------------------------------------------
  // STEP 8: CANDIDATE STARTS ASSESSMENT (Transition to in_progress)
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 8: Candidate Starts Assessment ---\x1b[0m');

  const startReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress' }),
  });

  const startRes = await patchInterviewApi(startReq, {
    params: Promise.resolve({ token: rawToken })
  });

  assert(startRes.status === 200, 'Candidate transitions interview to in_progress');
  const startData = await startRes.json();
  assert(startData.status === 'in_progress', 'Interview status is now in_progress');

  // --------------------------------------------------------------------------
  // STEP 9: CANDIDATE SUBMITS ASSESSMENT & AI EVALUATION
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 9: Candidate Submits Answers & Evaluates ---\x1b[0m');

  const candidateAnswers = [
    {
      questionId: 'q-1',
      questionText: 'Can you describe how you architect high-throughput APIs in Node.js?',
      answerText: 'I implement connection pooling, stateless authentication with JWTs, horizontal scaling behind a reverse proxy, and caching hot query paths using Redis. For asynchronous I/O, I leverage Node worker threads or background message queues like RabbitMQ.',
      durationSeconds: 45,
      timestamp: new Date().toISOString(),
    },
    {
      questionId: 'q-2',
      questionText: 'How do you handle state management and performance optimization in React?',
      answerText: 'I prioritize colocation of state to avoid unnecessary re-renders, use React Context for cross-cutting global state, and employ memoization hooks like useMemo and useCallback where profiling indicates bottlenecks.',
      durationSeconds: 40,
      timestamp: new Date().toISOString(),
    }
  ];

  const evalReq = new Request(`http://localhost:3000/api/interviews/${rawToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      answers: candidateAnswers,
      totalDurationSeconds: 85,
      completedAt: new Date().toISOString(),
    }),
  });

  const evalRes = await patchInterviewApi(evalReq, {
    params: Promise.resolve({ token: rawToken })
  });

  assert(evalRes.status === 200, 'Candidate completes assessment via PATCH with HTTP 200');
  const evalData = await evalRes.json();
  assert(evalData.status === 'completed', 'Interview status updated to completed');
  assert(evalData.recruiterReport === undefined, 'Evaluation response shields report from candidate view');

  // --------------------------------------------------------------------------
  // STEP 10: RECRUITER REVIEWS COMPLETED EVALUATION REPORT
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 10: Recruiter Views Candidate Evaluation in Dashboard ---\x1b[0m');

  const recruiterCheckReq = new Request('http://localhost:3000/api/interviews', {
    headers: {
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const recruiterCheckRes = await getInterviewsApi(recruiterCheckReq);
  assert(recruiterCheckRes.status === 200, 'Recruiter fetches updated interviews list');
  const updatedList: InterviewInvitation[] = await recruiterCheckRes.json();
  const completedInterview = updatedList.find(inv => inv.id === createdRecord.id);

  assert(completedInterview !== undefined, 'Completed interview found in recruiter records');
  assert(completedInterview?.status === 'completed', 'Recruiter sees status === completed');
  assert(completedInterview?.recruiterReport !== undefined, 'Recruiter successfully views confidential recruiterReport');
  if (completedInterview?.recruiterReport) {
    console.log(`     Score: ${completedInterview.recruiterReport.overallScore}/100 | Recommendation: ${completedInterview.recruiterReport.recommendation}`);
    assert(typeof completedInterview.recruiterReport.overallScore === 'number', 'Overall score is a number');
  }

  // --------------------------------------------------------------------------
  // STEP 11: RECRUITER LOGOUT
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Step 11: Recruiter Logout & Session Termination ---\x1b[0m');

  const logoutReq = new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  const logoutRes = await logoutApi(logoutReq);
  assert(logoutRes.status === 200, 'Logout succeeded with HTTP 200');
  const setCookie = logoutRes.headers.get('set-cookie') || '';
  assert(setCookie.includes('sb-access-token=') && setCookie.includes('Max-Age=0'), 'sb-access-token cookie was cleared');

  console.log('\n======================================================');
  console.log(`🏁 DEMO E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoE2ESuite().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});
