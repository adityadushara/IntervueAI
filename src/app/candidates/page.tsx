'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  FileText, 
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { InterviewInvitation } from '@/types/interview';
import { getInterviews, fetchInterviewsFromServer } from '@/lib/storage';
import ScorecardModal from '@/components/ScorecardModal';

export default function CandidatesPage() {
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active' | 'in_progress'>('all');
  const [selectedInterviewForReport, setSelectedInterviewForReport] = useState<InterviewInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

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

  const copyToClipboard = (token: string) => {
    const url = `${baseUrl}/interview/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Filter candidates list
  const candidatesList = interviews.filter(inv => {
    const q = searchTerm.toLowerCase();
    const candidateName = inv.candidate?.fullName?.toLowerCase() || '';
    const candidateEmail = inv.candidate?.email?.toLowerCase() || '';
    const jobTitle = inv.jobConfig?.jobTitle?.toLowerCase() || '';

    const matchSearch = !searchTerm || candidateName.includes(q) || candidateEmail.includes(q) || jobTitle.includes(q);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalCandidates = interviews.filter(i => !!i.candidate?.fullName).length;
  const completedCandidates = interviews.filter(i => i.status === 'completed').length;
  const activeCandidates = interviews.filter(i => i.status === 'active' || i.status === 'in_progress').length;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 space-y-7 flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
            Candidates Directory
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
            Track candidates across the interview pipeline, evaluate responses, and view scorecards.
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
            <span>Invite New Candidate</span>
          </Link>
        </div>
      </div>

      {/* Candidate KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-zinc-500 block">Total Candidates</span>
          <div className="text-2xl sm:text-3xl font-semibold text-zinc-950">
            {totalCandidates}
          </div>
          <span className="text-xs text-zinc-400 block">Invited to screening</span>
        </div>

        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-emerald-700 block">Active Assessments</span>
          <div className="text-2xl sm:text-3xl font-semibold text-emerald-600">
            {activeCandidates}
          </div>
          <span className="text-xs text-emerald-600/80 block">Pending intake or in-progress</span>
        </div>

        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-zinc-700 block">Evaluated Dossiers</span>
          <div className="text-2xl sm:text-3xl font-semibold text-zinc-950">
            {completedCandidates}
          </div>
          <span className="text-xs text-zinc-400 block">Ready for review</span>
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
            placeholder="Search candidate by name, email, or role..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'active' | 'in_progress')}
            className="bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-800 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950"
          >
            <option value="all">All Candidates</option>
            <option value="completed">Completed Only</option>
            <option value="active">Active Link</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="ui-card overflow-hidden bg-white">
        {isLoading && interviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-500">Loading candidate directory...</p>
          </div>
        ) : candidatesList.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">No candidates found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'No candidates match your search filters.'
                  : 'Start inviting candidates to technical assessments to populate this directory.'}
              </p>
            </div>
            <Link
              href="/config"
              className="ui-btn-primary h-8 px-4 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Candidate Assessment</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Role Applied</th>
                  <th className="py-3 px-4">Pipeline Status</th>
                  <th className="py-3 px-4">Invited Date</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {candidatesList.map((interview) => {
                  const isCompleted = interview.status === 'completed';
                  const score = interview.recruiterReport?.overallScore;
                  const recommendation = interview.recruiterReport?.recommendation;

                  return (
                    <tr key={interview.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Candidate Avatar & Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 font-semibold text-xs flex items-center justify-center shrink-0">
                            {getInitials(interview.candidate?.fullName)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-950">
                              {interview.candidate?.fullName || 'Unnamed Candidate'}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {interview.candidate?.email || 'No email specified'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Applied */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-zinc-900">
                          {interview.jobConfig?.jobTitle || 'General Engineering'}
                        </span>
                        <div className="text-[11px] text-zinc-500">
                          {interview.questions.length} questions • {Math.round(interview.jobConfig?.expectedDurationMinutes || 25)} mins
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-zinc-900 text-white border-zinc-950'
                            : interview.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200/60'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted ? 'bg-white' : interview.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`} />
                          <span className="capitalize">{interview.status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Invited Date */}
                      <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap text-[11px]">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCompleted && score !== undefined ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-zinc-950 text-xs">
                              {score}/100
                            </span>
                            {recommendation && (
                              <div className="text-[10px] text-emerald-700 font-medium truncate max-w-[130px]">
                                {recommendation}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForReport(interview)}
                            className="ui-btn-secondary h-7 px-2.5 text-xs font-medium inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-500" />
                            <span>View Dossier</span>
                          </button>
                        ) : interview.token ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(interview.token)}
                            className="ui-btn-secondary h-7 px-2.5 text-xs font-medium inline-flex items-center gap-1"
                          >
                            {copiedToken === interview.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                            <span>{copiedToken === interview.token ? 'Copied' : 'Copy Link'}</span>
                          </button>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scorecard Report Modal */}
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
