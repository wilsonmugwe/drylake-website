import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

/**
 * Resend client, memoised per server instance.
 * @throws Error when the Resend API key is not configured.
 */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

/**
 * The invoice sender address. It has no mailbox, so invoice mail sets a reply-to.
 * @throws Error when the sender address is not configured.
 */
export function getEmailFromAddress(): string {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("Missing EMAIL_FROM");
  }

  return from;
}