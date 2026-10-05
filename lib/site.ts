/*
 * Single source of truth for the reply-time promise. Every surface that promises a response
 * imports this constant, so the promise cannot drift between pages (pre-launch gate C3).
 * Only promise what the founders will actually meet.
 */
export const RESPONSE_TIME = "1 business day";

/* Public enquiry address, used in error copy so a visitor always has a fallback route. */
export const CONTACT_EMAIL = "hello@drylake.com.au";
