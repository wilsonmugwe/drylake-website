/*
 * Visitor-facing consultation copy, in one place so the homepage, the booking page, the contact
 * page and the tests read the same words. PURE. No em dashes, no prices, no promise beyond the
 * brief: free, 30 minutes, no obligation, quoted before any work.
 */

import { RESPONSE_TIME } from "../site.ts";

/* The brief's supporting text, verbatim. */
export const CONSULTATION_INTRO =
  "Book a free 30-minute consultation to discuss your business, explore your ideas and see how Drylake may be able to help. No obligation to proceed.";

export const CONSULTATION_PROMISES: readonly string[] = [
  "Completely free, 30 minutes, with a Drylake founder.",
  "Monday, Tuesday and Friday, 9:00 am to 5:00 pm Perth time.",
  "No account needed. Reschedule or cancel from your confirmation email.",
  "Every business is different. If there is a fit, you get a clear quote before any work begins.",
];

/* Pricing wording approved in the brief (no public price schedule). */
export const QUOTE_FIRST =
  "Every business has different requirements. We'll discuss your goals, recommend an appropriate approach and provide a clear quote before any work begins.";

/* The two routes in, shown together on /contact. The reply time is the site-wide constant (gate C3). */
export const MESSAGE_ALTERNATIVE = `Prefer to send us a message instead? Tell us a little about your project using the form below, and we'll get back to you within ${RESPONSE_TIME}.`;
