/*
 * Sender identity for review request emails. PURE: unit-tested in tests/review-requests.test.mjs.
 *
 * No new mailbox or domain is assumed. Mail goes out on the shared verified EMAIL_FROM address
 * under its own display name ("Drylake Feedback"); FEEDBACK_EMAIL_FROM, when set, wins. Replies go
 * to CONTACT_EMAIL, an inbox that exists and is monitored. Throws when no address is configured,
 * so delivery fails loudly instead of sending from nowhere.
 */

import { senderAddress } from "./contact-enquiry-sender.ts";

export const FEEDBACK_SENDER_NAME = "Drylake Feedback";

export function feedbackFromAddress(env: { FEEDBACK_EMAIL_FROM?: string; EMAIL_FROM?: string }): string {
  const explicit = env.FEEDBACK_EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const address = env.EMAIL_FROM ? senderAddress(env.EMAIL_FROM) : null;
  if (!address) throw new Error("Missing EMAIL_FROM");

  return `${FEEDBACK_SENDER_NAME} <${address}>`;
}
