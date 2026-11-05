'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Briefcase, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Sliders, 
  Plus, 
  X,
  Zap,
  Code
} from 'lucide-react';
import { 
  InterviewConfig, 
  ExperienceLevel, 
  InterviewType, 
  InterviewDifficulty,
  FormValidationErrors,
  InterviewSession 
} from '@/types/interview';
import { POPULAR_ROLES, DEFAULT_TOPICS_BY_ROLE, generateQuestionsForSession } from '@/lib/mockData';
import { setActiveSession } from '@/lib/storage';

export default function ConfigPage() {
  const router = useRouter();

  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [role, setRole] = useState<string>(POPULAR_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [level, setLevel] = useState<ExperienceLevel>('senior');
  const [interviewType, setInterviewType] = useState<InterviewType>('technical');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium');
  const [topics, setTopics] = useState<string[]>(DEFAULT_TOPICS_BY_ROLE[POPULAR_ROLES[0]] || []);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(3);
  
  // Validation state
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle role change - auto-update suggested topics
  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (newRole !== 'Other / Custom Role') {
      const suggested = DEFAULT_TOPICS_BY_ROLE[newRole] || ['General Architecture', 'Problem Solving'];
      setTopics(suggested);
      if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
    }
  };

  // Add custom topic tag
  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    if (!topics.includes(trimmed)) {
      setTopics(prev => [...prev, trimmed]);
      if (errors.topics) setErrors(prev => ({ ...prev, topics: undefined }));
    }
    setNewTopicInput('');
  };

  // Remove topic tag
  const handleRemoveTopic = (topicToRemove: string) => {
    const filtered = topics.filter(t => t !== topicToRemove);
    setTopics(filtered);
    if (filtered.length === 0) {
      setErrors(prev => ({ ...prev, topics: 'Please select or add at least one topic.' }));
    }
  };

  // Quick Preset Handlers
  const applyPreset = (preset: 'frontend' | 'backend' | 'system_design') => {
    if (preset === 'frontend') {
      setCandidateName(prev => prev || 'Taylor Swift');
      setRole('Frontend Engineer');
      setLevel('senior');
      setInterviewType('technical');
      setDifficulty('medium');
      setTopics(DEFAULT_TOPICS_BY_ROLE['Frontend Engineer']);
      setQuestionCount(3);
    } else if (preset === 'backend') {
      setCandidateName(prev => prev || 'Jordan Lee');
      setRole('Backend Engineer');
      setLevel('senior');
      setInterviewType('technical');
      setDifficulty('hard');
      setTopics(DEFAULT_TOPICS_BY_ROLE['Backend Engineer']);
      setQuestionCount(3);
    } else if (preset === 'system_design') {
      setCandidateName(prev => prev || 'Morgan Reed');
      setRole('System Architect');
      setLevel('lead');
      setInterviewType('system_design');
      setDifficulty('hard');
      setTopics(DEFAULT_TOPICS_BY_ROLE['System Architect']);
      setQuestionCount(3);
    }
    setErrors({});
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormValidationErrors = {};

    if (!candidateName.trim()) {
      newErrors.candidateName = 'Please enter your candidate name.';
    } else if (candidateName.trim().length < 2) {
      newErrors.candidateName = 'Name must be at least 2 characters.';
    }

    if (!role) {
      newErrors.role = 'Please select a target role.';
    }

    if (role === 'Other / Custom Role' && !customRole.trim()) {
      newErrors.customRole = 'Please specify your custom role title.';
    }

    if (topics.length === 0) {
      newErrors.topics = 'Please select or add at least one topic or skill.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const config: InterviewConfig = {
      candidateName: candidateName.trim(),
      role,
      customRole: role === 'Other / Custom Role' ? customRole.trim() : undefined,
      level,
      interviewType,
      difficulty,
      topics,
      questionCount,
    };

    // Generate questions
    const generatedQuestions = generateQuestionsForSession(config);

    // Create session
    const newSession: InterviewSession = {
      id: `session-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      config,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      totalTimeSeconds: 0,
      questions: generatedQuestions,
      answers: [],
      currentQuestionIndex: 0,
    };

    // Save to localStorage
    setActiveSession(newSession);

    // Navigate to interview page
    router.push('/interview');
  };

  return (
    <div className="py-10 md:py-16 bg-slate-50 flex-1">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <Sliders className="w-4 h-4" />
            <span>Session Setup</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Configure Your Mock Interview
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Tailor the simulated interview to match your target company, seniority level, and core technologies.
          </p>

          {/* Preset Buttons for Quick Testing */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick 1-Click Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('frontend')}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs font-medium"
            >
              Frontend Senior
            </button>
            <button
              type="button"
              onClick={() => applyPreset('backend')}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs font-medium"
            >
              Backend Senior
            </button>
            <button
              type="button"
              onClick={() => applyPreset('system_design')}
              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs font-medium"
            >
              System Architect Lead
            </button>
          </div>
        </div>

        {/* Configuration Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {/* Section 1: Candidate & Target Role */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. Candidate & Target Role
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Candidate Name */}
              <div>
                <label htmlFor="candidateName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Candidate Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    if (errors.candidateName) setErrors(prev => ({ ...prev, candidateName: undefined }));
                  }}
                  placeholder="e.g. Alex Chen"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.candidateName 
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500' 
                      : 'border-slate-300 hover:border-slate-400 focus:border-indigo-500'
                  }`}
                />
                {errors.candidateName && (
                  <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.candidateName}
                  </p>
                )}
              </div>

              {/* Target Role */}
              <div>
                <label htmlFor="roleSelect" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Role <span className="text-rose-500">*</span>
                </label>
                <select
                  id="roleSelect"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {POPULAR_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Role Input if 'Other / Custom Role' selected */}
            {role === 'Other / Custom Role' && (
              <div className="pt-1">
                <label htmlFor="customRole" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Specify Custom Role Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customRole"
                  type="text"
                  value={customRole}
                  onChange={(e) => {
                    setCustomRole(e.target.value);
                    if (errors.customRole) setErrors(prev => ({ ...prev, customRole: undefined }));
                  }}
                  placeholder="e.g. Embedded Firmware Engineer"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                    errors.customRole 
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500' 
                      : 'border-slate-300 hover:border-slate-400 focus:border-indigo-500'
                  }`}
                />
                {errors.customRole && (
                  <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.customRole}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Seniority & Interview Format */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              2. Experience Level & Interview Style
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seniority Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Experience Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'junior', label: 'Junior', desc: '0 - 2 yrs' },
                      { key: 'mid', label: 'Mid-Level', desc: '3 - 5 yrs' },
                      { key: 'senior', label: 'Senior', desc: '5 - 8 yrs' },
                      { key: 'lead', label: 'Lead / Staff', desc: '8+ yrs' },
                    ] as const
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setLevel(item.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        level === item.key
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-indigo-950'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interview Focus Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Interview Focus Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'technical', label: 'Technical', desc: 'Coding & architecture' },
                      { key: 'system_design', label: 'System Design', desc: 'Distributed scale' },
                      { key: 'behavioral', label: 'Behavioral', desc: 'STAR leadership' },
                      { key: 'mixed', label: 'Mixed / Combo', desc: 'Comprehensive' },
                    ] as const
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setInterviewType(item.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        interviewType === item.key
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-indigo-950'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Difficulty & Question Count */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              3. Difficulty & Duration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'easy', label: 'Standard', color: 'hover:border-emerald-300' },
                      { key: 'medium', label: 'Challenging', color: 'hover:border-indigo-300' },
                      { key: 'hard', label: 'Rigorous', color: 'hover:border-rose-300' },
                    ] as const
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setDifficulty(item.key)}
                      className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                        difficulty === item.key
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : `border-slate-200 bg-white text-slate-700 ${item.color}`
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Question Count
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 3, label: '3 Questions', desc: '~10 min' },
                    { count: 5, label: '5 Questions', desc: '~20 min' },
                    { count: 7, label: '7 Questions', desc: '~30 min' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.count}
                      onClick={() => setQuestionCount(item.count)}
                      className={`py-2 px-3 rounded-xl border text-center transition-all ${
                        questionCount === item.count
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600 text-indigo-950 font-bold'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Topics & Skills Tags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                4. Focus Topics & Technical Tags <span className="text-rose-500">*</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {topics.length} selected
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Select or add tags you want the interviewer to cover during your session:
            </p>

            {/* Topic Chips */}
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 transition-all"
                >
                  <span>{topic}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(topic)}
                    className="p-0.5 rounded-full hover:bg-indigo-200/60 text-indigo-700 transition-colors"
                    aria-label={`Remove topic ${topic}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Custom Topic Input */}
            <div className="flex items-center gap-2 max-w-md pt-1">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                placeholder="Add custom topic (e.g. GraphQL, Tailwind, Kafka)..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {errors.topics && (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.topics}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Session runs locally in your browser. No API keys required for Day 1.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Generating Questions...</span>
              ) : (
                <>
                  <span>Begin Mock Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
