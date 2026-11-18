/**
 * Shared & Distributed Rate Limiting System for IntervueAI
 * 
 * Multi-Instance Architecture:
 * 1. Distributed Storage: Persists rate limit counters to Supabase PostgreSQL (public.rate_limit_buckets / check_rate_limit RPC)
 *    to guarantee rate limiting functions across multiple stateless serverless instances / containers.
 * 2. Development & Fault Fallback: In local development, testing, or when database tables are temporarily
 *    unreachable, falls back to an in-memory sliding-window bucket store with transparent diagnostic logging.
 * 3. Standards Compliance: Returns RFC-standard HTTP 429 responses with 'Retry-After' and X-RateLimit-* headers.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';
import { logSecurityEvent } from '@/lib/security/logger';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
  retryAfter: number; // Seconds until allowed
  isDistributed: boolean;
}

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES = {
  // Auth login: 5 attempts per 15 minutes per IP or email
  login: { limit: 5, windowSeconds: 15 * 60 },
  // Auth signup: 10 account creations per hour per IP
  signup: { limit: 10, windowSeconds: 60 * 60 },
  // Password reset: 3 requests per hour per IP
  resetPassword: { limit: 3, windowSeconds: 60 * 60 },
  // Password update: 5 updates per 15 minutes
  updatePassword: { limit: 5, windowSeconds: 15 * 60 },
  // Candidate interact (Gemini turn): 40 turns per 10 minutes per invitation
  candidateInteract: { limit: 40, windowSeconds: 10 * 60 },
  // Candidate mutation patch: 25 updates per 5 minutes
  candidatePatch: { limit: 25, windowSeconds: 5 * 60 },
  // Recruiter JD analysis & plan generation: 15 requests per 10 minutes
  recruiterPlan: { limit: 15, windowSeconds: 10 * 60 },
  // Recruiter interview creation: 30 interviews per 10 minutes
  recruiterCreate: { limit: 30, windowSeconds: 10 * 60 },
  // Recruiter dashboard / list queries: 120 queries per 5 minutes
  recruiterQuery: { limit: 120, windowSeconds: 5 * 60 },
} as const;

// In-memory sliding-window store for development / offline testing fallback
interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets: Map<string, MemoryBucket> =
  (globalThis as unknown as { __intervue_rate_limit_buckets?: Map<string, MemoryBucket> }).__intervue_rate_limit_buckets ||
  new Map<string, MemoryBucket>();
(globalThis as unknown as { __intervue_rate_limit_buckets?: Map<string, MemoryBucket> }).__intervue_rate_limit_buckets = memoryBuckets;

// Global flag to track whether the remote Supabase RPC is installed to avoid repetitive network timeouts and log spam
function getIsRpcAvailable(): boolean {
  if (typeof (globalThis as unknown as { __intervue_rpc_rate_limit_available?: boolean }).__intervue_rpc_rate_limit_available === 'boolean') {
    return (globalThis as unknown as { __intervue_rpc_rate_limit_available: boolean }).__intervue_rpc_rate_limit_available;
  }
  return true;
}

function setIsRpcAvailable(val: boolean): void {
  (globalThis as unknown as { __intervue_rpc_rate_limit_available?: boolean }).__intervue_rpc_rate_limit_available = val;
}

/**
 * Resets the in-memory rate limit store. Useful for testing environments.
 */
export function resetRateLimits(): void {
  memoryBuckets.clear();
}

/**
 * Checks and increments a rate limit counter for a given identifier key.
 */
export async function checkRateLimit(
  key: string,
  policy: RateLimitPolicy
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = policy;
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  // 1. Attempt distributed rate check via Supabase PostgreSQL if configured and RPC is available
  if (isSupabaseConfigured() && getIsRpcAvailable()) {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('check_rate_limit', {
          p_key: key,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        });

        if (!error && data && typeof data === 'object') {
          const res = data as {
            allowed: boolean;
            limit: number;
            remaining: number;
            reset_at: number;
            retry_after: number;
          };

          return {
            allowed: res.allowed,
            limit: res.limit ?? limit,
            remaining: Math.max(0, res.remaining ?? 0),
            resetAt: res.reset_at || (nowSec + windowSeconds),
            retryAfter: res.retry_after || 0,
            isDistributed: true,
          };
        }

        if (error) {
          const isMissingRpc = 
            error.message.includes('Could not find the function') || 
            error.message.includes('schema cache') ||
            (error as { code?: string }).code === 'PGRST202';

          if (isMissingRpc) {
            // Disable remote RPC calls globally to avoid continuous latency delays and terminal log noise
            setIsRpcAvailable(false);
          } else {
            logSecurityEvent({
              event: 'RATE_LIMIT_STORAGE_ERROR',
              details: { key, error: error.message },
            });
          }

          const isStrict = process.env.ENFORCE_STRICT_RATE_LIMIT === 'true';
          if (isStrict) {
            return {
              allowed: false,
              limit,
              remaining: 0,
              resetAt: nowSec + windowSeconds,
              retryAfter: windowSeconds,
              isDistributed: false,
            };
          }
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        const isMissingRpc = errMessage.includes('Could not find the function') || errMessage.includes('schema cache');
        if (isMissingRpc) {
          setIsRpcAvailable(false);
        } else {
          logSecurityEvent({
            event: 'RATE_LIMIT_STORAGE_ERROR',
            details: { key, error: errMessage },
          });
        }
        const isStrict = process.env.ENFORCE_STRICT_RATE_LIMIT === 'true';
        if (isStrict) {
          return {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: nowSec + windowSeconds,
            retryAfter: windowSeconds,
            isDistributed: false,
          };
        }
      }
    }
  }

  // 2. Development & Resilient Fallback: In-memory sliding window
  // In strict mode (production fail-closed policy), fail closed if distributed store is unavailable
  if (process.env.ENFORCE_STRICT_RATE_LIMIT === 'true') {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: nowSec + windowSeconds,
      retryAfter: windowSeconds,
      isDistributed: false,
    };
  }

  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= nowMs) {
    const resetAt = nowMs + (windowSeconds * 1000);
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: Math.floor(resetAt / 1000),
      retryAfter: 0,
      isDistributed: false,
    };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: Math.floor(existing.resetAt / 1000),
      retryAfter,
      isDistributed: false,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - existing.count,
    resetAt: Math.floor(existing.resetAt / 1000),
    retryAfter: 0,
    isDistributed: false,
  };
}

/**
 * Generates an HTTP 429 Too Many Requests response with standard headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message: string = 'Too many requests. Please try again later.'
): NextResponse {
  logSecurityEvent({
    event: 'RATE_LIMIT_EXCEEDED',
    details: {
      limit: result.limit,
      retryAfter: result.retryAfter,
      isDistributed: result.isDistributed,
    },
  });

  const response = NextResponse.json(
    {
      error: message,
      retryAfter: result.retryAfter,
      limit: result.limit,
      remaining: 0,
      resetAt: result.resetAt,
    },
    { status: 429 }
  );

  response.headers.set('Retry-After', String(result.retryAfter));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));

  return response;
}
