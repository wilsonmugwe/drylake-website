import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Process-wide Stripe client, created on first use. No API version is pinned, so it is the
 * one bundled with the installed stripe package: upgrading the package can change webhook
 * event shapes and must be checked against lib/invoices/stripe-payment.ts.
 * @throws Error when the Stripe secret key is not configured.
 */
export function getStripe(): Stripe {
  const secretKey =
    process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY"
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(
      secretKey
    );
  }

  return stripeClient;
}