'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlusCircle, 
  Menu, 
  X, 
  Layers, 
  FileText, 
  Users, 
  Settings as SettingsIcon,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }

  // If candidate is on the interview assessment route (/interview/[token]), render distraction-free header
  const isCandidateRoute = pathname?.startsWith('/interview/') && pathname !== '/interview';
  if (isCandidateRoute) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="ui-page-container h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
              <svg className="w-4 h-4 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-950">
                Intervue<span className="text-zinc-500 font-normal">AI</span>
              </span>
              <span className="h-3 w-[1px] bg-zinc-200" />
              <span className="text-xs font-medium text-zinc-500">
                Candidate Assessment Terminal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              Secure Session
            </span>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    { label: 'Interviews', href: '/interviews', icon: Layers },
    { label: 'Candidates', href: '/candidates', icon: Users },
    { label: 'Reports', href: '/reports', icon: FileText },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  // Compute initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="ui-page-container">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center shadow-xs group-hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-zinc-950">
                Intervue<span className="text-zinc-500 font-normal">AI</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/70 font-medium">
                Recruiter
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Only visible to authenticated recruiters */}
          {isAuthenticated && user && (
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const isActive = 
                  link.href === '/' 
                    ? pathname === '/' 
                    : pathname?.startsWith(link.href.split('?')[0]);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-zinc-950 bg-zinc-100/90'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action / Profile Menu */}
          <div className="hidden sm:flex items-center gap-2.5">
            {isLoading ? (
              <div className="w-24 h-8 bg-zinc-100 rounded-md animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href="/config"
                  className="ui-btn-primary h-8 px-3 text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Interview</span>
                </Link>

                {/* Recruiter Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    type="button"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                    className="flex items-center gap-2 p-1 pl-1.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 transition-colors text-left shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded bg-zinc-900 text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                      {getInitials(user.fullName)}
                    </div>
                    <div className="flex flex-col pr-0.5">
                      <span className="text-xs font-medium text-zinc-900 leading-tight truncate max-w-[110px]">
                        {user.fullName}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white border border-zinc-200 shadow-lg py-1.5 z-50 divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Identity Details */}
                      <div className="px-3.5 py-2.5">
                        <p className="text-xs font-semibold text-zinc-900 truncate">
                          {user.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                          {user.email}
                        </p>
                        {user.companyName && (
                          <span className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded border border-zinc-200/60">
                            {user.companyName}
                          </span>
                        )}
                      </div>

                      {/* Navigation Options */}
                      <div className="py-1">
                        <Link
                          href="/interviews"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Interviews &amp; Links</span>
                        </Link>
                        <Link
                          href="/reports"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Evaluation Reports</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
                        >
                          <SettingsIcon className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Workspace Settings</span>
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="py-1">
                        <button
                          onClick={async () => {
                            setProfileMenuOpen(false);
                            await logout();
                          }}
                          type="button"
                          className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50/60 transition-colors text-left"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="ui-btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/signup"
                  className="ui-btn-primary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          {isAuthenticated && user && (
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-zinc-900 text-white font-semibold text-xs flex items-center justify-center">
                  {getInitials(user.fullName)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900">{user.fullName}</p>
                  <p className="text-[10px] text-zinc-500 truncate max-w-[180px] font-mono">{user.email}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                }}
                className="text-xs text-rose-600 font-semibold p-1 hover:bg-rose-50 rounded flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {isAuthenticated && user && (
            <div className="flex flex-col space-y-0.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-md"
                  >
                    <Icon className="w-4 h-4 text-zinc-500" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                href="/config"
                onClick={() => setMobileMenuOpen(false)}
                className="ui-btn-primary w-full text-xs h-9"
              >
                Create New Interview
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ui-btn-secondary flex-1 text-xs h-9 justify-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ui-btn-primary flex-1 text-xs h-9 justify-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
