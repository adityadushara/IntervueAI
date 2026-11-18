-- Migration: 20261107000003_gemini_evaluation_schema.sql
-- Description: Extends schema to store Gemini AI structured interview plans and 6-competency evaluations

-- 1. Extend job_configurations with structured interview plan
alter table public.job_configurations 
  add column if not exists structured_plan jsonb;

-- 2. Extend recruiter_evaluations with detailed Gemini evaluation and overall score
alter table public.recruiter_evaluations 
  add column if not exists detailed_evaluation jsonb,
  add column if not exists overall_score int check (overall_score between 0 and 100);

-- 3. Update recommendation constraint to support both legacy and advisory recommendation formats
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
