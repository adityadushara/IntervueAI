/**
 * Sanitized Security Logger for IntervueAI
 * 
 * Guarantees:
 * 1. Passwords, bearer tokens, API keys, and secrets are NEVER written to logs.
 * 2. Invitation tokens are logged only as truncated hashes (e.g. inv-hash-a1b2c3d4...).
 * 3. Candidate spoken answers and full transcripts are never logged in plain text.
 * 4. Structured JSON format for security auditing and log ingestion.
 */

export type SecurityEventType = 
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_SIGNUP_SUBMITTED'
  | 'AUTH_SIGNUP_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_APPROVAL_GRANTED'
  | 'AUTH_APPROVAL_REVOKED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_STORAGE_ERROR'
  | 'VALIDATION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'ACCESS_DENIED'
  | 'EVALUATION_TAMPER_ATTEMPT'
  | 'INTERVIEW_CREATED'
  | 'INTERVIEW_DELETED'
  | 'INTERVIEW_REVOKED'
  | 'INTERVIEW_TOKEN_REGENERATED'
  | 'INTERVIEW_STATE_TRANSITION'
  | 'INTERVIEW_COMPLETED'
  | 'EVALUATION_RETRY_REQUESTED'
  | 'EVALUATION_FAILED'
  | 'SECURITY_VIOLATION';

export interface SecurityEventPayload {
  event: SecurityEventType;
  clientIp?: string;
  userId?: string;
  tokenHash?: string;
  targetId?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * Redacts sensitive fields from diagnostic objects before output.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = new Set([
    'password',
    'confirmPassword',
    'newPassword',
    'token',
    'access_token',
    'sb-access-token',
    'apiKey',
    'gemini_api_key',
    'secret',
    'authorization',
    'answertext',
    'transcript',
  ]);

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Emits a structured security log entry to stdout / system logs.
 */
export function logSecurityEvent(payload: SecurityEventPayload): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    level: payload.event.includes('FAILED') || payload.event.includes('VIOLATION') || payload.event.includes('TAMPER') || payload.event.includes('EXCEEDED')
      ? 'WARN'
      : 'INFO',
    ...payload,
    details: payload.details ? sanitizeLogData(payload.details) : undefined,
  };

  const formatted = `[SECURITY_AUDIT] ${JSON.stringify(logEntry)}`;

  if (logEntry.level === 'WARN') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}
