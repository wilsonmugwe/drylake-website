/*
 * Visitor-facing copy for /collaborate. PURE. One place, so the page, the form microcopy, the
 * emails and the tests read the same words. Rules (tested): no em dashes, no price, and no claim
 * of a customer, partner, deployment, award or production-ready product.
 */

export const COLLABORATE_INTRO =
  "Drylake is open to working with other technology teams and businesses. This page is for proposals and conversations about working together. It is not the place to ask for a quote or to book a free consultation.";

export const COLLABORATE_AUDIENCES = [
  "Technology collaboration",
  "Product development partnerships",
  "Business partnerships",
  "Pilot projects",
  "Integration proposals",
  "Research and innovation",
  "Relevant supplier and service-provider proposals",
] as const;

export const COLLABORATE_NOT_THIS = {
  heading: "Looking for something else?",
  customer:
    "If you want Drylake to build or fix something for your business, tell us about it through the contact form.",
  consultation: "If you would like to talk it through first, you can book a free 30-minute consultation.",
} as const;

export const BRONNIE = {
  name: "BRONNIE",
  description:
    "BRONNIE is an AI-powered, multi-tenant business operations and automation platform in development. Its initial focus is customer operations: intelligent enquiry handling, routing and appointment coordination.",
  status:
    "BRONNIE is in development. Nothing about it is production-ready, and we are not claiming any partners, customers or deployments.",
  interestedIn: [
    "Pilots",
    "Product feedback",
    "Early access",
    "Integrations",
    "Automation use cases",
    "Technical collaboration",
    "Commercial discussions",
  ],
} as const;

export const FORM_MICROCOPY = {
  notFormal:
    "Sending a proposal is an enquiry. It is not a formal partnership, and it does not give you access to Drylake Workspace.",
  consent: "I have read the privacy policy and agree that Drylake may use these details to respond to this proposal.",
  success: "Thanks. Your proposal has been received. We read every one, and we will contact you if there is a sensible next step.",
} as const;

/* Email copy (customer acknowledgement). Kept here so the tests can check it without rendering. */
export const ACK_COPY = {
  subject: "We received your proposal",
  heading: "Proposal received",
  body:
    "Thanks for sending your proposal to Drylake. A founder will read it. If there is a sensible next step, we will contact you at this email address.",
  notPartnership:
    "This is an acknowledgement only. It is not a formal partnership, an agreement or an acceptance of your proposal, and it does not give you access to Drylake Workspace.",
  noReply: "Not every proposal leads to a reply. We review them as time allows.",
} as const;
