'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isCandidateRoute = pathname?.startsWith('/interview/') && pathname !== '/interview';
  const isWorkspaceRoute = ['/interviews', '/candidates', '/reports', '/settings', '/config', '/dashboard'].some(
    (prefix) => pathname === prefix || pathname?.startsWith(prefix + '/')
  );
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].some(
    (prefix) => pathname === prefix || pathname?.startsWith(prefix + '/')
  );

  // 1. Candidate Voice Assessment Room: Candidate Session Header & Candidate Session Footer
  if (isCandidateRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fcfcfd]">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </div>
    );
  }

  // 2. Authentication Pages (Sign in, Sign up, Password recovery): Pure focus on credentials, NO header, NO footer
  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#fcfcfd] py-6 px-4 sm:px-6">
        <main className="w-full flex-1 flex flex-col justify-center items-center">
          {children}
        </main>
      </div>
    );
  }

  // 3. Authenticated Recruiter Workspace: Modern Left Sidebar + Main App Content
  if (isWorkspaceRoute) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfd]">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // 4. Public / Marketing Routes (/, etc.): Top Navbar + Content + Full-width Footer
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfd]">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
