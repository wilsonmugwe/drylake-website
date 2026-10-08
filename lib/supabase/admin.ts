import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the secret key. It BYPASSES row-level security, so wherever it runs
 * the application code is the only tenant boundary. Create it only after an explicit check:
 * the platform-admin gate, a verified Stripe signature, or an RLS-scoped read that already
 * proved ownership. Call sites are allow-listed by tests/security-hardening.test.mjs and
 * justified in docs/security/service-role-audit.md.
 * @throws Error when the Supabase URL or the secret key is not configured.
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseSecretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}