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
-- Migration: 20261105000002_rls_and_security_definer.sql
-- Description: Strict Row-Level Security (RLS) policies and security-definer functions
--              Guarantees recruiters access only their own data and candidates
--              can only interact with their own interview session via hashed token.

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL TABLES
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.job_configurations enable row level security;
alter table public.interview_invitations enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.candidate_answers enable row level security;
alter table public.recruiter_evaluations enable row level security;

-- ============================================================================
-- 2. PROFILES POLICIES
-- ============================================================================
drop policy if exists "Recruiters can view own profile" on public.profiles;
create policy "Recruiters can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Recruiters can update own profile" on public.profiles;
create policy "Recruiters can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Recruiters can insert own profile" on public.profiles;
create policy "Recruiters can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================================
-- 3. JOB CONFIGURATIONS POLICIES
-- ============================================================================
drop policy if exists "Recruiters can manage own job configurations" on public.job_configurations;
create policy "Recruiters can manage own job configurations"
  on public.job_configurations for all
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);

-- ============================================================================
-- 4. INTERVIEW INVITATIONS POLICIES (RECRUITER ACCESS)
-- ============================================================================
drop policy if exists "Recruiters can view own interview invitations" on public.interview_invitations;
create policy "Recruiters can view own interview invitations"
  on public.interview_invitations for select
  using (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can create interview invitations" on public.interview_invitations;
create policy "Recruiters can create interview invitations"
  on public.interview_invitations for insert
  with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can update own interview invitations" on public.interview_invitations;
create policy "Recruiters can update own interview invitations"
  on public.interview_invitations for update
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can delete own interview invitations" on public.interview_invitations;
create policy "Recruiters can delete own interview invitations"
  on public.interview_invitations for delete
  using (auth.uid() = recruiter_id);

-- ============================================================================
-- 5. RECRUITER EVALUATIONS POLICIES (STRICT CONFIDENTIALITY)
-- ============================================================================
-- CANDIDATES CANNOT ACCESS THIS TABLE UNDER ANY CIRCUMSTANCES
drop policy if exists "Recruiters can view own candidate evaluations" on public.recruiter_evaluations;
create policy "Recruiters can view own candidate evaluations"
  on public.recruiter_evaluations for select
  using (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can create candidate evaluations" on public.recruiter_evaluations;
create policy "Recruiters can create candidate evaluations"
  on public.recruiter_evaluations for insert
  with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can update own candidate evaluations" on public.recruiter_evaluations;
create policy "Recruiters can update own candidate evaluations"
  on public.recruiter_evaluations for update
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters can delete own candidate evaluations" on public.recruiter_evaluations;
create policy "Recruiters can delete own candidate evaluations"
  on public.recruiter_evaluations for delete
  using (auth.uid() = recruiter_id);

-- ============================================================================
-- 6. QUESTIONS POLICIES
-- ============================================================================
drop policy if exists "Recruiters can view questions for own jobs" on public.interview_questions;
create policy "Recruiters can view questions for own jobs"
  on public.interview_questions for select
  using (
    exists (
      select 1 from public.job_configurations jc
      where jc.id = public.interview_questions.job_config_id
      and jc.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can insert questions for own jobs" on public.interview_questions;
create policy "Recruiters can insert questions for own jobs"
  on public.interview_questions for insert
  with check (
    exists (
      select 1 from public.job_configurations jc
      where jc.id = public.interview_questions.job_config_id
      and jc.recruiter_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. SESSIONS & ANSWERS POLICIES (RECRUITER ACCESS)
-- ============================================================================
drop policy if exists "Recruiters can view sessions for own invitations" on public.interview_sessions;
create policy "Recruiters can view sessions for own invitations"
  on public.interview_sessions for select
  using (
    exists (
      select 1 from public.interview_invitations inv
      where inv.id = public.interview_sessions.invitation_id
      and inv.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can view candidate answers for own invitations" on public.candidate_answers;
create policy "Recruiters can view candidate answers for own invitations"
  on public.candidate_answers for select
  using (
    exists (
      select 1 from public.interview_invitations inv
      where inv.id = public.candidate_answers.invitation_id
      and inv.recruiter_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. SECURE CANDIDATE INTERFACE FUNCTIONS (SECURITY DEFINER)
--    Enforces token_hash lookup, expiration gates, and strips confidential reports
-- ============================================================================

-- Function 8.1: Fetch Sanitized Interview Data by Hashed Token
create or replace function public.get_candidate_interview_by_hash(p_token_hash text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_job record;
  v_session record;
  v_questions json;
  v_answers json;
  v_status text;
begin
  -- Lookup invitation by SHA-256 token hash
  select * into v_invitation
  from public.interview_invitations
  where token_hash = p_token_hash;

  if not found then
    return json_build_object('error', 'Interview not found', 'status_code', 404);
  end if;

  -- Determine dynamic status
  v_status := v_invitation.status;
  if v_status = 'active' and v_invitation.expires_at < now() then
    v_status := 'expired';
    update public.interview_invitations set status = 'expired' where id = v_invitation.id;
  end if;

  -- Fetch associated job config
  select * into v_job
  from public.job_configurations
  where id = v_invitation.job_config_id;

  -- Fetch session if exists
  select * into v_session
  from public.interview_sessions
  where invitation_id = v_invitation.id;

  -- Fetch questions (omits any internal metadata)
  select coalesce(json_agg(json_build_object(
    'id', q.id,
    'questionNumber', q.question_number,
    'text', q.text,
    'category', q.category,
    'context', q.context,
    'sampleHints', q.sample_hints
  ) order by q.question_number), '[]'::json) into v_questions
  from public.interview_questions q
  where q.invitation_id = v_invitation.id or q.job_config_id = v_invitation.job_config_id;

  -- Fetch answers submitted so far
  select coalesce(json_agg(json_build_object(
    'questionId', a.question_id,
    'questionText', a.question_text,
    'answerText', a.answer_text,
    'timeSpentSeconds', a.time_spent_seconds,
    'submittedAt', a.submitted_at
  ) order by a.submitted_at), '[]'::json) into v_answers
  from public.candidate_answers a
  where a.invitation_id = v_invitation.id;

  -- RETURN SANITIZED CANDIDATE JSON
  -- STRICTLY NEVER RETURNS RECRUITER EVALUATIONS OR TOKEN HASH
  return json_build_object(
    'id', v_invitation.id,
    'status', v_status,
    'expiresAt', v_invitation.expires_at,
    'createdAt', v_invitation.created_at,
    'jobConfig', json_build_object(
      'companyName', v_job.company_name,
      'jobTitle', v_job.job_title,
      'jobDescription', v_job.job_description,
      'requiredSkills', v_job.required_skills,
      'requiredExperience', v_job.required_experience,
      'seniorityLevel', v_job.seniority_level,
      'interviewType', v_job.interview_type,
      'difficulty', v_job.difficulty,
      'questionCount', v_job.question_count,
      'expectedDurationMinutes', v_job.expected_duration_minutes,
      'language', v_job.language
    ),
    'candidate', json_build_object(
      'fullName', v_invitation.candidate_name,
      'email', v_invitation.candidate_email,
      'startedAt', v_session.started_at
    ),
    'questions', v_questions,
    'answers', v_answers,
    'completedAt', v_session.completed_at,
    'totalDurationSeconds', coalesce(v_session.total_duration_seconds, 0)
  );
end;
$$;

-- Function 8.2: Start Candidate Session by Hashed Token
create or replace function public.start_candidate_session_by_hash(
  p_token_hash text,
  p_client_ip text default null,
  p_user_agent text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_session record;
begin
  select * into v_invitation
  from public.interview_invitations
  where token_hash = p_token_hash;

  if not found then
    return json_build_object('error', 'Interview not found', 'status_code', 404);
  end if;

  if v_invitation.status = 'revoked' or v_invitation.status = 'expired' or v_invitation.expires_at < now() then
    return json_build_object('error', 'Interview is not active', 'status_code', 403);
  end if;

  if v_invitation.status = 'completed' then
    return json_build_object('error', 'Interview already completed', 'status_code', 403);
  end if;

  -- Create or retrieve session
  insert into public.interview_sessions (invitation_id, started_at, client_ip, client_user_agent)
  values (v_invitation.id, now(), p_client_ip, p_user_agent)
  on conflict (invitation_id) do update
    set client_user_agent = coalesce(p_user_agent, public.interview_sessions.client_user_agent)
  returning * into v_session;

  -- Update invitation status to in_progress
  update public.interview_invitations
  set status = 'in_progress'
  where id = v_invitation.id and status = 'active';

  return json_build_object('success', true, 'sessionId', v_session.id, 'status', 'in_progress');
end;
$$;

-- Function 8.3: Submit Candidate Answer & Update Progress
create or replace function public.submit_candidate_answer_by_hash(
  p_token_hash text,
  p_question_id text,
  p_question_text text,
  p_answer_text text,
  p_time_spent_seconds int,
  p_total_elapsed_seconds int default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_session record;
begin
  select * into v_invitation
  from public.interview_invitations
  where token_hash = p_token_hash;

  if not found then
    return json_build_object('error', 'Interview not found', 'status_code', 404);
  end if;

  if v_invitation.status = 'completed' or v_invitation.status = 'revoked' or v_invitation.status = 'expired' then
    return json_build_object('error', 'Cannot submit answer to inactive interview', 'status_code', 403);
  end if;

  select * into v_session
  from public.interview_sessions
  where invitation_id = v_invitation.id;

  if not found then
    return json_build_object('error', 'Session not started', 'status_code', 400);
  end if;

  -- Insert or replace answer
  insert into public.candidate_answers (
    session_id, invitation_id, question_id, question_text, answer_text, time_spent_seconds
  )
  values (
    v_session.id, v_invitation.id, p_question_id, p_question_text, p_answer_text, p_time_spent_seconds
  );

  -- Update total session duration
  if p_total_elapsed_seconds is not null then
    update public.interview_sessions
    set total_duration_seconds = p_total_elapsed_seconds
    where id = v_session.id;
  end if;

  return json_build_object('success', true);
end;
$$;

-- Function 8.4: Complete Candidate Interview by Hashed Token
create or replace function public.complete_candidate_interview_by_hash(
  p_token_hash text,
  p_total_duration_seconds int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
begin
  select * into v_invitation
  from public.interview_invitations
  where token_hash = p_token_hash;

  if not found then
    return json_build_object('error', 'Interview not found', 'status_code', 404);
  end if;

  if v_invitation.status = 'completed' then
    return json_build_object('error', 'Interview already completed', 'status_code', 403);
  end if;

  -- Update invitation status
  update public.interview_invitations
  set status = 'completed'
  where id = v_invitation.id;

  -- Update session completion
  update public.interview_sessions
  set completed_at = now(),
      total_duration_seconds = p_total_duration_seconds
  where invitation_id = v_invitation.id;

  return json_build_object('success', true, 'status', 'completed');
end;
$$;

-- Grant execute permissions on candidate procedures to anon, authenticated, and service_role
grant execute on function public.get_candidate_interview_by_hash(text) to anon, authenticated, service_role;
grant execute on function public.start_candidate_session_by_hash(text, text, text) to anon, authenticated, service_role;
grant execute on function public.submit_candidate_answer_by_hash(text, text, text, text, int, int) to anon, authenticated, service_role;
grant execute on function public.complete_candidate_interview_by_hash(text, int) to anon, authenticated, service_role;

-- ============================================================================
-- Migration: 20261107000003_gemini_evaluation_schema.sql
-- ============================================================================
alter table public.job_configurations 
  add column if not exists structured_plan jsonb;

alter table public.recruiter_evaluations 
  add column if not exists detailed_evaluation jsonb,
  add column if not exists overall_score int check (overall_score between 0 and 100);

alter table public.recruiter_evaluations 
  drop constraint if exists recruiter_evaluations_recommendation_check;

alter table public.recruiter_evaluations 
  add constraint recruiter_evaluations_recommendation_check 
  check (recommendation in (
    'Advance to Technical Final', 
    'Hold for Review', 
    'Schedule Follow-up', 
    'Do Not Advance',
    'Strongly Recommend', 
    'Recommend', 
    'Borderline', 
    'Not Recommended'
  ));
