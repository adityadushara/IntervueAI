-- Migration: 20261113000005_security_and_integrity_hardening.sql
-- Description: Creates distributed rate limiting table and function, updates candidate answer submission with idempotent upsert
-- Safety: Non-destructive. Adds new table and replaces existing stored procedure with enhanced conflict resolution.
-- Rollback: DROP TABLE public.rate_limit_buckets; DROP FUNCTION public.check_rate_limit(text, int, int);

-- ============================================================================
-- 1. DISTRIBUTED RATE LIMITING TABLE
-- ============================================================================
create table if not exists public.rate_limit_buckets (
  key text primary key,
  count int not null default 1,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_reset_at on public.rate_limit_buckets(reset_at);

-- ============================================================================
-- 2. ATOMIC RATE LIMIT CHECK FUNCTION (SECURITY DEFINER)
-- ============================================================================
create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket record;
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_new_count int;
  v_retry_after int;
begin
  -- 1. Purge expired bucket if present
  delete from public.rate_limit_buckets
  where key = p_key and reset_at <= v_now;

  -- 2. Check for active bucket
  select * into v_bucket from public.rate_limit_buckets where key = p_key;

  if not found then
    v_reset_at := v_now + (p_window_seconds || ' seconds')::interval;
    insert into public.rate_limit_buckets (key, count, reset_at, updated_at)
    values (p_key, 1, v_reset_at, v_now);
    
    return json_build_object(
      'allowed', true,
      'limit', p_limit,
      'remaining', p_limit - 1,
      'reset_at', extract(epoch from v_reset_at)::bigint,
      'retry_after', 0
    );
  end if;

  -- 3. If limit reached, return retry_after seconds
  if v_bucket.count >= p_limit then
    v_retry_after := greatest(1, extract(epoch from (v_bucket.reset_at - v_now))::int);
    return json_build_object(
      'allowed', false,
      'limit', p_limit,
      'remaining', 0,
      'reset_at', extract(epoch from v_bucket.reset_at)::bigint,
      'retry_after', v_retry_after
    );
  end if;

  -- 4. Increment count
  v_new_count := v_bucket.count + 1;
  update public.rate_limit_buckets
  set count = v_new_count, updated_at = v_now
  where key = p_key;

  return json_build_object(
    'allowed', true,
    'limit', p_limit,
    'remaining', p_limit - v_new_count,
    'reset_at', extract(epoch from v_bucket.reset_at)::bigint,
    'retry_after', 0
  );
end;
$$;

-- ============================================================================
-- 3. CANDIDATE ANSWER IDEMPOTENT UPSERT PROCEDURE
--    Replaces prior procedure with ON CONFLICT (session_id, question_id)
-- ============================================================================
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

  if v_invitation.status in ('completed', 'revoked', 'expired') or v_invitation.expires_at < now() then
    return json_build_object('error', 'Cannot submit answer to inactive interview', 'status_code', 403);
  end if;

  select * into v_session
  from public.interview_sessions
  where invitation_id = v_invitation.id;

  if not found then
    return json_build_object('error', 'Session not started', 'status_code', 400);
  end if;

  -- Idempotent upsert matching the UNIQUE (session_id, question_id) constraint
  insert into public.candidate_answers (
    session_id, invitation_id, question_id, question_text, answer_text, time_spent_seconds, submitted_at
  )
  values (
    v_session.id, v_invitation.id, p_question_id, p_question_text, p_answer_text, p_time_spent_seconds, now()
  )
  on conflict (session_id, question_id) do update set
    question_text = excluded.question_text,
    answer_text = excluded.answer_text,
    time_spent_seconds = excluded.time_spent_seconds,
    submitted_at = now();

  if p_total_elapsed_seconds is not null then
    update public.interview_sessions
    set total_duration_seconds = p_total_elapsed_seconds, updated_at = now()
    where id = v_session.id;
  end if;

  return json_build_object('success', true);
end;
$$;

-- Grant execution permissions
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated, service_role;
grant execute on function public.submit_candidate_answer_by_hash(text, text, text, text, int, int) to anon, authenticated, service_role;
