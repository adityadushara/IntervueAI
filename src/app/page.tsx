'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  PlusCircle, 
  ArrowRight, 
  Mic, 
  Sliders, 
  FileText,
  LayoutDashboard,
  Check,
  ChevronDown,
  Volume2,
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  UserCheck
} from 'lucide-react';

interface RolePreset {
  id: string;
  name: string;
  seniority: string;
  duration: string;
  sampleQuestion: string;
  sampleAnswer: string;
  competencies: { name: string; score: number }[];
  recommendation: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'frontend',
    name: 'Frontend Architect',
    seniority: 'Staff / Principal',
    duration: '25 min',
    sampleQuestion: 'How would you architect optimistic UI updates with automatic rollback in a Next.js application?',
    sampleAnswer: 'I dispatch the mutation while immediately applying the optimistic change to the React cache. If the network promise rejects, I catch the error, revert the cache to the snapshot, and notify the user.',
    competencies: [
      { name: 'State Architecture', score: 95 },
      { name: 'Component Lifecycles', score: 92 },
      { name: 'Performance & UX', score: 94 },
    ],
    recommendation: 'Strong Hire • Exceptional mastery of optimistic cache reconciliation',
  },
  {
    id: 'backend',
    name: 'Backend & Distributed Systems',
    seniority: 'Senior Engineer',
    duration: '30 min',
    sampleQuestion: 'How would you design a distributed rate limiter that avoids saturating Redis connection pools?',
    sampleAnswer: 'I would use a sliding-window counter executed via an atomic Redis Lua script. For high-volume endpoints, I front it with an in-memory token bucket to absorb local bursts.',
    competencies: [
      { name: 'Distributed Systems', score: 93 },
      { name: 'Concurrency & Locking', score: 91 },
      { name: 'System Resilience', score: 89 },
    ],
    recommendation: 'Strong Hire • Clear understanding of atomic operations & tiered caching',
  },
  {
    id: 'fullstack',
    name: 'Full-Stack Product Engineer',
    seniority: 'Mid-Senior',
    duration: '20 min',
    sampleQuestion: 'How do you handle end-to-end type safety between database schemas and client-rendered interfaces?',
    sampleAnswer: 'I generate TypeScript types directly from the database schema or GraphQL/tRPC definitions, ensuring client queries inherit typed return types without manual duplication.',
    competencies: [
      { name: 'Type Safety & API Design', score: 90 },
      { name: 'Database Schema Modeling', score: 88 },
      { name: 'Product Engineering Velocity', score: 93 },
    ],
    recommendation: 'Hire • Solid foundational practices across the entire application stack',
  },
  {
    id: 'devops',
    name: 'DevOps & Cloud Infrastructure',
    seniority: 'Senior / Lead',
    duration: '30 min',
    sampleQuestion: 'Explain how you approach zero-downtime database migrations with breaking column alterations.',
    sampleAnswer: 'I follow expand-and-contract: add the new column nullable, deploy code writing to both, backfill historical rows asynchronously, deploy code reading only new column, and finally drop old column.',
    competencies: [
      { name: 'Zero-Downtime Deployments', score: 96 },
      { name: 'Cloud Reliability & SRE', score: 92 },
      { name: 'Infrastructure as Code', score: 90 },
    ],
    recommendation: 'Strong Hire • Thorough grasp of expand-and-contract migration discipline',
  },
];

const FAQS = [
  {
    question: 'How does the voice interview work for candidates?',
    answer: 'Candidates click their unique single-use link and grant microphone access in their browser. The AI interviewer vocalizes questions aloud, listens to the candidate answer via low-latency speech recognition, and asks adaptive follow-ups. Zero software installation or signup is required for candidates.',
  },
  {
    question: 'Can candidates type their responses instead of speaking?',
    answer: 'No. IntervueAI is strictly voice-native. Candidates must verbally articulate their thoughts, replicating an authentic technical phone screen to assess spontaneous problem-solving, communication clarity, and genuine depth.',
  },
  {
    question: 'How are questions calibrated for each role?',
    answer: 'Recruiters specify the engineering domain, seniority level (Junior through Staff), target tech stack, and duration. IntervueAI generates calibrated questions tailored to that exact scope or draws from verified engineering question banks.',
  },
  {
    question: 'What do recruiters receive once an interview is completed?',
    answer: 'Recruiters receive a confidential evaluation dossier featuring 6 standardized competency scores (0-100), key citations with verbatim transcripts, identified candidate strengths, areas for inquiry, and a structured hiring recommendation.',
  },
  {
    question: 'How are candidate links secured?',
    answer: 'Each invitation is protected by a cryptographically signed, random 32-character token. Tokens are securely hashed on disk using SHA-256, have configurable expiration windows (24h or 48h), and cannot be modified or re-submitted after completion.',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [activeRole, setActiveRole] = useState<RolePreset>(ROLE_PRESETS[0]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="pt-20 pb-16 md:pt-28 md:pb-24 border-b border-zinc-200/80 bg-white">
        <div className="ui-page-container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-6xl font-semibold text-zinc-950 tracking-[-0.035em] leading-[1.08]">
              AI voice interviews for hiring engineers.
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto">
              Screen engineering candidates with realistic, conversational voice interviews in their browser. Set up role criteria, share an invitation link, and receive structured evaluation dossiers with transcripts and scores in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/config"
                    className="ui-btn-primary w-full sm:w-auto h-11 px-6 text-sm font-medium shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                  </Link>

                  <Link
                    href="/interviews"
                    className="ui-btn-secondary w-full sm:w-auto h-11 px-5 text-sm font-medium"
                  >
                    <LayoutDashboard className="w-4 h-4 text-zinc-500" />
                    <span>Recruiter Workspace</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="ui-btn-primary w-full sm:w-auto h-11 px-6 text-sm font-medium shadow-sm"
                  >
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                  </Link>

                  <Link
                    href="/signup"
                    className="ui-btn-secondary w-full sm:w-auto h-11 px-5 text-sm font-medium"
                  >
                    <span>Request Recruiter Access</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Hero Visual Product Preview (Interactive Dual Mockup) */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-zinc-200/90 bg-[#fafafa] p-3 sm:p-5 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Left Column: Live Candidate Voice Room Preview */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/80 p-5 sm:p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-zinc-900">Live Voice Assessment</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200/60">
                      Question 2 of 4
                    </span>
                  </div>

                  {/* AI Interviewer Audio Voice Prompt */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                      <Volume2 className="w-3.5 h-3.5 text-zinc-700" />
                      <span>AI Interviewer Vocal Prompt</span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/70 text-xs sm:text-sm font-medium text-zinc-900 leading-relaxed">
                      &ldquo;Can you explain how you would design an optimistic UI update with automatic rollback in a React application?&rdquo;
                    </div>
                  </div>

                  {/* Harmonic Audio Soundwave Visualizer */}
                  <div className="py-2 flex items-center justify-center gap-1.5 h-12 bg-zinc-950 rounded-lg px-4">
                    <span className="w-1 h-3 bg-zinc-500 rounded-full animate-pulse" />
                    <span className="w-1 h-6 bg-zinc-400 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-8 bg-zinc-200 rounded-full animate-pulse delay-100" />
                    <span className="w-1 h-5 bg-white rounded-full animate-pulse delay-150" />
                    <span className="w-1 h-7 bg-zinc-300 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-4 bg-zinc-500 rounded-full animate-pulse delay-200" />
                    <span className="w-1 h-9 bg-white rounded-full animate-pulse delay-100" />
                    <span className="w-1 h-5 bg-zinc-300 rounded-full animate-pulse" />
                    <span className="w-1 h-7 bg-zinc-400 rounded-full animate-pulse delay-150" />
                    <span className="w-1 h-3 bg-zinc-500 rounded-full animate-pulse" />
                  </div>

                  {/* Real-time Candidate Spoken Transcript */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                        <Mic className="w-3.5 h-3.5 text-emerald-600" /> Candidate Spoken Transcript
                      </span>
                      <span className="text-[11px] text-zinc-400">Transcribing voice in real time</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-700 leading-relaxed font-sans">
                      &ldquo;I apply the optimistic update to local cache immediately so the user experiences zero lag. If the network promise rejects, I catch the error, revert the cache snapshot, and dispatch a non-intrusive error notification.&rdquo;
                    </div>
                  </div>
                </div>

                {/* Right Column: Instant Recruiter Evaluation Scorecard Preview */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200/80 p-5 sm:p-6 space-y-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 block">Candidate Evaluation</span>
                        <span className="text-[11px] text-zinc-500">Frontend Architect • 25 min</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Strong Hire (92/100)
                      </span>
                    </div>

                    {/* Rubric Breakdown */}
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-zinc-700">State Architecture</span>
                          <span className="font-semibold text-zinc-900">95%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900 rounded-full" style={{ width: '95%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-zinc-700">Component Lifecycles</span>
                          <span className="font-semibold text-zinc-900">92%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900 rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-zinc-700">Error Handling &amp; Rollback</span>
                          <span className="font-semibold text-zinc-900">90%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900 rounded-full" style={{ width: '90%' }} />
                        </div>
                      </div>
                    </div>

                    {/* AI Feedback Snippet */}
                    <div className="mt-5 p-3 rounded-lg bg-zinc-50 border border-zinc-200/60 text-xs text-zinc-600 space-y-1">
                      <span className="font-semibold text-zinc-900 block text-[11px] uppercase tracking-wider">
                        Qualitative Assessment
                      </span>
                      <p className="leading-relaxed">
                        Candidate demonstrated clear command over asynchronous reconciliation and client state rollbacks.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100">
                    <Link
                      href={isAuthenticated ? "/reports" : "/login"}
                      className="text-xs font-medium text-zinc-900 hover:text-zinc-600 flex items-center justify-between transition-colors"
                    >
                      <span>Explore Recruiter Dossiers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Role Rubric Calibration Sandbox */}
      <section className="py-20 bg-[#fcfcfd] border-b border-zinc-200/80">
        <div className="ui-page-container">
          <div className="max-w-2xl mx-auto text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
              Calibrated for engineering domains
            </h2>
            <p className="text-sm text-zinc-600">
              Select an engineering role to preview how rubrics, questions, and evaluations adapt.
            </p>
          </div>

          {/* Segmented Role Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto mb-8">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActiveRole(preset)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeRole.id === preset.id
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Dynamic Role Calibration Card */}
          <div className="max-w-4xl mx-auto ui-card p-6 sm:p-8 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-lg font-semibold text-zinc-950">{activeRole.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Calibrated for <span className="font-medium text-zinc-900">{activeRole.seniority}</span> tier • Expected duration: {activeRole.duration}
                </p>
              </div>
              <Link
                href={isAuthenticated ? "/config" : "/login"}
                className="ui-btn-primary h-9 px-4 text-xs font-medium self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Assessment for this Role</span>
              </Link>
            </div>

            {/* Question & Spoken Answer Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/70 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Sample Vocal Question
                </span>
                <p className="text-xs sm:text-sm font-medium text-zinc-900 leading-relaxed">
                  &ldquo;{activeRole.sampleQuestion}&rdquo;
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/70 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Candidate Spoken Response
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  &ldquo;{activeRole.sampleAnswer}&rdquo;
                </p>
              </div>
            </div>

            {/* Evaluated Competencies */}
            <div className="pt-2 space-y-3">
              <span className="text-xs font-semibold text-zinc-900 block">
                Target Competency Scores
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeRole.competencies.map((comp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-zinc-200/80 bg-white space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-700 truncate">{comp.name}</span>
                      <span className="font-semibold text-zinc-900">{comp.score}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${comp.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Recruiter Workflow */}
      <section className="py-20 bg-white border-b border-zinc-200/80">
        <div className="ui-page-container">
          <div className="max-w-2xl mx-auto text-center mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
              From job description to verified candidate scorecard
            </h2>
            <p className="text-sm text-zinc-600">
              A frictionless workflow designed for fast engineering teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="ui-card p-6 space-y-3 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold flex items-center justify-center text-xs">
                1
              </div>
              <h3 className="font-semibold text-zinc-950 text-base tracking-tight">
                Calibrate role &amp; depth
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Specify engineering requirements, target tech stack, seniority tier (Junior to Staff), question depth, and assessment duration.
              </p>
            </div>

            <div className="ui-card p-6 space-y-3 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold flex items-center justify-center text-xs">
                2
              </div>
              <h3 className="font-semibold text-zinc-950 text-base tracking-tight">
                Dispatch single-use link
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Generate a secure, expiring URL. Candidates open the assessment from any browser without software installation or friction.
              </p>
            </div>

            <div className="ui-card p-6 space-y-3 bg-white">
              <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold flex items-center justify-center text-xs">
                3
              </div>
              <h3 className="font-semibold text-zinc-950 text-base tracking-tight">
                Review structured dossier
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Inspect AI-evaluated performance metrics, category ratings, full verbatim transcripts, and explicit hiring recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Traditional Screening vs IntervueAI Comparison */}
      <section className="py-20 bg-[#fcfcfd] border-b border-zinc-200/80">
        <div className="ui-page-container">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
              Why hiring teams switch to IntervueAI
            </h2>
            <p className="text-sm text-zinc-600">
              Replace scheduling bottlenecks and subjective impressions with standardized voice evaluations.
            </p>
          </div>

          <div className="max-w-4xl mx-auto ui-card overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200/80">
              
              {/* Traditional Phone Screens */}
              <div className="p-6 sm:p-8 space-y-4 bg-zinc-50/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  Traditional First-Round Phone Screens
                </span>
                <ul className="space-y-3.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>3 to 7 days lost coordinating recruiter calendars</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Inconsistent question difficulty across different interviewers</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Subjective recruiter notes lacking verbatim proof</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>Senior engineering hours wasted on unqualified initial filters</span>
                  </li>
                </ul>
              </div>

              {/* IntervueAI Voice Assessments */}
              <div className="p-6 sm:p-8 space-y-4 bg-white">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block">
                  IntervueAI Autonomous Voice Screening
                </span>
                <ul className="space-y-3.5 text-xs text-zinc-700">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Instant candidate intake at candidate convenience</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Strictly standardized rubrics calibrated to exact seniority tiers</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Verbatim spoken transcripts with timestamped evidence</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Zero engineering time spent before qualified final rounds</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 bg-white border-b border-zinc-200/80">
        <div className="ui-page-container">
          <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-sm text-zinc-600">
              Everything you need to know about setting up and running voice assessments.
            </p>
          </div>

          <div className="max-w-3xl mx-auto divide-y divide-zinc-200/80 border-y border-zinc-200/80">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left gap-4 py-1 text-sm font-semibold text-zinc-950 hover:text-zinc-600 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      openFaqIndex === idx ? 'rotate-180 text-zinc-900' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed pr-6">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-[#fcfcfd]">
        <div className="ui-page-container">
          <div className="max-w-4xl mx-auto p-8 sm:p-10 rounded-2xl border border-zinc-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-semibold text-zinc-950 tracking-tight">
                Ready to screen your next engineering candidate?
              </h3>
              <p className="text-zinc-600 text-xs sm:text-sm">
                Set up a custom assessment link in less than a minute.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/config"
                    className="ui-btn-primary h-11 px-6 whitespace-nowrap shadow-sm text-xs font-semibold w-full sm:w-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Assessment</span>
                  </Link>
                  <Link
                    href="/interviews"
                    className="ui-btn-secondary h-11 px-5 whitespace-nowrap text-xs font-medium w-full sm:w-auto"
                  >
                    <span>View Workspace</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="ui-btn-primary h-11 px-6 whitespace-nowrap shadow-sm text-xs font-semibold w-full sm:w-auto"
                  >
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="ui-btn-secondary h-11 px-5 whitespace-nowrap text-xs font-medium w-full sm:w-auto"
                  >
                    <span>Sign Up</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
