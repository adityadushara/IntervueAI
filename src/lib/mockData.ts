import { JobConfiguration, InterviewQuestion, RecruiterEvaluation, CandidateAnswer } from '@/types/interview';

export const SAMPLE_JOB_TITLES = [
  'Frontend Developer',
  'Senior React Engineer',
  'Backend Engineer',
  'Full Stack Developer',
  'DevOps & Cloud Engineer',
  'System Architect',
  'Engineering Manager',
  'QA Automation Engineer',
] as const;

export const DEFAULT_SKILLS_BY_ROLE: Record<string, string[]> = {
  'Frontend Developer': ['React', 'TypeScript', 'Next.js', 'CSS / Tailwind', 'Web Vitals', 'State Management', 'Browser APIs'],
  'Senior React Engineer': ['React 19', 'Next.js App Router', 'Server Components', 'TypeScript', 'Performance Profiling', 'Design Systems'],
  'Backend Engineer': ['Node.js', 'REST & GraphQL', 'PostgreSQL', 'Redis', 'Microservices', 'Distributed Locking', 'API Security'],
  'Full Stack Developer': ['React', 'Node.js', 'Next.js', 'SQL / NoSQL', 'System Architecture', 'CI/CD Pipelines'],
  'DevOps & Cloud Engineer': ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD GitHub Actions', 'Observability (Prometheus)'],
  'System Architect': ['High Availability', 'Distributed Messaging (Kafka)', 'Sharding & Replication', 'Caching Strategies', 'Rate Limiting'],
  'Engineering Manager': ['Team Leadership', 'Sprint Delivery', 'Conflict Resolution', 'Mentorship & 1:1s', 'Hiring & Culture'],
  'QA Automation Engineer': ['Playwright', 'Jest', 'Cypress', 'End-to-End Testing', 'API Automation', 'Test Strategy'],
};

interface QuestionBankItem {
  tags: string[];
  types: ('Technical' | 'HR' | 'Behavioural' | 'Mixed')[];
  category: string;
  text: string;
  context?: string;
  hints: string[];
}

export const MASTER_QUESTION_BANK: QuestionBankItem[] = [
  // Frontend & React
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Full Stack Developer', 'React', 'Next.js'],
    types: ['Technical', 'Mixed'],
    category: 'Architecture & Hydration',
    text: 'How do Next.js Server Components differ from Client Components, and what factors determine whether a component should be rendered on the server versus client?',
    context: 'Think about hydration cost, bundle size, data fetching proximity to the database, and user interactivity.',
    hints: ['Mention reduction in client-side bundle size', 'Discuss hydration boundaries with "use client"', 'Explain server data access without waterfall requests']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Full Stack Developer', 'Web Vitals', 'Performance'],
    types: ['Technical', 'Mixed'],
    category: 'Web Performance & Core Vitals',
    text: 'A user reports that a critical page in your application feels sluggish and shifts during initial render. How do you diagnose and optimize Core Web Vitals (LCP, INP, CLS)?',
    context: 'Focus on profiling tools, font/image loading optimizations, dynamic imports, and render lifecycle.',
    hints: ['Reference Chrome DevTools Performance panel or Lighthouse', 'Explain priority image loading for LCP', 'Discuss reserved aspect ratios for CLS']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'React', 'State Management'],
    types: ['Technical', 'Mixed'],
    category: 'State Management & Re-renders',
    text: 'Explain how React handles render tree updates. How do you prevent unnecessary re-computations when passing complex objects or callbacks down a component tree?',
    context: 'Discuss referential equality, useMemo, useCallback, and state colocation.',
    hints: ['Mention useMemo for expensive calculations', 'Highlight useCallback for stable function references', 'Explain that colocating state prevents unnecessary parent re-renders']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'TypeScript', 'CSS / Tailwind'],
    types: ['Technical', 'Mixed'],
    category: 'CSS Architecture & Layout Stability',
    text: 'How do you structure responsive CSS architectures in enterprise design systems to avoid layout thrashing and maintain maintainability across large engineering teams?',
    context: 'Consider utility-first CSS (Tailwind) versus CSS modules, CSS variables, and tokens.',
    hints: ['Discuss design token consistency', 'Explain CSS containment and hardware-accelerated transforms', 'Address responsive breakpoints']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Browser APIs', 'JavaScript'],
    types: ['Technical', 'Mixed'],
    category: 'Asynchronous JavaScript & Event Loop',
    text: 'Walk through how the browser Event Loop processes microtasks (promises) versus macrotasks (setTimeout, DOM events, requestAnimationFrame). Why does this distinction matter for UI responsiveness?',
    context: 'Explain microtask queue prioritization and thread blocking.',
    hints: ['Microtasks run immediately after current execution stack before rendering', 'Macrotasks yield back to event loop', 'Heavy sync tasks block the paint cycle']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Next.js', 'API Design'],
    types: ['Technical', 'Mixed'],
    category: 'Data Fetching & Cache Invalidation',
    text: 'Describe how you handle client-side and server-side data caching, revalidation (e.g. SWR, React Query, or Next.js fetch tags), and optimistic UI updates during data mutations.',
    context: 'Focus on rollback mechanisms when optimistic mutations fail on the backend.',
    hints: ['Explain stale-while-revalidate semantics', 'Describe tagging cache tags for on-demand revalidation', 'Detail optimistic UI rollback on network error']
  },
  {
    tags: ['Frontend Developer', 'Full Stack Developer', 'Security'],
    types: ['Technical', 'Mixed'],
    category: 'Frontend Security & XSS Mitigation',
    text: 'What are the most common security vulnerabilities on the modern web (such as XSS, CSRF, and Clickjacking), and what concrete safeguards do you implement in frontend applications?',
    context: 'Discuss Content Security Policy (CSP), cookie security flags (HttpOnly, SameSite), and DOM sanitization.',
    hints: ['Explain escaping user inputs and avoiding dangerouslySetInnerHTML', 'Discuss SameSite cookies against CSRF', 'Detail CSP headers to restrict untrusted scripts']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Testing'],
    types: ['Technical', 'Mixed'],
    category: 'Frontend Testing Strategy',
    text: 'How do you design a balanced testing pyramid for frontend applications across Unit tests (Jest/Vitest), Integration tests (React Testing Library), and End-to-End tests (Playwright)?',
    context: 'Discuss confidence versus execution speed, mock boundaries, and user-centric assertions.',
    hints: ['Test behavior, not implementation details', 'Focus unit tests on utilities and state reducers', 'Use Playwright for critical user checkout or authentication journeys']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Accessibility'],
    types: ['Technical', 'Mixed'],
    category: 'Accessibility (a11y) & Semantic HTML',
    text: 'How do you ensure enterprise web applications are fully accessible according to WCAG 2.1 AA standards, including keyboard navigation, focus management, and screen reader announcements?',
    context: 'Address ARIA live regions, focus trapping in modal dialogs, and semantic element usage.',
    hints: ['Use semantic HTML (<button>, <dialog>, <nav>) before custom ARIA roles', 'Implement focus restoration when closing modals', 'Ensure high contrast ratios and visible focus rings']
  },
  {
    tags: ['Frontend Developer', 'Senior React Engineer', 'Full Stack Developer'],
    types: ['Technical', 'Mixed'],
    category: 'Production Error Handling & Observability',
    text: 'How do you implement client-side observability, error boundaries, and telemetry tracking to detect and diagnose production bugs before users report them?',
    context: 'Discuss ErrorBoundary component lifecycle, Sentry or Datadog integrations, and session replay.',
    hints: ['Explain React Error Boundaries catching render errors', 'Discuss source map uploads for de-obfuscation', 'Explain tracking custom breadcrumbs before an exception occurs']
  },

  // Backend & Distributed Systems
  {
    tags: ['Backend Engineer', 'Full Stack Developer', 'System Architect'],
    types: ['Technical', 'Mixed'],
    category: 'Database Concurrency & ACID',
    text: 'How do you handle race conditions and maintain strict data consistency when handling high-concurrency balance deductions or ticket reservations in a relational database?',
    context: 'Contrast optimistic locking (version numbers) with pessimistic locking (SELECT FOR UPDATE) and distributed locks.',
    hints: ['Explain transaction isolation levels (Read Committed vs Serializable)', 'Compare optimistic versioning vs row-level locking', 'Discuss idempotency keys for client retries']
  },
  {
    tags: ['Backend Engineer', 'System Architect', 'Full Stack Developer'],
    types: ['Technical', 'Mixed'],
    category: 'Distributed Caching & Redis',
    text: 'Design a resilient distributed caching layer using Redis for a service with 100,000 read requests per second. How do you mitigate Cache Stampede (dog-piling) and Cache Penetration?',
    context: 'Discuss TTL jitter, mutex locks, probabilistic early expiration, and Bloom filters.',
    hints: ['Explain probabilistic early recomputation or distributed locks for stampede', 'Use Bloom filters for non-existent keys', 'Discuss Redis cluster sentinel and read replicas']
  },
  {
    tags: ['Backend Engineer', 'Full Stack Developer', 'API Design'],
    types: ['Technical', 'Mixed'],
    category: 'Rate Limiting & Resiliency',
    text: 'Explain how you would architect a distributed rate limiter supporting 50,000 RPM across multiple microservice replicas. Which rate limiting algorithm would you pick and why?',
    context: 'Compare Token Bucket, Leaky Bucket, and Sliding Window Counter in Redis.',
    hints: ['Sliding Window Counter offers smooth accuracy without burst spikes', 'Redis Lua scripts ensure atomic increments', 'Address fail-open strategy if Redis fails']
  },
  {
    tags: ['Backend Engineer', 'DevOps & Cloud Engineer', 'System Architect'],
    types: ['Technical', 'Mixed'],
    category: 'Message Queues & Asynchronous Processing',
    text: 'When designing an event-driven asynchronous processing pipeline with message brokers (such as Kafka or RabbitMQ), how do you guarantee idempotency and handle poison pill messages?',
    context: 'Discuss Dead Letter Queues (DLQ), retry backoff with jitter, and deduplication IDs.',
    hints: ['Dead Letter Queues isolate repeatedly failing payloads', 'Idempotency keys ensure repeated processing causes no side effects', 'Exponential backoff prevents thundering herds']
  },

  // HR & Culture & Behavioural
  {
    tags: ['Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'Engineering Manager', 'General'],
    types: ['HR', 'Behavioural', 'Mixed'],
    category: 'Collaboration & Stakeholder Alignment',
    text: 'Describe a situation where engineering constraints clashed with product deadlines or stakeholder expectations. How did you negotiate scope and communicate trade-offs?',
    context: 'Structure your response using the STAR format (Situation, Task, Action, Result).',
    hints: ['Focus on business impact and data-driven compromises', 'Explain presenting tiered options (MVP vs Phase 2)', 'Highlight collaborative outcomes']
  },
  {
    tags: ['Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'General'],
    types: ['HR', 'Behavioural', 'Mixed'],
    category: 'High-Severity Incident Management',
    text: 'Walk me through a production incident or severe bug that you were responsible for or led the resolution of. How did you triage, resolve it, and conduct the blameless post-mortem?',
    context: 'Focus on communication during downtime and concrete preventative engineering safeguards.',
    hints: ['Prioritize service restoration over immediate blame', 'Explain transparent status communication to stakeholders', 'Detail preventative tests, alerts, and runbooks established afterward']
  },
  {
    tags: ['Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'General'],
    types: ['HR', 'Behavioural', 'Mixed'],
    category: 'Technical Debt & Prioritization',
    text: 'How do you proactively identify, advocate for, and remediate technical debt when business roadmaps heavily emphasize shipping new client-facing features?',
    context: 'Discuss sprint budget allocation, developer velocity metrics, and the Boy Scout rule.',
    hints: ['Quantify technical debt in terms of incident risk and developer cycle time', 'Advocate for a consistent 15-20% engineering health allocation per sprint', 'Lead incremental refactoring during feature work']
  },
  {
    tags: ['Frontend Developer', 'Backend Engineer', 'Engineering Manager', 'General'],
    types: ['HR', 'Behavioural', 'Mixed'],
    category: 'Mentorship & Code Review Standards',
    text: 'What is your approach to conducting constructive code reviews? How do you mentor junior/mid-level teammates without causing delivery friction?',
    context: 'Discuss architectural standards, automated linting, empathy, and distinguishing preferences from bugs.',
    hints: ['Automate style debates via linters/formatters', 'Distinguish blocking defects from non-blocking suggestions (nitpicks)', 'Offer pair programming for complex architectural shifts']
  }
];

export function generateQuestionsForJob(jobConfig: JobConfiguration): InterviewQuestion[] {
  const targetCount = jobConfig.questionCount || 5;
  const jobTitle = jobConfig.jobTitle.toLowerCase();
  const reqSkills = jobConfig.requiredSkills.map(s => s.toLowerCase());

  // Match questions based on tags, interview type, and skills
  let matching = MASTER_QUESTION_BANK.filter(q => {
    // Type match
    if (jobConfig.interviewType !== 'Mixed' && !q.types.includes(jobConfig.interviewType)) {
      return false;
    }
    // Tag match
    const tagMatch = q.tags.some(t => {
      const lowerT = t.toLowerCase();
      return jobTitle.includes(lowerT) || reqSkills.some(s => s.includes(lowerT) || lowerT.includes(s)) || lowerT === 'general';
    });
    return tagMatch;
  });

  // If we don't have enough exact matches, widen to any question matching interview type
  if (matching.length < targetCount) {
    const typeMatching = MASTER_QUESTION_BANK.filter(q => 
      !matching.includes(q) && (jobConfig.interviewType === 'Mixed' || q.types.includes(jobConfig.interviewType))
    );
    matching = [...matching, ...typeMatching];
  }

  // If still not enough, add general questions from the bank
  if (matching.length < targetCount) {
    const remaining = MASTER_QUESTION_BANK.filter(q => !matching.includes(q));
    matching = [...matching, ...remaining];
  }

  // If requested count exceeds unique bank items, generate dynamic topic-specific questions
  const selected: InterviewQuestion[] = [];
  for (let i = 0; i < targetCount; i++) {
    if (i < matching.length) {
      const q = matching[i];
      selected.push({
        id: `q-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: i + 1,
        text: q.text,
        category: q.category,
        context: q.context,
        sampleHints: q.hints,
      });
    } else {
      // Dynamic fallback for high question count (e.g. 10+)
      const skill = jobConfig.requiredSkills[i % jobConfig.requiredSkills.length] || 'software architecture';
      selected.push({
        id: `q-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
        questionNumber: i + 1,
        text: `In the context of ${jobConfig.jobTitle}, explain your hands-on experience and best practices when implementing ${skill}. What are the primary trade-offs you encounter?`,
        category: `${skill} Deep Dive`,
        context: `Focus on architectural choices, maintainability, and real-world failure modes.`,
        sampleHints: [
          `Detail your architectural reasoning with ${skill}`,
          `Explain performance and scalability implications`,
          `Describe a specific production lesson or edge case you handled`
        ]
      });
    }
  }

  return selected;
}

export function generateRecruiterEvaluation(
  jobConfig: JobConfiguration,
  candidateName: string,
  answers: CandidateAnswer[]
): RecruiterEvaluation {
  const totalWords = answers.reduce((sum, a) => sum + a.answerText.trim().split(/\s+/).filter(Boolean).length, 0);
  const avgWords = answers.length > 0 ? Math.round(totalWords / answers.length) : 0;

  let technicalCompetency: RecruiterEvaluation['technicalCompetency'] = 'Strong';
  let communicationClarity: RecruiterEvaluation['communicationClarity'] = 'Clear & Structured';
  let recommendation: RecruiterEvaluation['recommendation'] = 'Advance to Technical Final';

  if (avgWords < 30) {
    technicalCompetency = 'Needs Review';
    communicationClarity = 'Too Brief';
    recommendation = 'Hold for Review';
  } else if (avgWords >= 70) {
    technicalCompetency = 'Exceptional';
    communicationClarity = 'Clear & Structured';
    recommendation = 'Advance to Technical Final';
  }

  return {
    overallAssessment: `Candidate completed all ${answers.length} questions for the ${jobConfig.seniorityLevel} ${jobConfig.jobTitle} position (${jobConfig.interviewType} focus). Average response depth was ${avgWords} words per question.`,
    technicalCompetency,
    communicationClarity,
    notableStrengths: [
      `Systematic approach to ${jobConfig.requiredSkills.slice(0, 3).join(', ')} requirements`,
      `Articulated architectural trade-offs with practical engineering mindset`,
      `Demonstrated consistent professional tone throughout the session`
    ],
    areasToProbeInLiveRound: [
      `Probe deeper into edge cases and live failure recovery in a collaborative whiteboard session`,
      `Verify hands-on debugging skills with live code snippet review`
    ],
    recommendation,
    evaluationGeneratedAt: new Date().toISOString()
  };
}
