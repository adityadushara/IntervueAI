import { InterviewConfig, InterviewQuestion, InterviewScore, CandidateAnswer } from '@/types/interview';

export const POPULAR_ROLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Developer',
  'System Architect',
  'DevOps / Cloud Engineer',
  'AI / Machine Learning Engineer',
  'Engineering Manager / Lead',
  'Other / Custom Role',
] as const;

export const DEFAULT_TOPICS_BY_ROLE: Record<string, string[]> = {
  'Frontend Engineer': ['React', 'TypeScript', 'Next.js', 'CSS & Responsive Design', 'Web Performance', 'State Management'],
  'Backend Engineer': ['Node.js', 'REST APIs', 'Databases & SQL', 'System Architecture', 'Microservices', 'Authentication & Security'],
  'Full Stack Developer': ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'API Design', 'Performance Optimization'],
  'System Architect': ['High Availability', 'Distributed Systems', 'Caching & CDNs', 'Message Queues', 'Data Partitioning', 'Disaster Recovery'],
  'DevOps / Cloud Engineer': ['Docker & Containers', 'Kubernetes', 'CI/CD Pipelines', 'AWS / Cloud Services', 'Terraform', 'Observability'],
  'AI / Machine Learning Engineer': ['LLM Architectures', 'Prompt Engineering', 'Vector Databases', 'Python', 'Model Evaluation', 'Fine-tuning'],
  'Engineering Manager / Lead': ['Team Leadership', 'Conflict Resolution', 'Technical Roadmap', '1:1 Coaching', 'Delivery Metrics', 'Hiring'],
  'Other / Custom Role': ['Problem Solving', 'System Design', 'Communication', 'Technical Leadership', 'Best Practices'],
};

interface QuestionBankItem {
  roles: string[];
  types: ('technical' | 'behavioral' | 'system_design' | 'mixed')[];
  levels: ('junior' | 'mid' | 'senior' | 'lead')[];
  category: string;
  text: string;
  context?: string;
  sampleHints: string[];
  keywords: string[];
}

export const QUESTION_BANK: QuestionBankItem[] = [
  // Frontend
  {
    roles: ['Frontend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'React & Core Architecture',
    text: 'How do Next.js Server Components differ from traditional Client Components, and when would you choose one over the other in a high-traffic production application?',
    context: 'Think about hydration cost, bundle size, data fetching proximity to the database, and user interactivity.',
    sampleHints: [
      'Mention server-side data fetching without waterfall requests.',
      'Explain that Client Components enable hooks (useState, useEffect) and DOM event listeners.',
      'Discuss bundle size reduction because server component dependencies remain on the server.'
    ],
    keywords: ['bundle size', 'hydration', 'server', 'client', 'waterfall', 'use client', 'security']
  },
  {
    roles: ['Frontend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['mid', 'senior', 'lead'],
    category: 'Web Performance',
    text: 'A user reports that a critical dashboard page in your application feels sluggish and experiences layout shifts during load. How do you diagnose and optimize Core Web Vitals (LCP, INP, CLS)?',
    context: 'Focus on profiling tools, image optimization, dynamic imports, and render lifecycle.',
    sampleHints: [
      'Reference Chrome DevTools Performance panel or Lighthouse.',
      'Address Largest Contentful Paint (LCP) with priority image loading and server-side rendering.',
      'Address Cumulative Layout Shift (CLS) with explicit aspect ratios and reserved dimensions.'
    ],
    keywords: ['LCP', 'INP', 'CLS', 'Lighthouse', 'performance', 'layout shift', 'devtools', 'lazy load']
  },
  {
    roles: ['Frontend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['junior', 'mid'],
    category: 'State Management & Concurrency',
    text: 'Explain how React handles re-renders and how you prevent unnecessary re-computations when passing complex objects or callbacks to deeply nested child components.',
    context: 'Discuss memoization, referential equality, and state colocation.',
    sampleHints: [
      'Mention useMemo and useCallback for stable object references.',
      'Discuss React.memo for component memoization.',
      'Highlight keeping state as local as possible to avoid unnecessary tree updates.'
    ],
    keywords: ['re-render', 'useMemo', 'useCallback', 'React.memo', 'referential equality', 'state colocation']
  },

  // Backend
  {
    roles: ['Backend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'Database & Data Consistency',
    text: 'How do you prevent race conditions and maintain data consistency when handling concurrent ticket purchases or inventory reservations in a database?',
    context: 'Consider transaction isolation levels, optimistic vs pessimistic locking, and idempotency.',
    sampleHints: [
      'Compare optimistic locking (version numbers) with pessimistic locking (SELECT FOR UPDATE).',
      'Explain ACID transaction boundaries and isolation levels (e.g., Read Committed vs Serializable).',
      'Mention idempotency keys for client retry resilience.'
    ],
    keywords: ['optimistic locking', 'pessimistic locking', 'isolation level', 'ACID', 'race condition', 'idempotency']
  },
  {
    roles: ['Backend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['mid', 'senior', 'lead'],
    category: 'API Design & Scaling',
    text: 'Design a resilient rate-limiting mechanism for a public API that receives 50,000 requests per minute across multiple distributed server instances.',
    context: 'Think about token bucket or sliding window algorithms, Redis storage, and failure handling.',
    sampleHints: [
      'Explain the Sliding Window Counter or Token Bucket algorithm.',
      'Use Redis as a centralized high-speed in-memory store with TTL.',
      'Discuss graceful degradation or fail-open strategy if the rate limiter cache goes down.'
    ],
    keywords: ['rate limit', 'token bucket', 'sliding window', 'redis', 'distributed', '429', 'headers']
  },
  {
    roles: ['Backend Engineer', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'Security & Authentication',
    text: 'Explain the security trade-offs between storing session state via JWT tokens in client cookies versus server-managed sessions in Redis. How do you handle token revocation?',
    context: 'Discuss CSRF, XSS, token expiration, revocation lists, and horizontal scalability.',
    sampleHints: [
      'Explain that stateless JWTs cannot be instantly revoked without a centralized blacklist.',
      'Compare cookie security flags: HttpOnly, Secure, SameSite.',
      'Discuss short-lived access tokens combined with rotating refresh tokens.'
    ],
    keywords: ['JWT', 'cookie', 'HttpOnly', 'SameSite', 'revocation', 'refresh token', 'CSRF', 'XSS']
  },

  // System Design
  {
    roles: ['System Architect', 'Backend Engineer', 'Full Stack Developer', 'Engineering Manager / Lead'],
    types: ['system_design', 'technical', 'mixed'],
    levels: ['mid', 'senior', 'lead'],
    category: 'Distributed Systems',
    text: 'Design a real-time notification system capable of sending push alerts and in-app notifications to 10 million active users with sub-second latency.',
    context: 'Cover ingestion, message broker choice, connection pooling (WebSockets/SSE), and persistence.',
    sampleHints: [
      'Identify backpressure and decoupling using Apache Kafka or RabbitMQ.',
      'Explain WebSocket connection gateways with heartbeat management.',
      'Discuss fan-out strategies for global announcements versus targeted user alerts.'
    ],
    keywords: ['WebSocket', 'Kafka', 'broker', 'fan-out', 'gateway', 'latency', 'horizontal scaling']
  },
  {
    roles: ['System Architect', 'Backend Engineer', 'Full Stack Developer'],
    types: ['system_design', 'technical', 'mixed'],
    levels: ['mid', 'senior', 'lead'],
    category: 'System Design & Storage',
    text: 'How would you architect a URL shortening service like Bitly handling 1 billion URLs with a 100:1 read-to-write ratio?',
    context: 'Estimate storage, discuss base62 encoding vs hashing, caching layers, and database sharding.',
    sampleHints: [
      'Calculate approximate QPS and multi-year storage needs.',
      'Use a 6-7 character Base62 encoded distributed counter (Snowflake or Redis counter).',
      'Add a Redis caching layer for the top 20% hottest URLs (80/20 rule).'
    ],
    keywords: ['base62', 'cache', 'Redis', 'sharding', 'read-heavy', 'snowflake', 'collision']
  },

  // DevOps & Cloud
  {
    roles: ['DevOps / Cloud Engineer', 'System Architect', 'Full Stack Developer'],
    types: ['technical', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'CI/CD & Reliability',
    text: 'Describe how you would implement a zero-downtime deployment strategy (e.g., Blue-Green or Canary) in a containerized environment with automated rollback on failure.',
    context: 'Focus on health checks, traffic routing, database migrations, and telemetry alerts.',
    sampleHints: [
      'Explain routing gradual traffic percentages via ingress controllers or load balancers.',
      'Emphasize backwards-compatible database schema migrations (expand and contract pattern).',
      'Set automated metric triggers (e.g., 5xx error spikes or latency threshold breaches) for instant rollback.'
    ],
    keywords: ['blue-green', 'canary', 'zero downtime', 'health check', 'rollback', 'schema migration']
  },

  // Behavioral
  {
    roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'System Architect', 'DevOps / Cloud Engineer', 'AI / Machine Learning Engineer', 'Engineering Manager / Lead', 'Other / Custom Role'],
    types: ['behavioral', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'Behavioral & Engineering Collaboration',
    text: 'Tell me about a time you strongly disagreed with a product manager or senior engineer on a technical or architectural decision. How did you handle the situation and what was the outcome?',
    context: 'Use the STAR method: Situation, Task, Action, Result. Highlight data-driven communication and empathy.',
    sampleHints: [
      'Focus on objective business trade-offs rather than emotional friction.',
      'Explain how you built a prototype, benchmarked data, or compromised effectively.',
      'Reflect on what you learned from the experience.'
    ],
    keywords: ['disagreement', 'compromise', 'data-driven', 'trade-off', 'communication', 'result']
  },
  {
    roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'System Architect', 'DevOps / Cloud Engineer', 'AI / Machine Learning Engineer', 'Engineering Manager / Lead', 'Other / Custom Role'],
    types: ['behavioral', 'mixed'],
    levels: ['junior', 'mid', 'senior', 'lead'],
    category: 'Incident Management & Accountability',
    text: 'Walk me through a high-severity production outage or bug that you caused or had to urgently triage. How did you mitigate it, communicate with stakeholders, and prevent recurrence?',
    context: 'Focus on blameless postmortems, root cause analysis, and preventative observability.',
    sampleHints: [
      'Detail the immediate triage steps taken to restore service first before hunting perfection.',
      'Describe honest, clear stakeholder communication.',
      'Explain concrete preventive actions implemented in the postmortem (e.g. tests, alerts, safeguards).'
    ],
    keywords: ['outage', 'triage', 'postmortem', 'root cause', 'mitigation', 'observability', 'monitoring']
  },
  {
    roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'System Architect', 'Engineering Manager / Lead', 'Other / Custom Role'],
    types: ['behavioral', 'mixed'],
    levels: ['mid', 'senior', 'lead'],
    category: 'Technical Debt & Prioritization',
    text: 'How do you balance delivering immediate customer features with maintaining high code quality and paying down compounding technical debt?',
    context: 'Discuss negotiation with leadership, allocating dedicated tech debt budgets, and test coverage.',
    sampleHints: [
      'Mention dedicating a percentage of each sprint (e.g., 15-20%) to maintenance and tech debt.',
      'Frame technical debt in terms of developer velocity, incident risk, and customer churn.',
      'Explain the "Boy Scout Rule" (leave the codebase cleaner than you found it).'
    ],
    keywords: ['technical debt', 'velocity', 'sprint allocation', 'refactoring', 'prioritization', 'trade-off']
  }
];

export function generateQuestionsForSession(config: InterviewConfig): InterviewQuestion[] {
  // Filter questions matching role or generic
  const targetRole = config.role === 'Other / Custom Role' ? (config.customRole || 'Software Engineer') : config.role;
  
  let matching = QUESTION_BANK.filter(q => {
    // Type match
    if (config.interviewType !== 'mixed' && !q.types.includes(config.interviewType)) {
      return false;
    }
    // Level match
    if (!q.levels.includes(config.level)) {
      return false;
    }
    // Role match
    const roleMatches = q.roles.includes(config.role) || q.roles.includes('Other / Custom Role');
    return roleMatches;
  });

  // Fallback if not enough matching
  if (matching.length < config.questionCount) {
    const fallbacks = QUESTION_BANK.filter(q => !matching.includes(q));
    matching = [...matching, ...fallbacks];
  }

  // Shuffle slightly and select requested count
  const selected = matching.slice(0, config.questionCount);

  return selected.map((q, index) => ({
    id: `q-${index + 1}-${Math.random().toString(36).substring(2, 7)}`,
    questionNumber: index + 1,
    text: q.text,
    category: q.category,
    context: q.context,
    sampleHints: q.sampleHints,
    expectedKeywords: q.keywords,
  }));
}

export function evaluateMockSession(
  config: InterviewConfig,
  answers: CandidateAnswer[],
  questions: InterviewQuestion[]
): InterviewScore {
  let totalLengthScore = 0;
  let totalKeywordMatches = 0;
  let totalKeywordsPossible = 0;

  answers.forEach((ans, idx) => {
    const q = questions[idx];
    const words = ans.answerText.trim().split(/\s+/).filter(Boolean).length;
    
    // Word count assessment (ideal: 40 - 150 words per question)
    const lengthScore = Math.min(100, Math.max(30, words * 1.2));
    totalLengthScore += lengthScore;

    if (q?.expectedKeywords) {
      totalKeywordsPossible += q.expectedKeywords.length;
      const lower = ans.answerText.toLowerCase();
      const matches = q.expectedKeywords.filter(k => lower.includes(k.toLowerCase())).length;
      totalKeywordMatches += matches;
    }
  });

  const avgLengthScore = answers.length > 0 ? Math.round(totalLengthScore / answers.length) : 60;
  const keywordRatio = totalKeywordsPossible > 0 ? (totalKeywordMatches / totalKeywordsPossible) : 0.6;
  const keywordScore = Math.round(Math.min(98, Math.max(50, keywordRatio * 100 + 35)));

  const technicalDepth = Math.min(96, Math.max(65, Math.round((avgLengthScore * 0.4) + (keywordScore * 0.6))));
  const communication = Math.min(95, Math.max(60, Math.round(avgLengthScore * 0.9 + 8)));
  const problemSolving = Math.min(94, Math.max(65, Math.round((technicalDepth + communication) / 2 - 2)));
  
  const overall = Math.round((technicalDepth * 0.4) + (communication * 0.3) + (problemSolving * 0.3));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (communication >= 80) {
    strengths.push('Articulated thoughts clearly with structured, professional tone.');
  } else {
    strengths.push('Direct responses that addressed the core prompt.');
    improvements.push('Elaborate more on specific implementation details and real-world examples.');
  }

  if (technicalDepth >= 80) {
    strengths.push('Demonstrated strong domain knowledge and awareness of trade-offs.');
  } else {
    improvements.push('Incorporate standard architectural terminology (e.g. latency, idempotency, caching).');
  }

  if (problemSolving >= 80) {
    strengths.push('Methodical problem breakdown with practical mitigation strategies.');
  } else {
    improvements.push('Consider edge cases and failure modes proactively when answering.');
  }

  return {
    overall,
    communication,
    technicalDepth,
    problemSolving,
    summary: `Solid mock interview session for ${config.role} (${config.level.toUpperCase()} level). Answered ${answers.length} question(s) covering ${config.topics.slice(0, 3).join(', ')}.`,
    strengths,
    improvements,
  };
}
