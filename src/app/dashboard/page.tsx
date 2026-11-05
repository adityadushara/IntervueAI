'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Award, 
  Clock, 
  Target, 
  TrendingUp, 
  PlusCircle, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Sparkles, 
  ChevronRight, 
  X,
  FileText,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import { InterviewSession } from '@/types/interview';
import { getInterviewHistory, deleteSessionFromHistory, getDashboardMetrics } from '@/lib/storage';

export default function DashboardPage() {
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const data = getInterviewHistory();
    setHistory(data);
    setIsLoaded(true);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session record?')) {
      const updated = deleteSessionFromHistory(id);
      setHistory(updated);
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    }
  };

  const metrics = getDashboardMetrics(history);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="py-10 md:py-16 bg-slate-50 flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>Candidate Analytics</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Interview Dashboard
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Track your mock interview history, performance metrics, and preparation progress.
            </p>
          </div>

          <Link
            href="/config"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            New Interview
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Interviews Taken
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {isLoaded ? metrics.totalCount : '-'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Simulated sessions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Average Score
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {isLoaded ? (metrics.averageScore ? `${metrics.averageScore}%` : 'N/A') : '-'}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                {metrics.averageScore >= 80 ? '✓ Ready for live rounds' : 'Practice recommended'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
          </div>

          {/* Practice Time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Practice Time
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {isLoaded ? `${metrics.totalPracticeMinutes}m` : '-'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Total focused time</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Top Role */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Focus
              </p>
              <h3 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-[150px]">
                {isLoaded ? metrics.topRole : '-'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Most practiced track</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Sessions History List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Mock Interview Sessions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any session to view questions, candidate responses, and evaluator feedback.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {history.length} record{history.length === 1 ? '' : 's'}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">No mock interviews recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Start your first interview session to see your scorecard and metrics here.
                </p>
              </div>
              <Link
                href="/config"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Start First Mock Interview
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((sess) => {
                const score = sess.score?.overall || 0;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {sess.config.role}
                        </span>
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {sess.config.level}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 capitalize">
                          • {sess.config.interviewType.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {sess.config.topics.slice(0, 4).map((t, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                        {sess.config.topics.length > 4 && (
                          <span className="text-[10px] text-slate-400">
                            +{sess.config.topics.length - 4} more
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(sess.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{sess.questions.length} Questions</span>
                        <span>•</span>
                        <span>Candidate: {sess.config.candidateName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-slate-900">
                          {score}
                          <span className="text-xs text-slate-400 font-medium">/100</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            score >= 85
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {score >= 85 ? 'Strong Hire' : 'Pass'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(sess.id, e)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="text-slate-400 hover:text-slate-600 p-1">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day 2 Teaser Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-white border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
              Coming in Day 2
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Live Google Gemini LLM & Voice Mode Integration
            </h4>
            <p className="text-xs text-slate-600">
              Real-time conversational streaming, dynamic audio responses, and adaptive difficulty.
            </p>
          </div>
          <Link
            href="/config"
            className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
          >
            Practice Day 1 Mock
          </Link>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {selectedSession.config.role} ({selectedSession.config.level.toUpperCase()})
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Session Performance Details
                </h3>
                <p className="text-xs text-slate-500">
                  Candidate: {selectedSession.config.candidateName} • {formatDate(selectedSession.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedSession.score && (
              <div className="space-y-4">
                {/* Score cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Overall</p>
                    <p className="text-2xl font-extrabold text-slate-900">{selectedSession.score.overall}%</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Technical</p>
                    <p className="text-2xl font-extrabold text-indigo-600">{selectedSession.score.technicalDepth}%</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Communication</p>
                    <p className="text-2xl font-extrabold text-violet-600">{selectedSession.score.communication}%</p>
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 text-xs text-slate-700">
                  <p className="font-bold text-indigo-900 mb-1">AI Evaluator Summary:</p>
                  <p>{selectedSession.score.summary}</p>
                </div>

                {selectedSession.score.strengths.length > 0 && (
                  <div className="text-xs space-y-1.5">
                    <p className="font-bold text-emerald-800 flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" /> Strengths:
                    </p>
                    <ul className="list-disc list-inside text-emerald-950 space-y-0.5">
                      {selectedSession.score.strengths.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Q&A Transcripts */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Questions & Answers
              </h4>
              <div className="space-y-3">
                {selectedSession.questions.map((q, i) => {
                  const ans = selectedSession.answers.find(a => a.questionId === q.id) || selectedSession.answers[i];
                  return (
                    <div key={q.id || i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                      <p className="font-bold text-slate-900">
                        Q{i + 1}: {q.text}
                      </p>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">
                        {ans ? ans.answerText : 'No answer recorded.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
