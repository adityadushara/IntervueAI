/**
 * End-to-End Automated Test Suite for IntervueAI
 * Phases Tested:
 * 1. Interview Creation & Expiry Calculation (24h/48h)
 * 2. Token Generation & Validation
 * 3. Candidate Invitation Isolation (No recruiter settings exposed)
 * 4. Token Security (Invalid, Expired, Revoked, Re-use prevention)
 * 5. Full Interview Execution (Start -> Answer Q1..Qn -> Complete)
 * 6. Recruiter Dashboard Metrics & Report Integrity
 * 7. Server Store & Cross-Session / Incognito Persistence
 * 8. API Route Handlers (GET / POST / PATCH)
 */

import fs from 'fs';
import path from 'path';

// 1. Setup in-memory localStorage for Node environment to test storage.ts
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).window = {
  localStorage: mockStorage,
  location: { origin: 'http://localhost:3000' }
};
(globalThis as any).localStorage = mockStorage;

// Import application modules under test
import { 
  createInterview, 
  getInterviewByToken, 
  getInterviews,
  startCandidateInterview, 
  submitCandidateAnswer, 
  completeCandidateInterview, 
  revokeInterview, 
  getRecruiterMetrics,
  SEEDED_RECRUITER_INTERVIEWS
} from '../src/lib/storage';

import {
  getServerInterviews,
  getServerInterviewByToken,
  upsertServerInterview
} from '../src/lib/serverStore';

import { GET as getInterviewsApi, POST as postInterviewApi } from '../src/app/api/interviews/route';
import { GET as getInterviewByTokenApi, PATCH as patchInterviewApi } from '../src/app/api/interviews/[token]/route';

// Test runner helpers
let passedCount = 0;
let failedCount = 0;
const testResults: { testName: string; passed: boolean; message?: string }[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    testResults.push({ testName, passed: true });
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName}`);
  } else {
    failedCount++;
    testResults.push({ testName, passed: false, message: detail });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName} - ${detail || 'Assertion failed'}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING INTERVUEAI END-TO-END QA AUTOMATION SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: INTERVIEW CREATION & EXPIRY CALCULATION
  // --------------------------------------------------------------------------
  console.log('\x1b[36m--- Group 1: Interview Creation & Expiry Calculation ---\x1b[0m');

  const creationTime = Date.now();
  const created24h = createInterview(
    {
      companyName: 'Apex Innovations',
      jobTitle: 'Senior Full Stack Engineer',
      jobDescription: 'Build enterprise Next.js applications and scalable APIs.',
      requiredSkills: ['Next.js', 'React', 'Node.js', 'TypeScript'],
      requiredExperience: '5+ years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Advanced',
      questionCount: 3,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    { expiration: '24 hours' },
    {
      fullName: 'Jordan Reed',
      email: 'jordan.reed@example.com'
    }
  );

  assert(Boolean(created24h.id && created24h.token), 'Interview is assigned unique ID and token');
  assert(created24h.token.length >= 10, 'Token length meets security entropy requirement (>= 10 chars)');
  assert(created24h.status === 'active', 'Initial status of newly generated interview is "active"');
  assert(created24h.candidate?.fullName === 'Jordan Reed', 'Candidate name correctly pre-filled');
  assert(created24h.candidate?.email === 'jordan.reed@example.com', 'Candidate email correctly pre-filled');
  assert(created24h.questions.length === 3, 'Configured question count (3) correctly generates 3 questions');

  // Verify 24h expiry calculation (+/- 5 seconds margin)
  const exp24h = new Date(created24h.expiresAt).getTime();
  const expectedExp24h = creationTime + 24 * 60 * 60 * 1000;
  assert(Math.abs(exp24h - expectedExp24h) < 5000, '24 hours expiration timestamp is calculated precisely');

  // Test 48h expiry option
  const created48h = createInterview(
    {
      companyName: 'Apex Innovations',
      jobTitle: 'Frontend Architect',
      jobDescription: 'Lead core frontend architecture and design systems.',
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
      requiredExperience: '7+ years',
      seniorityLevel: 'Lead / Staff',
      interviewType: 'Technical',
      difficulty: 'Advanced',
      questionCount: 4,
      expectedDurationMinutes: 45,
      language: 'English',
    },
    { expiration: '48 hours' },
    {
      fullName: 'Taylor Swift',
      email: 'taylor@example.com'
    }
  );

  const exp48h = new Date(created48h.expiresAt).getTime();
  const expectedExp48h = creationTime + 48 * 60 * 60 * 1000;
  assert(Math.abs(exp48h - expectedExp48h) < 5000, '48 hours expiration timestamp is calculated precisely');
  assert(created24h.token !== created48h.token, 'Distinct invitations receive unique random tokens');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: CANDIDATE INVITATION ACCESS & ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 2: Candidate Invitation Access & Isolation ---\x1b[0m');

  const retrieved = getInterviewByToken(created24h.token);
  assert(retrieved !== null, 'Candidate invitation can be retrieved by valid token');
  assert(retrieved?.token === created24h.token, 'Retrieved invitation matches requested token');
  assert(retrieved?.jobConfig.companyName === 'Apex Innovations', 'Company name is visible to candidate');
  assert(retrieved?.jobConfig.jobTitle === 'Senior Full Stack Engineer', 'Job title is visible to candidate');
  assert((retrieved?.jobConfig.jobDescription?.length ?? 0) > 0, 'Job description is visible to candidate');
  assert(retrieved?.candidate?.fullName === 'Jordan Reed', 'Pre-filled candidate name is presented to candidate');
  assert(retrieved?.candidate?.email === 'jordan.reed@example.com', 'Pre-filled candidate email is presented to candidate');

  // Candidate interface restriction check
  // Candidates must only receive pre-filled info and Start button; cannot modify config
  assert(typeof (retrieved as any).recruiterNotes === 'undefined', 'Candidate has no access to internal recruiter notes');
  assert(retrieved?.status === 'active', 'Invitation status allows candidate to begin interview');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: SECURITY, INVALID TOKENS & LIFECYCLE GUARDS
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 3: Security, Invalid Tokens & Lifecycle Guards ---\x1b[0m');

  // Scenario 3.1: Invalid token
  const invalidResult = getInterviewByToken('non-existent-fake-token-999');
  assert(invalidResult === null, 'Unknown or invalid token returns null (blocks entry)');

  // Scenario 3.2: Expired invitation link
  const expiredInv = createInterview(
    {
      companyName: 'RetroCorp',
      jobTitle: 'Legacy Analyst',
      jobDescription: 'Legacy analysis.',
      requiredSkills: ['COBOL'],
      requiredExperience: '10 years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Intermediate',
      questionCount: 3,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    { expiration: '24 hours' },
    { fullName: 'Rip Van Winkle', email: 'rip@example.com' }
  );

  // Artificially age the invitation past expiration
  expiredInv.expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();
  expiredInv.status = 'active'; // initially marked active
  const allCurrent = getInterviews();
  const idx = allCurrent.findIndex(i => i.id === expiredInv.id);
  allCurrent[idx] = expiredInv;
  mockStorage.setItem('intervue_recruiter_interviews', JSON.stringify(allCurrent));

  const checkedExpired = getInterviewByToken(expiredInv.token);
  assert(checkedExpired?.status === 'expired', 'Expired invitation is automatically flagged as "expired"');

  // Scenario 3.3: Revoked invitation link
  const toRevoke = createInterview(
    {
      companyName: 'RevokeCorp',
      jobTitle: 'QA Lead',
      jobDescription: 'QA lead role.',
      requiredSkills: ['Jest', 'Playwright'],
      requiredExperience: '5 years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Intermediate',
      questionCount: 3,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    { expiration: '24 hours' },
    { fullName: 'Sam Jones', email: 'sam@example.com' }
  );
  revokeInterview(toRevoke.id);
  const checkedRevoked = getInterviewByToken(toRevoke.token);
  assert(checkedRevoked?.status === 'revoked', 'Revoked invitation is immediately flagged as "revoked"');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: INTERVIEW EXECUTION & PROGRESSION
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 4: Interview Execution & Progression ---\x1b[0m');

  // Candidate begins interview
  const started = startCandidateInterview(created24h.token, {
    fullName: 'Jordan Reed',
    email: 'jordan.reed@example.com'
  });
  assert(started !== null && started.status === 'in_progress', 'Interview status transitions to "in_progress" upon start');
  assert(Boolean(started?.candidate?.startedAt), 'Candidate start timestamp is accurately stamped');

  // Candidate submits Question 1
  const q1 = started!.questions[0];
  const answeredQ1 = submitCandidateAnswer(
    created24h.token,
    q1.id,
    q1.text,
    'I architect Next.js applications using App Router server components for initial payloads and client components for interactive islands, ensuring low bundle size and zero hydration jank.',
    45,
    45
  );
  assert(answeredQ1 !== null && answeredQ1.answers.length === 1, 'Question 1 answer successfully recorded');
  assert(answeredQ1?.answers[0]?.questionId === q1.id, 'Answer maps to question ID');
  assert(answeredQ1?.totalDurationSeconds === 45, 'Cumulative elapsed seconds updated');

  // Candidate submits Question 2
  const q2 = started!.questions[1];
  const answeredQ2 = submitCandidateAnswer(
    created24h.token,
    q2.id,
    q2.text,
    'For state management and caching, I utilize React cache and optimistic UI mutations to guarantee deterministic state transitions across concurrent tabs.',
    55,
    100
  );
  assert(answeredQ2 !== null && answeredQ2.answers.length === 2, 'Question 2 answer successfully recorded');
  assert(answeredQ2?.totalDurationSeconds === 100, 'Cumulative elapsed seconds accumulated (100s)');

  // Candidate submits Question 3 (Final Question)
  const q3 = started!.questions[2];
  const answeredQ3 = submitCandidateAnswer(
    created24h.token,
    q3.id,
    q3.text,
    'I enforce strict error boundaries, telemetry spans, and structured error logs to monitor operational health in production clusters.',
    60,
    160
  );
  assert(answeredQ3 !== null && answeredQ3.answers.length === 3, 'Final Question answer successfully recorded');

  // Candidate completes interview
  const completed = completeCandidateInterview(created24h.token, 160);
  assert(completed !== null && completed.status === 'completed', 'Interview status transitions to "completed"');
  assert(Boolean(completed?.completedAt), 'Completion timestamp is accurately stamped');
  assert(completed?.answers.length === 3, 'All candidate answers are preserved upon completion');
  assert(Boolean(completed?.recruiterReport), 'Recruiter evaluation report is generated upon completion');
  assert(Boolean(completed?.recruiterReport?.overallAssessment), 'Recruiter evaluation includes qualitative assessment');
  assert(Boolean(completed?.recruiterReport?.recommendation), 'Recruiter evaluation provides structured recommendation');
  assert(Boolean(completed?.recruiterReport?.notableStrengths && completed.recruiterReport.notableStrengths.length > 0), 'Recruiter evaluation outlines notable candidate strengths');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: POST-COMPLETION GUARDS & RE-USE PREVENTION
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 5: Post-Completion Guards & Re-Use Prevention ---\x1b[0m');

  // Attempt to re-revoke a completed interview
  revokeInterview(created24h.id);
  const afterRevokeAttempt = getInterviewByToken(created24h.token);
  assert(afterRevokeAttempt?.status === 'completed', 'Completed interview cannot be mutated to "revoked"');

  // Attempt to re-start a completed interview
  const reStartAttempt = startCandidateInterview(created24h.token, {
    fullName: 'Intruder',
    email: 'intruder@example.com'
  });
  // Storage layer ignores or returns completed
  assert(reStartAttempt?.status === 'completed', 'Completed interview cannot be restarted');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: RECRUITER DASHBOARD METRICS
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 6: Recruiter Dashboard Metrics ---\x1b[0m');

  const currentInterviews = getInterviews();
  const metrics = getRecruiterMetrics(currentInterviews);

  assert(metrics.totalCreated === currentInterviews.length, 'Total created metric matches stored invitations');
  assert(metrics.completedInterviews >= 1, 'Completed interviews metric counts completed records');
  assert(metrics.expiredInterviews >= 1, 'Expired interviews metric accurately tracks expired invitations');
  assert(typeof metrics.activeLinks === 'number', 'Active links metric calculated');
  assert(typeof metrics.pendingInterviews === 'number', 'Pending interviews metric calculated');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: SERVER STORE & CROSS-WINDOW / INCOGNITO PERSISTENCE
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 7: Server Store & Cross-Session Persistence ---\x1b[0m');

  const serverInterviews = getServerInterviews();
  assert(Array.isArray(serverInterviews), 'Server store reads persisted interviews from disk (.data/interviews.json)');

  // Upsert a new interview into server store
  const serverToken = `incognito-test-token-${Date.now()}`;
  const incognitoInterview = {
    ...created24h,
    id: `intv-incognito-${Date.now()}`,
    token: serverToken,
    status: 'active' as const,
    candidate: {
      fullName: 'Incognito Tester',
      email: 'incognito@example.com'
    }
  };

  upsertServerInterview(incognitoInterview);
  const fetchedFromServer = getServerInterviewByToken(serverToken);
  assert(fetchedFromServer !== null, 'Server store correctly retrieves interview created by another session');
  assert(fetchedFromServer?.candidate?.fullName === 'Incognito Tester', 'Candidate info persists in server store across sessions');

  // --------------------------------------------------------------------------
  // TEST GROUP 8: API ROUTE HANDLERS
  // --------------------------------------------------------------------------
  console.log('\n\x1b[36m--- Group 8: API Route Handlers ---\x1b[0m');

  // GET /api/interviews
  const getApiResponse = await getInterviewsApi();
  const getApiJson = await getApiResponse.json();
  assert(getApiResponse.status === 200, 'GET /api/interviews returns HTTP 200');
  assert(Array.isArray(getApiJson), 'GET /api/interviews returns array of interviews');

  // GET /api/interviews/[token] (valid)
  const getByTokenResponse = await getInterviewByTokenApi(
    new Request(`http://localhost:3000/api/interviews/${serverToken}`),
    { params: Promise.resolve({ token: serverToken }) }
  );
  assert(getByTokenResponse.status === 200, 'GET /api/interviews/[token] returns HTTP 200 for valid token');

  // GET /api/interviews/[token] (invalid)
  const getInvalidTokenResponse = await getInterviewByTokenApi(
    new Request('http://localhost:3000/api/interviews/fake-token-does-not-exist'),
    { params: Promise.resolve({ token: 'fake-token-does-not-exist' }) }
  );
  assert(getInvalidTokenResponse.status === 404, 'GET /api/interviews/[token] returns HTTP 404 for invalid token');

  // PATCH /api/interviews/[token] (incognito submitting answer / progress)
  const patchResponse = await patchInterviewApi(
    new Request(`http://localhost:3000/api/interviews/${serverToken}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', totalDurationSeconds: 120 })
    }),
    { params: Promise.resolve({ token: serverToken }) }
  );
  assert(patchResponse.status === 200, 'PATCH /api/interviews/[token] returns HTTP 200');
  const patchedJson = await patchResponse.json();
  assert(patchedJson.status === 'completed', 'PATCH /api/interviews/[token] successfully updates status to "completed"');

  // --------------------------------------------------------------------------
  // FINAL TEST SUITE SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
