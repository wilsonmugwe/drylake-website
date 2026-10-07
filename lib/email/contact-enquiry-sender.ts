/*
 * Sender identity for website enquiries. PURE: unit-tested in tests/contact-enquiry.test.mjs.
 *
 * Why this exists: invoices and enquiries share one verified Resend sender (EMAIL_FROM). Its
 * display name was set for invoices, so every "Start a conversation" enquiry landed in the inbox
 * labelled as billing mail. Enquiries now carry their own display name on the same verified
 * address, so no new domain or Resend change is needed. CONTACT_EMAIL_FROM, when set, wins.
 *
 * Contract: returns a full From header ("Name <address>"), or throws when no address is
 * configured, so delivery fails loudly instead of sending from nowhere.
 */

export const ENQUIRY_SENDER_NAME = "Drylake website enquiries";

/* The bare address inside a From header: "Drylake Billing <a@b.au>" -> "a@b.au". */
export function senderAddress(from: string): string | null {
  const trimmed = from.trim();
  const angled = /<([^<>\s]+@[^<>\s]+)>\s*$/.exec(trimmed);

  if (angled) {
    return angled[1];
  }

  return /^[^\s<>@]+@[^\s<>@]+$/.test(trimmed) ? trimmed : null;
}

export function enquiryFromAddress(env: { CONTACT_EMAIL_FROM?: string; EMAIL_FROM?: string }): string {
  const explicit = env.CONTACT_EMAIL_FROM?.trim();

  if (explicit) {
    return explicit;
  }

  const address = env.EMAIL_FROM ? senderAddress(env.EMAIL_FROM) : null;

  if (!address) {
    throw new Error("Missing EMAIL_FROM");
  }

  return `${ENQUIRY_SENDER_NAME} <${address}>`;
}
