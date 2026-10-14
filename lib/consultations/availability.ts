/*
 * Which representatives are free for a consultation slot, from Drylake's own bookings plus
 * (when connected) their Microsoft 365 calendars. PURE (tests/consultation-m365.test.mjs).
 *
 * A slot is offered when AT LEAST ONE representative is free in both sources. A representative
 * whose calendar could not be read is treated as busy (fail safe), and the database's
 * per-representative exclusion constraint is the final word on Drylake bookings.
 */

import type { BusyMap } from "./calendar/types.ts";
import type { Representative, RepresentativeKey } from "./representatives.ts";
import { CONSULTATION_MINUTES } from "./rules.ts";

export type DbBusyRow = { start_time: string; representative: string };

export type FreeChecker = (start: Date) => RepresentativeKey[];

/**
 * Returns a function giving the representatives free at a slot start, in roster order.
 * `calendarBusy` null = no calendar connected (Drylake bookings only).
 */
export function freeRepresentativeChecker(
  representatives: readonly Representative[],
  dbBusy: readonly DbBusyRow[],
  calendarBusy: BusyMap | null
): FreeChecker {
  const booked = new Set(dbBusy.map((row) => `${row.representative}|${new Date(row.start_time).getTime()}`));
  const slotMs = CONSULTATION_MINUTES * 60_000;

  return (start: Date) => {
    const from = start.getTime();
    const to = from + slotMs;
    return representatives
      .filter((rep) => {
        if (booked.has(`${rep.key}|${from}`)) return false;
        if (!calendarBusy) return true;
        const intervals = calendarBusy.get(rep.email.toLowerCase());
        if (!intervals) return false;
        return !intervals.some((busy) => busy.start < to && busy.end > from);
      })
      .map((rep) => rep.key);
  };
}
