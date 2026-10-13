import { NextResponse } from "next/server";

import { clientIp } from "@/lib/contact/turnstile";
import { loadAvailability } from "@/lib/consultations/service";
import { CONSULTATION_TIMEZONE } from "@/lib/consultations/rules";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/* Generous: the picker loads once per visit and again after a conflict. */
const limiter = createRateLimiter(60, 60_000);

/*
 * Free consultation start times for the next four weeks, by Perth date.
 * Public and unauthenticated, so it returns start instants ONLY: never who booked, never ids.
 * Never cached: a stale list is how two visitors pick the same slot (the database still refuses
 * the second, but the visitor should not have to find that out).
 */
export async function GET(request: Request) {
  if (!limiter.take(clientIp(request) ?? "unknown")) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429, headers: NO_STORE });
  }

  try {
    const days = await loadAvailability(createAdminSupabaseClient());
    return NextResponse.json({ timezone: CONSULTATION_TIMEZONE, days }, { headers: NO_STORE });
  } catch (error) {
    console.error("Consultation availability failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Consultation times could not be loaded right now. Please try again shortly." },
      { status: 503, headers: NO_STORE }
    );
  }
}
