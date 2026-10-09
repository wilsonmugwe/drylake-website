/*
 * Single source of truth for the reply-time promise. Every surface that promises a response
 * imports this constant, so the promise cannot drift between pages (pre-launch gate C3).
 * Only promise what the founders will actually meet.
 */
export const RESPONSE_TIME = "1 business day";

/* Public enquiry address, used in error copy so a visitor always has a fallback route. */
export const CONTACT_EMAIL = "hello@drylake.com.au";

/*
 * Drylake's official business line (drylake-ops, 2026-10-09). The ONE place the number lives:
 * the site, the FAQ, structured data, llms.txt and client emails all import it, so a future
 * change is a one-line edit. Display in AU national format; dial in E.164 so click-to-call
 * works from any country and every mobile OS.
 */
export const BUSINESS_PHONE = {
  display: "0433 448 000",
  international: "+61 433 448 000",
  href: "tel:+61433448000",
} as const;
