-- Migration: 20261105000001_create_intervue_schema.sql
-- Description: Core production schema for IntervueAI recruitment platform
-- Includes: profiles, job_configurations, interview_invitations, interview_sessions,
--           interview_questions, candidate_answers, recruiter_evaluations

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. Profiles Table (Linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  company_name text not null,
  role text not null default 'recruiter' check (role in ('recruiter', 'admin', 'hiring_manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Job Configurations Table
create table if not exists public.job_configurations (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  company_name text not null,
  job_title text not null,
  job_description text not null,
  required_skills text[] not null default '{}',
  required_experience text not null,
  seniority_level text not null check (seniority_level in ('Junior', 'Mid-level', 'Senior', 'Lead / Staff', 'Principal')),
  interview_type text not null check (interview_type in ('Technical', 'HR', 'Behavioural', 'Mixed')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  question_count int not null default 5 check (question_count between 1 and 20),
  expected_duration_minutes int not null default 30 check (expected_duration_minutes between 5 and 120),
  language text not null default 'English',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Interview Invitations Table
-- SECURITY REQUIREMENT: Stores ONLY hashed tokens (SHA-256), NEVER raw tokens!
create table if not exists public.interview_invitations (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  job_config_id uuid references public.job_configurations(id) on delete cascade not null,
  token_hash varchar(64) not null unique, -- SHA-256 hex digest of the raw token
  candidate_name text not null,
  candidate_email text not null,
  status text not null default 'active' check (status in ('active', 'in_progress', 'completed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for lightning-fast token lookup and recruiter filtering
create index if not exists idx_invitations_token_hash on public.interview_invitations(token_hash);
create index if not exists idx_invitations_recruiter_id on public.interview_invitations(recruiter_id);
create index if not exists idx_invitations_status on public.interview_invitations(status);
create index if not exists idx_invitations_expires_at on public.interview_invitations(expires_at);

-- 4. Interview Sessions Table (Tracks candidate interview progress)
create table if not exists public.interview_sessions (
  id uuid default gen_random_uuid() primary key,
  invitation_id uuid references public.interview_invitations(id) on delete cascade not null unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_duration_seconds int not null default 0,
  current_question_index int not null default 0,
  client_ip text,
  client_user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_invitation_id on public.interview_sessions(invitation_id);

-- 5. Interview Questions Table
create table if not exists public.interview_questions (
  id uuid default gen_random_uuid() primary key,
  job_config_id uuid references public.job_configurations(id) on delete cascade not null,
  invitation_id uuid references public.interview_invitations(id) on delete cascade,
  question_number int not null,
  text text not null,
  category text not null,
  context text,
  sample_hints text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_invitation_id on public.interview_questions(invitation_id);
create index if not exists idx_questions_job_config_id on public.interview_questions(job_config_id);

-- 6. Candidate Answers Table
create table if not exists public.candidate_answers (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.interview_sessions(id) on delete cascade not null,
  invitation_id uuid references public.interview_invitations(id) on delete cascade not null,
  question_id text not null,
  question_text text not null,
  answer_text text not null,
  time_spent_seconds int not null default 0,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_answers_invitation_id on public.candidate_answers(invitation_id);
create index if not exists idx_answers_session_id on public.candidate_answers(session_id);

-- 7. Recruiter Evaluations Table (CONFIDENTIAL - Strictly shielded from candidates)
create table if not exists public.recruiter_evaluations (
  id uuid default gen_random_uuid() primary key,
  invitation_id uuid references public.interview_invitations(id) on delete cascade not null unique,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  technical_competency text not null check (technical_competency in ('Exceptional', 'Strong', 'Satisfactory', 'Needs Review')),
  communication_clarity text not null check (communication_clarity in ('Clear & Structured', 'Good', 'Verbose', 'Too Brief')),
  recommendation text not null check (recommendation in ('Advance to Technical Final', 'Hold for Review', 'Schedule Follow-up', 'Do Not Advance')),
  overall_assessment text not null,
  notable_strengths text[] not null default '{}',
  areas_to_probe text[] not null default '{}',
  evaluation_generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evaluations_invitation_id on public.recruiter_evaluations(invitation_id);
create index if not exists idx_evaluations_recruiter_id on public.recruiter_evaluations(recruiter_id);

-- Trigger to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_profiles_updated_at on public.profiles;
create trigger tr_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();

drop trigger if exists tr_job_configurations_updated_at on public.job_configurations;
create trigger tr_job_configurations_updated_at before update on public.job_configurations for each row execute function public.handle_updated_at();

drop trigger if exists tr_interview_invitations_updated_at on public.interview_invitations;
create trigger tr_interview_invitations_updated_at before update on public.interview_invitations for each row execute function public.handle_updated_at();

drop trigger if exists tr_interview_sessions_updated_at on public.interview_sessions;
create trigger tr_interview_sessions_updated_at before update on public.interview_sessions for each row execute function public.handle_updated_at();

drop trigger if exists tr_recruiter_evaluations_updated_at on public.recruiter_evaluations;
create trigger tr_recruiter_evaluations_updated_at before update on public.recruiter_evaluations for each row execute function public.handle_updated_at();

-- Auto-create profile on auth.users signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name, role)
  values (
    new.id,
    coalesce(new.email, 'recruiter@example.com'),
    coalesce(new.raw_user_meta_data->>'full_name', 'Recruiter'),
    coalesce(new.raw_user_meta_data->>'company_name', 'TechCorp Global'),
    coalesce(new.raw_user_meta_data->>'role', 'recruiter')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing auth.users into profiles
insert into public.profiles (id, email, full_name, company_name, role)
select 
  id, 
  coalesce(email, 'user@example.com'), 
  coalesce(raw_user_meta_data->>'full_name', 'Recruiter'),
  coalesce(raw_user_meta_data->>'company_name', 'TechCorp Global'),
  coalesce(raw_user_meta_data->>'role', 'recruiter')
from auth.users
on conflict (id) do nothing;
