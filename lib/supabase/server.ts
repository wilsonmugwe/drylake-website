import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    /*
     * Fail closed. When accessToken() returns null, supabase-js substitutes the
     * publishable key as the bearer (SupabaseClient._getAccessToken), so the query runs
     * as the anon role: RLS returns nothing and the portal looks "pending" instead of
     * broken. Throwing turns a missing Clerk token into a request error the caller sees.
     */
    async accessToken() {
      const { getToken } = await auth();
      const token = await getToken();

      if (!token) {
        throw new Error("Missing Clerk session token for Supabase");
      }

      return token;
    },
  });
}