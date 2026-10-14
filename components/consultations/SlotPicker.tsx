"use client";

import { useId, useMemo } from "react";

import {
  CONSULTATION_TIMEZONE,
  CONSULTATION_TIMEZONE_LABEL,
  type DaySlots,
  formatPerthTime,
  perthToInstant,
} from "@/lib/consultations/rules";

/*
 * Date and time selection for a free consultation. Used by the public booking page, the
 * customer's manage page and the admin reschedule panel, so every surface offers exactly the
 * same slots (computed by the server from lib/consultations/rules.ts).
 *
 * Native radio groups (visually styled as buttons): arrow keys, focus and screen-reader
 * semantics come from the browser. Every label is Perth time and says so.
 */

const dayLabel = new Intl.DateTimeFormat("en-AU", { timeZone: CONSULTATION_TIMEZONE, weekday: "short" });
const dateLabel = new Intl.DateTimeFormat("en-AU", { timeZone: CONSULTATION_TIMEZONE, day: "numeric", month: "short" });
const longLabel = new Intl.DateTimeFormat("en-AU", { timeZone: CONSULTATION_TIMEZONE, weekday: "long", day: "numeric", month: "long" });

function noonOf(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return perthToInstant(y, m, d, 12, 0);
}

export type SlotPickerProps = {
  days: DaySlots[];
  date: string | null;
  start: string | null;
  onDateChange: (date: string) => void;
  onStartChange: (start: string) => void;
  /* A start to leave out (the appointment being moved). */
  excludeStart?: string | null;
  tone?: "public" | "admin";
};

export const NO_AVAILABILITY_MESSAGE =
  "No consultation times are currently available. You can still get in touch with Drylake, and we'll help you find a suitable time.";

export default function SlotPicker({ days, date, start, onDateChange, onStartChange, excludeStart, tone = "public" }: SlotPickerProps) {
  const id = useId();
  const visibleDays = useMemo(
    () => days.map((day) => ({ ...day, slots: day.slots.filter((slot) => slot !== excludeStart) })),
    [days, excludeStart]
  );
  const selectedDay = visibleDays.find((day) => day.date === date) ?? null;
  const admin = tone === "admin";

  if (visibleDays.every((day) => day.slots.length === 0)) {
    return (
      <p className="border-l-2 border-[#f26a2e] pl-3 text-sm leading-6 text-black/70" role="status">
        {NO_AVAILABILITY_MESSAGE}
      </p>
    );
  }

  return (
    <div className="space-y-7">
      <fieldset>
        <legend className={admin ? "text-sm font-semibold text-neutral-900" : "section-label text-black/60"}>
          1. Choose a date
        </legend>
        <p className="mt-1 text-xs leading-5 text-black/60">Monday, Tuesday and Friday. All times are {CONSULTATION_TIMEZONE_LABEL}.</p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2">
          {visibleDays.map((day) => {
            const full = day.slots.length === 0;
            const noon = noonOf(day.date);
            return (
              <label
                key={day.date}
                className={`consult-chip ${full ? "consult-chip-full" : ""}`}
                data-selected={date === day.date || undefined}
              >
                <input
                  type="radio"
                  name={`${id}-date`}
                  value={day.date}
                  checked={date === day.date}
                  disabled={full}
                  onChange={() => onDateChange(day.date)}
                  className="consult-radio"
                  aria-label={`${longLabel.format(noon)}${full ? ", fully booked" : `, ${day.slots.length} times available`}`}
                />
                <span aria-hidden="true" className="text-[0.68rem] uppercase tracking-[0.1em]">{dayLabel.format(noon)}</span>
                <span aria-hidden="true" className="text-sm font-semibold">{dateLabel.format(noon)}</span>
                <span aria-hidden="true" className="text-[0.62rem] leading-4">{full ? "Booked" : `${day.slots.length} free`}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={!selectedDay}>
        <legend className={admin ? "text-sm font-semibold text-neutral-900" : "section-label text-black/60"}>
          2. Choose a time
        </legend>
        {selectedDay ? (
          <>
            <p className="mt-1 text-xs leading-5 text-black/60">
              {longLabel.format(noonOf(selectedDay.date))}, 30 minutes, {CONSULTATION_TIMEZONE_LABEL}.
            </p>
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-2">
              {selectedDay.slots.map((slot) => (
                <label key={slot} className="consult-chip consult-chip-time" data-selected={start === slot || undefined}>
                  <input
                    type="radio"
                    name={`${id}-time`}
                    value={slot}
                    checked={start === slot}
                    onChange={() => onStartChange(slot)}
                    className="consult-radio"
                  />
                  <span className="text-sm font-semibold">{formatPerthTime(new Date(slot))}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs leading-5 text-black/60">Choose a date first to see the available times.</p>
        )}
      </fieldset>
    </div>
  );
}
