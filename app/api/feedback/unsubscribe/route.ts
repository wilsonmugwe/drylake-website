import { NextResponse } from "next/server";

import { clientIp } from "@/lib/contact/turnstile";
import { hashToken } from "@/lib/reviews/tokens";
import { validateUnsubscribeToken } from "@/lib/reviews/validate";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { redactSensitive } from "@/lib/security/redact";
import { CONTACT_EMAIL } from "@/lib/site";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NO_STORE = { "Cache-Control": "no-store" };
const limiter = createRateLimiter(20, 10 * 60_000);

function reply(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/*
 * Functional unsubscribe (Spam Act 2003). POST only, so a mail scanner that merely fetches a link
 * cannot unsubscribe anyone by accident, and the one-click form named in the List-Unsubscribe
 * header (RFC 8058, a bare POST with the token in the query) works. The page at
 * /feedback/unsubscribe posts here with the token in the body.
 *
 * Effect: the recipient's address joins review_suppressions, which every future send checks.
 * Idempotent. An unknown token answers 404 without saying whether any address is on the list.
 */
export async function POST(request: Request) {
  try {
    let candidate: unknown = new URL(request.url).searchParams.get("t");

    if (!candidate) {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        candidate = body?.token;
      } catch {
        candidate = null;
      }
    }

    const token = validateUnsubscribeToken(candidate);
    if (!token) return reply({ success: false, error: "We could not find this unsubscribe link." }, 404);

    if (!limiter.take(clientIp(request) ?? "unknown")) {
      return reply({ success: false, error: "Too many attempts in a short time. Please try again in a few minutes." }, 429);
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("review_unsubscribe", { p_unsubscribe_token_hash: hashToken(token) });
    if (error) throw new Error(`unsubscribe: ${error.code ?? ""} ${redactSensitive(error.message)}`);

    if (data !== "unsubscribed") return reply({ success: false, error: "We could not find this unsubscribe link." }, 404);
    return reply({ success: true, message: "You will not receive feedback requests from Drylake again." }, 200);
  } catch (error) {
    console.error("Unsubscribe route failed:", error instanceof Error ? error.name : typeof error);
    return reply({ success: false, error: `We couldn't process this. Please email ${CONTACT_EMAIL} and we will remove you.` }, 500);
  }
}
