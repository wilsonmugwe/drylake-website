/*
 * The ONE list of service providers that handle personal information for Drylake. The Privacy
 * Policy (app/privacy) and the Security and Privacy page (app/security-privacy) both render it
 * through components/privacy/ProcessorList.tsx, and tests/privacy-cookies.test.mjs fails if either
 * page types the list out again. Add or remove a provider HERE and both pages follow.
 *
 * Derived from the code on 2026-10-16 (not from a template):
 *   Vercel        hosting, vercel.json (functions pinned to syd1), @vercel/analytics
 *   Clerk         sign-in for the client Workspace and admin, proxy.ts, components/auth/ClerkScope.tsx
 *   Supabase      database and private document storage, lib/supabase/*, consultation_bookings
 *   Stripe        card payments for invoices, lib/stripe.ts, app/api/stripe/webhook
 *   Resend        enquiry, consultation, invitation and invoice email, lib/email/*
 *   Cloudflare Turnstile   bot check on the contact and booking forms, components/forms/TurnstileWidget.tsx
 *   Microsoft 365 business mailbox; consultation calendar and Teams links ONLY if the calendar
 *                 integration is switched on (lib/consultations/calendar/*; off in production)
 * No AI service receives personal information from the website or Workspace (checked 2026-10-16).
 *
 * REGIONS: a region is stated only where there is evidence for it.
 *   Supabase  Sydney (ap-southeast-2), confirmed by the owner 2026-10-06 in the Supabase dashboard
 *             (docs/production-readiness/configuration-audit.md). Re-confirm if the project moves.
 *   Clerk     United States, per Clerk; it offers no region choice (docs/production-readiness/architecture.md).
 *   Others    "not stated": we have not verified where Stripe, Resend, Cloudflare or Microsoft process
 *             this data, so the pages say so instead of guessing.
 */

export type Processor = {
  name: string;
  /** What we use it for, in plain words. */
  purpose: string;
  /** The personal information it handles for us. */
  handles: string;
  /** Where it stores or processes our data, ONLY when known. */
  region?: string;
  /** Shown beside "Region not stated" when something useful is known. */
  note?: string;
};

export const PROCESSORS: readonly Processor[] = [
  {
    name: "Vercel",
    purpose: "Hosts the website and measures visits in aggregate (Vercel Web Analytics, which does not use cookies).",
    handles: "Pages requested, IP address and browser details in server logs, and anonymous visit counts.",
    note: "our website code is set to run in Sydney, Australia",
  },
  {
    name: "Clerk",
    purpose: "Signs clients and administrators in to Drylake Workspace and keeps accounts secure.",
    handles: "Name, work email, organisation membership, sign-in activity.",
    region: "United States",
  },
  {
    name: "Supabase",
    purpose: "Database and private document storage for Drylake Workspace and for consultation bookings.",
    handles: "Booking details, client organisations, projects, documents, invoices and an audit record of changes.",
    region: "Sydney, Australia",
  },
  {
    name: "Stripe",
    purpose: "Takes card payments for invoices on its own secure checkout.",
    handles: "Payment confirmation and billing details. Card numbers are entered with Stripe and never reach Drylake.",
  },
  {
    name: "Resend",
    purpose: "Delivers enquiry notifications, consultation emails, Workspace invitations and invoice emails.",
    handles: "Recipient and sender email addresses, names and the content of those emails.",
  },
  {
    name: "Cloudflare Turnstile",
    purpose: "Checks that a contact or booking form is submitted by a person and not an automated program.",
    handles: "A one-time check token, your IP address and browser signals while the check runs.",
  },
  {
    name: "Microsoft 365",
    purpose:
      "Drylake business email. If we switch on calendar bookings, consultation calendar entries and Teams meeting links are created here too.",
    handles: "Emails you send us and our replies; consultation meeting details if calendar bookings are on.",
  },
];

/** The region line for one provider. Never guesses: no evidence means "Region not stated". */
export function processorRegionText(processor: Processor): string {
  if (processor.region) return processor.region;
  return processor.note ? `Region not stated (${processor.note})` : "Region not stated";
}

/** Countries we can name for overseas disclosure (APP 1.4(g)): only those with evidence. */
export const OVERSEAS_COUNTRIES_KNOWN: readonly string[] = ["United States"];
