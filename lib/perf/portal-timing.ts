/*
 * Client portal timing payload. PURE: no Next, React or Clerk imports, so the privacy
 * contract is unit-tested (tests/portal-performance.test.mjs).
 *
 * Contract: the payload carries a route TEMPLATE ("/client/projects/[projectId]", never
 * the real path), a few fixed enum values and millisecond numbers. No token, email, user
 * id, Clerk organisation id or Supabase UUID can reach the log line, because anything that
 * is not on the allowlists below is dropped rather than passed through.
 */

export const PORTAL_ROUTES = [
  "/client",
  "/client/projects/[projectId]",
  "/client/billing",
  "/client/billing/[invoiceId]",
  "/portal/workspaces",
] as const;

export type PortalRoute = (typeof PORTAL_ROUTES)[number];

/* Which resolver path served the request. */
export type ResolverPath = "established" | "full" | "none";

/* Named phases. A phase that is not listed here is never logged. */
export const TIMING_PHASES = [
  "resolve.established_rls",
  "resolve.clerk_memberships",
  "resolve.org_mapping",
  "resolve.pending_invitations",
  "resolve.rls_verify",
  "content",
  "switcher",
] as const;

export type TimingPhase = (typeof TIMING_PHASES)[number];

const STATES = new Set([
  "signed-out",
  "lookup-failed",
  "no-organisation",
  "blocked",
  "access-pending",
  "ready",
]);

const PATHS = new Set<ResolverPath>(["established", "full", "none"]);

export type TimingPayload = {
  route: PortalRoute;
  region: string;
  path: ResolverPath;
  state: string;
  phasesMs: Partial<Record<TimingPhase, number>>;
  totalMs: number;
};

function ms(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

/* Vercel region ids look like "iad1" / "syd1"; anything else is reported as "other". */
function region(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "local";
  }

  return typeof value === "string" && /^[a-z]{3}\d$/.test(value) ? value : "other";
}

export function buildTimingPayload(input: {
  route: unknown;
  region: unknown;
  path: unknown;
  state: unknown;
  phases: Record<string, unknown>;
  totalMs: unknown;
}): TimingPayload | null {
  if (!(PORTAL_ROUTES as readonly unknown[]).includes(input.route)) {
    return null;
  }

  const phasesMs: Partial<Record<TimingPhase, number>> = {};

  for (const phase of TIMING_PHASES) {
    const value = ms(input.phases[phase]);

    if (value !== null) {
      phasesMs[phase] = value;
    }
  }

  return {
    route: input.route as PortalRoute,
    region: region(input.region),
    path: PATHS.has(input.path as ResolverPath) ? (input.path as ResolverPath) : "none",
    state: typeof input.state === "string" && STATES.has(input.state) ? input.state : "unknown",
    phasesMs,
    totalMs: ms(input.totalMs) ?? 0,
  };
}
