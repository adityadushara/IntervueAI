'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Full-width minimal footer for candidates during assessment
  const isCandidateRoute = pathname?.startsWith('/interview/') && pathname !== '/interview';
  if (isCandidateRoute) {
    return (
      <footer className="w-full border-t border-zinc-200/80 bg-white py-4 mt-auto">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-500 text-left">
          <p className="text-zinc-700 font-medium">IntervueAI Candidate Assessment</p>
          <p className="text-zinc-400">Responses are submitted directly to the hiring organization.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-zinc-200/80 bg-white mt-auto">
      {/* Full-width container stretching from left to right */}
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-12 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand info (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-zinc-950 tracking-tight">IntervueAI</span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              Automated technical voice screening for engineering hiring. Set up role rubrics, invite candidates with single-use links, and receive structured evaluation dossiers.
            </p>
          </div>

          {/* Navigation Column 1: Product */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <Link href="/" className="hover:text-zinc-950 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href={isAuthenticated ? "/config" : "/login"} className="hover:text-zinc-950 transition-colors">
                  Create Assessment
                </Link>
              </li>
              {isAuthenticated && (
                <li>
                  <Link href="/interviews" className="hover:text-zinc-950 transition-colors">
                    Recruiter Workspace
                  </Link>
                </li>
              )}
              <li>
                <Link href="/login" className="hover:text-zinc-950 transition-colors">
                  Recruiter Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2: Workspace (Visible only when authenticated) */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              {isAuthenticated ? 'Workspace' : 'Access'}
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link href="/interviews" className="hover:text-zinc-950 transition-colors">
                      Interviews &amp; Links
                    </Link>
                  </li>
                  <li>
                    <Link href="/candidates" className="hover:text-zinc-950 transition-colors">
                      Candidates Directory
                    </Link>
                  </li>
                  <li>
                    <Link href="/reports" className="hover:text-zinc-950 transition-colors">
                      Evaluation Dossiers
                    </Link>
                  </li>
                  <li>
                    <Link href="/settings" className="hover:text-zinc-950 transition-colors">
                      Workspace Settings
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="hover:text-zinc-950 transition-colors">
                      Recruiter Sign In
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="hover:text-zinc-950 transition-colors">
                      Request Recruiter Access
                    </Link>
                  </li>
                  <li>
                    <Link href="/forgot-password" className="hover:text-zinc-950 transition-colors">
                      Password Recovery
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Navigation Column 3: Engineering Roles */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Rubrics</h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li>
                <Link href="/config" className="hover:text-zinc-950 transition-colors">
                  Frontend Engineering
                </Link>
              </li>
              <li>
                <Link href="/config" className="hover:text-zinc-950 transition-colors">
                  Backend &amp; Distributed Systems
                </Link>
              </li>
              <li>
                <Link href="/config" className="hover:text-zinc-950 transition-colors">
                  Full-Stack Architecture
                </Link>
              </li>
              <li>
                <Link href="/config" className="hover:text-zinc-950 transition-colors">
                  DevOps &amp; Infrastructure
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Full-width Bottom Bar stretching edge-to-edge */}
        <div className="mt-12 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500 text-left">
          <p>© {new Date().getFullYear()} IntervueAI. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-500">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-zinc-900 transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link href="/" className="hover:text-zinc-900 transition-colors">Security Overview</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
