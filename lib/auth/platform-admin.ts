import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function lookupPlatformAdmin(): Promise<boolean> {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Platform admin authorization failed:", {
      code: error.code,
      message: error.message,
    });

    return false;
  }

  return Boolean(data);
}

/*
 * Memoised per server request (React cache()). A full load of an admin page used to run this
 * lookup twice, once in app/admin/layout.tsx and again in the page's own gate
 * (requirePlatformAdmin, which every admin page keeps: see lib/auth/guards.ts). Layout and page
 * now share one query. The answer is still derived from this request's Clerk session only,
 * and cache() never shares a value across requests. Outside a render (route handlers) cache()
 * does not memoise, so API routes keep exactly one lookup per call, as before.
 */
export const isPlatformAdmin = cache(lookupPlatformAdmin);
