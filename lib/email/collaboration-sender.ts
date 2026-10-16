/*
 * Sender identity for collaboration emails. PURE: unit-tested in tests/collaboration.test.mjs.
 *
 * Same approach as contact-enquiry-sender.ts: no new mailbox or domain is assumed. Mail goes out
 * on the shared verified EMAIL_FROM address under its own display name ("Drylake Partnerships").
 * COLLABORATION_EMAIL_FROM, when set, wins (use it once a partnerships mailbox exists).
 * Replies go to CONTACT_EMAIL, an inbox that exists and is monitored.
 *
 * Contract: returns a full From header ("Name <address>"), or throws when no address is
 * configured, so delivery fails loudly instead of sending from nowhere.
 */

import { senderAddress } from "./contact-enquiry-sender.ts";

export const COLLABORATION_SENDER_NAME = "Drylake Partnerships";

export function collaborationFromAddress(env: { COLLABORATION_EMAIL_FROM?: string; EMAIL_FROM?: string }): string {
  const explicit = env.COLLABORATION_EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const address = env.EMAIL_FROM ? senderAddress(env.EMAIL_FROM) : null;
  if (!address) throw new Error("Missing EMAIL_FROM");

  return `${COLLABORATION_SENDER_NAME} <${address}>`;
}
