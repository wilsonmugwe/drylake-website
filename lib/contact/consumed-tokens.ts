import "server-only";

import { createHash } from "node:crypto";

/*
 * Server-side single-use enforcement for Turnstile tokens, in addition to Cloudflare's own.
 *
 * Why: on 5 Oct 2026 one production token was accepted by /api/contact three times, and again
 * after the in-memory guard shipped (the replay reached a different server instance), although
 * Cloudflare documents every token as single-use.
 *
 * Two layers:
 * 1. claimToken: in-memory, per instance. Free, catches replays on a warm instance.
 * 2. claimTokenDurably: a row in public.turnstile_token_claims (primary key = fingerprint),
 *    shared by every instance. SQL: docs/operations/sql/2026-10-05-turnstile-token-claims.sql.
 *    Until that table exists the durable layer reports "unavailable" and the form keeps
 *    working on layer 1 (logged, so the gap is visible).
 *
 * Only a SHA-256 fingerprint is stored, never the token.
 */
const TOKEN_LIFETIME_MS = 6 * 60 * 1000;
const MAX_ENTRIES = 10_000;

const consumed = new Map<string, number>();

export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function prune(now: number) {
  // Insertion order is expiry order (fixed lifetime), so the oldest entries come first.
  for (const [key, expiresAt] of consumed) {
    if (expiresAt > now && consumed.size <= MAX_ENTRIES) break;
    consumed.delete(key);
  }
}

/**
 * Marks the token as used on this instance. Returns false when it was already used here.
 * Call before Siteverify: Cloudflare consumes a token on any validation attempt.
 */
export function claimToken(token: string, now = Date.now()): boolean {
  prune(now);

  const key = tokenFingerprint(token);
  const expiresAt = consumed.get(key);

  if (expiresAt !== undefined && expiresAt > now) {
    return false;
  }

  consumed.set(key, now + TOKEN_LIFETIME_MS);
  return true;
}

/** Test hook: forget every claimed token. */
export function resetClaimedTokens(): void {
  consumed.clear();
}

/** The slice of the Supabase client this module uses (injectable for tests). */
export interface ClaimStore {
  from(table: string): {
    insert(row: { fingerprint: string }): PromiseLike<{ error: { code?: string; message?: string } | null }>;
  };
}

export type DurableClaim = "claimed" | "replay" | "unavailable";

const UNIQUE_VIOLATION = "23505";

/**
 * Claims the token in the shared table. "replay" only when the fingerprint already exists.
 * Any other failure (table missing, network, misconfiguration) is "unavailable": the caller
 * falls back to the in-memory layer rather than breaking the contact form.
 */
export async function claimTokenDurably(
  token: string,
  store: ClaimStore | null
): Promise<DurableClaim> {
  if (!store) {
    return "unavailable";
  }

  try {
    const { error } = await store
      .from("turnstile_token_claims")
      .insert({ fingerprint: tokenFingerprint(token) });

    if (!error) {
      return "claimed";
    }

    if (error.code === UNIQUE_VIOLATION) {
      return "replay";
    }

    console.error("Turnstile: durable token claim unavailable:", error.code ?? "", error.message ?? "");
    return "unavailable";
  } catch (error) {
    console.error("Turnstile: durable token claim failed:", (error as Error).name);
    return "unavailable";
  }
}
