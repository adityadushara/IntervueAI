'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Clean minimal footer for candidates during assessment
  const isCandidateRoute = pathname?.startsWith('/interview/') && pathname !== '/interview';
  if (isCandidateRoute) {
    return (
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© 2026 IntervueAI Assessment Platform. All candidate submissions are securely encrypted and forwarded to the hiring team.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                IntervueAI
                <span className="text-[10px] uppercase font-bold tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded">
                  Recruiter Edition
                </span>
              </p>
              <p className="text-xs text-slate-500">
                AI-powered recruitment interview platform for hiring teams & engineering managers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Overview
            </Link>
            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
              Interviews & Links
            </Link>
            <Link href="/config" className="hover:text-indigo-600 transition-colors">
              Create Interview
            </Link>
            <Link href="/dashboard?tab=reports" className="hover:text-indigo-600 transition-colors">
              Candidate Reports
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 IntervueAI. Built with Next.js, TypeScript & Tailwind CSS.</p>
          <p className="flex items-center gap-1.5 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Enterprise Candidate Assessment Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
