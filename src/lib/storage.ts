import { InterviewSession, InterviewConfig } from '@/types/interview';

const ACTIVE_SESSION_KEY = 'intervue_ai_active_session';
const HISTORY_KEY = 'intervue_ai_history';

export const SEEDED_SESSIONS: InterviewSession[] = [
  {
    id: 'seed-sess-1',
    config: {
      candidateName: 'Alex Mercer',
      role: 'Frontend Engineer',
      level: 'senior',
      interviewType: 'technical',
      difficulty: 'medium',
      topics: ['React', 'Next.js', 'Web Performance'],
      questionCount: 3,
    },
    status: 'completed',
    createdAt: '2026-11-03T10:00:00.000Z',
    completedAt: '2026-11-03T10:20:00.000Z',
    totalTimeSeconds: 780,
    currentQuestionIndex: 3,
    questions: [
      {
        id: 'q-seed-1',
        questionNumber: 1,
        text: 'How do Next.js Server Components differ from traditional Client Components, and when would you choose one over the other in a high-traffic production application?',
        category: 'React & Core Architecture',
        sampleHints: ['Hydration costs', 'Server data access']
      },
      {
        id: 'q-seed-2',
        questionNumber: 2,
        text: 'A user reports that a critical dashboard page in your application feels sluggish. How do you diagnose and optimize Core Web Vitals?',
        category: 'Web Performance',
        sampleHints: ['LCP, INP, CLS profiling', 'DevTools']
      },
      {
        id: 'q-seed-3',
        questionNumber: 3,
        text: 'Explain how React handles re-renders and how you prevent unnecessary re-computations.',
        category: 'State Management & Concurrency',
        sampleHints: ['useMemo', 'useCallback']
      }
    ],
    answers: [
      {
        questionId: 'q-seed-1',
        questionText: 'Server Components vs Client Components',
        answerText: 'Server components execute entirely on the server and send pre-rendered HTML/JSON over the wire, removing client bundle overhead and eliminating waterfalls.',
        timeSpentSeconds: 240,
        submittedAt: '2026-11-03T10:04:00.000Z'
      },
      {
        questionId: 'q-seed-2',
        questionText: 'Web Performance & Core Web Vitals',
        answerText: 'I use Lighthouse and Chrome DevTools to measure LCP and CLS. I optimize hero assets with priority loading, reduce JS blocking time, and ensure reserved layout dimensions.',
        timeSpentSeconds: 300,
        submittedAt: '2026-11-03T10:09:00.000Z'
      },
      {
        questionId: 'q-seed-3',
        questionText: 'Preventing unnecessary re-computations',
        answerText: 'I keep state colocated close to consumers. For heavy derivations, useMemo caches results. Callbacks passed to pure components are stabilized with useCallback.',
        timeSpentSeconds: 240,
        submittedAt: '2026-11-03T10:13:00.000Z'
      }
    ],
    score: {
      overall: 88,
      communication: 90,
      technicalDepth: 86,
      problemSolving: 88,
      summary: 'Excellent technical clarity and practical grasp of React Server Components and modern web performance tuning.',
      strengths: ['Clear explanation of hydration boundaries', 'Hands-on performance diagnosis techniques'],
      improvements: ['Discuss streaming SSR and Suspense boundaries in more depth']
    }
  },
  {
    id: 'seed-sess-2',
    config: {
      candidateName: 'Alex Mercer',
      role: 'Backend Engineer',
      level: 'senior',
      interviewType: 'system_design',
      difficulty: 'hard',
      topics: ['Distributed Systems', 'Databases & SQL', 'Microservices'],
      questionCount: 3,
    },
    status: 'completed',
    createdAt: '2026-10-31T14:00:00.000Z',
    completedAt: '2026-10-31T14:25:00.000Z',
    totalTimeSeconds: 960,
    currentQuestionIndex: 3,
    questions: [
      {
        id: 'q-seed-4',
        questionNumber: 1,
        text: 'How do you prevent race conditions and maintain data consistency when handling concurrent ticket purchases?',
        category: 'Database & Data Consistency'
      },
      {
        id: 'q-seed-5',
        questionNumber: 2,
        text: 'Design a resilient rate-limiting mechanism for a public API that receives 50,000 requests per minute.',
        category: 'API Design & Scaling'
      },
      {
        id: 'q-seed-6',
        questionNumber: 3,
        text: 'Explain the security trade-offs between storing session state via JWT tokens in client cookies versus Redis sessions.',
        category: 'Security & Authentication'
      }
    ],
    answers: [
      {
        questionId: 'q-seed-4',
        questionText: 'Preventing race conditions',
        answerText: 'I implement optimistic locking with version numbers for high-throughput scenarios, or pessimistic SELECT FOR UPDATE within an ACID transaction when overbooking is strictly zero-tolerance.',
        timeSpentSeconds: 310,
        submittedAt: '2026-10-31T14:05:00.000Z'
      },
      {
        questionId: 'q-seed-5',
        questionText: 'Resilient rate-limiting mechanism',
        answerText: 'I would use a sliding window log or token bucket algorithm hosted in Redis. To avoid latency bottlenecks, Redis cluster instances run with local memory fallback and fail-open policies.',
        timeSpentSeconds: 340,
        submittedAt: '2026-10-31T14:11:00.000Z'
      },
      {
        questionId: 'q-seed-6',
        questionText: 'JWT vs Server sessions',
        answerText: 'Stateless JWTs eliminate DB lookups for authorization but make instant revocation impossible without a blacklist. Redis sessions offer instant invalidation at the cost of network hops.',
        timeSpentSeconds: 310,
        submittedAt: '2026-10-31T14:16:00.000Z'
      }
    ],
    score: {
      overall: 92,
      communication: 92,
      technicalDepth: 94,
      problemSolving: 90,
      summary: 'Superb architecture knowledge with practical awareness of trade-offs between Redis and stateless JWTs.',
      strengths: ['Nuanced discussion of transaction isolation', 'Strong fault-tolerance mindset with rate limiters'],
      improvements: ['Could mention Lua scripts for atomic Redis token bucket operations']
    }
  }
];

export function getActiveSession(): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error reading active session from localStorage', e);
    return null;
  }
}

export function setActiveSession(session: InterviewSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error saving active session to localStorage', e);
  }
}

export function getInterviewHistory(): InterviewSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      // Seed with sample data on first visit
      localStorage.setItem(HISTORY_KEY, JSON.stringify(SEEDED_SESSIONS));
      return SEEDED_SESSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading interview history', e);
    return SEEDED_SESSIONS;
  }
}

export function saveCompletedSession(session: InterviewSession): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getInterviewHistory();
    // Prepend new session
    const updated = [session, ...history.filter(s => s.id !== session.id)];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    // Clear active session
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.error('Error saving completed session', e);
  }
}

export function deleteSessionFromHistory(id: string): InterviewSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = getInterviewHistory();
    const updated = history.filter(s => s.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting session', e);
    return [];
  }
}

export function getDashboardMetrics(history: InterviewSession[]) {
  const completed = history.filter(s => s.status === 'completed');
  const totalCount = completed.length;
  
  if (totalCount === 0) {
    return {
      totalCount: 0,
      averageScore: 0,
      totalPracticeMinutes: 0,
      topRole: 'None',
      latestScore: 0,
    };
  }

  const scoreSum = completed.reduce((acc, s) => acc + (s.score?.overall || 0), 0);
  const averageScore = Math.round(scoreSum / totalCount);

  const totalTimeSeconds = completed.reduce((acc, s) => acc + (s.totalTimeSeconds || 600), 0);
  const totalPracticeMinutes = Math.round(totalTimeSeconds / 60);

  // Find top practiced role
  const roleCounts: Record<string, number> = {};
  completed.forEach(s => {
    const r = s.config.role;
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });
  let topRole = 'Software Engineer';
  let maxCount = 0;
  for (const [role, count] of Object.entries(roleCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topRole = role;
    }
  }

  const latestScore = completed[0]?.score?.overall || 0;

  return {
    totalCount,
    averageScore,
    totalPracticeMinutes,
    topRole,
    latestScore,
  };
}
