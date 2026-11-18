'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  Layers, 
  Clock, 
  Sparkles, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Sliders,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { 
  JobConfiguration, 
  LinkConfiguration, 
  SeniorityLevel, 
  InterviewType, 
  InterviewDifficulty, 
  ExpirationOption,
  InterviewInvitation,
  CandidateInfo,
  StructuredInterviewPlan,
  InterviewQuestion 
} from '@/types/interview';
import { SAMPLE_JOB_TITLES, DEFAULT_SKILLS_BY_ROLE } from '@/lib/mockData';
import { 
  createInterview, 
  getInterviews,
  saveInterviews 
} from '@/lib/storage';

export default function CreateInterviewPage() {
  // Company & Candidate Details
  const [companyName, setCompanyName] = useState('Acme Global Tech');
  const [candidateName, setCandidateName] = useState('Jordan Lee');
  const [candidateEmail, setCandidateEmail] = useState('jordan.lee@example.com');
  const [isGenerating, setIsGenerating] = useState(false);

  // Job Details State
  const [jobTitle, setJobTitle] = useState('Frontend Developer');
  const [jobDescription, setJobDescription] = useState(
    'Seeking an experienced Frontend Developer proficient in React, TypeScript, Next.js, and web performance optimization to engineer scalable interfaces.'
  );
  const [requiredSkills, setRequiredSkills] = useState<string[]>([
    'React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Web Vitals'
  ]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [requiredExperience, setRequiredExperience] = useState('3-5 years');
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>('Mid-level');

  // Interview Configuration
  const [interviewType, setInterviewType] = useState<InterviewType>('Technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState<number>(30);
  const [language, setLanguage] = useState('English');

  // Link Configuration
  const [expiration, setExpiration] = useState<ExpirationOption>('24 hours');

  // Submission & Result state
  const [createdInvitation, setCreatedInvitation] = useState<InterviewInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    const timer = setTimeout(() => {
      const canonicalUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (canonicalUrl) {
        setBaseUrl(canonicalUrl.replace(/\/$/, ''));
      } else if (typeof window !== 'undefined') {
        setBaseUrl(window.location.origin);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleJobTitleSelect = (title: string) => {
    setJobTitle(title);
    if (DEFAULT_SKILLS_BY_ROLE[title]) {
      setRequiredSkills(DEFAULT_SKILLS_BY_ROLE[title]);
    }
    if (errors.jobTitle) {
      setErrors(prev => ({ ...prev, jobTitle: '' }));
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (!requiredSkills.includes(trimmed)) {
      setRequiredSkills(prev => [...prev, trimmed]);
      if (errors.requiredSkills) setErrors(prev => ({ ...prev, requiredSkills: '' }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    const updated = requiredSkills.filter(s => s !== skill);
    setRequiredSkills(updated);
    if (updated.length === 0) {
      setErrors(prev => ({ ...prev, requiredSkills: 'At least one required skill is needed.' }));
    }
  };

  // Quick Preset per the Final Acceptance Test
  const loadAcceptanceTestPreset = () => {
    setCompanyName('Acme Global Tech');
    setCandidateName('Jordan Lee');
    setCandidateEmail('jordan.lee@example.com');
    setJobTitle('Frontend Developer');
    setJobDescription(
      'Looking for a Frontend Developer with strong React, Next.js, and TypeScript skills to build and maintain user-facing web applications.'
    );
    setRequiredSkills(['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Web Vitals']);
    setRequiredExperience('3-5 years');
    setSeniorityLevel('Mid-level');
    setInterviewType('Technical');
    setDifficulty('Intermediate');
    setQuestionCount(10);
    setExpectedDurationMinutes(30);
    setLanguage('English');
    setExpiration('24 hours');
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required.';
    if (!candidateName.trim()) errs.candidateName = 'Candidate name is required.';
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) errs.candidateEmail = 'Valid candidate email is required.';
    if (!jobTitle.trim()) errs.jobTitle = 'Job title is required.';
    if (!jobDescription.trim()) errs.jobDescription = 'Job description is required.';
    if (requiredSkills.length === 0) errs.requiredSkills = 'Add at least one technical skill tag.';
    if (!requiredExperience.trim()) errs.requiredExperience = 'Required experience is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isGenerating) return;

    setIsGenerating(true);

    const jobConfig: JobConfiguration = {
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      requiredSkills,
      requiredExperience: requiredExperience.trim(),
      seniorityLevel,
      interviewType,
      difficulty,
      questionCount,
      expectedDurationMinutes,
      language,
    };

    const linkConfig: LinkConfiguration = {
      expiration,
    };

    const candidateInfo: CandidateInfo = {
      fullName: candidateName.trim(),
      email: candidateEmail.trim(),
    };

    let planData: StructuredInterviewPlan | undefined = undefined;
    let customQuestions: InterviewQuestion[] | undefined = undefined;

    try {
      const planRes = await fetch('/api/interviews/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobConfig })
      });
      if (planRes.ok) {
        const json = await planRes.json();
        if (json.plan) {
          planData = json.plan;
          customQuestions = json.questions;
        }
      }
    } catch {
      // Fallback cleanly if offline or server endpoint unreachable
    }

    const jobConfigWithPlan: JobConfiguration = {
      ...jobConfig,
      structuredPlan: planData,
    };

    const newInv = createInterview(jobConfigWithPlan, linkConfig, candidateInfo, customQuestions, { skipSync: true });
    setServerError(null);

    // Authoritative Server Persistence Check
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInv),
      });

      if (!res.ok) {
        // Rollback from local cache so failed/unauthorized creation does not display phantom links on dashboard
        const local = getInterviews();
        saveInterviews(local.filter(i => i.id !== newInv.id && i.token !== newInv.token));
        const errData = await res.json().catch(() => ({}));
        setServerError(errData.error || `Server error (HTTP ${res.status}): Failed to save interview invitation.`);
        setIsGenerating(false);
        return;
      }

      const savedRecord = await res.json();
      const finalRecord: InterviewInvitation = { 
        ...newInv, 
        id: savedRecord.id || newInv.id,
        createdAt: savedRecord.createdAt || newInv.createdAt,
        expiresAt: savedRecord.expiresAt || newInv.expiresAt,
      };
      
      const local = getInterviews();
      saveInterviews([finalRecord, ...local.filter(i => i.id !== finalRecord.id)]);
      setCreatedInvitation(finalRecord);
    } catch (netErr) {
      const local = getInterviews();
      saveInterviews(local.filter(i => i.id !== newInv.id && i.token !== newInv.token));
      setServerError(netErr instanceof Error ? netErr.message : 'Network error connecting to interview API');
    } finally {
      setIsGenerating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyLink = () => {
    if (!createdInvitation) return;
    const link = `${baseUrl}/interview/${createdInvitation.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="py-10 md:py-16 bg-[#fcfcfd] flex-1">
      <div className="ui-form-container space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Assessment Calibration</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
                Create New Assessment
              </h1>
              <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
                Calibrate technical criteria, specify candidate details, and generate a cryptographically signed assessment URL.
              </p>
            </div>

            {/* Quick Preset Button */}
            <button
              type="button"
              onClick={loadAcceptanceTestPreset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-zinc-800 border border-zinc-200/90 hover:bg-zinc-50 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span>Load Frontend Dev (10 Qs)</span>
            </button>
          </div>
        </div>

        {/* Server Error Alert Banner */}
        {serverError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-rose-900">Unable to generate assessment</h4>
              <p className="mt-0.5 text-rose-700">{serverError}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setServerError(null)} 
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Modal / Card after Link Generation */}
        {createdInvitation && (
          <div className="ui-card border border-zinc-950 p-6 sm:p-8 space-y-5 bg-white shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 block font-medium">
                    Assessment Link Generated & Verified
                  </span>
                  <h2 className="text-base sm:text-lg font-semibold text-zinc-950">
                    {createdInvitation.jobConfig.seniorityLevel} {createdInvitation.jobConfig.jobTitle}
                  </h2>
                </div>
              </div>
              <span className="inline-flex items-center text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                Active
              </span>
            </div>

            {/* Link Box */}
            <div className="p-3.5 bg-zinc-50 rounded-lg border border-zinc-200/80 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                Single-Use Candidate Invitation URL
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${baseUrl}/interview/${createdInvitation.token}`}
                  className="flex-1 ui-input font-mono text-xs select-all bg-white"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ui-btn-primary whitespace-nowrap h-9 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Details info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600 pt-1 font-mono">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Candidate: <strong className="text-zinc-900 font-sans">{createdInvitation.candidate?.fullName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Expires: <strong className="text-zinc-900">{new Date(createdInvitation.expiresAt).toLocaleDateString()}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Questions: <strong className="text-zinc-900">{createdInvitation.questions.length}</strong></span>
              </div>
            </div>

            {/* Structured Interview Plan Preview */}
            {createdInvitation.jobConfig.structuredPlan && (
              <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-700" /> AI Calibrated Interview Plan
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200/70 text-zinc-800">
                    Gemini 2.5 Structured
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed text-[11px] font-sans">
                  {createdInvitation.jobConfig.structuredPlan.interviewStructureSummary}
                </p>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Evaluated Competencies:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {createdInvitation.jobConfig.structuredPlan.competencyCategories.map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-800 font-mono text-[10px]">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/interview/${createdInvitation.token}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-950"
              >
                <span>Preview Candidate Screen</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreatedInvitation(null)}
                  className="ui-btn-secondary text-xs h-8 px-3"
                >
                  Create Another
                </button>
                <Link
                  href="/interviews"
                  className="ui-btn-primary text-xs h-8 px-3.5"
                >
                  View in Interviews
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form Card */}
        <form onSubmit={handleSubmit} className="ui-card p-6 sm:p-8 space-y-7">
          {/* SECTION 1: CANDIDATE & COMPANY ASSIGNMENT */}
          <div className="space-y-4">
            <div className="border-b border-zinc-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-mono font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-zinc-500" />
                1. Candidate & Organization Details
              </h2>
              <span className="text-[11px] text-zinc-400 font-sans">Pre-populated on candidate screen</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-xs font-medium text-zinc-700 mb-1">
                  Hiring Organization <span className="text-rose-500">*</span>
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' }));
                  }}
                  placeholder="e.g. Acme Corp"
                  className="ui-input"
                />
                {errors.companyName && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.companyName}
                  </p>
                )}
              </div>

              {/* Candidate Full Name */}
              <div>
                <label htmlFor="candidateName" className="block text-xs font-medium text-zinc-700 mb-1">
                  Candidate Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    if (errors.candidateName) setErrors(prev => ({ ...prev, candidateName: '' }));
                  }}
                  placeholder="e.g. Jordan Lee"
                  className="ui-input"
                />
                {errors.candidateName && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.candidateName}
                  </p>
                )}
              </div>

              {/* Candidate Email */}
              <div>
                <label htmlFor="candidateEmail" className="block text-xs font-medium text-zinc-700 mb-1">
                  Candidate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="candidateEmail"
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => {
                    setCandidateEmail(e.target.value);
                    if (errors.candidateEmail) setErrors(prev => ({ ...prev, candidateEmail: '' }));
                  }}
                  placeholder="e.g. jordan.lee@example.com"
                  className="ui-input font-mono text-xs"
                />
                {errors.candidateEmail && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.candidateEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: JOB DETAILS */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-zinc-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-mono font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                2. Engineering Role Requirements
              </h2>
              <span className="text-[11px] text-zinc-400 font-sans">Defines AI question plan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Title */}
              <div>
                <label htmlFor="jobTitle" className="block text-xs font-medium text-zinc-700 mb-1">
                  Target Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="jobTitle"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    if (errors.jobTitle) setErrors(prev => ({ ...prev, jobTitle: '' }));
                  }}
                  placeholder="e.g. Frontend Developer"
                  className="ui-input"
                />
                {errors.jobTitle && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.jobTitle}
                  </p>
                )}

                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Quick Roles:</span>
                  {SAMPLE_JOB_TITLES.slice(0, 4).map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => handleJobTitleSelect(title)}
                      className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seniority Level */}
              <div>
                <label htmlFor="seniorityLevel" className="block text-xs font-medium text-zinc-700 mb-1">
                  Seniority Level
                </label>
                <select
                  id="seniorityLevel"
                  value={seniorityLevel}
                  onChange={(e) => setSeniorityLevel(e.target.value as SeniorityLevel)}
                  className="ui-input cursor-pointer"
                >
                  <option value="Junior">Junior (0 - 2 yrs)</option>
                  <option value="Mid-level">Mid-level (3 - 5 yrs)</option>
                  <option value="Senior">Senior (5 - 8 yrs)</option>
                  <option value="Lead / Staff">Lead / Staff (8+ yrs)</option>
                  <option value="Principal">Principal (10+ yrs)</option>
                </select>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="jobDescription" className="block text-xs font-medium text-zinc-700 mb-1">
                Role Context & Responsibilities <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="jobDescription"
                rows={3}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (errors.jobDescription) setErrors(prev => ({ ...prev, jobDescription: '' }));
                }}
                placeholder="Describe role scope and responsibilities..."
                className="w-full p-3 rounded-lg border border-zinc-200/90 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 focus:border-zinc-900 resize-y bg-white font-sans leading-relaxed shadow-2xs"
              />
              {errors.jobDescription && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.jobDescription}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Required Experience */}
              <div>
                <label htmlFor="requiredExperience" className="block text-xs font-medium text-zinc-700 mb-1">
                  Required Experience <span className="text-rose-500">*</span>
                </label>
                <input
                  id="requiredExperience"
                  type="text"
                  value={requiredExperience}
                  onChange={(e) => {
                    setRequiredExperience(e.target.value);
                    if (errors.requiredExperience) setErrors(prev => ({ ...prev, requiredExperience: '' }));
                  }}
                  placeholder="e.g. 3-5 years"
                  className="ui-input"
                />
              </div>

              {/* Technical Skills */}
              <div>
                <label htmlFor="newSkillInput" className="block text-xs font-medium text-zinc-700 mb-1">
                  Required Technical Stack <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-zinc-100 text-zinc-800 border border-zinc-200/80"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="p-0.5 rounded hover:bg-zinc-200 text-zinc-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="newSkillInput"
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add skill (e.g. GraphQL, Postgres)..."
                    className="flex-1 ui-input h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="ui-btn-secondary h-9 px-3 text-xs"
                  >
                    Add Tag
                  </button>
                </div>
                {errors.requiredSkills && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.requiredSkills}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: INTERVIEW PARAMETERS & LINK EXPIRY */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-zinc-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-mono font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                3. Assessment Parameters & Security
              </h2>
              <span className="text-[11px] text-zinc-400 font-sans">Recruiter controls</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interview Type */}
              <div>
                <span className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Assessment Focus
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['Technical', 'HR', 'Behavioural', 'Mixed'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setInterviewType(type)}
                      className={`h-9 px-3 rounded-lg border text-xs font-medium transition-all text-center ${
                        interviewType === type
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <span className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Depth & Rigor
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
                    <button
                      type="button"
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`h-9 px-2 rounded-lg border text-xs font-medium transition-all text-center ${
                        difficulty === diff
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Question Count */}
              <div>
                <label htmlFor="questionCount" className="block text-xs font-medium text-zinc-700 mb-1">
                  Question Count
                </label>
                <select
                  id="questionCount"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="ui-input cursor-pointer"
                >
                  <option value={3}>3 Questions (Brief intake)</option>
                  <option value={5}>5 Questions (Standard screen)</option>
                  <option value={7}>7 Questions (In-depth)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                </select>
              </div>

              {/* Expected Duration */}
              <div>
                <label htmlFor="expectedDurationMinutes" className="block text-xs font-medium text-zinc-700 mb-1">
                  Target Duration
                </label>
                <select
                  id="expectedDurationMinutes"
                  value={expectedDurationMinutes}
                  onChange={(e) => setExpectedDurationMinutes(Number(e.target.value))}
                  className="ui-input cursor-pointer"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              {/* Expiration */}
              <div>
                <label htmlFor="expiration" className="block text-xs font-medium text-zinc-700 mb-1">
                  Token Expiration
                </label>
                <select
                  id="expiration"
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value as ExpirationOption)}
                  className="ui-input cursor-pointer"
                >
                  <option value="24 hours">24 Hours</option>
                  <option value="48 hours">48 Hours</option>
                  <option value="7 days">7 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              Candidate accesses only pre-filled details and enters assessment directly with zero configuration friction.
            </p>

            <button
              type="submit"
              disabled={isGenerating}
              className="ui-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 h-10 px-5 text-xs font-semibold shadow-2xs"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Interview Plan...</span>
                </>
              ) : (
                <>
                  <span>Generate Assessment Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
