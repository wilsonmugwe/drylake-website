import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runCalendarSync } from "@/lib/consultations/calendar-sync-server";
import { runConsultationDispatch } from "@/lib/consultations/dispatch-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/*
 * Consultation background pass: first the Microsoft 365 calendar queue (events to create, move,
 * reassign or cancel; skipped while no calendar is connected), then the email outbox
 * (confirmations, founder notices, reschedule/cancel notices and 24-hour reminders that are due). Callers, all authenticated by `Authorization: Bearer CRON_SECRET`:
 *   - Supabase pg_cron + pg_net, every minute (docs/operations/sql/2026-10-13-consultation-dispatch-cron.sql)
 *     gives reminders their precision on any Vercel plan;
 *   - Vercel Cron, daily (vercel.json): a backstop that is valid on the Hobby plan.
 * Booking routes also run a pass right after each change, so most emails never wait for this.
 *
 * Up to 4 passes of 25 per call; safe to run concurrently (rows are leased with SKIP LOCKED).
 */
async function handle(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let supabase: ReturnType<typeof createAdminSupabaseClient>;
  try {
    supabase = createAdminSupabaseClient();
  } catch (error) {
    console.error("Consultation cron misconfigured:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Misconfigured" }, { status: 503, headers: NO_STORE });
  }

  // Calendar first: confirmations waiting for a Teams link can then go in the same run.
  const calendar = await runCalendarSync(supabase, { limit: 10 });

  const totals = { claimed: 0, sent: 0, retried: 0, skipped: 0, deferred: 0 };
  for (let pass = 0; pass < 4; pass += 1) {
    const summary = await runConsultationDispatch(supabase, 25);
    if (!summary) {
      return NextResponse.json({ ok: false, ...totals, calendar }, { status: 500, headers: NO_STORE });
    }
    totals.claimed += summary.claimed;
    totals.sent += summary.sent;
    totals.retried += summary.retried;
    totals.skipped += summary.skipped;
    totals.deferred += summary.deferred;
    if (summary.claimed < 25) break;
  }

  return NextResponse.json({ ok: true, ...totals, calendar }, { headers: NO_STORE });
}

export const GET = handle;
export const POST = handle;
