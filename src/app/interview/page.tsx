'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, ArrowRight, ShieldAlert, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function InterviewIndexPage() {
  return (
    <div className="py-20 bg-slate-50 flex-1 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Interview Invitation Required
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Candidates must access assessments through their unique time-limited invitation links provided by the recruiter (e.g. <code className="font-mono text-indigo-600">/interview/[token]</code>).
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/config"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Generate New Interview Link
          </Link>

          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Recruiter Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
