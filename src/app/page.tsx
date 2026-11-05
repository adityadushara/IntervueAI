'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Code2, 
  Users,
  ChevronRight,
  Briefcase,
  Clock,
  FileText,
  PlusCircle,
  Copy,
  Check
} from 'lucide-react';
import { getInterviews, getRecruiterMetrics } from '@/lib/storage';
import { InterviewInvitation, RecruiterDashboardMetrics } from '@/types/interview';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<RecruiterDashboardMetrics>({
    totalCreated: 0,
    activeLinks: 0,
    pendingInterviews: 0,
    completedInterviews: 0,
    expiredInterviews: 0,
  });
  const [recentInterviews, setRecentInterviews] = useState<InterviewInvitation[]>([]);

  useEffect(() => {
    const data = getInterviews();
    setMetrics(getRecruiterMetrics(data));
    setRecentInterviews(data.slice(0, 3));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Recruitment Interview Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Autonomous Technical Screening for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Modern Hiring Teams
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              Empower your recruitment pipeline. Configure custom engineering roles, generate time-limited invitation links, and let simulated AI interviewers conduct structured first-round assessments.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/config"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create New Interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs hover:border-slate-400 transition-all"
              >
                <span>Open Recruiter Dashboard</span>
              </Link>
            </div>

            {/* Trust points */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unique Time-Limited Invitation Links
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No Candidate Account Friction
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Private Recruiter Evaluation Reports
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background grid subtle effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      </section>

      {/* Recruiter Quick Metrics Overview */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Interviews Created
              </span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalCreated}</p>
              <span className="text-[11px] text-slate-500">Pipeline total</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Active Invitation Links
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.activeLinks}</p>
              <span className="text-[11px] text-emerald-700 font-medium">Ready for candidate intake</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Pending Interviews
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">{metrics.pendingInterviews}</p>
              <span className="text-[11px] text-indigo-700 font-medium">In pipeline</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Completed Reports
              </span>
              <p className="text-3xl font-extrabold text-violet-600 mt-1">{metrics.completedInterviews}</p>
              <span className="text-[11px] text-violet-700 font-medium">Ready for hiring review</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Recruiter Workflow */}
      <section className="py-16 md:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 mb-2">
              Recruiter Workflow
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">
              How IntervueAI Powers Your Hiring Funnel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Configure Job & Requirements
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Define the job role, required skills, seniority level, question count, and difficulty. Questions are automatically tailored to the profile.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Send Unique Invitation Link
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate a time-limited link (24h/48h). Candidates click the link, verify their identity with their name and email, and start answering questions.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-4 shadow-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Review Confidential Reports
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access completed transcripts, response durations, and structured recommendations inside your recruiter dashboard to make fast hiring decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter Action Banner */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Start Screening Immediately
              </span>
              <h3 className="text-2xl font-bold">
                Ready to configure your next interview invitation?
              </h3>
              <p className="text-slate-300 text-sm max-w-xl">
                Takes under 60 seconds to configure a Frontend Developer or Backend role and copy the invitation link.
              </p>
            </div>
            <Link
              href="/config"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-950 font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              Create Interview Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
