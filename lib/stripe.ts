import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  return stripeClient;
}