'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getAccessToken = () => {
    const queryToken = searchParams.get('token') || searchParams.get('access_token');
    if (queryToken) return queryToken;
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      return hashParams.get('access_token');
    }
    return null;
  };

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      setErrorMessage('Please ensure your new password satisfies all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const accessToken = getAccessToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update password. Your recovery link may have expired.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);

      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error updating password. Please try again.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 mb-1.5">
            Password Reset Complete
          </h1>

          <p className="text-xs text-zinc-600 leading-relaxed mb-5 font-sans">
            Your recruiter account password has been updated successfully. You will be redirected to the sign-in page momentarily.
          </p>

          <Link
            href="/login"
            className="ui-btn-primary w-full h-10 text-xs font-semibold"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Brand & Heading */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-950 text-white shadow-xs mb-3">
          <svg className="w-5 h-5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          Create New Password
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Enter and confirm your new recruiter access credentials
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7">
        {errorMessage && (
          <div role="alert" className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Password Update Error</span>
              {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {/* New Password */}
          <div>
            <label 
              htmlFor="newPassword" 
              className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs font-mono"
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

            {/* Checklist */}
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] bg-zinc-50 p-2 rounded border border-zinc-200/70 font-mono">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                {hasMinLength ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block" />}
                <span>8+ chars</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                {hasUpper ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block" />}
                <span>1 uppercase</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                {hasLower ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block" />}
                <span>1 lowercase</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                {hasNumber ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block" />}
                <span>1 number</span>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs font-mono"
                disabled={isSubmitting}
              />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary w-full h-10 mt-1 text-xs font-semibold shadow-2xs"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Updating Password...</span>
              </span>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
