'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  PlusCircle, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  X, 
  ShieldCheck, 
  ChevronRight, 
  Briefcase, 
  Eye, 
  Ban, 
  TrendingUp, 
  ThumbsUp, 
  Award,
  Sparkles,
  Calendar,
  Lock
} from 'lucide-react';
import { 
  InterviewInvitation, 
  RecruiterDashboardMetrics 
} from '@/types/interview';
import { 
  getInterviews, 
  fetchInterviewsFromServer,
  getRecruiterMetrics, 
  revokeInterview, 
  deleteInterview 
} from '@/lib/storage';

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'interviews';

  const [activeTab, setActiveTab] = useState<'interviews' | 'reports' | 'candidates' | 'settings'>('interviews');
  const [interviews, setInterviews] = useState<InterviewInvitation[]>([]);
  const [metrics, setMetrics] = useState<RecruiterDashboardMetrics>({
    totalCreated: 0,
    activeLinks: 0,
    pendingInterviews: 0,
    completedInterviews: 0,
    expiredInterviews: 0,
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

  useEffect(() => {
    if (initialTab === 'reports' || initialTab === 'candidates' || initialTab === 'settings' || initialTab === 'interviews') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const refreshData = async () => {
    const data = getInterviews();
    setInterviews(data);
    setMetrics(getRecruiterMetrics(data));

    try {
      const serverData = await fetchInterviewsFromServer();
      if (serverData && serverData.length > 0) {
        setInterviews(serverData);
        setMetrics(getRecruiterMetrics(serverData));
      }
    } catch {
      // Ignore network errors, local data already rendered
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCopyLink = (token: string) => {
    const link = `${baseUrl}/interview/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevoke = (id: string) => {
    if (confirm('Are you sure you want to revoke this invitation link? Candidates will no longer be able to access the interview.')) {
      revokeInterview(id);
      refreshData();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this interview record permanently?')) {
      deleteInterview(id);
      refreshData();
      if (selectedInterviewForReport?.id === id) setSelectedInterviewForReport(null);
      if (selectedInterviewForDetails?.id === id) setSelectedInterviewForDetails(null);
    }
  };

  const completedList = interviews.filter(i => i.status === 'completed');
  const candidatesList = interviews.filter(i => !!i.candidate);

  return (
    <div className="py-10 md:py-16 bg-slate-50 flex-1">
      <div className="ui-page-container space-y-8">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <Layers className="w-4 h-4" />
              <span>Hiring Management</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Recruiter Dashboard
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Create, monitor, and review automated AI candidate interviews across your pipeline.
            </p>
          </div>

          <Link
            href="/config"
            className="ui-btn-primary self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Interview</span>
          </Link>
        </div>

        {/* Recruiter Metrics KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Created */}
          <div className="ui-card p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Created
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {metrics.totalCreated}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">All interview links</span>
          </div>

          {/* Active Links */}
          <div className="ui-card p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Active Links
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              {metrics.activeLinks}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Awaiting candidate</span>
          </div>

          {/* Pending Interviews */}
          <div className="ui-card p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
              Pending
            </span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-2">
              {metrics.pendingInterviews}
            </div>
            <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">Active or in-progress</span>
          </div>

          {/* Completed Interviews */}
          <div className="ui-card p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 block">
              Completed
            </span>
            <div className="text-3xl font-extrabold text-violet-600 mt-2">
              {metrics.completedInterviews}
            </div>
            <span className="text-[11px] text-violet-600 font-semibold mt-1 block">Reports available</span>
          </div>

          {/* Expired Interviews */}
          <div className="ui-card p-5 col-span-2 lg:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Expired
            </span>
            <div className="text-3xl font-extrabold text-amber-600 mt-2">
              {metrics.expiredInterviews}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Past expiration window</span>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="ui-card overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('interviews')}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'interviews'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Interview Links ({interviews.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'reports'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Completed Reports ({completedList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'candidates'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Candidates ({candidatesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-5 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* TAB 1: ALL INTERVIEWS & LINKS */}
          {activeTab === 'interviews' && (
            <div>
              {interviews.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">No interviews created yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure your first role and generate a unique invitation link for candidates.
                    </p>
                  </div>
                  <Link
                    href="/config"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusCircle className="w-4 h-4" /> Create Interview
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {interviews.map((inv) => {
                    const isCopied = copiedToken === inv.token;
                    const isExpired = inv.status === 'expired' || new Date(inv.expiresAt).getTime() < Date.now();
                    const statusBadgeColor = {
                      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      completed: 'bg-violet-50 text-violet-700 border-violet-200',
                      expired: 'bg-amber-50 text-amber-700 border-amber-200',
                      revoked: 'bg-slate-100 text-slate-600 border-slate-300',
                    }[inv.status];

                    return (
                      <div
                        key={inv.id}
                        className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">
                              {inv.jobConfig.jobTitle}
                            </span>
                            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {inv.jobConfig.seniorityLevel}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                              {inv.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-xs font-medium text-slate-500">
                              {inv.jobConfig.interviewType} Focus • {inv.jobConfig.difficulty} Difficulty • {inv.questions.length} Questions
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Created: {new Date(inv.createdAt).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Expires: {new Date(inv.expiresAt).toLocaleDateString()} ({inv.linkConfig.expiration})
                            </span>
                            <span>•</span>
                            <span>Token: <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{inv.token}</code></span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-slate-400 text-slate-700 transition-colors shadow-2xs"
                            title="Copy candidate invitation link"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForDetails(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {/* View Report if completed */}
                          {inv.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => setSelectedInterviewForReport(inv)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Report</span>
                            </button>
                          )}

                          {/* Revoke link button if active */}
                          {inv.status === 'active' && !isExpired && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(inv.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Revoke active link"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPLETED REPORTS */}
          {activeTab === 'reports' && (
            <div>
              {completedList.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">No completed interviews yet</h3>
                  <p className="text-xs text-slate-500">
                    Once candidates open their invitation links and finish answering the AI questions, their reports will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-5">Candidate</th>
                        <th className="py-3 px-5">Job Role</th>
                        <th className="py-3 px-5">Interview Date</th>
                        <th className="py-3 px-5">Duration</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {completedList.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-900">{inv.candidate?.fullName || 'Anonymous Candidate'}</div>
                            <div className="text-[11px] text-slate-500">{inv.candidate?.email || 'No email recorded'}</div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="font-medium text-slate-900">{inv.jobConfig.jobTitle}</div>
                            <div className="text-[11px] text-slate-500">{inv.jobConfig.seniorityLevel}</div>
                          </td>
                          <td className="py-4 px-5 text-slate-600">
                            {inv.completedAt ? new Date(inv.completedAt).toLocaleDateString() : 'Recent'}
                          </td>
                          <td className="py-4 px-5 font-mono text-slate-600">
                            {inv.totalDurationSeconds ? `${Math.round(inv.totalDurationSeconds / 60)} mins` : '~25 mins'}
                          </td>
                          <td className="py-4 px-5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedInterviewForReport(inv)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Report</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CANDIDATES DIRECTORY */}
          {activeTab === 'candidates' && (
            <div>
              {candidatesList.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">No candidate submissions recorded</h3>
                  <p className="text-xs text-slate-500">
                    Candidates who verify their details and start an assessment will appear in this directory.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {candidatesList.map((inv) => (
                    <div key={inv.id} className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{inv.candidate?.fullName}</h4>
                        <p className="text-xs text-slate-500">{inv.candidate?.email}</p>
                        <p className="text-[11px] text-slate-400">
                          Applied for: <strong className="text-slate-700">{inv.jobConfig.jobTitle}</strong> ({inv.jobConfig.seniorityLevel})
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs capitalize font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {inv.status}
                        </span>
                        {inv.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setSelectedInterviewForReport(inv)}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg"
                          >
                            View Report
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="max-w-xl space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Recruiter Workspace Settings</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configure enterprise recruitment defaults, notification webhooks, and assessment parameters.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <p className="font-bold text-slate-800">Mock Link Provider (Day 1 Mode)</p>
                    <p className="text-slate-600">
                      Using local simulated invitation link generation and local client persistence. Fully self-contained without external database credentials.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1.5">
                    <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Day 2 Backend Roadmap
                    </p>
                    <p className="text-indigo-900">
                      Supabase PostgreSQL database sync, token cryptographic hashing, and live Google Gemini 2.0 LLM conversational streaming will activate tomorrow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: VIEW REPORT MODAL */}
      {selectedInterviewForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Recruiter Candidate Evaluation Report
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedInterviewForReport.candidate?.fullName || 'Candidate Assessment'}
                </h3>
                <p className="text-xs text-slate-500">
                  Email: {selectedInterviewForReport.candidate?.email} • Position: {selectedInterviewForReport.jobConfig.jobTitle} ({selectedInterviewForReport.jobConfig.seniorityLevel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInterviewForReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recruiter Evaluation Summary */}
            {selectedInterviewForReport.recruiterReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Technical Rating</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedInterviewForReport.recruiterReport.technicalCompetency}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Communication</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedInterviewForReport.recruiterReport.communicationClarity}
                    </span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Recommendation</span>
                    <span className="text-xs font-bold text-indigo-950">
                      {selectedInterviewForReport.recruiterReport.recommendation}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">Recruiter Evaluation Note:</p>
                  <p className="leading-relaxed">{selectedInterviewForReport.recruiterReport.overallAssessment}</p>
                </div>

                {/* Strengths & Probe areas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-emerald-950 space-y-1.5">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Notable Strengths
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {selectedInterviewForReport.recruiterReport.notableStrengths.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100 text-amber-950 space-y-1.5">
                    <p className="font-bold text-amber-800 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Live Round Focus Areas
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {selectedInterviewForReport.recruiterReport.areasToProbeInLiveRound.map((ar, i) => (
                        <li key={i}>{ar}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Evaluation report pending final recruiter generation.
              </div>
            )}

            {/* Q&A Transcript Review */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Candidate Q&A Transcript ({selectedInterviewForReport.answers.length} Questions Submitted)
              </h4>
              <div className="space-y-3">
                {selectedInterviewForReport.questions.map((q, idx) => {
                  const ans = selectedInterviewForReport.answers.find(a => a.questionId === q.id) || selectedInterviewForReport.answers[idx];
                  return (
                    <div key={q.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Question {idx + 1}: {q.category}</span>
                        {ans && <span className="text-slate-400 font-normal">{ans.timeSpentSeconds}s</span>}
                      </div>
                      <p className="text-slate-800 font-medium">{q.text}</p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {ans ? ans.answerText : <span className="text-slate-400 italic">No answer submitted</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInterviewForReport(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERVIEW DETAILS MODAL */}
      {selectedInterviewForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Interview Configuration
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedInterviewForDetails.jobConfig.jobTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInterviewForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <p className="font-bold text-slate-900 mb-1">Job Description:</p>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                  {selectedInterviewForDetails.jobConfig.jobDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Seniority & Experience:</span>
                  <span>{selectedInterviewForDetails.jobConfig.seniorityLevel} ({selectedInterviewForDetails.jobConfig.requiredExperience})</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Format & Difficulty:</span>
                  <span>{selectedInterviewForDetails.jobConfig.interviewType} • {selectedInterviewForDetails.jobConfig.difficulty}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1.5">Required Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedInterviewForDetails.jobConfig.requiredSkills.map(sk => (
                    <span key={sk} className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1.5">Configured Questions ({selectedInterviewForDetails.questions.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedInterviewForDetails.questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                      <strong className="text-slate-800">Q{idx + 1}:</strong> {q.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleCopyLink(selectedInterviewForDetails.token);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Invitation Link
              </button>

              <button
                type="button"
                onClick={() => setSelectedInterviewForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
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

export default function RecruiterDashboardPage() {
  return (
    <React.Suspense fallback={
      <div className="py-20 flex items-center justify-center bg-slate-50 min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading recruiter workspace...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </React.Suspense>
  );
}
