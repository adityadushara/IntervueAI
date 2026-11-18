import crypto from 'crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/service';

export interface RecruiterSession {
  authenticated: boolean;
  recruiterId?: string;
  email?: string;
  fullName?: string;
  companyName?: string;
  role?: string;
  isApproved?: boolean;
  error?: string;
}

interface CachedSession {
  session: RecruiterSession;
  expiresAt: number;
}

// In-memory token-to-session cache to eliminate duplicate sequential remote calls to Supabase Auth & profiles table
// Attached to globalThis to persist across Next.js Turbopack / worker scopes
const globalSessionCache: Map<string, CachedSession> =
  (globalThis as unknown as { __intervue_auth_session_cache?: Map<string, CachedSession> }).__intervue_auth_session_cache ||
  new Map<string, CachedSession>();

(globalThis as unknown as { __intervue_auth_session_cache?: Map<string, CachedSession> }).__intervue_auth_session_cache = globalSessionCache;

let cachedDevSession: { session: RecruiterSession; expiresAt: number } | null =
  (globalThis as unknown as { __intervue_dev_session_cache?: { session: RecruiterSession; expiresAt: number } | null }).__intervue_dev_session_cache || null;

export function clearSessionCache(): void {
  globalSessionCache.clear();
  cachedDevSession = null;
  (globalThis as unknown as { __intervue_dev_session_cache?: null }).__intervue_dev_session_cache = null;
}

/**
 * Helper to compute a secure SHA-256 token cache key
 */
function hashTokenForCache(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Extracts a bearer token or auth cookie from an incoming Next.js Request.
 */
export function extractAuthToken(request?: Request): string | null {
  if (!request || !request.headers) return null;

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Check cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:sb-access-token|sb_auth_token|sb-[^=]+-auth-token)=([^;]+)/);
  if (match && match[1]) {
    try {
      // Supabase may store session as URL-encoded JSON or direct JWT
      const raw = decodeURIComponent(match[1]);
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        return parsed.access_token || parsed[0] || null;
      }
      return raw;
    } catch {
      return match[1];
    }
  }

  return null;
}

/**
 * Verifies a recruiter's session on server-side API requests.
 * Uses Supabase Auth when configured.
 * In development or testing without live Supabase credentials, supports mock fallback session.
 */
export async function verifyRecruiterSession(request?: Request): Promise<RecruiterSession> {
  const token = extractAuthToken(request);
  const strictMode = process.env.NODE_ENV === 'production' || process.env.ENFORCE_STRICT_AUTH === 'true';

  // Explicit mock unauthorized testing hook
  if (request?.headers?.get('x-mock-auth') === 'unauthorized' || token === 'invalid') {
    return {
      authenticated: false,
      error: 'Unauthorized: Invalid recruiter credentials',
    };
  }

  // Production security guard: Never accept mock tokens in production mode
  if (strictMode && token && token.startsWith('mock-')) {
    return {
      authenticated: false,
      error: 'Unauthorized: Mock tokens are strictly prohibited in production mode',
    };
  }

  // In strict mode without a token, reject immediately
  if (strictMode && !token) {
    return {
      authenticated: false,
      error: 'Unauthorized: Recruiter session authentication required',
    };
  }

  // When Supabase is configured, verify using Supabase Auth JWT
  if (isSupabaseConfigured()) {
    if (token) {
      const tokenHash = hashTokenForCache(token);
      const cached = globalSessionCache.get(tokenHash);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.session;
      }

      // Check for valid 3-segment JWT structure before querying Supabase
      const segments = token.split('.');
      if (segments.length !== 3) {
        if (!strictMode && token.startsWith('mock-')) {
          const mockSession: RecruiterSession = {
            authenticated: true,
            recruiterId: '26ca1592-5ffa-4b1b-8922-6ce6ba1eb2b1',
            email: 'recruiter@techcorp.com',
            fullName: 'TechCorp Recruiter',
            companyName: 'TechCorp Global',
            role: 'recruiter',
            isApproved: true,
          };
          return mockSession;
        }
        return {
          authenticated: false,
          error: 'Unauthorized: Session token is malformed or invalid',
        };
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        return {
          authenticated: false,
          error: 'Internal authentication service unavailable',
        };
      }

      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
          const failSession: RecruiterSession = {
            authenticated: false,
            error: `Unauthorized: ${authErr?.message || 'Invalid or expired session'}`,
          };
          // Short 5s TTL for failed token lookups to prevent hammering
          globalSessionCache.set(tokenHash, {
            session: failSession,
            expiresAt: Date.now() + 5000,
          });
          return failSession;
        }

        // Verify recruiter role from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile && profile.role !== 'recruiter' && profile.role !== 'admin' && profile.role !== 'hiring_manager') {
          const roleFailSession: RecruiterSession = {
            authenticated: false,
            error: 'Forbidden: Recruiter or hiring manager privileges required',
          };
          globalSessionCache.set(tokenHash, {
            session: roleFailSession,
            expiresAt: Date.now() + 5000,
          });
          return roleFailSession;
        }

        if (profile && profile.is_approved === false) {
          const unapprovedSession: RecruiterSession = {
            authenticated: false,
            error: 'Forbidden: Account pending administrator approval. Please contact your hiring coordinator.',
            isApproved: false,
          };
          globalSessionCache.set(tokenHash, {
            session: unapprovedSession,
            expiresAt: Date.now() + 10000,
          });
          return unapprovedSession;
        }

        const validSession: RecruiterSession = {
          authenticated: true,
          recruiterId: user.id,
          email: user.email || '',
          fullName: profile?.full_name || user.user_metadata?.full_name || 'Recruiter',
          companyName: profile?.company_name || user.user_metadata?.company_name || 'Acme Global',
          role: profile?.role || user.user_metadata?.role || 'recruiter',
          isApproved: profile?.is_approved ?? true,
        };

        // Cache valid session for 60 seconds
        globalSessionCache.set(tokenHash, {
          session: validSession,
          expiresAt: Date.now() + 60000,
        });

        return validSession;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Session verification failed';
        return {
          authenticated: false,
          error: `Authentication failed: ${message}`,
        };
      }
    }

    // In strict mode without a token, require explicit authentication
    if (strictMode) {
      return {
        authenticated: false,
        error: 'Unauthorized: Authentication required',
      };
    }

    // In development / local testing without a session cookie, query the primary recruiter profile once and cache it
    if (cachedDevSession && Date.now() < cachedDevSession.expiresAt) {
      return cachedDevSession.session;
    }

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        // Query the canonical primary approved recruiter profile (deterministic order)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (profile) {
          const devSession: RecruiterSession = {
            authenticated: true,
            recruiterId: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            companyName: profile.company_name,
            role: profile.role,
            isApproved: profile.is_approved ?? true,
          };
          cachedDevSession = {
            session: devSession,
            expiresAt: Date.now() + 300000, // 5 min TTL
          };
          (globalThis as unknown as { __intervue_dev_session_cache?: typeof cachedDevSession }).__intervue_dev_session_cache = cachedDevSession;
          return devSession;
        }
      } catch {
        // Fall through to default developer recruiter
      }
    }
  }

  // When Supabase is not configured yet (dev / local test environment)
  if (strictMode) {
    return {
      authenticated: false,
      error: 'Unauthorized: Recruiter authentication required in strict mode',
    };
  }

  // Developer default recruiter session
  return {
    authenticated: true,
    recruiterId: '26ca1592-5ffa-4b1b-8922-6ce6ba1eb2b1',
    email: 'recruiter@techcorp.com',
    companyName: 'Acme Global',
    role: 'recruiter',
  };
}
