/*
 * Stripe webhook authentication, separated from the route so every refusal path is
 * unit-tested offline (tests/security-hardening.test.mjs). No API key and no network:
 * verification is an HMAC over the exact raw body with the endpoint's signing secret.
 *
 * Contract:
 *   - missing secret      -> 500 (our misconfiguration; Stripe retries until it is fixed)
 *   - missing signature   -> 400
 *   - bad, tampered, or
 *     stale signature     -> 400 (stale = timestamp outside the tolerance window, which is
 *                            what stops an old captured delivery being replayed)
 *   - otherwise           -> the parsed, authenticated event
 * Replays INSIDE the window are harmless by design: the route's writes are conditional on
 * the status they read, and PAID is terminal (see lib/invoices/stripe-payment.ts).
 */
import Stripe from "stripe";

/* Stripe's own default. Kept explicit so a change here is deliberate and reviewed. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type WebhookVerification =
  | { ok: true; event: Stripe.Event }
  | { ok: false; status: 400 | 500; error: string };

export function verifyStripeWebhook(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): WebhookVerification {
  if (!secret) {
    return { ok: false, status: 500, error: "Webhook is not configured" };
  }

  if (!signature) {
    return { ok: false, status: 400, error: "Missing Stripe signature" };
  }

  try {
    const event = Stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret,
      WEBHOOK_TOLERANCE_SECONDS
    );

    return { ok: true, event };
  } catch {
    return { ok: false, status: 400, error: "Invalid webhook signature" };
  }
}
