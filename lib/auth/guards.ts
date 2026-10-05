import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";

/** Sign-in URL that returns the user to `returnTo` afterwards. Relative paths only. */
export function signInUrl(returnTo: string): string {
  const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/portal";
  return `/sign-in?redirect_url=${encodeURIComponent(safe)}`;
}

/*
 * Page-level admin gate. Call at the top of EVERY admin page that reads data.
 *
 * Why not rely on app/admin/layout.tsx alone: layouts and pages render in parallel, and a
 * soft navigation between admin pages re-renders only the page segment. A page without its
 * own check runs its service-role (RLS-bypassing) queries for any caller, and is one RSC
 * request away from returning that data. Observed 2026-10-05: a signed-out GET /admin ran
 * the dashboard's Supabase queries before the layout's redirect discarded the output.
 *
 * Contract: returns the Clerk userId only for a platform admin. Signed-out -> sign-in
 * (returning to `returnTo`); signed-in non-admin -> /client. Never returns otherwise.
 */
export async function requirePlatformAdmin(returnTo: string): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    redirect(signInUrl(returnTo));
  }

  if (!(await isPlatformAdmin())) {
    redirect("/client");
  }

  return userId;
}
