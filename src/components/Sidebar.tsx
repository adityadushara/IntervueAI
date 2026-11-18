'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Layers, 
  Users, 
  FileText, 
  Settings, 
  PlusCircle, 
  LogOut, 
  Menu, 
  X,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    {
      label: 'Interviews',
      href: '/interviews',
      icon: Layers,
      match: (path: string) => path === '/interviews' || path === '/dashboard',
    },
    {
      label: 'Candidates',
      href: '/candidates',
      icon: Users,
      match: (path: string) => path === '/candidates',
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: FileText,
      match: (path: string) => path === '/reports',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      match: (path: string) => path === '/settings',
    },
  ];

  return (
    <>
      {/* Mobile Top Header (only visible on mobile screens < md) */}
      <div className="md:hidden sticky top-0 z-40 h-14 w-full bg-white border-b border-zinc-200/80 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <svg className="w-3.5 h-3.5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-950">
            Intervue<span className="text-zinc-500 font-normal">AI</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          aria-label="Toggle navigation drawer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-zinc-200/80 min-h-screen sticky top-0 h-screen flex-col justify-between p-4 z-30">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/interviews" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs transition-transform group-hover:scale-95">
                <svg className="w-4 h-4 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-zinc-950">
                  Intervue<span className="text-zinc-500 font-normal">AI</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-medium -mt-0.5">
                  Recruiter Workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Create Assessment Action CTA */}
          <div className="px-1">
            <Link
              href="/config"
              className="ui-btn-primary w-full h-9 px-3 text-xs font-semibold justify-center gap-1.5 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Assessment</span>
            </Link>
          </div>

          {/* Navigation Items (Strictly NO Overview) */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 block mb-2">
              Workspace
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom User Card & Logout */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {user?.fullName || 'Recruiter'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate" title={user?.email}>
                  {user?.email || 'recruiter@company.com'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => await logout()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex">
          <div className="w-64 max-w-[80vw] bg-white h-full p-4 flex flex-col justify-between shadow-xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs">
                    <svg className="w-3.5 h-3.5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-zinc-950">IntervueAI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <Link
                href="/config"
                onClick={() => setMobileOpen(false)}
                className="ui-btn-primary w-full h-9 px-3 text-xs font-semibold justify-center gap-1.5 shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Assessment</span>
              </Link>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-950 font-semibold'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span className="font-semibold text-zinc-900">{user?.fullName || 'Recruiter'}</span>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await logout();
                  }}
                  className="text-xs text-rose-600 font-semibold"
                >
                  Sign Out
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
