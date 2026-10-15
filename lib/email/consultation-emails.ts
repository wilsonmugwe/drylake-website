/*
 * Consultation emails (booking, reschedule, cancellation, 24-hour reminder, calendar alert),
 * rendered with the shared design system on its charcoal header (layout `header: "dark"`) and
 * the appointment blocks. PURE (no env, no SDK): tests/consultation-booking.test.mjs,
 * tests/consultation-m365.test.mjs and tests/email-design-system.test.mjs render every kind;
 * lib/consultations/dispatch.ts sends them from the outbox.
 *
 * Order in every email: what happened (heading), the appointment card (date and time largest),
 * how to join, the actions, the change policy, then contact. Founder notices lead with the same
 * card and add the customer's details.
 *
 * A button is rendered ONLY for a real destination: Join Teams only with the join URL from the
 * CURRENT calendar event, Manage Booking only with a link the database accepts, Open in admin
 * only when the sender passes adminUrl. No placeholder actions, ever.
 *
 * Times are always Perth wall-clock with the zone named, whatever the reader's timezone.
 * Copy rules: no em dashes, no prices, no promise the founders have not made. Customer emails
 * show only the customer's own booking; founder emails carry the full details.
 */

import {
  CONSULTATION_MINUTES,
  CONSULTATION_TIMEZONE_LABEL,
  CUSTOMER_CHANGE_CUTOFF_MINUTES,
  formatPerthDate,
  formatPerthRange,
} from "../consultations/rules.ts";
import { MEETING_METHOD_LABELS, type MeetingMethod } from "../consultations/representatives.ts";
import { BUSINESS_PHONE, CONTACT_EMAIL } from "../site.ts";
import { appointmentCard, notice, sectionLabel, textRows, textSection } from "./appointment-blocks.ts";
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
  /* Founder emails: the booking's admin page (behind sign-in). */
  adminUrl?: string | null;
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

const CUTOFF_HOURS = CUSTOMER_CHANGE_CUTOFF_MINUTES / 60;
const CUTOFF = `${CUTOFF_HOURS} hour${CUTOFF_HOURS === 1 ? "" : "s"}`;

/* The two-hour rule, in the words the manage page enforces (lib/consultations/outcomes.ts). */
export const CHANGE_POLICY = `You can reschedule or cancel online until ${CUTOFF} before your consultation starts. Inside ${CUTOFF}, reply to this email or call ${BUSINESS_PHONE.display} and we will help.`;

/* ------------------------------------------------------------------ rows */

function cardRows(input: ConsultationEmailInput, audience: "customer" | "founder"): DetailRow[] {
  const rows: DetailRow[] = [{ label: "Duration", value: `${CONSULTATION_MINUTES} minutes` }];
  if (input.method) rows.push({ label: "Method", value: MEETING_METHOD_LABELS[input.method] });
  if (input.representativeName) rows.push({ label: audience === "customer" ? "With" : "Representative", value: input.representativeName });
  rows.push({ label: "Booking reference", value: input.reference });
  return rows;
}

/* The full appointment for the plain-text part, same facts as the card. */
function textAppointment(input: ConsultationEmailInput, audience: "customer" | "founder", start = input.start): string[] {
  return [
    `Date: ${formatPerthDate(start)}`,
    `Time: ${formatPerthRange(start)}`,
    `Timezone: ${CONSULTATION_TIMEZONE_LABEL}`,
    ...textRows(cardRows(input, audience)),
  ];
}

function card(input: ConsultationEmailInput, audience: "customer" | "founder", title: string, inactive = false): string {
  return appointmentCard({
    title,
    date: formatPerthDate(input.start),
    time: formatPerthRange(input.start),
    zone: CONSULTATION_TIMEZONE_LABEL,
    rows: cardRows(input, audience),
    inactive,
  });
}

function previousTime(input: ConsultationEmailInput): string {
  return input.previousStart ? `${formatPerthDate(input.previousStart)}, ${formatPerthRange(input.previousStart)}` : "Not recorded";
}

/* ------------------------------------------------------------------ joining */

type Section = { blocks: string[]; lines: string[] };
const EMPTY: Section = { blocks: [], lines: [] };

/* How to join: Teams button, Teams-link-to-follow note, or "we will call you". Active bookings only. */
function joining(input: ConsultationEmailInput): Section {
  if (input.method === "PHONE") {
    const text = `We will call you on ${input.customerPhone || "the number you gave us"} at the appointment time. Please keep your phone nearby.`;
    return { blocks: [notice({ title: "Phone consultation", text, tone: "action" })], lines: textSection("How we will meet", [text]) };
  }
  if (input.method !== "TEAMS") return EMPTY;
  if (input.joinUrl) {
    return {
      blocks: [
        paragraph("Your consultation is a Microsoft Teams video call. Join from your browser or the Teams app a few minutes before the start time."),
        button({ href: input.joinUrl, label: "Join Microsoft Teams Meeting" }),
      ],
      lines: textSection("How to join", [`Microsoft Teams meeting: ${input.joinUrl}`]),
    };
  }
  // No link yet means the invitation may not exist either: never claim it was sent.
  const text = "Your Microsoft Teams link will follow in a calendar invitation from Drylake. If it has not arrived by the day before, reply to this email and we will send it.";
  return { blocks: [notice({ title: "Microsoft Teams video call", text, tone: "action" })], lines: textSection("How to join", [text]) };
}

/* ------------------------------------------------------------------ actions */

function manageActions(input: ConsultationEmailInput): Section {
  if (!input.manageUrl) return EMPTY;
  const secondary = input.method === "TEAMS" && Boolean(input.joinUrl);
  return {
    blocks: [
      button({ href: input.manageUrl, label: "Manage Booking", variant: secondary ? "secondary" : "primary" }),
      fallbackLink({ href: input.manageUrl, linkText: "Open your booking in your browser" }),
    ],
    lines: [`Manage your booking: ${input.manageUrl}`, ""],
  };
}

function policy(input: ConsultationEmailInput): Section {
  // The two-hour rule is always stated. Without a working manage link (e.g. after a secret
  // rotation) the online route is not offered, only the ways to reach us.
  const text = input.manageUrl
    ? CHANGE_POLICY
    : `Changes can be made until ${CUTOFF} before your consultation starts: reply to this email or call ${BUSINESS_PHONE.display}.`;
  return { blocks: [notice({ title: "Rescheduling and cancelling", text })], lines: textSection("Rescheduling and cancelling", [text]) };
}

function founderActions(input: ConsultationEmailInput): Section {
  const blocks: string[] = [];
  const lines: string[] = [];
  if (input.joinUrl) {
    blocks.push(button({ href: input.joinUrl, label: "Join Microsoft Teams Meeting" }));
    lines.push(`Microsoft Teams meeting: ${input.joinUrl}`);
  }
  if (input.adminUrl) {
    blocks.push(button({ href: input.adminUrl, label: "Open in Drylake admin", variant: input.joinUrl ? "secondary" : "primary" }));
    lines.push(`Admin: ${input.adminUrl}`);
  }
  return { blocks, lines: lines.length ? [...lines, ""] : [] };
}

/* Founders: with no calendar connected, nobody sends the Teams invitation unless they do. */
function manualInvite(input: ConsultationEmailInput): Section {
  if (!(input.method === "TEAMS" && input.calendarConnected === false)) return EMPTY;
  const text = "Calendar integration is off. Send this customer a Microsoft Teams invitation from the representative's Outlook.";
  return { blocks: [notice({ title: "Action needed", text, tone: "action" })], lines: [`Action needed: ${text}`, ""] };
}

function customerDetails(input: ConsultationEmailInput): Section {
  const rows: DetailRow[] = [
    { label: "Name", value: input.customerName },
    { label: "Email", value: input.customerEmail },
    { label: "Phone", value: input.customerPhone || "Not provided" },
    { label: "Business", value: input.businessName || "Not provided" },
  ];
  return { blocks: [sectionLabel("Customer"), detailTable(rows)], lines: textSection("Customer", textRows(rows)) };
}

const questions = (): Section => {
  const text = `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`;
  return { blocks: [paragraph(text, { muted: true, small: true })], lines: [text] };
};

function actorPhrase(actor: ConsultationEmailInput["actor"]): string {
  return actor === "ADMIN" ? "Drylake" : "the customer";
}

/* ------------------------------------------------------------------ compose */

type Parts = { eyebrow: string; heading: string; preheader: string; sections: Section[] };

const intro = (text: string): Section => ({ blocks: [paragraph(text)], lines: [text, ""] });
const raw = (blocks: string[], lines: string[] = []): Section => ({ blocks, lines });

function compose(input: ConsultationEmailInput): Parts {
  const ref = input.reference;
  const when = `${formatPerthDate(input.start)}, ${formatPerthRange(input.start)} (${CONSULTATION_TIMEZONE_LABEL})`;
  const appointment = (title: string, audience: "customer" | "founder" = "customer", inactive = false): Section =>
    raw([card(input, audience, title, inactive)], textSection(title, textAppointment(input, audience)));

  switch (input.kind) {
    case "CUSTOMER_CONFIRMATION":
      return {
        eyebrow: "Consultation confirmed",
        heading: `Thanks, ${input.customerName}. You're booked in.`,
        preheader: `Your free ${CONSULTATION_MINUTES}-minute consultation: ${when}.`,
        sections: [
          intro("Your free consultation with Drylake is confirmed. Here are the details."),
          appointment("Your appointment"),
          joining(input),
          manageActions(input),
          raw([checklist({ title: "What to expect", items: WHAT_TO_EXPECT })], textSection("What to expect", WHAT_TO_EXPECT.map((item) => `- ${item}`))),
          policy(input),
          questions(),
        ],
      };

    case "CUSTOMER_REMINDER":
      return {
        eyebrow: "Tomorrow",
        heading: `Your consultation is tomorrow, ${input.customerName}.`,
        preheader: `Tomorrow: ${when}.`,
        sections: [
          intro("A quick reminder of your free consultation with Drylake."),
          appointment("Your appointment"),
          joining(input),
          manageActions(input),
          raw([paragraph("If the time no longer suits you, please reschedule or cancel so we can offer it to someone else.")],
            ["If the time no longer suits you, please reschedule or cancel so we can offer it to someone else.", ""]),
          policy(input),
          questions(),
        ],
      };

    case "CUSTOMER_RESCHEDULED": {
      const byDrylake = input.actor === "ADMIN";
      return {
        eyebrow: byDrylake ? "Rescheduled by Drylake" : "Consultation rescheduled",
        heading: "Your consultation has a new time.",
        preheader: `New time: ${when}.`,
        sections: [
          intro(byDrylake
            ? "Drylake has rescheduled your consultation. We are sorry for any inconvenience. Your new time is below."
            : "Your consultation has been rescheduled. Your new time is below."),
          appointment("New time"),
          raw([detailTable([{ label: "Previous time", value: previousTime(input) }])], [`Previous time: ${previousTime(input)}`, ""]),
          joining(input),
          manageActions(input),
          policy(input),
          questions(),
        ],
      };
    }

    case "CUSTOMER_CANCELLED": {
      const byDrylake = input.actor === "ADMIN";
      const bookUrl = new URL("/consultation", input.assetOrigin).toString();
      const reason = byDrylake && input.cancellationReason ? input.cancellationReason : null;
      return {
        eyebrow: "Consultation cancelled",
        heading: "Your consultation is cancelled.",
        preheader: `Cancelled: ${when}.`,
        sections: [
          intro(byDrylake
            ? "Drylake has had to cancel your consultation. We are sorry for the inconvenience."
            : "Your consultation has been cancelled, as you asked."),
          appointment("Cancelled appointment", "customer", true),
          ...(reason ? [raw([notice({ title: "Reason", text: reason })], textSection("Reason", [reason]))] : []),
          ...(input.method === "TEAMS"
            ? [intro("The Microsoft Teams link for this appointment no longer applies.")]
            : []),
          raw(
            [paragraph("You are welcome to book another free consultation at any time."), button({ href: bookUrl, label: "Book a New Consultation" })],
            [`Book a new consultation: ${bookUrl}`, ""]
          ),
          questions(),
        ],
      };
    }

    case "FOUNDER_NEW_BOOKING":
      return {
        eyebrow: "New consultation",
        heading: `${input.customerName} booked a consultation.`,
        preheader: `${when}. Reference ${ref}.`,
        sections: [
          appointment("Appointment", "founder"),
          manualInvite(input),
          founderActions(input),
          customerDetails(input),
          raw([messageBlock({ title: "About their business or project", text: input.projectDescription })],
            textSection("About their business or project", [input.projectDescription])),
          raw([paragraph("Reply to this email to write to the customer directly.", { muted: true, small: true })]),
        ],
      };

    case "FOUNDER_RESCHEDULED":
      return {
        eyebrow: "Consultation rescheduled",
        heading: `${input.customerName}'s consultation moved.`,
        preheader: `Now ${when}. Changed by ${actorPhrase(input.actor)}.`,
        sections: [
          intro(`Rescheduled by ${actorPhrase(input.actor)}.`),
          appointment("New time", "founder"),
          raw([detailTable([{ label: "Previous time", value: previousTime(input) }])], [`Previous time: ${previousTime(input)}`, ""]),
          manualInvite(input),
          founderActions(input),
          customerDetails(input),
        ],
      };

    case "FOUNDER_CANCELLED":
      return {
        eyebrow: "Consultation cancelled",
        heading: `${input.customerName}'s consultation was cancelled.`,
        preheader: `${when}. Cancelled by ${actorPhrase(input.actor)}.`,
        sections: [
          intro(`Cancelled by ${actorPhrase(input.actor)}. The time is free for another booking.`),
          appointment("Cancelled appointment", "founder", true),
          ...(input.cancellationReason ? [raw([notice({ title: "Reason", text: input.cancellationReason })], textSection("Reason", [input.cancellationReason]))] : []),
          founderActions({ ...input, joinUrl: null }),
          customerDetails(input),
        ],
      };

    case "FOUNDER_CALENDAR_FAILED": {
      const text = input.bookingCancelled
        ? "This consultation is CANCELLED, but Drylake could not cancel its Outlook event after repeated attempts. The calendar invitation and any Teams link may still be live for the customer. Cancel the event in Outlook by hand."
        : "Drylake could not update Microsoft 365 for this consultation after repeated attempts. The booking itself stands and the customer has their email, but the Outlook event, the calendar invitation or the Teams link may be missing or out of date.";
      const action = "Open Admin > Consultations, check the booking, and use Retry calendar sync once Microsoft 365 is working.";
      return {
        eyebrow: "Action needed",
        heading: `Calendar sync failed for ${input.customerName}.`,
        preheader: `${when}. Reference ${ref}.`,
        sections: [
          raw([notice({ title: "What happened", text, tone: "action" })], [text, ""]),
          appointment("Appointment", "founder", Boolean(input.bookingCancelled)),
          ...(input.calendarError ? [raw([messageBlock({ title: "Last error", text: input.calendarError })], [`Last error: ${input.calendarError}`, ""])] : []),
          intro(action),
          founderActions({ ...input, joinUrl: null }),
          customerDetails(input),
        ],
      };
    }
  }
}

export function renderConsultationEmail(input: ConsultationEmailInput): RenderedEmail {
  const subject = CONSULTATION_SUBJECTS[input.kind](input.customerName);
  const parts = compose(input);

  const html = renderEmailLayout({
    title: subject,
    preheader: parts.preheader,
    eyebrow: parts.eyebrow,
    heading: parts.heading,
    bodyHtml: parts.sections.flatMap((s) => s.blocks).join("\n"),
    assetOrigin: input.assetOrigin,
    header: "dark",
  });

  const lines = parts.sections.flatMap((s) => s.lines);
  const text = [parts.heading, "", ...lines, "", ...textFooter()].join("\n").replace(/\n{3,}/g, "\n\n");

  return { subject, html, text };
}
