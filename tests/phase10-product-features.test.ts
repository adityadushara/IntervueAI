import * as fs from 'fs';
import * as path from 'path';

// Automatically load .env.local into process.env if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const nodeProcess = process as unknown as { loadEnvFile?: (path: string) => void };
if (fs.existsSync(envLocalPath) && typeof nodeProcess.loadEnvFile === 'function') {
  nodeProcess.loadEnvFile(envLocalPath);
}

import { 
  DELETE as recruiterDeleteApi, 
  PATCH as recruiterPatchApi 
} from '../src/app/api/interviews/route';
import { GET as candidateGetApi } from '../src/app/api/interviews/[token]/route';
import { 
  getRecruiterMetrics, 
  generateSecureToken 
} from '../src/lib/storage';
import { 
  deleteInterviewFromDb, 
  createInterviewInDb,
  getInterviewByRawTokenFromDb
} from '../src/lib/supabase/service';
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

async function runPhase10TestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 10 PRODUCT INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  const testRecruiterId = '26ca1592-5ffa-4b1b-8922-6ce6ba1eb2b1';
  const otherRecruiterId = '7e608b11-53f7-4345-8fe4-f2d820f7edd5';

  const sampleJobConfig: JobConfiguration = {
    companyName: 'Acme Cloud Platform',
    jobTitle: 'Senior Infrastructure Engineer',
    jobDescription: 'Build scalable cloud infrastructure and Kubernetes automation.',
    requiredSkills: ['Kubernetes', 'Go', 'Terraform', 'Prometheus'],
    requiredExperience: '5+ years',
    seniorityLevel: 'Senior',
    interviewType: 'Technical',
    difficulty: 'Advanced',
    questionCount: 3,
    expectedDurationMinutes: 30,
    language: 'English',
  };

  // =========================================================================
  // GROUP 1: Recruiter Token Regeneration & Invalidation
  // =========================================================================
  console.log('--- Group 1: Recruiter Token Regeneration & Invalidation ---');

  const initialToken = generateSecureToken();
  const createdInterview = await createInterviewInDb(
    sampleJobConfig,
    { expiration: '24 hours' },
    { fullName: 'Jordan Miles', email: 'jordan@cloudplatform.io' },
    initialToken,
    [
      { id: 'q1', questionNumber: 1, text: 'How do you structure Kubernetes ingress controllers?', category: 'Infrastructure' },
      { id: 'q2', questionNumber: 2, text: 'Explain Go channel deadlock conditions.', category: 'Concurrency' },
      { id: 'q3', questionNumber: 3, text: 'Describe a zero-downtime database migration pattern.', category: 'Reliability' },
    ],
    testRecruiterId
  );

  assert(Boolean(createdInterview && createdInterview.id), 'Interview created in database successfully');

  // Verify candidate can read using initialToken
  const candReq1 = new Request(`http://localhost:3000/api/interviews/${initialToken}`);
  const candRes1 = await candidateGetApi(candReq1, { params: Promise.resolve({ token: initialToken }) });
  assert(candRes1.status === 200, 'Candidate can access interview using initial token');

  // Recruiter regenerates token via PATCH /api/interviews
  const regenReq = new Request('http://localhost:3000/api/interviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: createdInterview.id, action: 'regenerate-token' }),
  });
  const regenRes = await recruiterPatchApi(regenReq);
  assert(regenRes.status === 200, 'Recruiter PATCH /api/interviews action:regenerate-token returns HTTP 200');

  const regenData = await regenRes.json();
  assert(Boolean(regenData.success && regenData.token), 'Token regeneration returns new raw token');
  assert(regenData.token !== initialToken, 'New token is distinct from initial token');

  // Old initial token must now return 404 (invalidated in DB)
  const candReqOld = new Request(`http://localhost:3000/api/interviews/${initialToken}`);
  const candResOld = await candidateGetApi(candReqOld, { params: Promise.resolve({ token: initialToken }) });
  assert(candResOld.status === 404, 'Candidate accessing invalidated old token receives HTTP 404');

  // New regenerated token must return 200
  const candReqNew = new Request(`http://localhost:3000/api/interviews/${regenData.token}`);
  const candResNew = await candidateGetApi(candReqNew, { params: Promise.resolve({ token: regenData.token }) });
  assert(candResNew.status === 200, 'Candidate accessing new regenerated token receives HTTP 200');

  // =========================================================================
  // GROUP 2: Recruiter Revoke Invitation in Database
  // =========================================================================
  console.log('\n--- Group 2: Recruiter Revoke Invitation in Database ---');

  const revokeReq = new Request('http://localhost:3000/api/interviews', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: createdInterview.id, action: 'revoke' }),
  });
  const revokeRes = await recruiterPatchApi(revokeReq);
  assert(revokeRes.status === 200, 'Recruiter PATCH /api/interviews action:revoke returns HTTP 200');

  const revokeData = await revokeRes.json();
  assert(revokeData.status === 'revoked', 'Response confirms status = revoked');

  // Candidate accessing revoked interview gets status = revoked
  const candReqRevoked = new Request(`http://localhost:3000/api/interviews/${regenData.token}`);
  const candResRevoked = await candidateGetApi(candReqRevoked, { params: Promise.resolve({ token: regenData.token }) });
  assert(candResRevoked.status === 200, 'Candidate endpoint responds for revoked interview check');
  const candRevokedBody = await candResRevoked.json();
  assert(candRevokedBody.status === 'revoked', 'Candidate receives status: revoked');

  // =========================================================================
  // GROUP 3: Recruiter Delete Interview in Database
  // =========================================================================
  console.log('\n--- Group 3: Recruiter Delete Interview in Database ---');

  const deleteReq = new Request(`http://localhost:3000/api/interviews?id=${createdInterview.id}`, {
    method: 'DELETE',
  });
  const deleteRes = await recruiterDeleteApi(deleteReq);
  assert(deleteRes.status === 200, 'Recruiter DELETE /api/interviews returns HTTP 200');

  const deleteData = await deleteRes.json();
  assert(deleteData.success === true, 'Response confirms deletion success');

  // Candidate accessing deleted interview gets 404
  const candReqDeleted = new Request(`http://localhost:3000/api/interviews/${regenData.token}`);
  const candResDeleted = await candidateGetApi(candReqDeleted, { params: Promise.resolve({ token: regenData.token }) });
  assert(candResDeleted.status === 404, 'Candidate accessing deleted interview receives HTTP 404');

  // =========================================================================
  // GROUP 4: Multi-Tenant Authorization on Management Actions
  // =========================================================================
  console.log('\n--- Group 4: Multi-Tenant Authorization on Management Actions ---');

  // Create an interview belonging to Recruiter A
  const recAInterview = await createInterviewInDb(
    sampleJobConfig,
    { expiration: '24 hours' },
    { fullName: 'Alice RecruiterA', email: 'alice@tenant-a.com' },
    generateSecureToken(),
    [],
    testRecruiterId
  );

  // Recruiter B attempts to delete Recruiter A's interview directly
  const unauthorizedDeleteSuccess = await deleteInterviewFromDb(recAInterview.id, otherRecruiterId);
  assert(!unauthorizedDeleteSuccess, 'Recruiter B deletion attempt returns false');
  // Should fail to match recruiter_id condition
  const verifyStillExists = await getInterviewByRawTokenFromDb(recAInterview.token);
  assert(verifyStillExists !== null, 'Recruiter B cannot delete Recruiter A interview (record persists)');

  // Clean up Recruiter A interview
  await deleteInterviewFromDb(recAInterview.id, testRecruiterId);

  // =========================================================================
  // GROUP 5: Recruiter Metrics with Failed Evaluations
  // =========================================================================
  console.log('\n--- Group 5: Recruiter Metrics with Failed Evaluations ---');

  const testList: InterviewInvitation[] = [
    {
      id: 'inv-1',
      token: 'tok-1',
      jobConfig: sampleJobConfig,
      linkConfig: { expiration: '24 hours' },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'active',
      questions: [],
      answers: [],
    },
    {
      id: 'inv-2',
      token: 'tok-2',
      jobConfig: sampleJobConfig,
      linkConfig: { expiration: '24 hours' },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'completed',
      evaluationStatus: 'completed',
      questions: [],
      answers: [],
    },
    {
      id: 'inv-3',
      token: 'tok-3',
      jobConfig: sampleJobConfig,
      linkConfig: { expiration: '24 hours' },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'completed',
      evaluationStatus: 'failed', // Failed AI evaluation
      questions: [],
      answers: [],
    },
    {
      id: 'inv-4',
      token: 'tok-4',
      jobConfig: sampleJobConfig,
      linkConfig: { expiration: '24 hours' },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 86400000).toISOString(), // Expired
      status: 'expired',
      questions: [],
      answers: [],
    },
  ];

  const calculatedMetrics = getRecruiterMetrics(testList);
  assert(calculatedMetrics.totalCreated === 4, 'Metrics calculate totalCreated = 4');
  assert(calculatedMetrics.activeLinks === 1, 'Metrics calculate activeLinks = 1');
  assert(calculatedMetrics.completedInterviews === 2, 'Metrics calculate completedInterviews = 2');
  assert(calculatedMetrics.expiredInterviews === 1, 'Metrics calculate expiredInterviews = 1');
  assert(calculatedMetrics.failedEvaluations === 1, 'Metrics correctly identify failedEvaluations = 1');

  console.log('\n======================================================');
  console.log(`📊 PHASE 10 TEST SUITE SUMMARY: ${passedTests} PASSED, 0 FAILED`);
  console.log('======================================================\n');
}

runPhase10TestSuite().catch((err) => {
  console.error('\n❌ Unhandled exception in Phase 10 test suite:', err);
  process.exit(1);
});
