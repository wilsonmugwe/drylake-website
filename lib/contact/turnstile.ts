import "server-only";

import {
  claimToken,
  claimTokenDurably,
  tokenFingerprint,
  type ClaimStore,
} from "./consumed-tokens.ts";
import { CONTACT_ACTION } from "./turnstile-action.ts";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const TIMEOUT_MS = 8_000;

const DEFAULT_ALLOWED_HOSTNAMES = ["drylake.com.au", "www.drylake.com.au"];

/*
 * Cloudflare's published test secrets (always-pass / always-fail / token-spent). Their
 * responses report hostname "example.com", so the hostname check cannot apply to them.
 * They can only ever be configured deliberately, for local or CI testing.
 */
const TEST_SECRET_PATTERN = /^[123]x0{20,}AA$/;

export type TurnstileVerdict =
  | { ok: true }
  | {
      ok: false;
      /**
       * misconfigured: our secret is missing (our fault, 503)
       * unreachable:   Cloudflare could not be asked (transient, 503)
       * rejected:      the token is missing, invalid, expired or already used (403)
       * wrong-host:    a valid token minted for a site that is not ours (403)
       * wrong-action:  a valid token minted by a different widget action (403)
       */
      reason: "misconfigured" | "unreachable" | "rejected" | "wrong-host" | "wrong-action";
      errorCodes?: string[];
    };

interface SiteverifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
}

function allowedHostnames(): string[] {
  const extra = (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return [...DEFAULT_ALLOWED_HOSTNAMES, ...extra];
}

/** First hop of x-forwarded-for (set by Vercel), passed to Cloudflare as a risk signal. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip");
}

/*
 * Server-side Turnstile verification. The browser widget showing a tick proves nothing on
 * its own; only this call decides whether a submission is accepted.
 *
 * Contract: { ok: true } only when Cloudflare confirms success for a token minted on one of
 * our hostnames by the contact action, and the token has not been presented before (checked
 * in memory and, when claimStore is given, in the shared turnstile_token_claims table). Fails closed on any error or timeout. Never throws.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp: string | null,
  claimStore: ClaimStore | null = null
): Promise<TurnstileVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("Turnstile: TURNSTILE_SECRET_KEY is not configured.");
    return { ok: false, reason: "misconfigured" };
  }

  if (!token) {
    return { ok: false, reason: "rejected", errorCodes: ["missing-input-response"] };
  }

  // Single use, enforced here as well as by Cloudflare (see consumed-tokens.ts). Cloudflare's
  // test keys issue the same dummy token every time, so local/CI testing is exempt.
  if (!TEST_SECRET_PATTERN.test(secret)) {
    const replayed =
      !claimToken(token) || (await claimTokenDurably(token, claimStore)) === "replay";

    if (replayed) {
      console.warn("Turnstile: token replay refused:", tokenFingerprint(token).slice(0, 12));
      return { ok: false, reason: "rejected", errorCodes: ["duplicate-token"] };
    }
  }

  const body = new URLSearchParams({ secret, response: token });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let result: SiteverifyResponse;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // Cloudflare answers an unrecognised secret with HTTP 400 plus a JSON error code, so
    // read the body before deciding: a bad secret is our misconfiguration, not an outage.
    const parsed = (await response.json().catch(() => null)) as SiteverifyResponse | null;

    if (!response.ok && !parsed?.["error-codes"]?.length) {
      console.error("Turnstile: siteverify HTTP", response.status);
      return { ok: false, reason: "unreachable" };
    }

    if (!parsed) {
      console.error("Turnstile: siteverify returned a non-JSON body");
      return { ok: false, reason: "unreachable" };
    }

    result = parsed;
  } catch (error) {
    console.error("Turnstile: siteverify request failed:", (error as Error).name);
    return { ok: false, reason: "unreachable" };
  }

  // Strict check: anything other than a literal `true` (missing field, malformed body) fails.
  if (result.success !== true) {
    const errorCodes = result["error-codes"] ?? [];

    // invalid-input-secret means OUR configuration is wrong, not the visitor's token.
    if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("missing-input-secret")) {
      console.error("Turnstile: secret rejected by Cloudflare:", errorCodes);
      return { ok: false, reason: "misconfigured", errorCodes };
    }

    // Error codes only (e.g. timeout-or-duplicate): no token, secret or visitor data.
    console.warn("Turnstile: token rejected:", errorCodes);
    return { ok: false, reason: "rejected", errorCodes };
  }

  // Cloudflare's test secrets answer with hostname "example.com" and no action, so the
  // binding checks below only apply to a real secret.
  if (TEST_SECRET_PATTERN.test(secret)) {
    return { ok: true };
  }

  const hostname = (result.hostname ?? "").toLowerCase();

  if (!allowedHostnames().includes(hostname)) {
    console.error("Turnstile: token minted for unexpected hostname:", hostname);
    return { ok: false, reason: "wrong-host" };
  }

  // A token is bound to the widget action that minted it; only the contact form's counts.
  if (result.action !== CONTACT_ACTION) {
    console.error("Turnstile: token minted for unexpected action:", result.action ?? "(none)");
    return { ok: false, reason: "wrong-action" };
  }

  // Diagnostic, no personal data: a short token fingerprint and the token's age let a replay
  // that Cloudflare accepted be spotted in the logs (same fingerprint, growing age).
  const issuedAt = Date.parse(result.challenge_ts ?? "");
  console.info(
    "Turnstile: verified",
    tokenFingerprint(token).slice(0, 12),
    Number.isFinite(issuedAt) ? `age ${Math.round((Date.now() - issuedAt) / 1000)}s` : "age unknown"
  );

  return { ok: true };
}
