import React from 'react';
import Link from 'next/link';
import { Bot, Heart, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Footer() {
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
                <span className="text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  Day 1 Foundation
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Mock technical interviews with realistic question banks & scorecards.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <Link href="/config" className="hover:text-indigo-600 transition-colors">
              Configure Interview
            </Link>
            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
              Candidate Dashboard
            </Link>
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Mock AI Ready (Gemini Integration: Day 2)
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 IntervueAI. Built with Next.js, TypeScript & Tailwind CSS.</p>
          <p className="flex items-center gap-1">
            Engineered for realistic interview preparation
          </p>
        </div>
      </div>
    </footer>
  );
}
