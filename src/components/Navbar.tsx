'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bot, 
  PlusCircle, 
  Menu, 
  X, 
  Layers, 
  FileText, 
  Users, 
  Settings as SettingsIcon,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If candidate is on the interview assessment route (/interview/[token]), hide recruiter nav
  const isCandidateRoute = pathname?.startsWith('/interview/') && pathname !== '/interview';
  if (isCandidateRoute) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="ui-page-container h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Intervue<span className="text-indigo-600">AI</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-500 -mt-1">
                Candidate Assessment Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Verified Invitation
            </span>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Interviews', href: '/dashboard?tab=interviews', icon: Layers },
    { label: 'Create Interview', href: '/config', icon: PlusCircle },
    { label: 'Candidates', href: '/dashboard?tab=candidates', icon: Users },
    { label: 'Reports', href: '/dashboard?tab=reports', icon: FileText },
    { label: 'Settings', href: '/dashboard?tab=settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="ui-page-container">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform duration-200">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Intervue<span className="text-indigo-600">AI</span>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Recruiter
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium -mt-1">
                AI Recruitment & Assessment Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href === '/' && pathname === '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'text-indigo-600 bg-indigo-50/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className="w-4 h-4 opacity-75" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/dashboard"
              className="ui-btn-secondary h-9 px-3 text-xs"
            >
              Dashboard
            </Link>
            <Link
              href="/config"
              className="ui-btn-primary h-9 px-3.5 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Interview</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/config"
              onClick={() => setMobileMenuOpen(false)}
              className="ui-btn-primary w-full text-xs h-10"
            >
              Create New Interview
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
