/*
 * Shape of the Clerk session token handed to Supabase, for diagnosing RLS misses.
 * PURE: no Clerk, Supabase or Next imports, so every branch is unit-tested
 * (tests/supabase-token-shape.test.mjs).
 *
 * Contract: the result NEVER contains the token, a signature, a user id, an email or an
 * organisation id. Only categories and booleans leave this module, so the result is safe
 * to log. The token is decoded, not verified: this explains what Supabase will receive,
 * it is never used to authorise anything.
 *
 * What Supabase needs from a Clerk session token (third-party auth):
 *   - role = "authenticated", otherwise PostgREST runs the request as the anon role and
 *     policies granted TO authenticated match nothing (an empty result, no error);
 *   - the active organisation, as `o.id` (session token v2) or `org_id` (v1), which
 *     current_clerk_org_id() reads.
 */

export type TokenShape = {
  tokenPresent: boolean;
  decodable: boolean;
  roleClaim: "authenticated" | "anon" | "other" | "missing";
  orgClaimSource: "o.id" | "org_id" | "none";
  orgClaimMatchesSession: boolean;
  sessionTokenVersion: number | null;
  expired: boolean | null;
};

const EMPTY: TokenShape = {
  tokenPresent: false,
  decodable: false,
  roleClaim: "missing",
  orgClaimSource: "none",
  orgClaimMatchesSession: false,
  sessionTokenVersion: null,
  expired: null,
};

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload: unknown = JSON.parse(json);

    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function orgClaim(payload: Record<string, unknown>): {
  source: TokenShape["orgClaimSource"];
  value: string | null;
} {
  const o = payload.o;

  if (o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string") {
    return { source: "o.id", value: (o as { id: string }).id };
  }

  if (typeof payload.org_id === "string") {
    return { source: "org_id", value: payload.org_id };
  }

  return { source: "none", value: null };
}

function roleCategory(role: unknown): TokenShape["roleClaim"] {
  if (role === undefined || role === null) return "missing";
  if (role === "authenticated") return "authenticated";
  if (role === "anon") return "anon";
  return "other";
}

export function describeClerkSupabaseToken(
  token: string | null | undefined,
  sessionOrgId: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): TokenShape {
  if (!token) {
    return EMPTY;
  }

  const payload = decodePayload(token);

  if (!payload) {
    return { ...EMPTY, tokenPresent: true };
  }

  const org = orgClaim(payload);

  return {
    tokenPresent: true,
    decodable: true,
    roleClaim: roleCategory(payload.role),
    orgClaimSource: org.source,
    orgClaimMatchesSession:
      typeof sessionOrgId === "string" && sessionOrgId.length > 0 && org.value === sessionOrgId,
    sessionTokenVersion: typeof payload.v === "number" ? payload.v : null,
    expired: typeof payload.exp === "number" ? payload.exp <= nowSeconds : null,
  };
}

export type OrganizationLookupOutcome = "found" | "rls-empty" | "request-error";

/*
 * An RLS-scoped read that returns no row is not the same failure as a request Supabase
 * rejected. Only the first means "no workspace for this session"; the second (expired or
 * untrusted token, missing grant, network) must surface as a lookup failure, not as
 * "access pending", or the cause is hidden behind the wrong message.
 */
export function classifyOrganizationLookup(
  error: { code?: string | null } | null | undefined,
  row: unknown
): OrganizationLookupOutcome {
  if (error) return "request-error";
  return row ? "found" : "rls-empty";
}
