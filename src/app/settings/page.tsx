'use client';

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  ShieldCheck, 
  Clock, 
  Check, 
  Save, 
  User, 
  Mail, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  const [orgName, setOrgName] = useState(user?.companyName || 'Engineering Hiring Team');
  const [defaultExpirationHours, setDefaultExpirationHours] = useState('24');
  const [defaultQuestionsCount, setDefaultQuestionsCount] = useState('4');
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState('25');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 space-y-7 flex-1 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-950 tracking-tight">
          Workspace Settings
        </h1>
        <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
          Manage your organization profile, recruiter account, and assessment defaults.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Workspace preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Recruiter Profile Card */}
        <div className="ui-card p-6 bg-white space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <User className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-950">Recruiter Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                readOnly
                value={user?.fullName || 'Recruiter'}
                className="w-full ui-input text-xs bg-zinc-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                readOnly
                value={user?.email || 'recruiter@company.com'}
                className="w-full ui-input text-xs bg-zinc-50 cursor-not-allowed font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Organization / Company Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full ui-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Assessment Calibration Defaults Card */}
        <div className="ui-card p-6 bg-white space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <SettingsIcon className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-950">Assessment Defaults</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Default Link Expiration
              </label>
              <select
                value={defaultExpirationHours}
                onChange={(e) => setDefaultExpirationHours(e.target.value)}
                className="w-full ui-input text-xs"
              >
                <option value="24">24 Hours</option>
                <option value="48">48 Hours</option>
                <option value="72">72 Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Default Question Count
              </label>
              <select
                value={defaultQuestionsCount}
                onChange={(e) => setDefaultQuestionsCount(e.target.value)}
                className="w-full ui-input text-xs"
              >
                <option value="3">3 Questions</option>
                <option value="4">4 Questions</option>
                <option value="5">5 Questions</option>
                <option value="6">6 Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Target Interview Duration
              </label>
              <select
                value={defaultDurationMinutes}
                onChange={(e) => setDefaultDurationMinutes(e.target.value)}
                className="w-full ui-input text-xs"
              >
                <option value="15">15 Minutes</option>
                <option value="20">20 Minutes</option>
                <option value="25">25 Minutes</option>
                <option value="30">30 Minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Tenant Security & Audio Policy Card */}
        <div className="ui-card p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <ShieldCheck className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-950">Security &amp; Data Isolation</h2>
          </div>

          <div className="space-y-3 text-xs text-zinc-600">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-900 block">PostgreSQL Row-Level Security (RLS)</span>
                <span>Assessment links and candidate submissions are strictly scoped to your recruiter organization ID.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-900 block">SHA-256 Token Vault Hashing</span>
                <span>Raw invitation tokens are hashed before storage to prevent link harvesting.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/60 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-900 block">Voice Privacy &amp; Zero Persistent Audio Retention</span>
                <span>Speech audio is converted to text in real time. Raw voice recordings are discarded immediately after transcription.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="ui-btn-primary h-9 px-5 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
