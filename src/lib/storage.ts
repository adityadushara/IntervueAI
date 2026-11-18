import { 
  InterviewInvitation, 
  JobConfiguration, 
  LinkConfiguration, 
  ExpirationOption,
  CandidateInfo, 
  CandidateAnswer, 
  InterviewQuestion,
  RecruiterDashboardMetrics 
} from '@/types/interview';
import { generateQuestionsForJob, generateRecruiterEvaluation } from '@/lib/mockData';

const RECRUITER_INTERVIEWS_KEY = 'intervue_recruiter_interviews';

export const SEEDED_RECRUITER_INTERVIEWS: InterviewInvitation[] = [
  {
    id: 'intv-sample-completed-1',
    token: 'eval-demo-completed-88',
    jobConfig: {
      companyName: 'Acme Global Tech',
      jobTitle: 'Frontend Developer',
      jobDescription: 'Seeking an experienced Frontend Developer with deep React, Next.js, and TypeScript expertise to lead customer dashboard development.',
      requiredSkills: ['React', 'Next.js', 'TypeScript', 'Web Vitals', 'Tailwind CSS'],
      requiredExperience: '3-5 years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Intermediate',
      questionCount: 3,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    linkConfig: {
      expiration: '48 hours',
    },
    createdAt: '2026-11-03T09:00:00.000Z',
    expiresAt: '2026-11-05T09:00:00.000Z',
    status: 'completed',
    candidate: {
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.com',
      startedAt: '2026-11-03T11:00:00.000Z',
    },
    completedAt: '2026-11-03T11:24:00.000Z',
    totalDurationSeconds: 1440,
    questions: [
      {
        id: 'q-seed-1',
        questionNumber: 1,
        text: 'How do Next.js Server Components differ from Client Components, and what factors determine whether a component should be rendered on the server versus client?',
        category: 'Architecture & Hydration',
        context: 'Think about hydration cost, bundle size, and user interactivity.',
      },
      {
        id: 'q-seed-2',
        questionNumber: 2,
        text: 'A user reports that a critical page in your application feels sluggish and shifts during initial render. How do you diagnose and optimize Core Web Vitals (LCP, INP, CLS)?',
        category: 'Web Performance & Core Vitals',
        context: 'Focus on profiling tools, font/image loading optimizations, and render lifecycle.',
      },
      {
        id: 'q-seed-3',
        questionNumber: 3,
        text: 'Explain how React handles render tree updates. How do you prevent unnecessary re-computations when passing complex objects or callbacks down a component tree?',
        category: 'State Management & Re-renders',
        context: 'Discuss referential equality, useMemo, useCallback, and state colocation.',
      }
    ],
    answers: [
      {
        questionId: 'q-seed-1',
        questionText: 'Server Components vs Client Components',
        answerText: 'Server components execute only on the server, removing heavy dependencies from the client bundle and fetching data directly next to database layers without client waterfalls. Client components are reserved strictly for interactive state, effects, and DOM listeners.',
        timeSpentSeconds: 420,
        submittedAt: '2026-11-03T11:07:00.000Z'
      },
      {
        questionId: 'q-seed-2',
        questionText: 'Core Web Vitals Optimization',
        answerText: 'I diagnose using Chrome DevTools Performance panel and Lighthouse. For LCP, I ensure hero images use priority preloading and SSR. For CLS, I enforce explicit image dimensions and avoid inserting dynamic content above the fold.',
        timeSpentSeconds: 510,
        submittedAt: '2026-11-03T11:15:30.000Z'
      },
      {
        questionId: 'q-seed-3',
        questionText: 'State Management and Re-renders',
        answerText: 'I prioritize state colocation so updates only re-render the components that actually consume that state. When passing functions or complex derivations down to memoized children, I stabilize references using useCallback and useMemo.',
        timeSpentSeconds: 510,
        submittedAt: '2026-11-03T11:24:00.000Z'
      }
    ],
    recruiterReport: {
      overallAssessment: 'Candidate completed all 3 questions for the Senior Frontend Developer position with clear technical depth and strong architectural communication.',
      technicalCompetency: 'Strong',
      communicationClarity: 'Clear & Structured',
      notableStrengths: [
        'Nuanced understanding of React Server Components and hydration boundaries',
        'Demonstrated practical knowledge of Core Web Vitals (LCP & CLS)',
        'Clear focus on state colocation and referential stability'
      ],
      areasToProbeInLiveRound: [
        'Test live hands-on refactoring of an unoptimized component tree',
        'Explore experience with Next.js parallel and intercepting routes'
      ],
      recommendation: 'Advance to Technical Final',
      evaluationGeneratedAt: '2026-11-03T11:24:05.000Z'
    }
  },
  {
    id: 'intv-sample-active-2',
    token: 'active-react-link-77',
    jobConfig: {
      companyName: 'Vercel Partner Labs',
      jobTitle: 'Senior React Engineer',
      jobDescription: 'Lead our web platform architecture and design system implementation using modern React 19 and Next.js.',
      requiredSkills: ['React 19', 'Next.js App Router', 'Server Components', 'TypeScript', 'Design Systems'],
      requiredExperience: '5+ years',
      seniorityLevel: 'Senior',
      interviewType: 'Technical',
      difficulty: 'Advanced',
      questionCount: 5,
      expectedDurationMinutes: 45,
      language: 'English',
    },
    linkConfig: {
      expiration: '24 hours',
    },
    createdAt: '2026-11-05T08:00:00.000Z',
    expiresAt: '2026-11-06T08:00:00.000Z',
    status: 'active',
    candidate: {
      fullName: 'Taylor Swift',
      email: 'taylor.swift@example.com',
    },
    questions: [
      {
        id: 'q-act-1',
        questionNumber: 1,
        text: 'How do Next.js Server Components differ from Client Components, and what factors determine whether a component should be rendered on the server versus client?',
        category: 'Architecture & Hydration'
      },
      {
        id: 'q-act-2',
        questionNumber: 2,
        text: 'A user reports that a critical page in your application feels sluggish. How do you diagnose and optimize Core Web Vitals?',
        category: 'Web Performance'
      },
      {
        id: 'q-act-3',
        questionNumber: 3,
        text: 'Explain how React handles render tree updates and prevents unnecessary re-renders.',
        category: 'State Management'
      },
      {
        id: 'q-act-4',
        questionNumber: 4,
        text: 'How do you structure responsive CSS architectures in enterprise design systems to avoid layout thrashing?',
        category: 'Design Systems & CSS'
      },
      {
        id: 'q-act-5',
        questionNumber: 5,
        text: 'How do you implement client-side observability and error boundaries in enterprise applications?',
        category: 'Observability & Stability'
      }
    ],
    answers: []
  },
  {
    id: 'intv-sample-expired-3',
    token: 'expired-devops-link-12',
    jobConfig: {
      companyName: 'CloudScale Systems',
      jobTitle: 'DevOps & Cloud Engineer',
      jobDescription: 'Automate multi-cloud Kubernetes clusters and CI/CD deployment pipelines.',
      requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Prometheus'],
      requiredExperience: '3-5 years',
      seniorityLevel: 'Mid-level',
      interviewType: 'Technical',
      difficulty: 'Intermediate',
      questionCount: 3,
      expectedDurationMinutes: 30,
      language: 'English',
    },
    linkConfig: {
      expiration: '24 hours',
    },
    createdAt: '2026-11-01T10:00:00.000Z',
    expiresAt: '2026-11-02T10:00:00.000Z',
    status: 'expired',
    candidate: {
      fullName: 'Alex Mercer',
      email: 'alex.mercer@example.com',
    },
    questions: [],
    answers: []
  }
];

export function getInterviews(): InterviewInvitation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECRUITER_INTERVIEWS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: InterviewInvitation[] = JSON.parse(raw);
    
    // Automatically flag expired interviews based on current time
    const now = Date.now();
    let hasChanges = false;
    const checked = parsed.map(inv => {
      if (inv.status === 'active' && new Date(inv.expiresAt).getTime() < now) {
        hasChanges = true;
        return { ...inv, status: 'expired' as const };
      }
      return inv;
    });

    if (hasChanges) {
      localStorage.setItem(RECRUITER_INTERVIEWS_KEY, JSON.stringify(checked));
    }
    return checked;
  } catch (err) {
    console.error('Error loading recruiter interviews', err);
    return [];
  }
}

export function saveInterviews(interviews: InterviewInvitation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECRUITER_INTERVIEWS_KEY, JSON.stringify(interviews));
  } catch (err) {
    console.error('Error saving recruiter interviews', err);
  }
}

// Background sync to server API for cross-browser & incognito persistence
function getApiEndpoint(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null' && !path.startsWith('http')) {
    return `${window.location.origin}${path}`;
  }
  if (!path.startsWith('http')) {
    return `http://localhost:3000${path}`;
  }
  return path;
}

export async function syncToServer(interview: InterviewInvitation): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(getApiEndpoint('/api/interviews'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interview),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Sync interview to server failed [HTTP ${res.status}]:`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error syncing interview to server:', err);
    return false;
  }
}

export async function syncPatchToServer(token: string, updates: Partial<InterviewInvitation>): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(getApiEndpoint(`/api/interviews/${token}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Sync patch to server failed [HTTP ${res.status}]:`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error syncing patch to server:', err);
    return false;
  }
}

export async function fetchInterviewsFromServer(): Promise<InterviewInvitation[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(getApiEndpoint('/api/interviews'));
    if (res.ok) {
      const serverData: InterviewInvitation[] = await res.json();
      if (Array.isArray(serverData)) {
        // Build map of known raw tokens from local cache to preserve clickable links
        const local = getInterviews();
        const rawTokenMap = new Map<string, string>();
        local.forEach(inv => {
          if (inv.token && !inv.token.startsWith('inv-hash-')) {
            rawTokenMap.set(inv.id, inv.token);
          }
        });

        const merged = serverData.map(inv => {
          const knownRaw = rawTokenMap.get(inv.id);
          if (knownRaw) {
            return { ...inv, token: knownRaw };
          }
          return inv;
        });

        saveInterviews(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not reach /api/interviews, using local cache:', err);
  }
  return getInterviews();
}

export async function fetchInterviewByTokenFromServer(token: string): Promise<InterviewInvitation | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(getApiEndpoint(`/api/interviews/${encodeURIComponent(token)}`));
    if (res.ok) {
      const serverInv: InterviewInvitation = await res.json();
      if (serverInv && serverInv.token) {
        const interviews = getInterviews();
        const updated = [serverInv, ...interviews.filter(i => i.token !== serverInv.token && i.id !== serverInv.id)];
        saveInterviews(updated);
        return serverInv;
      }
    }
  } catch (err) {
    console.warn(`Could not reach /api/interviews/${token}:`, err);
  }
  return getInterviewByToken(token);
}

export async function deleteInterviewOnServer(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    const res = await fetch(getApiEndpoint(`/api/interviews?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to delete interview on server:', err);
    return false;
  }
}

export async function revokeInterviewOnServer(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    const res = await fetch(getApiEndpoint('/api/interviews'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'revoke' }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to revoke interview on server:', err);
    return false;
  }
}

export async function regenerateTokenOnServer(id: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window undefined' };
  try {
    const res = await fetch(getApiEndpoint('/api/interviews'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'regenerate-token' }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      return { success: true, token: data.token };
    }
    return { success: false, error: data.error || 'Failed to regenerate token' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function getInterviewByToken(token: string): InterviewInvitation | null {
  const interviews = getInterviews();
  const found = interviews.find(i => i.token.trim().toLowerCase() === token.trim().toLowerCase());
  if (!found) return null;

  // Check if active but expired
  if (found.status === 'active' && new Date(found.expiresAt).getTime() < Date.now()) {
    found.status = 'expired';
    saveInterviews(interviews);
    syncPatchToServer(found.token, { status: 'expired' });
  }

  return found;
}

export function getInterviewById(id: string): InterviewInvitation | null {
  const interviews = getInterviews();
  return interviews.find(i => i.id === id) || null;
}

/**
 * Generates a cryptographically secure, unpredictable invitation token.
 * Uses Web Crypto / Node crypto.randomUUID() (128 bits of entropy).
 */
export function generateSecureToken(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return `inv-${crypto.randomUUID().replace(/-/g, '')}`;
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return `inv-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  // Fallback for environments lacking crypto API
  return `inv-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 12)}`;
}

export function createInterview(
  jobConfig: JobConfiguration,
  linkConfig: LinkConfiguration,
  candidateInfo?: CandidateInfo,
  customQuestions?: InterviewQuestion[],
  options?: { skipSync?: boolean }
): InterviewInvitation {
  const interviews = getInterviews();
  
  // Generate cryptographically secure token
  const token = generateSecureToken();

  // Calculate expiration
  const now = Date.now();
  let durationMs = 24 * 60 * 60 * 1000; // 24 hours default
  const expirationSetting = typeof linkConfig === 'string' ? linkConfig : linkConfig?.expiration;
  if (expirationSetting === '48 hours') {
    durationMs = 48 * 60 * 60 * 1000;
  } else if (expirationSetting === '7 days') {
    durationMs = 7 * 24 * 60 * 60 * 1000;
  }

  const normalizedLinkConfig: LinkConfiguration = typeof linkConfig === 'string' 
    ? { expiration: linkConfig as ExpirationOption }
    : linkConfig;

  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(now + durationMs).toISOString();

  // Generate tailored questions or use AI-generated questions
  const questions = (customQuestions && customQuestions.length > 0) 
    ? customQuestions 
    : (jobConfig.structuredPlan?.generatedQuestions || generateQuestionsForJob(jobConfig));

  const uniqueSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().substring(0, 8)
    : Math.random().toString(36).substring(2, 8);

  const newInvitation: InterviewInvitation = {
    id: `intv-${now.toString(36)}-${uniqueSuffix}`,
    token,
    jobConfig,
    linkConfig: normalizedLinkConfig,
    createdAt,
    expiresAt,
    status: 'active',
    candidate: candidateInfo ? {
      fullName: candidateInfo.fullName,
      email: candidateInfo.email,
    } : undefined,
    questions,
    answers: [],
  };

  const updated = [newInvitation, ...interviews];
  saveInterviews(updated);
  if (!options?.skipSync) {
    syncToServer(newInvitation);
  }
  return newInvitation;
}

export function revokeInterview(id: string): void {
  const interviews = getInterviews();
  let revokedToken: string | null = null;
  const updated = interviews.map(i => {
    if (i.id === id && i.status !== 'completed') {
      revokedToken = i.token;
      return { ...i, status: 'revoked' as const };
    }
    return i;
  });
  saveInterviews(updated);
  if (revokedToken) {
    syncPatchToServer(revokedToken, { status: 'revoked' });
  }
  revokeInterviewOnServer(id);
}

export function deleteInterview(id: string): void {
  const interviews = getInterviews();
  const updated = interviews.filter(i => i.id !== id);
  saveInterviews(updated);
  deleteInterviewOnServer(id);
}

export function startCandidateInterview(token: string, candidate: CandidateInfo): InterviewInvitation | null {
  const interviews = getInterviews();
  const index = interviews.findIndex(i => i.token.trim().toLowerCase() === token.trim().toLowerCase());
  if (index === -1) return null;

  const target = interviews[index];
  if (target.status !== 'active') return target;

  target.status = 'in_progress';
  target.candidate = {
    ...target.candidate,
    ...candidate,
    startedAt: new Date().toISOString(),
  };

  interviews[index] = target;
  saveInterviews(interviews);
  syncPatchToServer(target.token, {
    status: 'in_progress',
    candidate: target.candidate,
  });
  return target;
}

export function submitCandidateAnswer(
  token: string,
  questionId: string,
  questionText: string,
  answerText: string,
  timeSpentSeconds: number,
  totalElapsedSeconds?: number
): InterviewInvitation | null {
  const interviews = getInterviews();
  const index = interviews.findIndex(i => i.token.trim().toLowerCase() === token.trim().toLowerCase());
  if (index === -1) return null;

  const target = interviews[index];
  const newAnswer: CandidateAnswer = {
    questionId,
    questionText,
    answerText,
    timeSpentSeconds,
    submittedAt: new Date().toISOString(),
  };

  // Replace if existing or append
  const existingIdx = target.answers.findIndex(a => a.questionId === questionId);
  if (existingIdx >= 0) {
    target.answers[existingIdx] = newAnswer;
  } else {
    target.answers.push(newAnswer);
  }

  if (totalElapsedSeconds !== undefined) {
    target.totalDurationSeconds = totalElapsedSeconds;
  }

  interviews[index] = target;
  saveInterviews(interviews);
  syncPatchToServer(target.token, {
    answers: target.answers,
    totalDurationSeconds: target.totalDurationSeconds,
  });
  return target;
}

export function completeCandidateInterview(token: string, totalSeconds: number): InterviewInvitation | null {
  const interviews = getInterviews();
  const index = interviews.findIndex(i => i.token.trim().toLowerCase() === token.trim().toLowerCase());
  if (index === -1) return null;

  const target = interviews[index];
  target.status = 'completed';
  target.completedAt = new Date().toISOString();
  target.totalDurationSeconds = totalSeconds;

  // Generate recruiter report
  const candidateName = target.candidate?.fullName || 'Candidate';
  target.recruiterReport = generateRecruiterEvaluation(target.jobConfig, candidateName, target.answers);

  interviews[index] = target;
  saveInterviews(interviews);
  syncPatchToServer(target.token, {
    status: 'completed',
    completedAt: target.completedAt,
    totalDurationSeconds: target.totalDurationSeconds,
    recruiterReport: target.recruiterReport,
  });
  return target;
}

export function getRecruiterMetrics(interviews: InterviewInvitation[]): RecruiterDashboardMetrics {
  const now = Date.now();
  const totalCreated = interviews.length;
  let activeLinks = 0;
  let pendingInterviews = 0;
  let completedInterviews = 0;
  let expiredInterviews = 0;
  let failedEvaluations = 0;

  interviews.forEach(inv => {
    const isExpiredByTime = new Date(inv.expiresAt).getTime() < now;
    if (inv.evaluationStatus === 'failed' || inv.recruiterReport?.evaluationStatus === 'failed') {
      failedEvaluations++;
    }
    if (inv.status === 'completed') {
      completedInterviews++;
    } else if (inv.status === 'expired' || (inv.status === 'active' && isExpiredByTime)) {
      expiredInterviews++;
    } else if (inv.status === 'active') {
      activeLinks++;
      pendingInterviews++;
    } else if (inv.status === 'in_progress') {
      pendingInterviews++;
    }
  });

  return {
    totalCreated,
    activeLinks,
    pendingInterviews,
    completedInterviews,
    expiredInterviews,
    failedEvaluations,
  };
}
