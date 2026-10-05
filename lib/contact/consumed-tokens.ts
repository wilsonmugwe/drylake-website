import "server-only";

import { createHash } from "node:crypto";

/*
 * Server-side single-use enforcement for Turnstile tokens, in addition to Cloudflare's own.
 *
 * Why: on 5 Oct 2026 one production token was accepted by /api/contact three times in about
 * two minutes, although Cloudflare documents every token as single-use. Until the cause is
 * found in the Vercel logs, a token we have already presented to Siteverify is refused here.
 *
 * Scope, stated honestly: this memory lives in one server instance. It stops replays that land
 * on the same warm instance (the common case for a burst), not replays spread across cold
 * instances. Durable cross-instance enforcement needs a shared store.
 *
 * Only a SHA-256 fingerprint is kept, never the token. Entries expire after the 300 s token
 * lifetime plus a margin, and the map is capped so it cannot grow without bound.
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
 * Marks the token as used. Returns false when it was already used on this instance.
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
export function resetClaimedTokens() {
  consumed.clear();
}
