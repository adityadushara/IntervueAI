'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  LogOut, 
  ArrowRight,
  Building,
  Lock,
  Check, 
  Mic, 
  MicOff, 
  RotateCcw, 
  Copy, 
  Loader2,
  Terminal,
  Volume2
} from 'lucide-react';
import { InterviewInvitation } from '@/types/interview';
import { 
  getInterviewByToken, 
  fetchInterviewByTokenFromServer,
  startCandidateInterview, 
  submitCandidateAnswer, 
  completeCandidateInterview 
} from '@/lib/storage';
import { getCandidateGreeting, generateMockFeedbackForAnswer } from '@/lib/mockInterviewer';
import { useVoiceInterview } from '@/lib/voice/useVoiceInterview';
import { VoiceVisualizer, VoiceVisualizerStatus } from '@/components/voice/VoiceVisualizer';

function CandidateInterviewContent() {
  const params = useParams();
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
  const [copiedLink, setCopiedLink] = useState(false);

  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Final submission state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Submission lock ref to strictly prevent duplicate submissions
  const isSubmittingRef = useRef(false);
  const lastSpokenQuestionIndexRef = useRef<number | null>(null);

  // Voice Interview Engine (Voice-Only Mode)
  const {
    permissionState,
    isVoiceSupported,
    isAiSpeaking,
    isListening,
    isPaused,
    audioLevel,
    finalTranscript,
    interimTranscript,
    errorMessage: voiceErrorMessage,
    requestMicrophone,
    speakText,
    startListening,
    stopListening,
    retryRecognition,
    togglePause,
    interruptAi,
    resetTranscript,
  } = useVoiceInterview({
    enabled: hasStarted,
    config: {
      silenceThresholdMs: 3000,
      autoSubmitOnSilence: false,
      voiceRate: 0.94,
      voicePitch: 0.98,
    },
    onTranscriptChange: (text) => {
      if (text) {
        setCurrentAnswer(text);
        setAnswerValidationError(null);
      }
    },
    onAnswerReady: (text) => {
      if (text) {
        setCurrentAnswer(prev => {
          const cleanPrev = prev.trim();
          if (!cleanPrev) return text;
          if (cleanPrev.includes(text)) return cleanPrev;
          return `${cleanPrev} ${text}`;
        });
        setAnswerValidationError(null);
      }
    }
  });

  // Automatically read greeting & question aloud when candidate transitions to a new question
  useEffect(() => {
    if (!hasStarted || permissionState !== 'granted' || !invitation) return;
    const currentQ = invitation.questions[currentQuestionIndex];
    if (!currentQ) return;

    if (lastSpokenQuestionIndexRef.current !== currentQuestionIndex) {
      lastSpokenQuestionIndexRef.current = currentQuestionIndex;
      resetTranscript();
      setCurrentAnswer('');

      const greetingPrefix = (currentQuestionIndex === 0 && !interviewerNote)
        ? `${getCandidateGreeting(invitation.jobConfig, candidateName)}. `
        : '';
      const feedbackPrefix = interviewerNote 
        ? `${interviewerNote}. Next question: ` 
        : '';
      const textToSpeak = `${greetingPrefix}${feedbackPrefix}${currentQ.text}`;

      speakText(textToSpeak, () => {
        startListening();
      });
    }
  }, [hasStarted, permissionState, currentQuestionIndex, invitation, interviewerNote, candidateName, resetTranscript, speakText, startListening]);

  // Replay question vocalization handler
  const handleReplayQuestion = () => {
    if (!invitation || isEvaluating) return;
    const currentQ = invitation.questions[currentQuestionIndex];
    if (!currentQ) return;
    speakText(currentQ.text, () => {
      startListening(currentAnswer);
    });
  };

  // Reset/Clear spoken response for current question so candidate can re-record
  const handleClearTranscript = () => {
    if (isEvaluating) return;
    resetTranscript();
    setCurrentAnswer('');
    setAnswerValidationError(null);
    if (!isListening && !isAiSpeaking) {
      startListening('');
    }
  };

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

      let found = await fetchInterviewByTokenFromServer(token);
      if (!found) {
        found = getInterviewByToken(token);
      }

      if (!isMounted) return;

      if (!found) {
        setErrorType('invalid');
        setIsLoading(false);
        return;
      }

      if (found.status === 'revoked') {
        setErrorType('revoked');
      } else if (found.status === 'completed') {
        setErrorType('completed');
      } else if (found.status === 'expired' || new Date(found.expiresAt).getTime() < Date.now()) {
        setErrorType('expired');
      } else {
        setInvitation(found);
        const prefillName = found.candidate?.fullName || 'Candidate';
        const prefillEmail = found.candidate?.email || 'candidate@example.com';
        setCandidateName(prefillName);
        setCandidateEmail(prefillEmail);

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

  // Begin Voice Interview Handler
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (!isVoiceSupported) {
      return;
    }

    if (permissionState !== 'granted') {
      const granted = await requestMicrophone();
      if (!granted) {
        return;
      }
    }

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

  // Submit Current Spoken Answer
  const handleAnswerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invitation || isEvaluating || isSubmittingRef.current) return;

    const spokenText = (currentAnswer || finalTranscript).trim();
    const wordCount = spokenText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 4) {
      setAnswerValidationError('Please speak a more complete response (at least 4 words) before submitting.');
      return;
    }

    setAnswerValidationError(null);
    setIsEvaluating(true);
    isSubmittingRef.current = true;
    stopListening();

    const currentQ = invitation.questions[currentQuestionIndex];
    const timeSpent = Math.max(10, Math.round((Date.now() - (questionStartTime || Date.now())) / 1000));
    const newTotalSeconds = elapsedSeconds + timeSpent;

    submitCandidateAnswer(token, currentQ.id, currentQ.text, spokenText, timeSpent, newTotalSeconds);

    try {
      const res = await fetch(`/api/interviews/${token}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          answerText: spokenText,
          timeSpentSeconds: timeSpent,
          totalElapsedSeconds: newTotalSeconds,
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isInterviewComplete) {
          completeCandidateInterview(token, newTotalSeconds);
          setIsSubmitted(true);
          setIsEvaluating(false);
          isSubmittingRef.current = false;
          return;
        }

        const updatedQuestions = [...invitation.questions];
        if (data.hasFollowUp && data.followUpQuestion) {
          updatedQuestions.splice(currentQuestionIndex + 1, 0, data.followUpQuestion);
          setInvitation(prev => prev ? { ...prev, questions: updatedQuestions } : null);
        }

        setCurrentQuestionIndex(prev => prev + 1);
        setCurrentAnswer('');
        resetTranscript();
        setInterviewerNote(data.interviewerFeedback || 'Thank you for your response.');
        setShowHint(false);
        setQuestionStartTime(Date.now());
        setIsEvaluating(false);
        isSubmittingRef.current = false;
        return;
      }
    } catch {
      console.warn('Interviewer interaction endpoint unreachable, using fallback.');
    }

    // Fallback if offline or API unreachable
    const isLast = currentQuestionIndex + 1 >= invitation.questions.length;
    const feedback = generateMockFeedbackForAnswer(
      currentQ,
      spokenText,
      currentQuestionIndex,
      invitation.questions.length
    );

    if (isLast) {
      completeCandidateInterview(token, newTotalSeconds);
      setIsSubmitted(true);
      setIsEvaluating(false);
      isSubmittingRef.current = false;
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
      resetTranscript();
      setInterviewerNote(feedback);
      setShowHint(false);
      setQuestionStartTime(Date.now());
      setIsEvaluating(false);
      isSubmittingRef.current = false;
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Determine current VoiceVisualizer status
  const visualizerStatus: VoiceVisualizerStatus = isEvaluating
    ? 'processing'
    : isAiSpeaking
    ? 'ai_speaking'
    : isPaused
    ? 'paused'
    : (voiceErrorMessage && !isListening)
    ? 'error'
    : isListening
    ? 'listening'
    : permissionState === 'denied' || permissionState === 'unavailable'
    ? 'unavailable'
    : permissionState === 'requesting'
    ? 'preparing'
    : 'idle';

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Verifying assessment token...</p>
        </div>
      </div>
    );
  }

  // STEP 1: Error States
  if (errorType) {
    const errorConfigs = {
      invalid: {
        title: 'Invalid assessment token',
        desc: 'The interview invitation link you opened is invalid or could not be found. Please check the URL or contact your hiring recruiter.',
        icon: AlertCircle,
        badge: 'Link Not Found',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      expired: {
        title: 'This assessment link has expired',
        desc: 'The time window allocated for this interview session has passed. Please contact the recruiter to request a fresh invitation link.',
        icon: Clock,
        badge: 'Expired Token',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      completed: {
        title: 'Assessment already completed',
        desc: 'Your assessment responses have already been recorded and securely submitted to the hiring team. Candidate submissions cannot be modified.',
        icon: CheckCircle2,
        badge: 'Submitted & Locked',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      revoked: {
        title: 'Assessment invitation revoked',
        desc: 'This invitation was cancelled or revoked by the hiring organization. Please contact your hiring coordinator for assistance.',
        icon: Lock,
        badge: 'Token Revoked',
        badgeColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      },
    };

    const cfg = errorConfigs[errorType];
    const Icon = cfg.icon;

    return (
      <div className="py-20 md:py-28 bg-[#fcfcfd] flex-1 flex items-center justify-center px-4">
        <div className="ui-card-container w-full">
          <div className="ui-card p-8 sm:p-9 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center mx-auto text-zinc-800">
              <Icon className="w-6 h-6 text-zinc-800" />
            </div>

            <div className="space-y-2">
              <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.badgeColor}`}>
                {cfg.badge}
              </span>
              <h1 className="text-xl font-semibold text-zinc-950 tracking-tight">
                {cfg.title}
              </h1>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
                {cfg.desc}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-100">
              <p className="text-[11px] font-mono text-zinc-400">
                Token reference: <span className="text-zinc-600 font-semibold">{token}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  // STEP 5: Final Submission Screen
  if (isSubmitted) {
    return (
      <div className="py-20 md:py-28 bg-[#fcfcfd] flex-1 flex items-center justify-center px-4">
        <div className="ui-card-container w-full">
          <div className="ui-card p-8 sm:p-10 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <Check className="w-3 h-3" /> Submission Received
              </span>
              <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
                Your assessment has been submitted.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-md mx-auto">
                Thank you, <strong className="text-zinc-900 font-semibold">{candidateName}</strong>. Your technical responses for the{' '}
                <strong className="text-zinc-900 font-semibold">{invitation.jobConfig.jobTitle}</strong> position have been securely encrypted and delivered to the hiring team at{' '}
                <strong className="text-zinc-900 font-semibold">{invitation.jobConfig.companyName || 'the hiring organization'}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700 text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Company:</span>
                <span className="text-zinc-900 font-semibold font-sans">{invitation.jobConfig.companyName || 'IntervueAI Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Role Track:</span>
                <span className="text-zinc-900 font-semibold font-sans">{invitation.jobConfig.jobTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Questions Completed:</span>
                <span className="text-zinc-900 font-semibold">{invitation.questions.length} / {invitation.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-sans">Total Session Duration:</span>
                <span className="text-zinc-900 font-semibold">{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-normal">
              The recruiting team will evaluate your recorded responses and qualitative evaluation. You may safely close this tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Candidate Invitation Experience (Pre-interview Welcome)
  if (!hasStarted) {
    const { jobConfig } = invitation;

    return (
      <div className="py-14 md:py-20 bg-[#fcfcfd] flex-1 flex items-center justify-center px-4">
        <div className="ui-card-container w-full">
          <div className="ui-card p-6 sm:p-8 space-y-6">
            {/* Company & Role */}
            <div className="text-center space-y-2 border-b border-zinc-100 pb-5">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center mx-auto shadow-xs mb-3">
                <svg className="w-5 h-5 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/70">
                <Building className="w-3.5 h-3.5 text-zinc-500" />
                <span>{jobConfig.companyName || 'Hiring Assessment'}</span>
              </div>
              <h1 className="text-2xl font-semibold text-zinc-950 tracking-tight">
                {jobConfig.jobTitle}
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                {jobConfig.seniorityLevel} Technical Screen • {invitation.questions.length} Questions
              </p>
            </div>

            {/* Job Description */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700 space-y-1.5">
              <span className="font-mono uppercase tracking-wider text-[11px] text-zinc-500 block">
                Position Summary
              </span>
              <p className="leading-relaxed whitespace-pre-line text-zinc-600">
                {jobConfig.jobDescription}
              </p>
            </div>

            {/* Voice-Only Format Notice */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-800 flex items-start gap-2.5">
              <Mic className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-zinc-900">Voice-Only Experience</p>
                <p className="text-zinc-600 text-[11px] leading-relaxed mt-0.5">
                  The AI interviewer will vocalize each technical prompt. Speak your answer into your microphone; speech is transcribed in real-time for your review before each submission.
                </p>
              </div>
            </div>

            {/* Candidate Details & Start Button */}
            <form onSubmit={handleStartInterview} className="space-y-4">
              <div>
                <label htmlFor="candidateOnboardingName" className="block text-xs font-medium text-zinc-700 mb-1">
                  Candidate Name
                </label>
                <input
                  id="candidateOnboardingName"
                  type="text"
                  readOnly
                  value={candidateName}
                  className="ui-input font-medium"
                />
              </div>

              <div>
                <label htmlFor="candidateOnboardingEmail" className="block text-xs font-medium text-zinc-700 mb-1">
                  Candidate Email
                </label>
                <input
                  id="candidateOnboardingEmail"
                  type="email"
                  readOnly
                  value={candidateEmail}
                  className="ui-input font-medium font-mono text-xs"
                />
              </div>

              {/* Start Interview Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="ui-btn-primary w-full text-sm font-medium shadow-sm h-11"
                >
                  <span>Begin Voice Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Active Interview Stage
  const currentQ = invitation.questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex) / invitation.questions.length) * 100);
  const wordCount = (currentAnswer || finalTranscript).trim().split(/\s+/).filter(Boolean).length;
  const charCount = (currentAnswer || finalTranscript).trim().length;

  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfd] min-h-full">
      {/* Top Session Information Bar */}
      <div className="bg-white border-b border-zinc-200/80 sticky top-14 z-40">
        <div className="ui-form-container h-12 flex items-center justify-between">
          {/* Question Counter & Context */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-zinc-800 bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-200/60">
              Question {currentQuestionIndex + 1} of {invitation.questions.length}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600 font-medium">
              <span>{invitation.jobConfig.jobTitle}</span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-500">{invitation.jobConfig.companyName}</span>
            </div>
          </div>

          {/* Timer & End Interview Action */}
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-800 bg-zinc-50 border border-zinc-200/70 px-2.5 py-0.5 rounded-md"
              title="Elapsed interview time"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="text-xs font-medium text-zinc-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              title="Conclude interview early"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Session</span>
            </button>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="w-full bg-zinc-100 h-0.5">
          <div
            className="bg-zinc-950 h-0.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Voice Interview Stage */}
      <div className="flex-1 ui-form-container py-8 space-y-5">
        {/* Browser Unsupported Notice */}
        {!isVoiceSupported && (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-xs text-amber-900">
                  Voice Speech Recognition Not Supported in this Browser
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  IntervueAI is a voice-only assessment platform requiring browser speech-to-text and audio synthesis. Your current browser does not support the Web Speech API.
                </p>
                <p className="text-xs text-amber-900 font-medium pt-1">
                  Please open this invitation link in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Apple Safari</strong>.
                </p>
              </div>
            </div>

            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="ui-btn-secondary h-8 px-3 text-xs font-medium bg-white text-zinc-700 border-amber-300 hover:bg-amber-100 flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invitation Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Microphone Permission Required Banner */}
        {isVoiceSupported && permissionState !== 'granted' && (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <MicOff className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-xs text-amber-900">
                  Microphone Access Required for Voice Assessment
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This interview is conducted entirely through voice. To answer questions, please grant your browser permission to access your microphone.
                </p>

                {permissionState === 'denied' && (
                  <div className="p-3 bg-white/70 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <p className="font-semibold">How to enable microphone access:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
                      <li>Click the lock or camera icon on the left of your browser address bar.</li>
                      <li>Set <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                      <li>Click <strong>Retry Microphone Access</strong> below.</li>
                    </ol>
                  </div>
                )}

                {voiceErrorMessage && (
                  <p className="text-[11px] text-rose-600 font-medium font-mono">
                    {voiceErrorMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={requestMicrophone}
                className="ui-btn-primary h-8 px-3.5 text-xs font-medium bg-amber-800 hover:bg-amber-900 text-white"
              >
                <span>{permissionState === 'denied' ? 'Retry Microphone Access' : 'Allow Microphone'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Voice Interaction Section */}
        {isVoiceSupported && permissionState === 'granted' && (
          <div className="space-y-3">
            <VoiceVisualizer
              status={visualizerStatus}
              isAiSpeaking={isAiSpeaking}
              isListening={isListening}
              isPaused={isPaused}
              audioLevel={audioLevel}
              onInterrupt={interruptAi}
              onReplay={handleReplayQuestion}
              onTogglePause={togglePause}
              onRetry={retryRecognition}
              disabled={isEvaluating}
            />

            {/* Speech Recognition Error Notice with One-Click Retry */}
            {voiceErrorMessage && !isListening && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-medium text-amber-900">{voiceErrorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={retryRecognition}
                  className="ui-btn-primary h-7 px-3 text-xs font-medium shrink-0 self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry Engine</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial Greeting Banner on Question 1 */}
        {currentQuestionIndex === 0 && !interviewerNote && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 flex items-start gap-3">
            <Volume2 className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-900 mb-0.5">Interviewer Welcome:</p>
              <p className="leading-relaxed text-zinc-600">{getCandidateGreeting(invitation.jobConfig, candidateName)}</p>
            </div>
          </div>
        )}

        {/* Adaptive Interviewer Follow-up Feedback Note */}
        {interviewerNote && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 flex items-start gap-3">
            <Volume2 className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-900 mb-0.5">Interviewer Note:</p>
              <p className="leading-relaxed text-zinc-600">{interviewerNote}</p>
            </div>
          </div>
        )}

        {/* AI Interviewer Section: Current Question Card */}
        <div className="ui-card p-6 sm:p-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-2xs font-mono text-xs font-semibold">
              Q{currentQuestionIndex + 1}
            </div>

            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Question Prompt
                </span>
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                  {currentQ.category}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-semibold text-zinc-950 leading-snug tracking-tight">
                {currentQ.text}
              </h2>

              {/* Optional context */}
              {currentQ.context && (
                <p className="text-xs sm:text-sm text-zinc-600 bg-zinc-50 p-3 rounded-lg border border-zinc-200/70 leading-relaxed font-sans">
                  💡 <strong className="font-semibold text-zinc-900">Context:</strong> {currentQ.context}
                </p>
              )}

              {/* Optional response structure hints toggle */}
              {currentQ.sampleHints && currentQ.sampleHints.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                    {showHint ? 'Hide response guidelines' : 'Need guidance on structure?'}
                  </button>

                  {showHint && (
                    <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 text-xs text-zinc-800 space-y-1">
                      <p className="font-semibold text-zinc-900">Recommended technical points to cover:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-600">
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

        {/* Read-Only Transcript Preview & Submission Section */}
        <div className="ui-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-zinc-700" />
              <span className="text-xs font-semibold text-zinc-950">
                Live Voice Transcript
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/70">
                Read-Only
              </span>
              {isListening && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Capturing voice...
                </span>
              )}
            </div>

            <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
              <span>{wordCount} words</span>
              <span className="text-zinc-300">•</span>
              <span>{charCount} chars</span>
            </div>
          </div>

          {/* Dedicated Read-Only Transcript Container (NO TEXTAREA / NO TYPING) */}
          <div 
            className="min-h-[150px] p-4 sm:p-5 rounded-lg bg-zinc-50/80 border border-zinc-200/80 text-sm leading-relaxed text-zinc-900 font-sans select-text transition-all"
            role="region"
            aria-live="polite"
            aria-label="Live Voice Transcript"
          >
            {(currentAnswer || finalTranscript || interimTranscript) ? (
              <div className="space-y-1">
                <span className="font-normal text-zinc-900">
                  {currentAnswer || finalTranscript}
                </span>
                {interimTranscript && (
                  <span className="text-zinc-400 italic font-normal">
                    {' '}{interimTranscript}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-28 text-center text-zinc-400 space-y-1.5">
                <Mic className="w-6 h-6 text-zinc-300 stroke-[1.5]" />
                <p className="text-xs font-medium text-zinc-500">
                  {isAiSpeaking 
                    ? 'AI interviewer is vocalizing prompt. Speak when ready...' 
                    : isPaused 
                    ? 'Microphone is paused. Click "Resume Mic" above to speak.' 
                    : 'Speak into your microphone. Your spoken response is transcribed here.'}
                </p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Manual typing is disabled. Transcripts are generated strictly from candidate speech.
                </p>
              </div>
            )}
          </div>

          {answerValidationError && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {answerValidationError}
            </p>
          )}

          {/* Transcript Actions & Submission Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Candidate: <strong className="text-zinc-800 font-medium">{candidateName}</strong></span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Option to clear and re-speak answer */}
              {(currentAnswer || finalTranscript) && !isEvaluating && (
                <button
                  type="button"
                  onClick={handleClearTranscript}
                  className="ui-btn-secondary h-8 px-3 text-xs font-medium text-zinc-700 hover:text-zinc-950 flex items-center gap-1"
                  title="Clear transcript and speak your answer again"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Re-speak Answer</span>
                </button>
              )}

              {/* Submit Answer Action */}
              <button
                type="button"
                onClick={() => handleAnswerSubmit()}
                disabled={isEvaluating || wordCount < 4}
                className="ui-btn-primary h-8 px-3.5 text-xs font-medium w-full sm:w-auto shadow-2xs"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating response...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {currentQuestionIndex + 1 === invitation.questions.length
                        ? 'Finalize & Submit Assessment'
                        : 'Submit Answer'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-zinc-200">
            <h3 className="font-semibold text-sm text-zinc-950">End your interview early?</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              If you end now, only your submitted questions will be recorded for the recruiter. You will not be able to restart this session.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="ui-btn-secondary h-8 text-xs font-medium"
              >
                Continue Assessment
              </button>
              <button
                type="button"
                onClick={() => {
                  completeCandidateInterview(token, elapsedSeconds);
                  setIsSubmitted(true);
                  setShowExitModal(false);
                }}
                className="ui-btn-danger h-8 text-xs font-medium"
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
      <div className="py-20 flex items-center justify-center bg-[#fcfcfd] min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Loading interview assessment...</p>
        </div>
      </div>
    }>
      <CandidateInterviewContent />
    </React.Suspense>
  );
}
