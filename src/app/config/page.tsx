'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  Layers, 
  Clock, 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Mail,
  Sliders
} from 'lucide-react';
import { 
  JobConfiguration, 
  LinkConfiguration, 
  SeniorityLevel, 
  InterviewType, 
  InterviewDifficulty, 
  ExpirationOption,
  InterviewInvitation,
  CandidateInfo 
} from '@/types/interview';
import { SAMPLE_JOB_TITLES, DEFAULT_SKILLS_BY_ROLE } from '@/lib/mockData';
import { createInterview } from '@/lib/storage';

export default function CreateInterviewPage() {
  const router = useRouter();

  // Company & Candidate Details
  const [companyName, setCompanyName] = useState('Acme Global Tech');
  const [candidateName, setCandidateName] = useState('Jordan Lee');
  const [candidateEmail, setCandidateEmail] = useState('jordan.lee@example.com');

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
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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

    const newInv = createInterview(jobConfig, linkConfig, candidateInfo);
    setCreatedInvitation(newInv);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    if (!createdInvitation) return;
    const link = `${baseUrl}/interview/${createdInvitation.token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="py-10 md:py-16 bg-slate-50 flex-1">
      <div className="ui-form-container space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Sliders className="w-4 h-4" />
            <span>Recruiter Setup</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Create New Interview
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Configure candidate details, job requirements, and time limits to generate a unique interview invitation.
              </p>
            </div>

            {/* Quick Preset Button */}
            <button
              type="button"
              onClick={loadAcceptanceTestPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Frontend Dev Preset (10 Qs)</span>
            </button>
          </div>
        </div>

        {/* Success Modal / Display Card after Link Generation */}
        {createdInvitation && (
          <div className="ui-card border-2 border-emerald-500 shadow-sm p-6 sm:p-8 space-y-5 animate-fadeIn">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                    Invitation Link Generated Successfully
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {createdInvitation.jobConfig.seniorityLevel} {createdInvitation.jobConfig.jobTitle}
                  </h2>
                </div>
              </div>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                Active
              </span>
            </div>

            {/* Link Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Candidate Invitation URL
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${baseUrl}/interview/${createdInvitation.token}`}
                  className="flex-1 ui-input font-mono text-xs sm:text-sm select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ui-btn-primary whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Details info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Candidate: <strong className="text-slate-900">{createdInvitation.candidate?.fullName}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Expires: <strong className="text-slate-900">{new Date(createdInvitation.expiresAt).toLocaleDateString()}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Questions: <strong className="text-slate-900">{createdInvitation.questions.length}</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/interview/${createdInvitation.token}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <span>Open Candidate Experience</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreatedInvitation(null)}
                  className="ui-btn-secondary text-xs h-9"
                >
                  Create Another
                </button>
                <Link
                  href="/dashboard"
                  className="ui-btn-primary text-xs h-9 bg-slate-900 hover:bg-slate-800"
                >
                  View in Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form Card */}
        <form onSubmit={handleSubmit} className="ui-card p-6 sm:p-8 space-y-8">
          {/* SECTION 1: CANDIDATE & COMPANY ASSIGNMENT */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                1. Company & Candidate Assignment
              </h2>
              <span className="text-xs text-slate-400 font-medium">Pre-filled on invitation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hiring Company <span className="text-rose-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Candidate Full Name <span className="text-rose-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Candidate Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => {
                    setCandidateEmail(e.target.value);
                    if (errors.candidateEmail) setErrors(prev => ({ ...prev, candidateEmail: '' }));
                  }}
                  placeholder="e.g. jordan.lee@example.com"
                  className="ui-input"
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
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                2. Job Requirements
              </h2>
              <span className="text-xs text-slate-400 font-medium">Role specifics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
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
                  <span className="text-[11px] text-slate-400">Quick roles:</span>
                  {SAMPLE_JOB_TITLES.slice(0, 4).map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => handleJobTitleSelect(title)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seniority Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Seniority Level
                </label>
                <select
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Job Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (errors.jobDescription) setErrors(prev => ({ ...prev, jobDescription: '' }));
                }}
                placeholder="Describe role scope and responsibilities..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Required Experience <span className="text-rose-500">*</span>
                </label>
                <input
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Required Technical Skills <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="p-0.5 rounded-full hover:bg-indigo-200 text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add skill (e.g. GraphQL, Tailwind)..."
                    className="flex-1 ui-input h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="ui-btn-secondary h-9 px-3 text-xs"
                  >
                    Add
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
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                3. Interview Parameters & Link Security
              </h2>
              <span className="text-xs text-slate-400 font-medium">Recruiter controlled</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interview Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Interview Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Technical', 'HR', 'Behavioural', 'Mixed'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setInterviewType(type)}
                      className={`h-10 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                        interviewType === type
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((diff) => (
                    <button
                      type="button"
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`h-10 px-2 rounded-xl border text-xs font-semibold transition-all text-center ${
                        difficulty === diff
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Questions Count
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="ui-input cursor-pointer"
                >
                  <option value={3}>3 Questions (Quick screen)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={7}>7 Questions (In-depth)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                </select>
              </div>

              {/* Expected Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Expected Duration
                </label>
                <select
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link Expiration
                </label>
                <select
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
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Candidate accesses only pre-filled details and begins the interview with no configuration options.
            </p>

            <button
              type="submit"
              className="ui-btn-primary w-full sm:w-auto"
            >
              <span>Generate Invitation Link</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
