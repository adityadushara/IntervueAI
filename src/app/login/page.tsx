'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  Sparkles 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/interviews';
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, redirectPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPendingApproval(false);

    // Client-side validation
    const emailClean = email.trim();
    if (!emailClean) {
      setErrorMessage('Please enter your work email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(emailClean, password);

      if (!result.success) {
        if (result.pendingApproval) {
          setIsPendingApproval(true);
          setErrorMessage(result.error || 'Your account is pending administrator approval.');
        } else {
          setErrorMessage(result.error || 'Invalid email or password. Please verify your credentials.');
        }
        setIsSubmitting(false);
        return;
      }

      router.push(redirectPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage(null);
    setIsPendingApproval(false);
    setIsSubmitting(true);
    setEmail('demo@intervue.ai');
    setPassword('DemoUser2026!');
    try {
      const result = await login('demo@intervue.ai', 'DemoUser2026!');
      if (!result.success) {
        if (result.pendingApproval) {
          setIsPendingApproval(true);
          setErrorMessage(result.error || 'The demo account is pending administrator approval.');
        } else {
          setErrorMessage(result.error || 'Failed to authenticate demo account.');
        }
        setIsSubmitting(false);
        return;
      }
      router.push(redirectPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during demo login.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Brand & Heading */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-950 text-white shadow-xs mb-3">
          <svg className="w-5 h-5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          Sign in to Intervue<span className="text-zinc-500 font-normal">AI</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Enter your recruiter credentials to manage candidates and assessments
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7">
        {/* Error / Alert banner */}
        {errorMessage && (
          <div 
            role="alert" 
            className={`mb-5 p-3.5 rounded-lg border flex items-start gap-2.5 text-xs ${
              isPendingApproval 
                ? 'bg-amber-50 border-amber-200 text-amber-900' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {isPendingApproval ? (
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed font-sans">
              <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                {isPendingApproval ? 'Access Pending Approval' : 'Authentication Error'}
              </span>
              {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Work Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label 
                htmlFor="password" 
                className="block text-xs font-medium text-zinc-700"
              >
                Password
              </label>
              <Link 
                href="/forgot-password" 
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary w-full h-10 text-xs font-semibold shadow-2xs mt-2"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating...</span>
              </span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Fast Demo Testing Access */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2.5 text-zinc-400 font-semibold tracking-wider font-mono">
              Fast Demo Testing
            </span>
          </div>
        </div>

        {/* Single-Click Demo Login Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isSubmitting}
          className="w-full h-10 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>One-Click Demo Login (demo@intervue.ai)</span>
        </button>

        {/* Security badge note */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
          <span>Protected by HttpOnly session tokens &amp; Postgres RLS</span>
        </div>
      </div>

      {/* Link to Signup */}
      <div className="text-center mt-5">
        <p className="text-xs text-zinc-500">
          Need a recruiter account?{' '}
          <Link 
            href="/signup" 
            className="font-medium text-zinc-900 hover:underline transition-colors"
          >
            Request recruiter access
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full flex items-center justify-center py-6 px-4 sm:px-6">
      <Suspense fallback={
        <div className="w-full max-w-sm mx-auto text-center p-8 bg-white rounded-xl border border-zinc-200">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-8 bg-zinc-200 rounded-lg mx-auto" />
            <div className="h-5 w-40 bg-zinc-200 rounded mx-auto" />
            <div className="h-3 w-56 bg-zinc-200 rounded mx-auto" />
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
