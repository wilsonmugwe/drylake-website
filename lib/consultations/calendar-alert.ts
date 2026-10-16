/*
 * "Microsoft 365 refused our credentials" alert for the admins. PURE (tests/consultation-m365-hardening.test.mjs).
 *
 * Why this exists: the per-booking founder alert (FOUNDER_CALENDAR_FAILED) only fires once a
 * booking has used up its retries, hours later, and a booking that is REFUSED because calendars
 * cannot be checked never creates a row to retry. An expired client secret therefore looks like
 * "no times available" to customers and like nothing at all to Drylake. This email is the fix:
 * sent as soon as an auth failure repeats, from either path, at most once per kind per Perth day.
 *
 * It names what to renew and where. It never carries a secret, a token, a customer detail or the
 * raw provider error (only the failure kind).
 */

import { checklist, messageBlock, paragraph, renderEmailLayout, textFooter, type RenderedEmail } from "../email/layout.ts";
import { perthParts } from "./rules.ts";
import { type CalendarFailureKind, isAuthFailure } from "./calendar/types.ts";

/** Resend idempotency key: one alert per failure kind per Perth calendar day. */
export function calendarAuthAlertKey(kind: CalendarFailureKind, now: Date): string {
  const p = perthParts(now);
  const two = (n: number) => String(n).padStart(2, "0");
  return `calendar-auth-alert:${kind}:${p.year}-${two(p.month)}-${two(p.day)}`;
}

const WHAT: Record<"credential_expired" | "auth", { subject: string; heading: string; cause: string; steps: string[] }> = {
  credential_expired: {
    subject: "Action Needed: Microsoft 365 Client Secret Expired for Consultation Booking",
    heading: "The Microsoft 365 client secret has expired.",
    cause:
      "Microsoft is refusing to sign the Drylake Consultation Booking app in (the client secret is expired or no longer valid), so Drylake cannot read or write the Outlook calendars.",
    steps: [
      "In Microsoft Entra admin centre, open App registrations > Drylake Consultation Booking > Certificates & secrets, and create a new client secret.",
      "In Vercel, set MS_GRAPH_CLIENT_SECRET to the new secret value (Production) and redeploy.",
      "Delete the old secret in Entra once the redeploy is live.",
      "Check https://drylake.com.au/api/health shows consultations.calendar.credentials as ok.",
    ],
  },
  auth: {
    subject: "Action Needed: Microsoft 365 Refused Access for Consultation Booking",
    heading: "Microsoft 365 is refusing the consultation booking app.",
    cause:
      "Microsoft accepted the sign-in but refused the calendar request, or rejected the sign-in itself. The usual causes are a removed Exchange application role assignment, a changed management scope, or a disabled app.",
    steps: [
      "In Exchange Online PowerShell, check that the service principal still has the role Application Calendars.ReadWrite scoped to Drylake-Consultation-Mailboxes, and that wilson@ and benedict@ are in that scope.",
      "In Microsoft Entra, confirm the Drylake Consultation Booking app is enabled and its tenant-wide Graph Calendars.ReadWrite permission is still absent (it must not be restored).",
      "Run scripts/m365-verify.mjs with the Vercel credentials to see which step fails.",
      "Check https://drylake.com.au/api/health shows consultations.calendar.credentials as ok.",
    ],
  },
};

export function renderCalendarAuthAlert(kind: CalendarFailureKind, assetOrigin: string): RenderedEmail | null {
  if (!isAuthFailure(kind)) return null;
  const what = WHAT[kind as "credential_expired" | "auth"];

  const effect =
    "Customers cannot book new consultations while calendars cannot be checked: the booking page shows a temporary-unavailable message instead of times. Existing bookings are safe in Drylake's database and their calendar updates are queued and will retry automatically once access is restored.";

  const html = renderEmailLayout({
    title: what.subject,
    preheader: "Consultation booking cannot reach the Outlook calendars.",
    eyebrow: "Action needed",
    heading: what.heading,
    bodyHtml: [
      messageBlock({ title: "What happened", text: what.cause }),
      paragraph(effect),
      checklist({ title: "How to fix it", items: what.steps }),
      paragraph("This alert is sent at most once a day while the problem continues. It contains no secrets.", { muted: true, small: true }),
    ].join("\n"),
    assetOrigin,
    header: "dark",
  });

  const text = [
    what.heading,
    "",
    what.cause,
    "",
    effect,
    "",
    "How to fix it:",
    ...what.steps.map((step, i) => `${i + 1}. ${step}`),
    "",
    "This alert is sent at most once a day while the problem continues. It contains no secrets.",
    "",
    ...textFooter(),
  ].join("\n");

  return { subject: what.subject, html, text };
}
