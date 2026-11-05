'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Sparkles, LayoutDashboard, PlusCircle, Play, Menu, X } from 'lucide-react';
import { getActiveSession } from '@/lib/storage';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    // Check if there is an in-progress session
    const checkActive = () => {
      const active = getActiveSession();
      setHasActiveSession(!!active && active.status === 'in_progress');
    };
    checkActive();

    // Listen to storage events to update badge
    window.addEventListener('storage', checkActive);
    return () => window.removeEventListener('storage', checkActive);
  }, [pathname]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Configure Interview', href: '/config' },
    { label: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Intervue<span className="text-indigo-600">AI</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Sparkles className="w-2.5 h-2.5" /> Mock
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium -mt-1">AI Interview Practice</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {hasActiveSession && (
              <Link
                href="/interview"
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse hover:bg-amber-100 transition-colors"
              >
                <Play className="w-3 h-3 fill-amber-600 text-amber-600" />
                Resume Session
              </Link>
            )}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              History
            </Link>

            <Link
              href="/config"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow-indigo-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              Start Mock Interview
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {hasActiveSession && (
              <Link
                href="/interview"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
              >
                <Play className="w-3 h-3 fill-amber-600" />
                Resume
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {hasActiveSession && (
              <Link
                href="/interview"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-amber-600" />
                Resume In-Progress Interview
              </Link>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/config"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm"
            >
              Start Mock Interview
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 px-4 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
