/*
 * What each database outcome means to a visitor or an admin. PURE (unit-tested).
 * The SQL functions return these codes; the routes turn them into a status and a message.
 */

export type ConsultationOutcome =
  | "created"
  | "replayed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "slot_taken"
  | "invalid_slot"
  | "too_soon"
  | "too_far"
  | "limit_reached"
  | "idempotency_conflict"
  | "not_found"
  | "not_active"
  | "stale"
  | "already_started"
  | "same_slot"
  | "not_started"
  | "change_window_closed"
  | "phone_required"
  | "invalid_method"
  | "calendar_unavailable";

/* Customers reach Drylake directly once online changes close (2 hours before the start). */
export const CHANGE_WINDOW_CLOSED_MESSAGE =
  "Online changes close 2 hours before your consultation. Please email hello@drylake.com.au or reply to your confirmation email and we will help.";

export const SLOT_TAKEN_MESSAGE = "This time has just been booked. Please choose another available time.";

const MESSAGES: Record<ConsultationOutcome, { status: number; message: string }> = {
  created: { status: 201, message: "Your consultation is booked." },
  replayed: { status: 200, message: "Your consultation is booked." },
  rescheduled: { status: 200, message: "Your consultation has been moved." },
  cancelled: { status: 200, message: "Your consultation has been cancelled." },
  completed: { status: 200, message: "Consultation marked as completed." },
  slot_taken: { status: 409, message: SLOT_TAKEN_MESSAGE },
  invalid_slot: { status: 400, message: "That time is not available. Consultations run Monday, Tuesday and Friday, 9:00 am to 5:00 pm Perth time." },
  too_soon: { status: 409, message: "That time is too close to book now. Please choose a later time." },
  too_far: { status: 400, message: "That date is too far ahead. Please choose a time within the next four weeks." },
  limit_reached: {
    status: 409,
    message: "You already have two upcoming consultations booked. Please manage an existing booking from your confirmation email.",
  },
  idempotency_conflict: { status: 409, message: "This request could not be completed. Please reload the page and try again." },
  not_found: { status: 404, message: "We could not find that appointment." },
  not_active: { status: 409, message: "This appointment has already been cancelled or completed." },
  stale: { status: 409, message: "This appointment was changed a moment ago. The latest details are shown below." },
  already_started: { status: 409, message: "This appointment has already started, so it can no longer be changed online." },
  same_slot: { status: 400, message: "That is already your appointment time. Please choose a different time." },
  not_started: { status: 409, message: "A consultation can only be marked completed once it has started." },
  change_window_closed: { status: 409, message: CHANGE_WINDOW_CLOSED_MESSAGE },
  phone_required: { status: 400, message: "Please enter the phone number we should call." },
  invalid_method: { status: 400, message: "Please choose Microsoft Teams or a phone call." },
  calendar_unavailable: {
    status: 503,
    message: "We couldn't confirm that time with our calendars just now. Nothing has been booked. Please try again in a minute.",
  },
};

export function describeOutcome(outcome: string): { status: number; message: string; known: boolean } {
  const entry = MESSAGES[outcome as ConsultationOutcome];
  return entry ? { ...entry, known: true } : { status: 500, message: "Something went wrong. Please try again.", known: false };
}

export const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set(["created", "replayed", "rescheduled", "cancelled", "completed"]);
