import { healthReport } from "@/lib/health/health-report";

/*
 * GET /api/health: liveness and configuration check for uptime monitors (lib/health/health-report.ts
 * holds the contract). Public by design, never cached, reveals no variable names or values.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const report = healthReport(process.env);

  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
