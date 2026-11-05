'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { 
  Bot, 
  User, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  HelpCircle, 
  RotateCcw, 
  Award, 
  ArrowRight, 
  BookOpen, 
  Mic, 
  MessageSquare,
  LogOut,
  ThumbsUp,
  TrendingUp,
  FileText
} from 'lucide-react';
import { InterviewSession, CandidateAnswer, InterviewScore } from '@/types/interview';
import { getActiveSession, setActiveSession, saveCompletedSession } from '@/lib/storage';
import { generateQuestionsForSession, evaluateMockSession } from '@/lib/mockData';
import { getGreetingMessage, generateMockFeedbackForAnswer } from '@/lib/mockInterviewer';

export default function InterviewPage() {
  const router = useRouter();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [interviewerFeedback, setInterviewerFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const active = getActiveSession();
    if (active && active.status === 'in_progress') {
      setSession(active);
      setElapsedSeconds(active.totalTimeSeconds || 0);
      setQuestionStartTime(Date.now());
    }
    setIsLoading(false);
  }, []);

  // Timer interval
  useEffect(() => {
    if (!session || session.status === 'completed') return;

    const interval = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        // Periodically update session time
        if (next % 10 === 0 && session) {
          setActiveSession({ ...session, totalTimeSeconds: next });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Format seconds to mm:ss
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Quick fallback starter if accessed directly
  const startDemoSession = () => {
    const demoConfig = {
      candidateName: 'Demo Candidate',
      role: 'Frontend Engineer',
      level: 'senior' as const,
      interviewType: 'technical' as const,
      difficulty: 'medium' as const,
      topics: ['React', 'Next.js', 'Web Performance'],
      questionCount: 3,
    };
    const questions = generateQuestionsForSession(demoConfig);
    const newSession: InterviewSession = {
      id: `session-demo-${Date.now().toString(36)}`,
      config: demoConfig,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      totalTimeSeconds: 0,
      questions,
      answers: [],
      currentQuestionIndex: 0,
    };
    setActiveSession(newSession);
    setSession(newSession);
    setElapsedSeconds(0);
    setQuestionStartTime(Date.now());
  };

  // Submit Answer Handler
  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) return;

    const trimmed = currentAnswer.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    if (wordCount < 4) {
      setValidationError('Please provide a more complete answer (at least 4 words) to continue.');
      return;
    }

    setValidationError(null);
    setIsSubmittingAnswer(true);

    const currentIndex = session.currentQuestionIndex;
    const currentQuestion = session.questions[currentIndex];
    const timeSpent = Math.max(10, Math.round((Date.now() - questionStartTime) / 1000));

    // Simulate thoughtful interviewer assessment delay (600ms)
    setTimeout(() => {
      const feedback = generateMockFeedbackForAnswer(
        currentQuestion,
        trimmed,
        currentIndex,
        session.questions.length
      );

      const newAnswer: CandidateAnswer = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        answerText: trimmed,
        timeSpentSeconds: timeSpent,
        submittedAt: new Date().toISOString(),
        feedbackSnippet: feedback,
      };

      const updatedAnswers = [...session.answers, newAnswer];
      const isLastQuestion = currentIndex + 1 >= session.questions.length;

      if (isLastQuestion) {
        // Complete interview
        const finalScore = evaluateMockSession(session.config, updatedAnswers, session.questions);
        const completedSession: InterviewSession = {
          ...session,
          status: 'completed',
          completedAt: new Date().toISOString(),
          totalTimeSeconds: elapsedSeconds + timeSpent,
          answers: updatedAnswers,
          currentQuestionIndex: currentIndex + 1,
          score: finalScore,
        };

        saveCompletedSession(completedSession);
        setSession(completedSession);
        setIsSubmittingAnswer(false);
        setCurrentAnswer('');

        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        // Step to next question
        const updatedSession: InterviewSession = {
          ...session,
          currentQuestionIndex: currentIndex + 1,
          answers: updatedAnswers,
          totalTimeSeconds: elapsedSeconds + timeSpent,
        };

        setActiveSession(updatedSession);
        setSession(updatedSession);
        setInterviewerFeedback(feedback);
        setCurrentAnswer('');
        setShowHint(false);
        setIsSubmittingAnswer(false);
        setQuestionStartTime(Date.now());
      }
    }, 600);
  };

  const handleExitInterview = () => {
    setActiveSession(null);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  // If no active session found
  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <Bot className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">No Active Interview Session</h2>
            <p className="text-slate-600 text-sm mt-1.5 leading-relaxed">
              You do not have an interview in progress. You can configure your own customized session or launch a fast demo session right now.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/config"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Configure Custom Interview
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={startDemoSession}
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Launch Quick 3-Question Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Interview Completed & Scorecard Display
  if (session.status === 'completed' && session.score) {
    const { score } = session;
    return (
      <div className="py-12 bg-slate-50 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Interview Completed
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Great Job, {session.config.candidateName}!
              </h1>
              <p className="text-sm text-slate-600 max-w-lg">
                You completed all {session.questions.length} questions for the{' '}
                <span className="font-semibold text-slate-900">{session.config.role}</span> track in{' '}
                {formatTimer(session.totalTimeSeconds)}.
              </p>
            </div>

            {/* Overall Score Badge */}
            <div className="flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-2xl p-6 min-w-[160px] text-center shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Overall Score
              </span>
              <div className="text-5xl font-extrabold text-indigo-950 mt-1">
                {score.overall}
                <span className="text-2xl text-indigo-400 font-semibold">/100</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 mt-1.5 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {score.overall >= 85 ? 'Strong Hire' : score.overall >= 70 ? 'Pass' : 'Needs Practice'}
              </span>
            </div>
          </div>

          {/* Metrics Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Technical Depth
                </span>
                <span className="text-sm font-bold text-slate-900">{score.technicalDepth}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${score.technicalDepth}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Command of core concepts, API specifics, and trade-offs.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Communication
                </span>
                <span className="text-sm font-bold text-slate-900">{score.communication}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-violet-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${score.communication}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Clarity of expression, structure, and professional tone.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Problem Solving
                </span>
                <span className="text-sm font-bold text-slate-900">{score.problemSolving}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${score.problemSolving}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Methodical breakdown, handling edge cases, and reasoning.
              </p>
            </div>
          </div>

          {/* AI Evaluator Summary & Detailed Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Interviewer Performance Feedback
              </h3>
              <p className="text-sm text-slate-600 mt-1">{score.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Strengths */}
              <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-2.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                </h4>
                <ul className="space-y-2 text-xs text-emerald-950">
                  {score.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Recommendations
                </h4>
                <ul className="space-y-2 text-xs text-amber-950">
                  {score.improvements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Transcript Accordion / Review */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Review Submitted Answers
              </h4>
              <div className="space-y-3">
                {session.answers.map((ans, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Question {idx + 1}</span>
                      <span className="text-slate-400 font-normal">{ans.timeSpentSeconds}s</span>
                    </div>
                    <p className="text-slate-700 font-medium">{ans.questionText}</p>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-600 whitespace-pre-wrap">
                      {ans.answerText}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Go to Candidate Dashboard
              </Link>
              <Link
                href="/config"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
              >
                Practice Another Interview
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active in-progress question view
  const currentIdx = session.currentQuestionIndex;
  const currentQuestion = session.questions[currentIdx];
  const progressPercent = Math.round(((currentIdx) / session.questions.length) * 100);
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Top Session Progress Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Question {currentIdx + 1} of {session.questions.length}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span>{session.config.role}</span>
              <span className="text-slate-300">•</span>
              <span className="capitalize">{session.config.level}</span>
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
              <span className="hidden sm:inline">Exit Session</span>
            </button>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Interview Stage */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Previous Turn Feedback Notice (if any) */}
        {interviewerFeedback && (
          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-3 animate-fadeIn">
            <Bot className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900 mb-0.5">Interviewer Note:</p>
              <p className="leading-relaxed">{interviewerFeedback}</p>
            </div>
          </div>
        )}

        {/* AI Interviewer Question Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 relative overflow-hidden">
          <div className="flex items-start gap-4">
            {/* Interviewer Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Bot className="w-6 h-6" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    IntervueAI Simulator
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {currentQuestion.category}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  <Mic className="w-3 h-3 text-indigo-600" />
                  Text Mode (Day 1 Mock)
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQuestion.text}
              </h2>

              {currentQuestion.context && (
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  💡 <span className="font-medium text-slate-700">Context:</span> {currentQuestion.context}
                </p>
              )}

              {/* Hint accordion */}
              {currentQuestion.sampleHints && currentQuestion.sampleHints.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showHint ? 'Hide Interview Hint' : 'Need a hint on how to structure your answer?'}
                  </button>

                  {showHint && (
                    <div className="mt-2 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-950 space-y-1">
                      <p className="font-bold text-amber-900">Key points interviewer is looking for:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        {currentQuestion.sampleHints.map((hint, hIdx) => (
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

        {/* Candidate Answer Studio */}
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
                if (validationError) setValidationError(null);
              }}
              placeholder="Structure your answer clearly. Discuss architecture, reasoning, trade-offs, and concrete examples..."
              className="w-full p-4 text-sm text-slate-900 bg-slate-50/60 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y font-sans leading-relaxed"
            />

            {validationError && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {validationError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Simulated AI Review ready
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
                  disabled={isSubmittingAnswer}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {isSubmittingAnswer ? (
                    <span>Evaluating response...</span>
                  ) : (
                    <>
                      <span>{currentIdx + 1 === session.questions.length ? 'Submit Final Answer' : 'Submit & Next Question'}</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Exit this interview?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your ongoing session progress will be cancelled. You can always configure and start a fresh session anytime.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={handleExitInterview}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
