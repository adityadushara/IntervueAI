'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Briefcase, 
  Clock, 
  Calendar, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  RefreshCw,
  ThumbsUp,
  Volume2
} from 'lucide-react';
import { InterviewInvitation } from '@/types/interview';

interface ScorecardModalProps {
  interview: InterviewInvitation;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ScorecardModal({ interview, onClose, onRefresh }: ScorecardModalProps) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const report = interview.recruiterReport;
  const isFailed = interview.evaluationStatus === 'failed';

  const handleCopyTranscript = () => {
    const text = interview.answers.map((ans, idx) => {
      const q = interview.questions.find(item => item.id === ans.questionId);
      return `Q${idx + 1}: ${q?.text || 'Question'}\nAnswer: ${ans.answerText}\nTime: ${ans.timeSpentSeconds}s\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleRetryEvaluation = async () => {
    try {
      setIsRetrying(true);
      setRetryError(null);
      const res = await fetch('/api/interviews/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: interview.id, force: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRetryError(data.error || data.details || 'Evaluation retry failed');
        return;
      }
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Network error during evaluation retry');
    } finally {
      setIsRetrying(false);
    }
  };

  const categories = report?.detailedEvaluation?.competencies ? [
    { name: 'Technical Knowledge', score: report.detailedEvaluation.competencies.technicalKnowledge.score, feedback: report.detailedEvaluation.competencies.technicalKnowledge.improvementSuggestions?.[0] },
    { name: 'Problem Solving', score: report.detailedEvaluation.competencies.problemSolving.score, feedback: report.detailedEvaluation.competencies.problemSolving.improvementSuggestions?.[0] },
    { name: 'Communication Clarity', score: report.detailedEvaluation.competencies.communication.score, feedback: report.detailedEvaluation.competencies.communication.improvementSuggestions?.[0] },
    { name: 'Conceptual Understanding', score: report.detailedEvaluation.competencies.conceptualUnderstanding.score, feedback: report.detailedEvaluation.competencies.conceptualUnderstanding.improvementSuggestions?.[0] },
    { name: 'Practical Reasoning', score: report.detailedEvaluation.competencies.practicalReasoning.score, feedback: report.detailedEvaluation.competencies.practicalReasoning.improvementSuggestions?.[0] },
    { name: 'Role Specific Depth', score: report.detailedEvaluation.competencies.roleSpecific.score, feedback: report.detailedEvaluation.competencies.roleSpecific.improvementSuggestions?.[0] },
  ] : report ? [
    { name: 'Technical Competency', score: report.overallScore ?? 85, feedback: `Assessment: ${report.technicalCompetency}` },
    { name: 'Communication Clarity', score: report.overallScore ?? 85, feedback: `Clarity: ${report.communicationClarity}` },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="ui-card w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 space-y-6 shadow-xl border border-zinc-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <span>Candidate Evaluation Dossier</span>
              <span>•</span>
              <span className="text-zinc-700">{interview.jobConfig?.companyName || 'IntervueAI'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-950 tracking-tight">
              {interview.candidate?.fullName || 'Unnamed Candidate'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {interview.jobConfig?.jobTitle || 'Technical Assessment'} • {interview.candidate?.email || 'No email provided'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Failed Evaluation Notice */}
        {isFailed && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  Automated Evaluation Pending
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Candidate completed the voice assessment, but the AI evaluation service timed out or was rate-limited.
                </p>
                {retryError && (
                  <p className="text-xs text-rose-700 font-medium mt-1">
                    Retry error: {retryError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetryEvaluation}
              disabled={isRetrying}
              className="ui-btn-primary h-8 px-3 text-xs bg-amber-900 border-amber-950 hover:bg-amber-950"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Re-evaluating...' : 'Retry Evaluation Now'}</span>
            </button>
          </div>
        )}

        {/* Overall Recommendation & Score Banner */}
        {report && (
          <div className="p-5 rounded-xl border border-zinc-200/80 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Executive Recommendation
              </span>
              <p className="text-base sm:text-lg font-semibold text-zinc-950">
                {report.recommendation || 'Evaluation Complete'}
              </p>
              <p className="text-xs text-zinc-600 max-w-md">
                {report.overallAssessment || 'Candidate demonstrated consistent verbal answers against rubric criteria.'}
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Overall Score
              </span>
              <div className="text-3xl font-semibold text-zinc-950 mt-0.5">
                {report.overallScore ?? 'N/A'}<span className="text-base font-normal text-zinc-400">/100</span>
              </div>
            </div>
          </div>
        )}

        {/* Competency Ratings Grid */}
        {categories.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Competency Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border border-zinc-200/80 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900">{cat.name}</span>
                    <span className="font-semibold text-zinc-950">{cat.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        cat.score >= 80 ? 'bg-emerald-600' : cat.score >= 60 ? 'bg-zinc-800' : 'bg-amber-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, cat.score))}%` }}
                    />
                  </div>
                  {cat.feedback && (
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {cat.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Areas of Improvement */}
        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.notableStrengths && report.notableStrengths.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-200/80 bg-white space-y-2">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Candidate Strengths
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-700">
                  {report.notableStrengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.areasToProbeInLiveRound && report.areasToProbeInLiveRound.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-200/80 bg-white space-y-2">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                  Areas for Inquiry
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-700">
                  {report.areasToProbeInLiveRound.map((weak, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Spoken Audio Transcripts per Question */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-700" />
              Verbatim Spoken Transcripts ({interview.answers.length} Responses)
            </h3>
            <button
              type="button"
              onClick={handleCopyTranscript}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTranscript ? 'Copied' : 'Copy All'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {interview.answers.map((ans, idx) => {
              const q = interview.questions.find(item => item.id === ans.questionId);
              return (
                <div key={idx} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-900">
                      Question {idx + 1}: {q?.category || 'Technical Prompt'}
                    </span>
                    <span>{ans.timeSpentSeconds}s duration</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-800">
                    {q?.text || 'Assessment Question'}
                  </p>
                  <div className="p-3 rounded-lg bg-white border border-zinc-200/70 text-xs text-zinc-700 leading-relaxed font-sans">
                    {ans.answerText || 'No verbal response recorded.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary h-9 px-4 text-xs font-medium"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
