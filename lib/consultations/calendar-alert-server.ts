import "server-only";

import { getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";
import { redactSensitive } from "@/lib/security/redact";

import { calendarAuthAlertKey, renderCalendarAuthAlert } from "./calendar-alert";
import { type CalendarFailureKind, CalendarUnavailableError, isAuthFailure } from "./calendar/types";
import { FOUNDER_NOTIFICATION_EMAILS } from "./config";
import { consultationFromAddress } from "./dispatch-server";

/* Keys already sent by this server instance: stops a busy booking page re-sending within a day. */
const sentKeys = new Set<string>();

/*
 * Emails both admins that Microsoft 365 is refusing the booking app's credentials. At most one
 * email per failure kind per Perth day: this instance remembers what it sent, and the Resend
 * idempotency key (same key within 24 hours is one email) covers other instances.
 * Never throws: it runs inside after() or a worker, where a throw helps nobody.
 */
export async function alertCalendarAuthFailure(kind: CalendarFailureKind): Promise<void> {
  try {
    const now = new Date();
    const key = calendarAuthAlertKey(kind, now);
    if (sentKeys.has(key)) return;

    const rendered = renderCalendarAuthAlert(kind, appBaseUrl(process.env));
    if (!rendered) return;

    const { error } = await getResendClient().emails.send(
      {
        from: consultationFromAddress({ CONSULTATION_EMAIL_FROM: process.env.CONSULTATION_EMAIL_FROM, EMAIL_FROM: process.env.EMAIL_FROM }),
        to: [...FOUNDER_NOTIFICATION_EMAILS],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      { idempotencyKey: key }
    );
    // The same key with the same content was already accepted: counts as sent.
    if (error && error.name !== "invalid_idempotent_request") throw new Error(`${error.name}: ${error.message}`);
    sentKeys.add(key);
  } catch (error) {
    console.error("Consultation calendar auth alert not sent:", redactSensitive(error instanceof Error ? error.message : null));
  }
}

/** For route catch blocks: alerts the admins when a calendar error is an auth failure, else does nothing. */
export async function reportCalendarFailure(error: unknown): Promise<void> {
  if (error instanceof CalendarUnavailableError && isAuthFailure(error.kind)) await alertCalendarAuthFailure(error.kind);
}
