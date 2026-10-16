import { type TrackImpl, sendEvent } from "./events.ts";

/*
 * Conversion measurement for enquiries (AI discoverability PR, 2026-10-08).
 *
 * The contact form shows its confirmation inline, so a page view can never count an enquiry.
 * This sends one Vercel Analytics custom event per enquiry the server has confirmed it delivered,
 * which the Analytics dashboard can break down by referrer (Google, Bing, chatgpt.com,
 * perplexity.ai, ...). Custom events need a Vercel Pro plan; on Hobby the call is accepted and
 * simply not reported, so shipping this costs nothing either way.
 *
 * Privacy: the event carries no personal information. Only two properties are sent, both from
 * closed sets: which form was used, and the public form's own dropdown value (anything else,
 * including the portal's free-text topic, is reported as "other"). Never add name, email,
 * company, message or a free-text value here.
 */

export const ENQUIRY_EVENT = "enquiry_submitted";

/* The public contact form's "projectType" option values (components/forms/ProjectForm.tsx). */
const PUBLIC_PROJECT_TYPES: ReadonlySet<string> = new Set([
  "Manual processes",
  "Disconnected systems",
  "Existing software",
  "Customer experience",
  "Reporting and data",
  "Website and digital",
  "AI opportunity",
  "Other",
  "Not sure",
]);

/* The portal's "Message Drylake" form prefixes its projectType with this (MessageDrylake.tsx). */
const PORTAL_PREFIX = "Drylake Workspace:";

export type EnquiryEventProperties = {
  surface: "public" | "portal";
  projectType: string;
};

/**
 * Builds the analytics properties for a delivered enquiry.
 *
 * @param projectType - the `projectType` field exactly as it was submitted.
 * @returns `surface` ("portal" for the signed-in Message Drylake form, else "public") and a
 *   `projectType` that is always one of the public form's option values or "other".
 */
export function enquiryEventProperties(projectType: string): EnquiryEventProperties {
  if (projectType.startsWith(PORTAL_PREFIX)) {
    return { surface: "portal", projectType: "other" };
  }
  return {
    surface: "public",
    projectType: PUBLIC_PROJECT_TYPES.has(projectType) ? projectType : "other",
  };
}

/**
 * Records one delivered enquiry. Call it only after the server has confirmed delivery.
 *
 * Never throws: analytics must not turn a delivered enquiry into a visible error, so a missing
 * or blocked analytics script (ad blockers, privacy extensions) is ignored.
 *
 * @param projectType - the submitted `projectType` (reduced to a closed set before sending).
 * @param trackImpl - injectable for tests; defaults to Vercel Analytics' `track`.
 */
export function trackEnquirySubmitted(
  projectType: string,
  trackImpl?: TrackImpl
): void {
  // sendEvent swallows any error from analytics, see above. Shared with the other events.
  sendEvent(ENQUIRY_EVENT, enquiryEventProperties(projectType), trackImpl);
}
