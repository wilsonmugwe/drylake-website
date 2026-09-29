import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function isPlatformAdmin(): Promise<boolean> {
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