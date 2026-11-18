'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  RefreshCw,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Volume2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { InterviewInvitation } from '@/types/interview';
import { getInterviews, fetchInterviewsFromServer } from '@/lib/storage';
import ScorecardModal from '@/components/ScorecardModal';

export default function ReportsPage() {
  const [interviews, setInterviews] = useState<InterviewInvitation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getInterviews();
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return getInterviews().length === 0;
      } catch {
        return true;
      }
    }
    return true;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<string>('all');
  const [selectedInterviewForReport, setSelectedInterviewForReport] = useState<InterviewInvitation | null>(null);

  const refreshData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchInterviewsFromServer();
      setInterviews(data);
    } catch {
      // Fallback cleanly
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const hasCached = interviews.length > 0;
    refreshData(hasCached);
  }, []);

  // Filter completed interviews
  const completedInterviews = interviews.filter(inv => inv.status === 'completed');

  const filteredDossiers = completedInterviews.filter(inv => {
    const q = searchTerm.toLowerCase();
    const candidateName = inv.candidate?.fullName?.toLowerCase() || '';
    const jobTitle = inv.jobConfig?.jobTitle?.toLowerCase() || '';
    const rec = inv.recruiterReport?.recommendation?.toLowerCase() || '';

    const matchSearch = !searchTerm || candidateName.includes(q) || jobTitle.includes(q);
    const matchRec = recommendationFilter === 'all' || rec.includes(recommendationFilter.toLowerCase());

    return matchSearch && matchRec;
  });

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 space-y-7 flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
            Evaluation Dossiers
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
            Objective candidate scorecards, verbatim spoken transcripts, and hiring recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refreshData(false)}
            disabled={isLoading}
            className="ui-btn-secondary h-9 px-3 text-xs font-medium gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/config"
            className="ui-btn-primary h-9 px-4 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Assessment</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="ui-card p-3 sm:p-4 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search report by candidate or role..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-800 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950"
          >
            <option value="all">All Recommendations</option>
            <option value="strong hire">Strong Hire</option>
            <option value="hire">Hire</option>
            <option value="consider">Consider</option>
            <option value="no hire">No Hire</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading && interviews.length === 0 ? (
        <div className="ui-card p-12 text-center space-y-3 bg-white">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
          <p className="text-xs text-zinc-500">Loading evaluation dossiers...</p>
        </div>
      ) : filteredDossiers.length === 0 ? (
        <div className="ui-card p-12 text-center space-y-4 bg-white">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-900">No completed dossiers found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {completedInterviews.length > 0 
                ? 'No dossiers match your filter criteria.'
                : 'Candidates who complete voice assessments will automatically have their dossiers generated and displayed here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredDossiers.map((interview) => {
            const report = interview.recruiterReport;
            const score = report?.overallScore ?? 0;
            const isStrong = score >= 85;

            return (
              <div 
                key={interview.id} 
                className="ui-card p-5 sm:p-6 bg-white space-y-5 hover:border-zinc-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div>
                      <h3 className="font-semibold text-zinc-950 text-base">
                        {interview.candidate?.fullName || 'Unnamed Candidate'}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {interview.jobConfig?.jobTitle || 'General Engineering'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isStrong 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                      }`}>
                        {report?.recommendation || `${score}/100`}
                      </span>
                    </div>
                  </div>

                  {/* Score & Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>Overall Assessment Score</span>
                      <span className="font-semibold text-zinc-950 text-sm">{score}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isStrong ? 'bg-emerald-600' : 'bg-zinc-900'}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed pt-1 line-clamp-2">
                      {report?.overallAssessment || 'Candidate verbal answers evaluated against technical criteria.'}
                    </p>
                  </div>

                  {/* Competency Highlights */}
                  {report?.detailedEvaluation?.competencies && (
                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Top Competencies
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200/60 flex items-center justify-between">
                          <span className="text-zinc-600 truncate text-[11px]">Technical Knowledge</span>
                          <span className="font-semibold text-zinc-900 text-[11px] ml-1">
                            {report.detailedEvaluation.competencies.technicalKnowledge.score}%
                          </span>
                        </div>
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200/60 flex items-center justify-between">
                          <span className="text-zinc-600 truncate text-[11px]">Problem Solving</span>
                          <span className="font-semibold text-zinc-900 text-[11px] ml-1">
                            {report.detailedEvaluation.competencies.problemSolving.score}%
                          </span>
                        </div>
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200/60 flex items-center justify-between">
                          <span className="text-zinc-600 truncate text-[11px]">Communication</span>
                          <span className="font-semibold text-zinc-900 text-[11px] ml-1">
                            {report.detailedEvaluation.competencies.communication.score}%
                          </span>
                        </div>
                        <div className="p-2 rounded bg-zinc-50 border border-zinc-200/60 flex items-center justify-between">
                          <span className="text-zinc-600 truncate text-[11px]">System Design</span>
                          <span className="font-semibold text-zinc-900 text-[11px] ml-1">
                            {report.detailedEvaluation.competencies.roleSpecific.score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Action */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(interview.completedAt || interview.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedInterviewForReport(interview)}
                    className="ui-btn-secondary h-8 px-3 text-xs font-semibold gap-1 inline-flex items-center text-zinc-900"
                  >
                    <span>Open Full Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Dossier Modal */}
      {selectedInterviewForReport && (
        <ScorecardModal
          interview={selectedInterviewForReport}
          onClose={() => setSelectedInterviewForReport(null)}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
}
