'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function InterviewIndexPage() {
  return (
    <div className="py-20 bg-slate-50 flex-1 flex items-center justify-center px-4">
      <div className="ui-card-container w-full">
        <div className="ui-card p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Interview Invitation Required
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidates must access assessments through their unique time-limited invitation links provided by the recruiter (e.g. <code className="font-mono text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">/interview/[token]</code>).
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              href="/config"
              className="ui-btn-primary w-full"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Generate New Interview Link</span>
            </Link>

            <Link
              href="/dashboard"
              className="ui-btn-secondary w-full"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Recruiter Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
