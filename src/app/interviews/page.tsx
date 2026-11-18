'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Trash2, 
  FileText, 
  Users, 
  X, 
  Briefcase, 
  Eye, 
  Ban, 
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { InterviewInvitation, RecruiterDashboardMetrics } from '@/types/interview';
import { 
  getInterviews,
  fetchInterviewsFromServer,
  getRecruiterMetrics, 
  deleteInterviewOnServer,
  revokeInterviewOnServer,
  regenerateTokenOnServer
} from '@/lib/storage';
import ScorecardModal from '@/components/ScorecardModal';

export default function InterviewsPage() {
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score_desc'>('newest');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [metrics, setMetrics] = useState<RecruiterDashboardMetrics>(() => {
    if (typeof window !== 'undefined') {
      try {
        const local = getInterviews();
        return getRecruiterMetrics(local);
      } catch {
        // Fallback
      }
    }
    return {
      totalCreated: 0,
      activeLinks: 0,
      pendingInterviews: 0,
      completedInterviews: 0,
      expiredInterviews: 0,
      failedEvaluations: 0,
    };
  });

  const [selectedInterviewForReport, setSelectedInterviewForReport] = useState<InterviewInvitation | null>(null);
  const [selectedInterviewForDetails, setSelectedInterviewForDetails] = useState<InterviewInvitation | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const refreshData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const serverData = await fetchInterviewsFromServer();
      setInterviews(serverData);
      setMetrics(getRecruiterMetrics(serverData));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to synchronize with server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If local cached interviews already exist, revalidate silently without blocking the UI
    const hasCached = interviews.length > 0;
    refreshData(hasCached);
  }, []);

  const copyToClipboard = (token: string) => {
    const url = `${baseUrl}/interview/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this interview token? The candidate will no longer be able to access or complete this assessment.')) {
      return;
    }
    const success = await revokeInterviewOnServer(invitationId);
    if (success) {
      setActionMessage({ type: 'success', text: 'Interview token revoked successfully.' });
      await refreshData();
    } else {
      setActionMessage({ type: 'error', text: 'Failed to revoke interview token on server.' });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDelete = async (invitationId: string) => {
    if (!confirm('Are you sure you want to permanently delete this interview? This action cannot be undone.')) {
      return;
    }
    const success = await deleteInterviewOnServer(invitationId);
    if (success) {
      setActionMessage({ type: 'success', text: 'Interview deleted successfully.' });
      await refreshData();
    } else {
      setActionMessage({ type: 'error', text: 'Failed to delete interview record on server.' });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleRegenerate = async (invitationId: string) => {
    if (!confirm('Regenerating this token will immediately invalidate the previous invitation link and generate a fresh 24-hour token. Continue?')) {
      return;
    }
    try {
      setRegeneratingId(invitationId);
      const newToken = await regenerateTokenOnServer(invitationId);
      if (newToken) {
        setActionMessage({ type: 'success', text: 'New token generated and old token invalidated.' });
        await refreshData();
      } else {
        setActionMessage({ type: 'error', text: 'Failed to regenerate token.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error during token regeneration.' });
    } finally {
      setRegeneratingId(null);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  // Filter and sort logic
  const filteredInterviews = interviews
    .filter(inv => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        !searchTerm ||
        inv.candidate?.fullName?.toLowerCase().includes(q) ||
        inv.candidate?.email?.toLowerCase().includes(q) ||
        inv.jobConfig?.jobTitle?.toLowerCase().includes(q) ||
        inv.token?.toLowerCase().includes(q);

      const matchStatus = 
        statusFilter === 'all' || 
        inv.status === statusFilter;

      const matchRole = 
        roleFilter === 'all' || 
        inv.jobConfig?.jobTitle?.toLowerCase() === roleFilter.toLowerCase();

      return matchSearch && matchStatus && matchRole;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'score_desc') {
        const scoreA = a.recruiterReport?.overallScore ?? -1;
        const scoreB = b.recruiterReport?.overallScore ?? -1;
        return scoreB - scoreA;
      }
      return 0;
    });

  const availableRoles = Array.from(new Set(interviews.map(i => i.jobConfig?.jobTitle).filter(Boolean)));

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 space-y-7 flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
            Interviews &amp; Links
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
            Manage single-use invitation tokens, monitor candidate progress, and copy active assessment links.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refreshData(false)}
            disabled={isLoading}
            className="ui-btn-secondary h-9 px-3 text-xs font-medium gap-1.5"
            title="Refresh pipeline from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/config"
            className="ui-btn-primary h-9 px-4 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Assessment</span>
          </Link>
        </div>
      </div>

      {/* Action status message banner */}
      {actionMessage && (
        <div 
          role="status" 
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-emerald-700 block">Active Links</span>
          <div className="text-2xl sm:text-3xl font-semibold text-emerald-600">
            {metrics.activeLinks}
          </div>
          <span className="text-xs text-emerald-700/80 block">Ready for candidate intake</span>
        </div>

        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-zinc-600 block">In-Progress</span>
          <div className="text-2xl sm:text-3xl font-semibold text-zinc-950">
            {metrics.pendingInterviews}
          </div>
          <span className="text-xs text-zinc-400 block">Candidate actively speaking</span>
        </div>

        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-zinc-700 block">Completed Dossiers</span>
          <div className="text-2xl sm:text-3xl font-semibold text-zinc-950">
            {metrics.completedInterviews}
          </div>
          <span className="text-xs text-zinc-400 block">Ready for hiring review</span>
        </div>

        <div className="ui-card p-4 sm:p-5 bg-white space-y-1">
          <span className="text-xs font-medium text-zinc-500 block">Total Pipeline</span>
          <div className="text-2xl sm:text-3xl font-semibold text-zinc-950">
            {metrics.totalCreated}
          </div>
          <span className="text-xs text-zinc-400 block">Total invitations issued</span>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="ui-card p-3 sm:p-4 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by candidate, role, or token..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-800 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Role Filter */}
          {availableRoles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-800 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950 max-w-[150px] truncate"
            >
              <option value="all">All Roles</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'score_desc')}
              className="bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs text-zinc-800 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score_desc">Highest Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="ui-card overflow-hidden bg-white">
        {isLoading && interviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-500">Loading interview pipeline from database...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <Layers className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">No interviews found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                  ? 'No interviews match your search criteria. Try resetting the filters.'
                  : 'You have not created any technical assessments yet.'}
              </p>
            </div>
            <Link
              href="/config"
              className="ui-btn-primary h-8 px-4 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create First Assessment</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-100 text-zinc-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate &amp; Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Token &amp; Link</th>
                  <th className="py-3 px-4">Created / Expires</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredInterviews.map((interview) => {
                  const isCompleted = interview.status === 'completed';
                  const isRevoked = interview.status === 'revoked';
                  const isExpired = interview.status === 'expired';
                  const isActive = interview.status === 'active';
                  const isInProgress = interview.status === 'in_progress';

                  let statusBadgeColor = 'bg-zinc-100 text-zinc-700 border-zinc-200/60';
                  if (isActive) statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (isInProgress) statusBadgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                  if (isCompleted) statusBadgeColor = 'bg-zinc-900 text-white border-zinc-950';
                  if (isExpired) statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (isRevoked) statusBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';

                  const score = interview.recruiterReport?.overallScore;

                  return (
                    <tr key={interview.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Candidate & Role */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-950">
                          {interview.candidate?.fullName || 'Open Assessment'}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {interview.jobConfig?.jobTitle || 'General Engineering'}
                          {interview.candidate?.email && ` • ${interview.candidate.email}`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : isInProgress ? 'bg-blue-500' : isCompleted ? 'bg-white' : 'bg-zinc-400'
                          }`} />
                          <span className="capitalize">{interview.status.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Token & 1-click Copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/60 max-w-[120px] truncate">
                            {interview.token || 'SHA-256 Vault'}
                          </code>

                          {interview.token && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(interview.token)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                              title="Copy Candidate Link"
                            >
                              {copiedToken === interview.token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Created / Expires */}
                      <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap text-[11px]">
                        <div>{new Date(interview.createdAt).toLocaleDateString()}</div>
                        <div className="text-zinc-400">Exp: {new Date(interview.expiresAt).toLocaleDateString()}</div>
                      </td>

                      {/* Score / Dossier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCompleted && score !== undefined ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForReport(interview)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            <span>{score}/100</span>
                            <FileText className="w-3 h-3" />
                          </button>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForReport(interview)}
                            className="text-xs text-zinc-600 hover:underline"
                          >
                            View Report
                          </button>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForDetails(interview)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            title="View Link Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Regenerate Token */}
                          {!isCompleted && !isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleRegenerate(interview.id)}
                              disabled={regeneratingId === interview.id}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                              title="Regenerate Token"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === interview.id ? 'animate-spin text-blue-600' : ''}`} />
                            </button>
                          )}

                          {/* Revoke */}
                          {!isCompleted && !isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(interview.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50"
                              title="Revoke Token"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(interview.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Interview"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Token Details Modal */}
      {selectedInterviewForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <div className="ui-card w-full max-w-lg bg-white p-6 space-y-5 shadow-xl border border-zinc-200">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-zinc-900" />
                <h3 className="font-semibold text-zinc-950 text-sm">Assessment Token Details</h3>
              </div>
              <button 
                onClick={() => setSelectedInterviewForDetails(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">Direct Candidate URL:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${baseUrl}/interview/${selectedInterviewForDetails.token}`}
                    className="flex-1 ui-input font-mono text-xs select-all bg-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedInterviewForDetails.token)}
                    className="ui-btn-secondary h-9 px-3 text-xs"
                  >
                    {copiedToken === selectedInterviewForDetails.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-zinc-600">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Role:</span>
                  <span className="font-medium text-zinc-900">{selectedInterviewForDetails.jobConfig?.jobTitle}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Status:</span>
                  <span className="font-medium text-zinc-900 capitalize">{selectedInterviewForDetails.status}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Created:</span>
                  <span>{new Date(selectedInterviewForDetails.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Expires:</span>
                  <span>{new Date(selectedInterviewForDetails.expiresAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInterviewForDetails(null)}
                className="ui-btn-secondary h-8 px-3 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
