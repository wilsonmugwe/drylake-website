/*
 * Consultation emails (booking, reschedule, cancellation, 24-hour reminder), rendered with the
 * shared design system. PURE (no env, no SDK): tests/consultation-emails.test.mjs renders every
 * kind; lib/consultations/dispatch.ts sends them from the outbox.
 *
 * Times are always Perth wall-clock with the zone named, whatever the reader's timezone.
 * Copy rules: no em dashes, no prices, no promise the founders have not made. Customer emails
 * show only the customer's own booking; founder emails carry the full details.
 */

import {
  CONSULTATION_MINUTES,
  CONSULTATION_TIMEZONE_LABEL,
  formatPerthDate,
  formatPerthRange,
} from "../consultations/rules.ts";
import { MEETING_METHOD_LABELS, type MeetingMethod } from "../consultations/representatives.ts";
import { CONTACT_EMAIL } from "../site.ts";
import {
  type DetailRow,
  type RenderedEmail,
  button,
  checklist,
  detailTable,
  fallbackLink,
  messageBlock,
  paragraph,
  renderEmailLayout,
  textFooter,
} from "./layout.ts";

export type ConsultationEmailKind =
  | "CUSTOMER_CONFIRMATION"
  | "FOUNDER_NEW_BOOKING"
  | "CUSTOMER_RESCHEDULED"
  | "FOUNDER_RESCHEDULED"
  | "CUSTOMER_CANCELLED"
  | "FOUNDER_CANCELLED"
  | "CUSTOMER_REMINDER"
  | "FOUNDER_CALENDAR_FAILED";

export const CUSTOMER_KINDS: readonly ConsultationEmailKind[] = [
  "CUSTOMER_CONFIRMATION",
  "CUSTOMER_RESCHEDULED",
  "CUSTOMER_CANCELLED",
  "CUSTOMER_REMINDER",
];

export type ConsultationEmailInput = {
  kind: ConsultationEmailKind;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  businessName: string | null;
  projectDescription: string;
  start: Date;
  previousStart?: Date | null;
  /* Who made a reschedule or cancellation. */
  actor?: "CUSTOMER" | "ADMIN" | "SYSTEM";
  cancellationReason?: string | null;
  /* How the consultation happens and with whom (absent on bookings rendered by older tests). */
  method?: MeetingMethod;
  representativeName?: string | null;
  /* Teams join link from the CURRENT calendar event; null while not (yet) available. */
  joinUrl?: string | null;
  /* Microsoft 365 connected: the calendar invitation carries the Teams link. */
  calendarConnected?: boolean;
  calendarError?: string | null;
  /* The booking has been cancelled (calendar failure alert wording). */
  bookingCancelled?: boolean;
  /* Customer emails for an active booking carry the management link. */
  manageUrl?: string | null;
  assetOrigin: string;
};

export const CONSULTATION_SUBJECTS: Record<ConsultationEmailKind, (name: string) => string> = {
  CUSTOMER_CONFIRMATION: () => "Your Free Consultation with Drylake is Confirmed",
  FOUNDER_NEW_BOOKING: (name) => `New Drylake Consultation Booking: ${name}`,
  CUSTOMER_RESCHEDULED: () => "Your Drylake Consultation Has Been Rescheduled",
  FOUNDER_RESCHEDULED: (name) => `Consultation Rescheduled: ${name}`,
  CUSTOMER_CANCELLED: () => "Your Drylake Consultation Has Been Cancelled",
  FOUNDER_CANCELLED: (name) => `Consultation Cancelled: ${name}`,
  CUSTOMER_REMINDER: () => "Reminder: Your Drylake Consultation is Tomorrow",
  FOUNDER_CALENDAR_FAILED: (name) => `Action Needed: Calendar Sync Failed for ${name}'s Consultation`,
};

/* What the customer can expect. Only facts the brief states: free, 30 minutes, no obligation. */
export const WHAT_TO_EXPECT: readonly string[] = [
  `A ${CONSULTATION_MINUTES}-minute conversation with a Drylake founder about your business and what you would like to improve.`,
  "No preparation is needed. Bring any examples of the paperwork, tools or steps that slow you down.",
  "If there is a good fit, we will recommend an approach and give you a clear quote before any work begins.",
  "The consultation is free and there is no obligation to proceed.",
];

function appointmentRows(start: Date): DetailRow[] {
  return [
    { label: "Date", value: formatPerthDate(start) },
    { label: "Time", value: formatPerthRange(start) },
    { label: "Timezone", value: CONSULTATION_TIMEZONE_LABEL },
    { label: "Duration", value: `${CONSULTATION_MINUTES} minutes` },
  ];
}

function methodRows(input: ConsultationEmailInput, audience: "customer" | "founder"): DetailRow[] {
  const rows: DetailRow[] = [];
  if (input.method) rows.push({ label: "Consultation method", value: MEETING_METHOD_LABELS[input.method] });
  if (input.representativeName) rows.push({ label: audience === "customer" ? "With" : "Representative", value: input.representativeName });
  return rows;
}

/* How to join: Teams button, Teams-link-to-follow note, or "we will call you". Active bookings only. */
function meetingBlocks(input: ConsultationEmailInput): { blocks: string[]; lines: string[] } {
  if (input.method === "PHONE") {
    const text = `We will call you on ${input.customerPhone || "the number you gave us"} at the appointment time. Please keep your phone nearby.`;
    return { blocks: [messageBlock({ title: "Phone consultation", text })], lines: [`Phone consultation: ${text}`] };
  }
  if (input.method !== "TEAMS") return { blocks: [], lines: [] };
  if (input.joinUrl) {
    return {
      blocks: [
        paragraph("Your consultation is a Microsoft Teams video call. Join from your browser or the Teams app at the appointment time."),
        button({ href: input.joinUrl, label: "Join Microsoft Teams Meeting" }),
        fallbackLink({ href: input.joinUrl, linkText: "Open the Teams meeting in your browser" }),
      ],
      lines: [`Microsoft Teams meeting: ${input.joinUrl}`],
    };
  }
  // No link yet means the invitation may not exist either: never claim it was sent.
  const text = "Your Microsoft Teams link will follow in a calendar invitation from Drylake. If it has not arrived by the day before, reply to this email and we will send it.";
  return { blocks: [messageBlock({ title: "Microsoft Teams video call", text })], lines: [`Microsoft Teams video call: ${text}`] };
}

function customerDetailRows(input: ConsultationEmailInput): DetailRow[] {
  return [
    { label: "Name", value: input.customerName },
    { label: "Email", value: input.customerEmail },
    { label: "Phone", value: input.customerPhone || "Not provided" },
    { label: "Business", value: input.businessName || "Not provided" },
  ];
}

function actorPhrase(actor: ConsultationEmailInput["actor"]): string {
  return actor === "ADMIN" ? "Drylake" : "the customer";
}

type Parts = { eyebrow: string; heading: string; preheader: string; blocks: string[]; lines: string[] };

function compose(input: ConsultationEmailInput): Parts {
  const ref = input.reference;
  const when = `${formatPerthDate(input.start)}, ${formatPerthRange(input.start)} (${CONSULTATION_TIMEZONE_LABEL})`;
  const rows = [{ label: "Booking reference", value: ref }, ...appointmentRows(input.start), ...methodRows(input, "customer")];
  const founderRows = [{ label: "Booking reference", value: ref }, ...appointmentRows(input.start), ...methodRows(input, "founder")];
  const meeting = meetingBlocks(input);
  const founderLink = input.joinUrl ? [{ label: "Teams link", value: input.joinUrl }] : [];
  const manage = input.manageUrl
    ? [
        button({ href: input.manageUrl, label: "Manage Appointment" }),
        fallbackLink({ href: input.manageUrl, linkText: "Open your appointment in your browser" }),
      ]
    : [];
  const manageLines = input.manageUrl ? [`Manage your appointment: ${input.manageUrl}`] : [];
  const questions = paragraph(`Questions? Reply to this email or write to ${CONTACT_EMAIL}.`, { muted: true, small: true });
  const questionsLine = `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`;
  const previous = input.previousStart
    ? `${formatPerthDate(input.previousStart)}, ${formatPerthRange(input.previousStart)}`
    : "Not recorded";

  switch (input.kind) {
    case "CUSTOMER_CONFIRMATION":
      return {
        eyebrow: "Consultation confirmed",
        heading: `Thanks, ${input.customerName}. You're booked in.`,
        preheader: `Your free ${CONSULTATION_MINUTES}-minute consultation: ${when}.`,
        blocks: [
          paragraph("Your free consultation with Drylake is confirmed. Here are the details."),
          detailTable(rows),
          ...meeting.blocks,
          checklist({ title: "What to expect", items: WHAT_TO_EXPECT }),
          paragraph("Need a different time? You can reschedule or cancel with the button below until 2 hours before your consultation."),
          ...manage,
          questions,
        ],
        lines: [
          "Your free consultation with Drylake is confirmed.",
          "",
          `Booking reference: ${ref}`,
          `When: ${when}`,
          `Duration: ${CONSULTATION_MINUTES} minutes`,
          ...methodLines(input),
          ...meeting.lines,
          "",
          "What to expect:",
          ...WHAT_TO_EXPECT.map((item) => `- ${item}`),
          "",
          ...manageLines,
          questionsLine,
        ],
      };

    case "CUSTOMER_REMINDER":
      return {
        eyebrow: "Reminder",
        heading: `Your consultation is tomorrow, ${input.customerName}.`,
        preheader: `Tomorrow: ${when}.`,
        blocks: [
          paragraph("A quick reminder of your free consultation with Drylake."),
          detailTable(rows),
          ...meeting.blocks,
          paragraph("If the time no longer suits you, please reschedule or cancel so we can offer it to someone else."),
          ...manage,
          questions,
        ],
        lines: [
          `Hi ${input.customerName}, a quick reminder of your free consultation with Drylake.`,
          "",
          `Booking reference: ${ref}`,
          `When: ${when}`,
          `Duration: ${CONSULTATION_MINUTES} minutes`,
          ...methodLines(input),
          ...meeting.lines,
          "",
          ...manageLines,
          questionsLine,
        ],
      };

    case "CUSTOMER_RESCHEDULED": {
      const byDrylake = input.actor === "ADMIN";
      const intro = byDrylake
        ? "Drylake has rescheduled your consultation. We are sorry for any inconvenience. Your new time is below."
        : "Your consultation has been rescheduled. Your new time is below.";
      return {
        eyebrow: byDrylake ? "Rescheduled by Drylake" : "Consultation rescheduled",
        heading: "Your consultation has a new time.",
        preheader: `New time: ${when}.`,
        blocks: [
          paragraph(intro),
          detailTable([...rows, { label: "Previous time", value: previous }]),
          ...meeting.blocks,
          paragraph("If the new time does not suit you, you can change it or cancel below."),
          ...manage,
          questions,
        ],
        lines: [
          intro,
          "",
          `Booking reference: ${ref}`,
          `New time: ${when}`,
          `Previous time: ${previous}`,
          ...methodLines(input),
          ...meeting.lines,
          "",
          ...manageLines,
          questionsLine,
        ],
      };
    }

    case "CUSTOMER_CANCELLED": {
      const byDrylake = input.actor === "ADMIN";
      const intro = byDrylake
        ? "Drylake has had to cancel your consultation. We are sorry for the inconvenience."
        : "Your consultation has been cancelled, as you asked.";
      const reason = byDrylake && input.cancellationReason ? [messageBlock({ title: "Reason", text: input.cancellationReason })] : [];
      return {
        eyebrow: "Consultation cancelled",
        heading: "Your consultation is cancelled.",
        preheader: `Cancelled: ${when}.`,
        blocks: [
          paragraph(intro),
          detailTable(rows),
          ...reason,
          ...(input.method === "TEAMS" ? [paragraph("The Microsoft Teams link for this appointment no longer applies.")] : []),
          paragraph("You are welcome to book another free consultation at any time at drylake.com.au/consultation."),
          questions,
        ],
        lines: [
          intro,
          "",
          `Booking reference: ${ref}`,
          `Cancelled appointment: ${when}`,
          ...(byDrylake && input.cancellationReason ? [`Reason: ${input.cancellationReason}`] : []),
          "",
          "You are welcome to book another free consultation at any time at drylake.com.au/consultation.",
          questionsLine,
        ],
      };
    }

    case "FOUNDER_NEW_BOOKING":
      return {
        eyebrow: "New consultation",
        heading: `${input.customerName} booked a consultation.`,
        preheader: `${when}. Reference ${ref}.`,
        blocks: [
          detailTable([...founderRows, ...founderLink]),
          ...manualInvite(input),
          detailTable(customerDetailRows(input)),
          messageBlock({ title: "About their business or project", text: input.projectDescription }),
          paragraph("Reply to this email to write to the customer directly.", { muted: true, small: true }),
        ],
        lines: [
          `${input.customerName} booked a free consultation.`,
          "",
          `Booking reference: ${ref}`,
          `When: ${when}`,
          ...methodLines(input),
          ...manualInviteLines(input),
          `Name: ${input.customerName}`,
          `Email: ${input.customerEmail}`,
          `Phone: ${input.customerPhone || "Not provided"}`,
          `Business: ${input.businessName || "Not provided"}`,
          "",
          "About their business or project:",
          input.projectDescription,
        ],
      };

    case "FOUNDER_RESCHEDULED":
      return {
        eyebrow: "Consultation rescheduled",
        heading: `${input.customerName}'s consultation moved.`,
        preheader: `Now ${when}. Changed by ${actorPhrase(input.actor)}.`,
        blocks: [
          paragraph(`Rescheduled by ${actorPhrase(input.actor)}.`),
          detailTable([...founderRows, { label: "Previous time", value: previous }, ...founderLink]),
          ...manualInvite(input),
          detailTable(customerDetailRows(input)),
        ],
        lines: [
          `${input.customerName}'s consultation was rescheduled by ${actorPhrase(input.actor)}.`,
          "",
          `Booking reference: ${ref}`,
          `New time: ${when}`,
          `Previous time: ${previous}`,
          ...methodLines(input),
          ...manualInviteLines(input),
          `Email: ${input.customerEmail}`,
        ],
      };

    case "FOUNDER_CANCELLED":
      return {
        eyebrow: "Consultation cancelled",
        heading: `${input.customerName}'s consultation was cancelled.`,
        preheader: `${when}. Cancelled by ${actorPhrase(input.actor)}.`,
        blocks: [
          paragraph(`Cancelled by ${actorPhrase(input.actor)}. The time is free for another booking.`),
          detailTable(founderRows),
          ...(input.cancellationReason ? [messageBlock({ title: "Reason", text: input.cancellationReason })] : []),
          detailTable(customerDetailRows(input)),
        ],
        lines: [
          `${input.customerName}'s consultation was cancelled by ${actorPhrase(input.actor)}.`,
          "",
          `Booking reference: ${ref}`,
          `Cancelled appointment: ${when}`,
          ...(input.cancellationReason ? [`Reason: ${input.cancellationReason}`] : []),
          `Email: ${input.customerEmail}`,
        ],
      };

    case "FOUNDER_CALENDAR_FAILED": {
      const intro = input.bookingCancelled
        ? "This consultation is CANCELLED, but Drylake could not cancel its Outlook event after repeated attempts. The calendar invitation and any Teams link may still be live for the customer. Cancel the event in Outlook by hand."
        : "Drylake could not update Microsoft 365 for this consultation after repeated attempts. The booking itself stands and the customer has their email, but the Outlook event, the calendar invitation or the Teams link may be missing or out of date.";
      const action = "Open Admin > Consultations, check the booking, and use Retry calendar sync once Microsoft 365 is working.";
      return {
        eyebrow: "Action needed",
        heading: `Calendar sync failed for ${input.customerName}.`,
        preheader: `${when}. Reference ${ref}.`,
        blocks: [
          paragraph(intro),
          detailTable(founderRows),
          ...(input.calendarError ? [messageBlock({ title: "Last error", text: input.calendarError })] : []),
          paragraph(action),
          detailTable(customerDetailRows(input)),
        ],
        lines: [intro, "", `Booking reference: ${ref}`, `When: ${when}`, ...methodLines(input),
          ...(input.calendarError ? [`Last error: ${input.calendarError}`] : []), "", action, `Email: ${input.customerEmail}`],
      };
    }
  }
}

/* Founders: with no calendar connected, nobody sends the Teams invitation unless they do. */
function manualInvite(input: ConsultationEmailInput): string[] {
  return input.method === "TEAMS" && input.calendarConnected === false
    ? [messageBlock({ title: "Action needed", text: "Calendar integration is off. Send this customer a Microsoft Teams invitation from the representative's Outlook." })]
    : [];
}

function manualInviteLines(input: ConsultationEmailInput): string[] {
  return input.method === "TEAMS" && input.calendarConnected === false
    ? ["Action needed: Calendar integration is off. Send this customer a Microsoft Teams invitation from the representative's Outlook."]
    : [];
}

function methodLines(input: ConsultationEmailInput): string[] {
  return methodRows(input, "customer").map((row) => `${row.label}: ${row.value}`);
}

export function renderConsultationEmail(input: ConsultationEmailInput): RenderedEmail {
  const subject = CONSULTATION_SUBJECTS[input.kind](input.customerName);
  const parts = compose(input);

  const html = renderEmailLayout({
    title: subject,
    preheader: parts.preheader,
    eyebrow: parts.eyebrow,
    heading: parts.heading,
    bodyHtml: parts.blocks.join("\n"),
    assetOrigin: input.assetOrigin,
  });

  const text = [parts.heading, "", ...parts.lines, "", ...textFooter()].join("\n");

  return { subject, html, text };
}
