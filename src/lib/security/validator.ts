/**
 * Server-Side Request Validation & Security Guard Utilities for IntervueAI
 */

import { NextResponse } from 'next/server';
import { InterviewStatus, SeniorityLevel, InterviewType, InterviewDifficulty } from '@/types/interview';

// Maximum allowed request payload sizes
export const MAX_AUTH_PAYLOAD_BYTES = 256 * 1024; // 256 KB
export const MAX_INTERVIEW_PAYLOAD_BYTES = 512 * 1024; // 512 KB
export const MAX_INTERACT_PAYLOAD_BYTES = 256 * 1024; // 256 KB

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_FORMAT_REGEX = /^[a-zA-Z0-9_-]{16,64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Extracts client IP address from proxy headers with safe fallback.
 */
export function extractClientIp(request?: Request): string {
  if (!request || !request.headers) return '127.0.0.1';
  
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Validates that an incoming request's body does not exceed the allowed byte limit.
 */
export async function validatePayloadSize(
  request: Request,
  maxBytes: number = MAX_AUTH_PAYLOAD_BYTES
): Promise<{ valid: boolean; errorResponse?: NextResponse }> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      return {
        valid: false,
        errorResponse: NextResponse.json({
          error: `Payload too large. Maximum permitted request body is ${Math.round(maxBytes / 1024)} KB.`,
        }, { status: 413 }),
      };
    }
  }

  return { valid: true };
}

/**
 * Validates invitation token format (16 to 64 alphanumeric/hyphen characters).
 */
export function isValidTokenFormat(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  return TOKEN_FORMAT_REGEX.test(token.trim());
}

/**
 * Validates RFC 4122 v4 UUID format.
 */
export function isValidUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return UUID_V4_REGEX.test(id.trim());
}

/**
 * Validates standard email address format.
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const clean = email.trim();
  return clean.length >= 5 && clean.length <= 255 && EMAIL_REGEX.test(clean);
}

/**
 * Validates recruiter password complexity.
 */
export function isValidPassword(password: unknown): { valid: boolean; reason?: string } {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters in length' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password must not exceed 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one number' };
  }
  return { valid: true };
}

/**
 * State machine for interview status transitions.
 * Enforces valid lifecycle progression and prevents tampering.
 */
export function isValidStatusTransition(
  currentStatus: InterviewStatus,
  targetStatus: InterviewStatus
): boolean {
  if (currentStatus === targetStatus) return true;

  switch (currentStatus) {
    case 'active':
      return targetStatus === 'in_progress' || targetStatus === 'completed' || targetStatus === 'expired' || targetStatus === 'revoked';
    case 'in_progress':
      return targetStatus === 'completed' || targetStatus === 'expired' || targetStatus === 'revoked';
    case 'completed':
    case 'expired':
    case 'revoked':
      // Terminal states cannot be reverted or changed
      return false;
    default:
      return false;
  }
}

const VALID_SENIORITIES = new Set([
  'Junior', 'Mid-level', 'Senior', 'Lead / Staff', 'Principal', 'Staff', 'Lead', 'Entry-level'
]);

const VALID_INTERVIEW_TYPES = new Set([
  'Technical', 'HR', 'Behavioural', 'Mixed', 'System Design', 'Coding', 'Cultural'
]);

const VALID_DIFFICULTIES: Set<InterviewDifficulty> = new Set([
  'Beginner', 'Intermediate', 'Advanced'
]);

/**
 * Validates a job configuration payload.
 */
export function validateJobConfig(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Job configuration object is required' };
  }

  const c = config as Record<string, unknown>;

  if (typeof c.jobTitle !== 'string' || c.jobTitle.trim().length < 2 || c.jobTitle.trim().length > 150) {
    return { valid: false, error: 'Job title must be between 2 and 150 characters' };
  }

  if (typeof c.companyName !== 'string' || c.companyName.trim().length < 1 || c.companyName.trim().length > 100) {
    return { valid: false, error: 'Company name must be between 1 and 100 characters' };
  }

  if (typeof c.jobDescription !== 'string' || c.jobDescription.trim().length < 10 || c.jobDescription.trim().length > 15000) {
    return { valid: false, error: 'Job description must be between 10 and 15,000 characters' };
  }

  if (c.seniorityLevel && !VALID_SENIORITIES.has(c.seniorityLevel as SeniorityLevel)) {
    return { valid: false, error: 'Invalid seniority level specified' };
  }

  if (c.interviewType && !VALID_INTERVIEW_TYPES.has(c.interviewType as InterviewType)) {
    return { valid: false, error: 'Invalid interview type specified' };
  }

  if (c.difficulty && !VALID_DIFFICULTIES.has(c.difficulty as InterviewDifficulty)) {
    return { valid: false, error: 'Invalid difficulty specified' };
  }

  if (typeof c.questionCount === 'number' && (c.questionCount < 1 || c.questionCount > 20)) {
    return { valid: false, error: 'Question count must be between 1 and 20' };
  }

  if (typeof c.expectedDurationMinutes === 'number' && (c.expectedDurationMinutes < 5 || c.expectedDurationMinutes > 120)) {
    return { valid: false, error: 'Duration must be between 5 and 120 minutes' };
  }

  return { valid: true };
}

/**
 * Validates a candidate's turn answer input.
 */
export function validateCandidateAnswerInput(input: unknown): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Answer input payload is required' };
  }

  const ans = input as Record<string, unknown>;

  if (typeof ans.questionId !== 'string' || ans.questionId.trim().length < 1 || ans.questionId.trim().length > 100) {
    return { valid: false, error: 'Valid questionId is required (1-100 characters)' };
  }

  if (typeof ans.answerText !== 'string' || ans.answerText.trim().length < 1) {
    return { valid: false, error: 'Answer text cannot be empty' };
  }

  if (ans.answerText.length > 10000) {
    return { valid: false, error: 'Answer text exceeds maximum permitted limit (10,000 characters)' };
  }

  if (ans.timeSpentSeconds !== undefined && (typeof ans.timeSpentSeconds !== 'number' || ans.timeSpentSeconds < 0 || ans.timeSpentSeconds > 7200)) {
    return { valid: false, error: 'Invalid time spent value (must be between 0 and 7200 seconds)' };
  }

  return { valid: true };
}
