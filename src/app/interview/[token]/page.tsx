'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bot, 
  User, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  LogOut, 
  ShieldCheck, 
  FileText, 
  ArrowRight,
  Briefcase,
  Layers,
  Sparkles,
  Calendar,
  Lock,
  Mail,
  Check
} from 'lucide-react';
import { InterviewInvitation, CandidateAnswer } from '@/types/interview';
import { 
  getInterviewByToken, 
  startCandidateInterview, 
  submitCandidateAnswer, 
  completeCandidateInterview 
} from '@/lib/storage';
import { getCandidateGreeting, generateMockFeedbackForAnswer } from '@/lib/mockInterviewer';

function CandidateInterviewContent() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';

  // Data states
  const [invitation, setInvitation] = useState<InterviewInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<'invalid' | 'expired' | 'completed' | 'revoked' | null>(null);

  // Step 2: Candidate onboarding state
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Step 4: Active interview stage
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewerNote, setInterviewerNote] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [answerValidationError, setAnswerValidationError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Step 5: Completed state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorType('invalid');
      setIsLoading(false);
      return;
    }

    const found = getInterviewByToken(token);
    if (!found) {
      setErrorType('invalid');
      setIsLoading(false);
      return;
    }

    // Check status
    if (found.status === 'revoked') {
      setErrorType('revoked');
    } else if (found.status === 'completed') {
      setErrorType('completed');
    } else if (found.status === 'expired' || new Date(found.expiresAt).getTime() < Date.now()) {
      setErrorType('expired');
    } else {
      setInvitation(found);
      // If already has candidate info and was in_progress
      if (found.status === 'in_progress' && found.candidate) {
        setCandidateName(found.candidate.fullName);
        setCandidateEmail(found.candidate.email);
        setHasStarted(true);
        setCurrentQuestionIndex(found.answers?.length || 0);
        setQuestionStartTime(Date.now());
      }
    }

    setIsLoading(false);
  }, [token]);

  // Elapsed timer when interview is active
  useEffect(() => {
    if (!hasStarted || isSubmitted || errorType) return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, isSubmitted, errorType]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // STEP 2 -> STEP 3: Begin Interview
  const handleBeginInterview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormError(null);
    const updated = startCandidateInterview(token, {
      fullName: candidateName.trim(),
      email: candidateEmail.trim(),
    });

    if (updated) {
      setInvitation(updated);
      setHasStarted(true);
      setQuestionStartTime(Date.now());
    }
  };

  // STEP 4: Submit Current Answer
  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    const trimmed = currentAnswer.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    if (wordCount < 4) {
      setAnswerValidationError('Please provide a more detailed response (at least 4 words) before continuing.');
      return;
    }

    setAnswerValidationError(null);
    setIsEvaluating(true);

    const currentQ = invitation.questions[currentQuestionIndex];
    const timeSpent = Math.max(10, Math.round((Date.now() - (questionStartTime || Date.now())) / 1000));

    // Save answer into storage
    submitCandidateAnswer(token, currentQ.id, currentQ.text, trimmed, timeSpent);

    // Simulate AI interviewer transition
    setTimeout(() => {
      const isLast = currentQuestionIndex + 1 >= invitation.questions.length;
      const feedback = generateMockFeedbackForAnswer(
        currentQ,
        trimmed,
        currentQuestionIndex,
        invitation.questions.length
      );

      if (isLast) {
        // Complete the interview
        completeCandidateInterview(token, elapsedSeconds + timeSpent);
        setIsSubmitted(true);
        setIsEvaluating(false);
      } else {
        // Next question
        setCurrentQuestionIndex(prev => prev + 1);
        setCurrentAnswer('');
        setInterviewerNote(feedback);
        setShowHint(false);
        setQuestionStartTime(Date.now());
        setIsEvaluating(false);
      }
    }, 600);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Validating interview invitation...</p>
        </div>
      </div>
    );
  }

  // STEP 1: Error States (Invalid, Expired, Completed, Revoked)
  if (errorType) {
    const errorConfigs = {
      invalid: {
        title: 'Invalid interview invitation.',
        desc: 'The interview invitation link you entered is invalid or could not be found. Please check the URL or contact your hiring recruiter.',
        icon: AlertCircle,
        badge: 'Link Not Found',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      expired: {
        title: 'This interview invitation has expired.',
        desc: 'The time window allocated for this interview session has passed. Please contact the recruiter or hiring manager to request a new invitation link.',
        icon: Clock,
        badge: 'Expired Link',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      completed: {
        title: 'This interview has already been completed.',
        desc: 'Your assessment responses have already been recorded and securely submitted to the hiring team. Candidates cannot retake a completed session.',
        icon: CheckCircle2,
        badge: 'Assessment Complete',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      revoked: {
        title: 'This interview invitation has been revoked.',
        desc: 'This invitation was cancelled or revoked by the recruiter. Please contact your hiring coordinator for assistance.',
        icon: Lock,
        badge: 'Link Revoked',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      },
    };

    const cfg = errorConfigs[errorType];
    const Icon = cfg.icon;

    return (
      <div className="py-16 md:py-24 bg-slate-50 flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
            <Icon className="w-7 h-7 text-indigo-600" />
          </div>

          <div className="space-y-2">
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cfg.badgeColor}`}>
              {cfg.badge}
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {cfg.title}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              {cfg.desc}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              Token reference: <code className="font-mono text-slate-600">{token}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  // STEP 5: Final Submission Screen (Recruiter reports NOT exposed to candidate)
  if (isSubmitted) {
    return (
      <div className="py-16 md:py-24 bg-slate-50 flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5" /> Assessment Received
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Your interview has been submitted successfully.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Thank you, <strong className="text-slate-900">{candidateName}</strong>! Your answers for the{' '}
              <strong className="text-slate-900">{invitation.jobConfig.seniorityLevel} {invitation.jobConfig.jobTitle}</strong> position have been securely encrypted and forwarded to the hiring team.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-2">
            <div className="flex justify-between font-medium">
              <span>Position:</span>
              <span className="text-slate-900 font-bold">{invitation.jobConfig.jobTitle}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Questions Answered:</span>
              <span className="text-slate-900 font-bold">{invitation.questions.length}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Time Completed:</span>
              <span className="text-slate-900 font-bold">{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            The recruiting team will review your submission and reach out regarding subsequent steps. You may safely close this window.
          </p>
        </div>
      </div>
    );
  }

  // STEP 2: Candidate Introduction & Onboarding Page
  if (!hasStarted) {
    const { jobConfig } = invitation;

    return (
      <div className="py-12 md:py-16 bg-slate-50 flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  IntervueAI Candidate Assessment
                </span>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {jobConfig.seniorityLevel} {jobConfig.jobTitle}
                </h1>
              </div>
            </div>

            {/* Assessment Details Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Format</span>
                <span className="text-xs font-bold text-slate-900">{jobConfig.interviewType}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Difficulty</span>
                <span className="text-xs font-bold text-slate-900">{jobConfig.difficulty}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Questions</span>
                <span className="text-xs font-bold text-slate-900">{jobConfig.questionCount} Questions</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Duration</span>
                <span className="text-xs font-bold text-slate-900">~{jobConfig.expectedDurationMinutes} Mins</span>
              </div>
            </div>

            {/* Job Description & Required Skills */}
            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-800">Role Context:</p>
              <p className="leading-relaxed">{jobConfig.jobDescription}</p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                {jobConfig.requiredSkills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Candidate Instructions */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Interview Guidelines & Instructions
              </h3>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>This is an automated interview simulation conducted by IntervueAI on behalf of the hiring team.</li>
                <li>You will be presented with {jobConfig.questionCount} sequential questions.</li>
                <li>Please structure your responses thoroughly, discussing architectural reasoning and trade-offs.</li>
                <li>No candidate account creation is required. Your answers will be submitted directly to the recruiter.</li>
              </ul>
            </div>

            {/* Candidate Info Input Form */}
            <form onSubmit={handleBeginInterview} className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Candidate Verification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => {
                      setCandidateName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => {
                      setCandidateEmail(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="alex.morgan@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Begin Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: Active Professional Interview Stage
  const currentQ = invitation.questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex) / invitation.questions.length) * 100);
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-full">
      {/* Top Session Progress Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Question {currentQuestionIndex + 1} of {invitation.questions.length}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>{invitation.jobConfig.jobTitle}</span>
              <span className="text-slate-300">•</span>
              <span className="capitalize">{invitation.jobConfig.seniorityLevel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Interview</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Initial Greeting or Follow-up Feedback Notice */}
        {currentQuestionIndex === 0 && !interviewerNote && (
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
            <Bot className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 mb-0.5">AI Interviewer Greeting:</p>
              <p className="leading-relaxed">{getCandidateGreeting(invitation.jobConfig, candidateName)}</p>
            </div>
          </div>
        )}

        {interviewerNote && (
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3 animate-fadeIn">
            <Bot className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 mb-0.5">Interviewer Note:</p>
              <p className="leading-relaxed">{interviewerNote}</p>
            </div>
          </div>
        )}

        {/* Current Question Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bot className="w-6 h-6" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    IntervueAI Assessment Bot
                  </span>
                  <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {currentQ.category}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {invitation.jobConfig.interviewType} Focus
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQ.text}
              </h2>

              {currentQ.context && (
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  💡 <strong className="font-semibold text-slate-800">Context:</strong> {currentQ.context}
                </p>
              )}

              {/* Sample hints toggle */}
              {currentQ.sampleHints && currentQ.sampleHints.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showHint ? 'Hide Response Guidelines' : 'Need guidance on structure?'}
                  </button>

                  {showHint && (
                    <div className="mt-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-950 space-y-1">
                      <p className="font-bold text-amber-900">Key architectural areas to cover:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        {currentQ.sampleHints.map((hint, hIdx) => (
                          <li key={hIdx}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Candidate Response Textarea */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Your Response</h3>
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>{wordCount} words</span>
              <span className="text-slate-300">•</span>
              <span>{currentAnswer.length} characters</span>
            </div>
          </div>

          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <textarea
              rows={8}
              value={currentAnswer}
              onChange={(e) => {
                setCurrentAnswer(e.target.value);
                if (answerValidationError) setAnswerValidationError(null);
              }}
              placeholder="Type your structured answer here. Cover your direct experience, architectural reasoning, trade-offs, and failure handling..."
              className="w-full p-4 text-sm text-slate-900 bg-slate-50/60 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y font-sans leading-relaxed"
            />

            {answerValidationError && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {answerValidationError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                <span>Candidate: {candidateName}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {currentAnswer && (
                  <button
                    type="button"
                    onClick={() => setCurrentAnswer('')}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg"
                  >
                    Clear
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isEvaluating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {isEvaluating ? (
                    <span>Logging response...</span>
                  ) : (
                    <>
                      <span>
                        {currentQuestionIndex + 1 === invitation.questions.length
                          ? 'Finalize & Submit Interview'
                          : 'Submit & Next Question'}
                      </span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">End your interview early?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you end now, only your submitted questions will be recorded for the recruiter. You will not be able to restart this session.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  completeCandidateInterview(token, elapsedSeconds);
                  setIsSubmitted(true);
                  setShowExitModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                End & Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateInterviewPage() {
  return (
    <React.Suspense fallback={
      <div className="py-20 flex items-center justify-center bg-slate-50 min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading interview assessment...</p>
        </div>
      </div>
    }>
      <CandidateInterviewContent />
    </React.Suspense>
  );
}
