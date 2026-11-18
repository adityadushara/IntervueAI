import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  // Prevent execution in browser context
  const isBrowser = typeof window !== 'undefined' && !(typeof process !== 'undefined' && Boolean(process.versions?.node));
  if (isBrowser) {
    console.error('CRITICAL SECURITY: getSupabaseAdminClient() called in browser context.');
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) return null;

  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
