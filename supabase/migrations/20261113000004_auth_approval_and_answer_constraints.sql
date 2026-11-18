-- Migration: 20261113000004_auth_approval_and_answer_constraints.sql
-- Description: Adds account approval control to public.profiles and enforces unique candidate answers

-- 1. Add is_approved column to profiles table
alter table public.profiles 
  add column if not exists is_approved boolean not null default false;

-- Backfill existing profiles to approved status so existing recruiters remain active
update public.profiles 
  set is_approved = true 
  where is_approved is false;

-- 2. Update handle_new_user trigger function to strictly provision new signups as unapproved recruiters
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name, role, is_approved)
  values (
    new.id,
    coalesce(new.email, 'recruiter@example.com'),
    coalesce(new.raw_user_meta_data->>'full_name', 'Recruiter'),
    coalesce(new.raw_user_meta_data->>'company_name', 'TechCorp Global'),
    'recruiter',
    false -- Requires explicit administrator approval
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name);
  return new;
end;
$$;

-- 3. Clean up any duplicate candidate_answers and enforce unique constraint (session_id, question_id)
delete from public.candidate_answers a using public.candidate_answers b
where a.id > b.id
  and a.session_id = b.session_id
  and a.question_id = b.question_id;

alter table public.candidate_answers
  drop constraint if exists uq_candidate_answers_session_question;

alter table public.candidate_answers
  add constraint uq_candidate_answers_session_question
  unique (session_id, question_id);
