'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  User, 
  Building2, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<{
    email: string;
    message: string;
    requiresEmailVerification: boolean;
  } | null>(null);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    const nameClean = fullName.trim();
    if (!nameClean || nameClean.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailClean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailClean || !emailRegex.test(emailClean)) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
      setErrorMessage('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password confirmation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: nameClean,
          email: emailClean,
          companyName: companyName.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit registration request.');
        setIsSubmitting(false);
        return;
      }

      setRegisteredSuccess({
        email: emailClean,
        message: data.message || 'Your recruiter account has been registered and is pending administrator review.',
        requiresEmailVerification: Boolean(data.requiresEmailVerification),
      });
      setIsSubmitting(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error during registration. Please try again.';
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  };

  // If successfully registered, show confirmation screen
  if (registeredSuccess) {
    return (
      <div className="w-full flex items-center justify-center py-6 px-4 sm:px-6">
        <div className="w-full max-w-sm mx-auto">
          <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-4 shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100/70 text-amber-800 border border-amber-200 mb-2 font-medium">
              Account Under Review
            </span>

            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 mb-2">
              Registration Received
            </h1>

            <p className="text-xs text-zinc-600 leading-relaxed mb-5 font-sans">
              Thank you for registering <strong className="text-zinc-900 font-semibold">{registeredSuccess.email}</strong>. 
              {registeredSuccess.requiresEmailVerification
                ? ' Please check your email inbox to verify your address first.'
                : ' All recruiter accounts require administrator approval before platform access is enabled.'}
            </p>

            <div className="bg-zinc-50 rounded-lg p-3.5 border border-zinc-200/80 text-left space-y-1.5 mb-5 font-mono text-[11px] text-zinc-600">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 font-sans">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                <span>Provisioning Status</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-zinc-500 font-sans">
                <li>Profile recorded in multi-tenant registry</li>
                <li>Admin notification dispatched</li>
                <li>Approval notice will be sent upon verification</li>
              </ul>
            </div>

            <Link
              href="/login"
              className="ui-btn-primary w-full h-10 text-xs font-semibold"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Request Recruiter Access
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Create an account to configure AI interviews and evaluate candidates
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-6 sm:p-7">
          {/* Notice about controlled registration */}
          <div className="mb-5 p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-zinc-700 text-xs flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-zinc-900 font-medium">Enterprise Control:</strong> New recruiter accounts require administrator approval before accessing candidate scorecards.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div role="alert" className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Registration Error</span>
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Full Name */}
            <div>
              <label 
                htmlFor="fullName" 
                className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
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
                  placeholder="jane.doe@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs font-mono"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label 
                htmlFor="companyName" 
                className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
              >
                Organization <span className="text-zinc-400 font-sans lowercase">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <input
                  id="companyName"
                  type="text"
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Global Tech"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200/90 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 transition-colors shadow-2xs"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  id="password"
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

              {/* Password complexity checklist */}
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
                  <span>Submitting Request...</span>
                </span>
              ) : (
                <>
                  <span>Submit Account Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing account link */}
        <div className="text-center mt-5">
          <p className="text-xs text-zinc-500">
            Already have an approved account?{' '}
            <Link 
              href="/login" 
              className="font-medium text-zinc-900 hover:underline transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
