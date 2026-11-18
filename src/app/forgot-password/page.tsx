'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailClean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailClean || !emailRegex.test(emailClean)) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to process request. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error. Please try again.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-sm mx-auto">
        {/* Brand & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-950 text-white shadow-xs mb-3">
            <svg className="w-5 h-5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            Password Recovery
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Enter your registered email address to receive reset instructions
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7">
          {isSubmitted ? (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-zinc-950 mb-1">Check Your Email</h2>
              <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                If an account exists for <strong className="text-zinc-900 font-semibold">{email}</strong>, we have sent a secure recovery link.
              </p>
              <div className="p-3 bg-zinc-50 border border-zinc-200/70 rounded-lg text-xs text-zinc-500 mb-5 text-left font-sans text-[11px]">
                <span className="font-semibold text-zinc-800 block mb-0.5">Didn&apos;t receive an email?</span>
                Verify your work email address or check your organizational spam quarantine.
              </div>
              <Link
                href="/login"
                className="ui-btn-primary w-full h-9 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorMessage && (
                <div role="alert" className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Reset Request Failed</span>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
                >
                  Work Email Address
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
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs font-mono"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-btn-primary w-full h-10 text-xs font-semibold shadow-2xs mt-1"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Sending Reset Link...</span>
                  </span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
