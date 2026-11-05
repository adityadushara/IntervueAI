import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Award, 
  Clock, 
  BrainCircuit, 
  Layers, 
  Code2, 
  Users,
  ChevronRight
} from 'lucide-react';

export default function HomePage() {
  const popularRoles = [
    {
      title: 'Frontend Engineer',
      level: 'Senior Level',
      type: 'React & Core Architecture',
      description: 'Server components, Web Vitals, hydration performance, state colocation.',
      color: 'from-blue-500/10 to-indigo-500/10 text-indigo-700 border-indigo-200'
    },
    {
      title: 'Backend Engineer',
      level: 'Mid to Senior',
      type: 'Distributed Systems & SQL',
      description: 'ACID transactions, optimistic locking, Redis rate-limiting, stateless auth.',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200'
    },
    {
      title: 'System Architect',
      level: 'Lead / Staff',
      type: 'Large-scale Design',
      description: 'Microservices, message queues, push notification fan-outs, URL shorteners.',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200'
    },
    {
      title: 'Behavioral & Leadership',
      level: 'All Seniorities',
      type: 'STAR Method & Culture',
      description: 'Cross-functional disagreements, incident postmortems, managing tech debt.',
      color: 'from-violet-500/10 to-purple-500/10 text-violet-700 border-violet-200'
    }
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/30 to-slate-50 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Day 1: Fully Working Mock AI Interviewer Engine</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Master Your Tech Interviews with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Mock AI Feedback
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              Step into an immersive, zero-pressure simulated interview. Tailor questions to your target role, answer in real-time, and get scored on communication, technical depth, and problem-solving.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/config"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <span>Configure & Start Interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs hover:border-slate-400 transition-all"
              >
                <span>View Dashboard</span>
              </Link>
            </div>

            {/* Trust points */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No signup required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Role-tailored questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Instant scorecard & review
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background grid subtle effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 md:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 mb-2">
              Built For High-Velocity Practice
            </h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              Everything you need to polish your answers before the live round
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-7 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Role & Level Customization
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Target Frontend, Backend, System Architecture, or custom roles. Configure junior, mid, senior, or lead difficulty with custom tech topics.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                Flexible configuration <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-5">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Interactive Answer Studio
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Focus on crisp, structured explanations with real-time character counters, elapsed timer tracking, and helpful hint toggles.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-semibold text-violet-600 flex items-center gap-1">
                Distraction-free environment <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Performance Scorecard
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Get scored on communication, technical depth, and problem-solving. Review strengths and improvement areas saved to your personal dashboard.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                Session history tracking <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Tracks Preview Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Explore Available Interview Tracks
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Practice popular interview topics with our curated question banks.
              </p>
            </div>
            <Link
              href="/config"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Start custom configuration <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoles.map((role) => (
              <div
                key={role.title}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {role.level}
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">
                      {role.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-2">
                    {role.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {role.description}
                  </p>
                </div>

                <Link
                  href="/config"
                  className="w-full text-center py-2 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Practice this track
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step "How It Works" Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 mb-2">
              Simple 3-Step Flow
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              How IntervueAI Prepares You
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Configure Your Session
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Provide your candidate name, choose role seniority, interview type, and select your target technical tags.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Answer Real Questions
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The simulated AI interviewer poses real-world challenges. Type your thoughts, use hints if needed, and submit each response.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Analyze & Track Progress
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Receive instant evaluations, review key strengths, and track your historical interview progress on your dashboard.
              </p>
            </div>
          </div>

          {/* Quick CTA Box */}
          <div className="mt-14 p-8 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold mb-1">
                Ready to practice your first mock interview?
              </h3>
              <p className="text-slate-300 text-sm">
                Zero setup required. Takes under 5 minutes to complete a quick 3-question warmup.
              </p>
            </div>
            <Link
              href="/config"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-950 font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm whitespace-nowrap"
            >
              Start Free Mock Interview <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
