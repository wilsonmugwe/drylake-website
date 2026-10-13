/*
 * Free consultation booking rules: the ONE TypeScript statement of when a consultation can be
 * booked. PURE (no env, no framework): the booking UI, the API routes and tests import it.
 *
 * The same rules are enforced again by the database (supabase/migrations/
 * 20261013120000_consultation_bookings.sql: CHECK constraint + consultation_create_booking),
 * so a bug here can show a wrong slot but can never store one. tests/consultation-rules.test.mjs
 * pins both statements to the same numbers.
 *
 * Every rule is evaluated in Perth wall-clock time, whatever the visitor's timezone.
 * Perth has had no daylight saving since 2009, but nothing here assumes a fixed offset.
 */

export const CONSULTATION_TIMEZONE = "Australia/Perth";
export const CONSULTATION_TIMEZONE_LABEL = "Perth time (AWST)";
export const CONSULTATION_MINUTES = 30;

/* ISO weekdays: 1 Monday, 2 Tuesday, 5 Friday. */
export const CONSULTATION_WEEKDAYS: readonly number[] = [1, 2, 5];

/* First start 09:00, last start 16:30 (ends 17:00), every 30 minutes. */
export const FIRST_START_MINUTES = 9 * 60;
export const LAST_START_MINUTES = 16 * 60 + 30;

/* Bookable from 2 hours ahead (founders see the notification first) to 28 days ahead. */
export const MIN_NOTICE_MINUTES = 120;
export const HORIZON_DAYS = 28;

/* Slot hoarding guard, mirrored by p_max_active in the database. */
export const MAX_UPCOMING_PER_EMAIL = 2;

/* Reminder 24h ahead, unless that moment is less than 2h after the change (short notice). */
export const REMINDER_LEAD_HOURS = 24;
export const REMINDER_MIN_GAP_MINUTES = 120;

export type PerthParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; isoWeekday: number };

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const partsFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: CONSULTATION_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

/** The Perth wall-clock reading of an instant. */
export function perthParts(instant: Date): PerthParts {
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(instant)) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    isoWeekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}

/** The instant at which Perth's clock reads the given date and time. */
export function perthToInstant(year: number, month: number, day: number, hour: number, minute: number): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Offset of Perth from UTC at (approximately) that moment; corrected once for safety.
  const offsetAt = (ms: number) => {
    const p = perthParts(new Date(ms));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
  };
  const first = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(first));
}

/** YYYY-MM-DD of the Perth calendar date an instant falls on. */
export function perthDateKey(instant: Date): string {
  const p = perthParts(instant);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export type SlotRuleResult = { ok: true } | { ok: false; reason: "invalid_slot" | "too_soon" | "too_far" };

/** Is this start time a bookable consultation slot at `now`? */
export function checkSlot(start: Date, now: Date): SlotRuleResult {
  if (Number.isNaN(start.getTime())) return { ok: false, reason: "invalid_slot" };

  const p = perthParts(start);
  const minutes = p.hour * 60 + p.minute;

  if (
    !CONSULTATION_WEEKDAYS.includes(p.isoWeekday) ||
    minutes < FIRST_START_MINUTES ||
    minutes > LAST_START_MINUTES ||
    p.minute % CONSULTATION_MINUTES !== 0 ||
    p.second !== 0 ||
    start.getUTCMilliseconds() !== 0
  ) {
    return { ok: false, reason: "invalid_slot" };
  }

  if (start.getTime() < now.getTime() + MIN_NOTICE_MINUTES * 60_000) return { ok: false, reason: "too_soon" };
  if (start.getTime() > now.getTime() + (HORIZON_DAYS + 1) * 86_400_000) return { ok: false, reason: "too_far" };

  return { ok: true };
}

export type DaySlots = { date: string; slots: string[] };

/*
 * Every bookable slot from now to the horizon, grouped by Perth date, minus the busy starts.
 * Slots are ISO instants (UTC). Days with no free slot are kept (empty) so the UI can show
 * "fully booked" rather than silently skipping a Monday.
 */
export function buildAvailability(now: Date, busyStarts: Iterable<string | Date>): DaySlots[] {
  const busy = new Set([...busyStarts].map((s) => new Date(s).getTime()));
  const today = perthParts(now);
  const days: DaySlots[] = [];

  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    // Noon avoids any date-boundary ambiguity while stepping days.
    const noon = perthToInstant(today.year, today.month, today.day + offset, 12, 0);
    const p = perthParts(noon);
    if (!CONSULTATION_WEEKDAYS.includes(p.isoWeekday)) continue;

    const slots: string[] = [];
    for (let m = FIRST_START_MINUTES; m <= LAST_START_MINUTES; m += CONSULTATION_MINUTES) {
      const start = perthToInstant(p.year, p.month, p.day, Math.floor(m / 60), m % 60);
      if (checkSlot(start, now).ok && !busy.has(start.getTime())) slots.push(start.toISOString());
    }

    const date = perthDateKey(noon);
    // Today with every slot already past or inside the notice period is not offered at all.
    if (slots.length > 0 || offset > 0) days.push({ date, slots });
  }

  return days;
}

/** Consultation end for a start (always +30 minutes). */
export function consultationEnd(start: Date): Date {
  return new Date(start.getTime() + CONSULTATION_MINUTES * 60_000);
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: CONSULTATION_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: CONSULTATION_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Monday 19 October 2026" in Perth. */
export function formatPerthDate(instant: Date): string {
  return dateFormatter.format(instant);
}

/** "9:30 am" in Perth (lower-case am/pm, normal space). */
export function formatPerthTime(instant: Date): string {
  return timeFormatter.format(instant).replace(/[\u202f\u00a0]/g, " ").toLowerCase();
}

/** "9:30 am to 10:00 am" */
export function formatPerthRange(start: Date): string {
  return `${formatPerthTime(start)} to ${formatPerthTime(consultationEnd(start))}`;
}
