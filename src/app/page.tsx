'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  PlusCircle 
} from 'lucide-react';
import { getInterviews, getRecruiterMetrics } from '@/lib/storage';
import { RecruiterDashboardMetrics } from '@/types/interview';

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<RecruiterDashboardMetrics>({
    totalCreated: 0,
    activeLinks: 0,
    pendingInterviews: 0,
    completedInterviews: 0,
    expiredInterviews: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = getInterviews();
      setMetrics(getRecruiterMetrics(data));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 pt-16 pb-20 md:pt-20 md:pb-24 border-b border-slate-200">
        <div className="ui-page-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Recruitment Interview Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Autonomous Technical Screening for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                Modern Hiring Teams
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Empower your recruitment pipeline. Configure custom engineering roles, generate time-limited invitation links, and let simulated AI interviewers conduct structured first-round assessments.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/config"
                className="ui-btn-primary w-full sm:w-auto h-12 px-7 text-sm font-bold shadow-md hover:shadow-indigo-200"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="ui-btn-secondary w-full sm:w-auto h-12 px-6 text-sm"
              >
                <span>Open Recruiter Dashboard</span>
              </Link>
            </div>

            {/* Trust points */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unique Time-Limited Links
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero Candidate Friction
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confidential Recruiter Reports
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f01a_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f01a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      </section>

      {/* Recruiter Quick Metrics Overview */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="ui-page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="ui-card p-5 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Interviews Created
              </span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalCreated}</p>
              <span className="text-[11px] text-slate-400">Pipeline total</span>
            </div>

            <div className="ui-card p-5 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Active Invitation Links
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.activeLinks}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Ready for candidate intake</span>
            </div>

            <div className="ui-card p-5 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
                Pending Interviews
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">{metrics.pendingInterviews}</p>
              <span className="text-[11px] text-indigo-600 font-semibold">In pipeline</span>
            </div>

            <div className="ui-card p-5 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 block">
                Completed Reports
              </span>
              <p className="text-3xl font-extrabold text-violet-600 mt-1">{metrics.completedInterviews}</p>
              <span className="text-[11px] text-violet-700 font-semibold">Ready for hiring review</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Recruiter Workflow */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="ui-page-container">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-widest text-indigo-600 mb-2">
              Recruiter Workflow
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How IntervueAI Powers Your Hiring Funnel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="ui-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Configure Job & Candidate
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Define the hiring company, candidate name/email, required skills, seniority level, and question count.
              </p>
            </div>

            <div className="ui-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Send Unique Invitation Link
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a time-limited link. Candidates open it, see their pre-filled details, and click Start Interview.
              </p>
            </div>

            <div className="ui-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Review Confidential Reports
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access completed transcripts, response durations, and structured recommendations inside your recruiter dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recruiter Action Banner */}
      <section className="py-16 bg-white">
        <div className="ui-page-container">
          <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Start Screening Immediately
              </span>
              <h3 className="text-2xl font-bold">
                Ready to configure your next interview invitation?
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
                Takes under 60 seconds to configure a Frontend Developer or Backend role and generate the candidate invitation link.
              </p>
            </div>
            <Link
              href="/config"
              className="ui-btn-primary bg-white text-indigo-950 hover:bg-slate-100 shadow-sm whitespace-nowrap h-12 px-6"
            >
              <PlusCircle className="w-4 h-4 text-indigo-900" />
              <span>Create Interview Now</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
