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
  ArrowRight,
  Building,
  Lock,
  Check
} from 'lucide-react';
import { InterviewInvitation, CandidateAnswer } from '@/types/interview';
import { 
  getInterviewByToken, 
  fetchInterviewByTokenFromServer,
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

  // Pre-filled candidate state
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  // Active interview stage
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

  // Final submission state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Validate token on mount with server-sync support for incognito windows
  useEffect(() => {
    let isMounted = true;

    async function validate() {
      if (!token) {
        if (isMounted) {
          setErrorType('invalid');
          setIsLoading(false);
        }
        return;
      }

      // Check local cache first, fallback to server store for incognito sessions
      let found = getInterviewByToken(token);
      if (!found) {
        found = await fetchInterviewByTokenFromServer(token);
      }

      if (!isMounted) return;

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
        // Pre-fill candidate info set by recruiter
        const prefillName = found.candidate?.fullName || 'Candidate';
        const prefillEmail = found.candidate?.email || 'candidate@example.com';
        setCandidateName(prefillName);
        setCandidateEmail(prefillEmail);

        // Resume in-progress state and elapsed timer on page refresh
        if (found.status === 'in_progress') {
          setHasStarted(true);
          setCurrentQuestionIndex(found.answers?.length || 0);
          setElapsedSeconds(found.totalDurationSeconds || 0);
          setQuestionStartTime(Date.now());
        }
      }

      setIsLoading(false);
    }

    validate();
    return () => { isMounted = false; };
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

  // Begin Interview Handler
  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    const updated = startCandidateInterview(token, {
      fullName: candidateName.trim() || 'Candidate',
      email: candidateEmail.trim() || 'candidate@example.com',
    });

    if (updated) {
      setInvitation(updated);
      setHasStarted(true);
      setQuestionStartTime(Date.now());
    }
  };

  // Submit Current Answer
  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || isEvaluating) return;

    const trimmed = currentAnswer.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    if (wordCount < 4) {
      setAnswerValidationError('Please provide a more complete response (at least 4 words) before continuing.');
      return;
    }

    setAnswerValidationError(null);
    setIsEvaluating(true);

    const currentQ = invitation.questions[currentQuestionIndex];
    const timeSpent = Math.max(10, Math.round((Date.now() - (questionStartTime || Date.now())) / 1000));
    const newTotalSeconds = elapsedSeconds + timeSpent;

    // Save answer into storage
    submitCandidateAnswer(token, currentQ.id, currentQ.text, trimmed, timeSpent, newTotalSeconds);

    // Simulate AI interviewer review and step
    setTimeout(() => {
      const isLast = currentQuestionIndex + 1 >= invitation.questions.length;
      const feedback = generateMockFeedbackForAnswer(
        currentQ,
        trimmed,
        currentQuestionIndex,
        invitation.questions.length
      );

      if (isLast) {
        completeCandidateInterview(token, newTotalSeconds);
        setIsSubmitted(true);
        setIsEvaluating(false);
      } else {
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
          <p className="text-sm font-medium text-slate-600">Verifying invitation token...</p>
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
        <div className="ui-card-container">
          <div className="ui-card p-8 text-center space-y-6">
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
      </div>
    );
  }

  if (!invitation) return null;

  // STEP 5: Final Submission Screen (Clean confirmation, no recruiter evaluation exposed)
  if (isSubmitted) {
    return (
      <div className="py-16 md:py-24 bg-slate-50 flex-1 flex items-center justify-center px-4">
        <div className="ui-card-container">
          <div className="ui-card p-8 sm:p-10 text-center space-y-6">
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
              <p className="text-sm text-slate-600 leading-relaxed">
                Thank you, <strong className="text-slate-900">{candidateName}</strong>! Your answers for the{' '}
                <strong className="text-slate-900">{invitation.jobConfig.jobTitle}</strong> position have been securely encrypted and forwarded to the hiring team at{' '}
                <strong className="text-slate-900">{invitation.jobConfig.companyName || 'the hiring company'}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-2">
              <div className="flex justify-between font-medium">
                <span>Company:</span>
                <span className="text-slate-900 font-bold">{invitation.jobConfig.companyName || 'IntervueAI Client'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Role:</span>
                <span className="text-slate-900 font-bold">{invitation.jobConfig.jobTitle}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Questions Answered:</span>
                <span className="text-slate-900 font-bold">{invitation.questions.length}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Completion Duration:</span>
                <span className="text-slate-900 font-bold">{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              The recruiting team will review your submission and reach out regarding subsequent steps. You may safely close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Candidate Invitation Experience
  // When a candidate opens the link, they see ONLY:
  // 1. Candidate's pre-filled name.
  // 2. Candidate's pre-filled email address.
  // 3. Company name and description.
  // 4. Job role.
  // 5. Job description.
  // 6. Start Interview button.
  // Nothing else. All configuration options removed from candidate side.
  if (!hasStarted) {
    const { jobConfig } = invitation;

    return (
      <div className="py-16 md:py-24 bg-slate-50 flex-1 flex items-center justify-center px-4">
        <div className="ui-card-container w-full">
          <div className="ui-card p-6 sm:p-8 space-y-6 shadow-sm">
            {/* 3. Company Name & 4. Job Role */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xs mb-3">
                <Bot className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>{jobConfig.companyName || 'Hiring Assessment'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {jobConfig.jobTitle}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {jobConfig.seniorityLevel} Position Assessment
              </p>
            </div>

            {/* 5. Job Description & Company Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                Job Description
              </span>
              <p className="leading-relaxed whitespace-pre-line text-slate-600">
                {jobConfig.jobDescription}
              </p>
            </div>

            {/* 1. Candidate Name, 2. Candidate Email & 6. Start Interview Button */}
            <form onSubmit={handleStartInterview} className="space-y-4">
              {/* Pre-filled Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Candidate Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={candidateName}
                  className="ui-input font-medium"
                />
              </div>

              {/* Pre-filled Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Candidate Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={candidateEmail}
                  className="ui-input font-medium"
                />
              </div>

              {/* Start Interview Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="ui-btn-primary w-full text-sm font-bold shadow-md hover:shadow-indigo-200"
                >
                  <span>Start Interview</span>
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
        <div className="ui-form-container h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Question {currentQuestionIndex + 1} of {invitation.questions.length}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>{invitation.jobConfig.jobTitle}</span>
              <span className="text-slate-300">•</span>
              <span>{invitation.jobConfig.companyName}</span>
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

      {/* Main Interview Stage */}
      <div className="flex-1 ui-form-container py-8 space-y-6">
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
        <div className="ui-card p-6 sm:p-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  IntervueAI Assessment
                </span>
                <span className="inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {currentQ.category}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQ.text}
              </h2>

              {currentQ.context && (
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  💡 <strong className="font-semibold text-slate-800">Context:</strong> {currentQ.context}
                </p>
              )}

              {/* Guidelines toggle */}
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
        <div className="ui-card p-6 sm:p-7 space-y-4">
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
              className="w-full p-4 text-sm text-slate-900 bg-slate-50/60 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-y font-sans leading-relaxed"
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
                  className="ui-btn-primary w-full sm:w-auto"
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
                className="ui-btn-secondary h-9 text-xs"
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
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
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
