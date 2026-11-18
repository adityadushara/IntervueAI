'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, PlusCircle, LayoutDashboard, KeyRound } from 'lucide-react';

export default function InterviewIndexPage() {
  return (
    <div className="py-24 bg-[#fcfcfd] flex-1 flex items-center justify-center px-4">
      <div className="ui-card-container w-full">
        <div className="ui-card p-8 sm:p-9 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-800 flex items-center justify-center mx-auto shadow-2xs">
            <KeyRound className="w-6 h-6 text-zinc-900" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/60">
              Access Restricted
            </span>
            <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">
              Invitation Token Required
            </h1>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
              Candidates must access assessments through their unique time-limited invitation links provided by the recruiter (e.g. <code className="font-mono text-zinc-900 bg-zinc-100 px-1 py-0.5 rounded border border-zinc-200/60">/interview/[token]</code>).
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/config"
              className="ui-btn-primary w-full text-xs font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Generate New Assessment Link</span>
            </Link>

            <Link
              href="/interviews"
              className="ui-btn-secondary w-full text-xs font-medium"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-zinc-500" />
              <span>Recruiter Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
