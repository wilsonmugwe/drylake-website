import { consultationNeedsAttention } from "@/lib/consultations/health";
import { loadConsultationHealth } from "@/lib/consultations/health-server";
import { healthReport } from "@/lib/health/health-report";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/*
 * GET /api/health: liveness and configuration check for uptime monitors (lib/health/health-report.ts
 * holds the contract). Public by design, never cached, reveals no variable names or values.
 *
 * Adds a "consultations" block (lib/consultations/health.ts): email dispatch liveness and the
 * Microsoft 365 credential status. Counts, ages and status words only, never personal data. It
 * degrades the endpoint (503) only when Microsoft refuses the booking app's credentials; a
 * database outage reports { available: false } and leaves the rest of the report alone.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function consultationBlock() {
  try {
    return await loadConsultationHealth(createAdminSupabaseClient(), process.env);
  } catch {
    // Service-role client not configured (preview without the database): no consultation data.
    return { available: false } as const;
  }
}

export async function GET() {
  const base = healthReport(process.env);
  const consultations = await consultationBlock();
  const report = {
    ...base,
    status: base.status === "ok" && !consultationNeedsAttention(consultations) ? ("ok" as const) : ("degraded" as const),
    consultations,
  };

  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
