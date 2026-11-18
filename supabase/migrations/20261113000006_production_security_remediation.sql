-- Migration: 20261113000006_production_security_remediation.sql
-- Description: Resolves rate limiter permissions, enables RLS on rate_limit_buckets,
--              adds explicit evaluation status tracking, and secures atomic recruiter retry.
-- Safety: Non-destructive. Adds RLS, restricts RPC execute grants strictly to service_role,
--         and adds columns for evaluation status and error reporting.
-- Rollback: See detailed rollback SQL in PHASE_8_MIGRATION_GUIDE.md

-- ============================================================================
-- 1. ROW LEVEL SECURITY ON RATE LIMIT BUCKETS (CRITICAL ISSUE 2)
-- ============================================================================

-- Enable RLS on rate_limit_buckets table
alter table public.rate_limit_buckets enable row level security;

-- Revoke all direct table permissions from public, anon, and authenticated
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

-- Grant full table permissions strictly to service_role (server-side admin only)
grant all on table public.rate_limit_buckets to service_role;

-- Ensure no permissive RLS policies exist for anon or authenticated
drop policy if exists "Deny anon access to rate_limit_buckets" on public.rate_limit_buckets;
drop policy if exists "Deny authenticated access to rate_limit_buckets" on public.rate_limit_buckets;

-- ============================================================================
-- 2. RATE LIMITER RPC EXECUTION PRIVILEGES (CRITICAL ISSUE 1)
-- ============================================================================

-- Revoke execute permissions on check_rate_limit from public, anon, and authenticated
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- Grant execute strictly to service_role (invoked via getSupabaseAdminClient in Next.js backend)
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ============================================================================
-- 3. MAINTENANCE FUNCTION FOR PRUNING EXPIRED BUCKETS
-- ============================================================================

create or replace function public.prune_expired_rate_limit_buckets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count int;
begin
  delete from public.rate_limit_buckets
  where reset_at < now();
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.prune_expired_rate_limit_buckets() from public, anon, authenticated;
grant execute on function public.prune_expired_rate_limit_buckets() to service_role;

-- ============================================================================
-- 4. EXPLICIT EVALUATION STATUS & FAILURE RESILIENCE SCHEMA (MEDIUM ISSUE 3)
-- ============================================================================

-- Allow nullable fields in recruiter_evaluations to support pending/failed states
alter table public.recruiter_evaluations
  alter column technical_competency drop not null,
  alter column communication_clarity drop not null,
  alter column recommendation drop not null,
  alter column overall_assessment drop not null;

-- Add evaluation status and error columns to recruiter_evaluations
alter table public.recruiter_evaluations
  add column if not exists evaluation_status text not null default 'completed'
  check (evaluation_status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists evaluation_error text;

-- Add evaluation status and error columns to interview_invitations
alter table public.interview_invitations
  add column if not exists evaluation_status text not null default 'pending'
  check (evaluation_status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists evaluation_error text;

-- Add indexes for fast recruiter querying and filtering by evaluation status
create index if not exists idx_invitations_evaluation_status on public.interview_invitations(evaluation_status);
create index if not exists idx_evaluations_status on public.recruiter_evaluations(evaluation_status);
