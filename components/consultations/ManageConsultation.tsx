"use client";

import { CalendarClock, CalendarX, LoaderCircle, Phone, RotateCcw, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import SlotPicker from "@/components/consultations/SlotPicker";
import { type ManagedBooking, fetchAvailability, manageBooking } from "@/lib/consultations/client";
import {
  CONSULTATION_MINUTES,
  CONSULTATION_TIMEZONE_LABEL,
  type DaySlots,
  formatPerthDate,
  formatPerthRange,
} from "@/lib/consultations/rules";
import { CONTACT_EMAIL } from "@/lib/site";

/*
 * Customer appointment management, opened from the link in a Drylake email.
 *
 * The token lives in the URL fragment (#t=...), read here and sent only in POST bodies, so it
 * never reaches a server log, analytics or a Referer header. It opens exactly one booking.
 * Every change goes through a confirmation screen; the buttons disable while a request is in
 * flight; the server re-checks the version, so a second tab cannot overwrite a newer change.
 * After a reschedule the server issues a new link (older links stop working); the fragment is
 * updated in place so this page keeps working.
 */

type Mode = "view" | "reschedule" | "confirm-reschedule" | "confirm-cancel";

const STATUS_TEXT: Record<ManagedBooking["status"], string> = {
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Confirmed (rescheduled)",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function readToken(): string {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("t") ?? "";
}

export default function ManageConsultation() {
  const [token, setToken] = useState<string | null>(null);
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // State is set only in the promise callback, never synchronously in the effect.
  useEffect(() => {
    let live = true;
    const value = readToken();
    (value ? manageBooking({ token: value, action: "view" }) : Promise.resolve(null)).then((result) => {
      if (!live) return;
      setToken(value);
      if (!result) {
        setLoadError("This page needs the appointment link from your Drylake email. Please open the link in your most recent email.");
      } else if (result.ok && result.data.booking) {
        setBooking(result.data.booking);
      } else {
        setLoadError(result.ok ? "We could not find that appointment." : result.message);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  // A newer email link pasted into this tab only changes the fragment: start again from it.
  // (replaceState after a reschedule does not fire hashchange, so this never loops.)
  useEffect(() => {
    const onHashChange = () => window.location.reload();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (mode !== "view") headingRef.current?.focus();
  }, [mode]);

  // After an action the button that had focus is gone: move focus to the outcome so keyboard
  // and screen-reader users land on it instead of the top of the page.
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  async function startReschedule() {
    setMessage(null);
    setMode("reschedule");
    setDays(null);
    const result = await fetchAvailability();
    if (result.ok) setDays(result.data.days);
    else setMessage({ tone: "error", text: result.message });
  }

  async function submit(action: "cancel" | "reschedule") {
    if (inFlight.current || !booking || !token) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);

    const result = await manageBooking({ token, action, version: booking.version, ...(action === "reschedule" && start ? { newStart: start } : {}) });

    inFlight.current = false;
    setBusy(false);

    if (result.ok) {
      if (result.data.token) {
        setToken(result.data.token);
        // Replace the revoked link in the address bar (no navigation, no history entry).
        window.history.replaceState(null, "", `${window.location.pathname}#t=${result.data.token}`);
      }
      if (result.data.booking) setBooking(result.data.booking);
      setMode("view");
      setStart(null);
      setDate(null);
      setMessage({
        tone: "ok",
        text:
          action === "cancel"
            ? "Your consultation has been cancelled. We have emailed you a confirmation."
            : "Your consultation has been moved. We have emailed you the new details.",
      });
      return;
    }

    // Refresh to the latest server state whenever the server sent one back.
    const latest = result.data?.booking;
    if (latest) setBooking(latest);

    if (result.code === "slot_taken" || result.code === "too_soon") {
      setStart(null);
      setMode("reschedule");
      const fresh = await fetchAvailability();
      if (fresh.ok) setDays(fresh.data.days);
    } else {
      setMode("view");
    }
    setMessage({ tone: "error", text: result.message });
  }

  if (loadError) {
    return (
      <div role="alert" className="border border-black/10 bg-[#f4f2ec] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">We couldn&apos;t open this appointment.</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-black/65">{loadError}</p>
        <p className="mt-3 max-w-lg text-sm leading-6 text-black/65">
          Need help? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your booking reference.
        </p>
        <Link href="/consultation" className="mt-6 inline-block border-b border-black pb-1 text-sm font-semibold">
          Book a new consultation
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-black/60">
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Loading your appointment
      </p>
    );
  }

  const when = new Date(booking.start);

  return (
    <div className="space-y-6">
      {message && (
        <p
          ref={messageRef}
          tabIndex={-1}
          role={message.tone === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 border-l-2 pl-3 text-sm leading-6 outline-none ${message.tone === "error" ? "border-red-700 text-red-700" : "border-[#2f6b3a] text-[#2f6b3a]"}`}
        >
          {message.tone === "error" && <RotateCcw aria-hidden="true" size={14} className="mt-1 shrink-0" />}
          {message.text}
        </p>
      )}

      <div className="border border-black/10 bg-[#f4f2ec] p-5 text-sm sm:p-6">
      <dl className="grid gap-4 sm:grid-cols-2" aria-label="Your appointment">
        <div>
          <dt className="section-label text-black/60">Status</dt>
          <dd className="mt-1 font-semibold" data-testid="manage-status">{STATUS_TEXT[booking.status]}</dd>
        </div>
        <div>
          <dt className="section-label text-black/60">Reference</dt>
          <dd className="mt-1 font-mono font-semibold">{booking.reference}</dd>
        </div>
        <div>
          <dt className="section-label text-black/60">Date</dt>
          <dd className="mt-1 font-semibold">{formatPerthDate(when)}</dd>
        </div>
        <div>
          <dt className="section-label text-black/60">Time</dt>
          <dd className="mt-1 font-semibold">{formatPerthRange(when)} ({CONSULTATION_TIMEZONE_LABEL})</dd>
        </div>
        <div>
          <dt className="section-label text-black/60">How we will meet</dt>
          <dd className="mt-1 font-semibold" data-testid="manage-method">
            {booking.method === "PHONE" ? "Phone call" : "Microsoft Teams video call"}
          </dd>
        </div>
        <div>
          <dt className="section-label text-black/60">With</dt>
          <dd className="mt-1 font-semibold">{booking.representative}</dd>
        </div>
      </dl>
        <p className="mt-4 text-xs leading-5 text-black/60">
          Free {CONSULTATION_MINUTES}-minute consultation for {booking.name}. No obligation to proceed.
        </p>
      </div>

      {(booking.status === "CONFIRMED" || booking.status === "RESCHEDULED") && (
        <div className="flex items-start gap-3 border-l-2 border-black/20 pl-3 text-sm leading-6 text-black/70" data-testid="manage-instructions">
          {booking.method === "PHONE" ? (
            <>
              <Phone aria-hidden="true" size={16} className="mt-1 shrink-0" />
              <p>We will call you on <strong className="text-black">{booking.phone}</strong> at the appointment time.</p>
            </>
          ) : (
            <>
              <Video aria-hidden="true" size={16} className="mt-1 shrink-0" />
              {booking.joinUrl ? (
                <p>
                  Join at the appointment time:{" "}
                  <a href={booking.joinUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                    Join Microsoft Teams meeting
                  </a>
                </p>
              ) : (
                <p>Your Microsoft Teams link is in your confirmation email and calendar invitation from Drylake.</p>
              )}
            </>
          )}
        </div>
      )}

      {booking.status === "CANCELLED" && (
        <p className="text-sm leading-6 text-black/65">
          {booking.cancelledByDrylake ? "Drylake cancelled this consultation." : "This consultation is cancelled."} You are welcome to{" "}
          <Link href="/consultation" className="underline underline-offset-2">book a new time</Link>.
        </p>
      )}

      {!booking.canChange && booking.status !== "CANCELLED" && (
        <p className="text-sm leading-6 text-black/65" data-testid="manage-locked">
          {booking.changeWindowClosed
            ? "Online changes close 2 hours before your consultation. To change or cancel now, please email "
            : "This appointment can no longer be changed online. Need help? Email "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {booking.changeWindowClosed ? " or reply to your confirmation email, and we will help." : "."}
        </p>
      )}

      {booking.canChange && mode === "view" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => void startReschedule()} className="consult-primary">
            <CalendarClock aria-hidden="true" size={17} /> Reschedule
          </button>
          <button type="button" onClick={() => { setMessage(null); setMode("confirm-cancel"); }} className="consult-secondary consult-danger">
            <CalendarX aria-hidden="true" size={17} /> Cancel consultation
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <section aria-labelledby="manage-reschedule" className="space-y-5 border-t border-black/10 pt-6">
          <h2 id="manage-reschedule" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Choose a new time
          </h2>
          {days === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-black/60">
              <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Loading available times
            </p>
          ) : (
            <SlotPicker days={days} date={date} start={start} excludeStart={booking.start}
              onDateChange={(d) => { setDate(d); setStart(null); }} onStartChange={setStart} />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setMode("view")} className="consult-secondary">Keep my current time</button>
            <button type="button" disabled={!start} onClick={() => setMode("confirm-reschedule")} className="consult-primary">
              Review new time
            </button>
          </div>
        </section>
      )}

      {mode === "confirm-reschedule" && start && (
        <section aria-labelledby="manage-confirm-move" className="space-y-5 border-t border-black/10 pt-6">
          <h2 id="manage-confirm-move" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Move your consultation?
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-black/60">From</dt>
              <dd className="font-medium">{formatPerthDate(when)}, {formatPerthRange(when)}</dd>
            </div>
            <div>
              <dt className="text-black/60">To</dt>
              <dd className="font-semibold">{formatPerthDate(new Date(start))}, {formatPerthRange(new Date(start))}</dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-black/60">All times are {CONSULTATION_TIMEZONE_LABEL}. If the new time is taken before you confirm, your current appointment stays as it is.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" disabled={busy} onClick={() => setMode("reschedule")} className="consult-secondary">Choose a different time</button>
            <button type="button" disabled={busy} aria-busy={busy} onClick={() => void submit("reschedule")} className="consult-primary">
              {busy ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Saving</> : "Yes, move my consultation"}
            </button>
          </div>
        </section>
      )}

      {mode === "confirm-cancel" && (
        <section aria-labelledby="manage-confirm-cancel" className="space-y-5 border-t border-black/10 pt-6">
          <h2 id="manage-confirm-cancel" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Cancel your consultation?
          </h2>
          <p className="text-sm leading-6 text-black/65">
            Your consultation on {formatPerthDate(when)} at {formatPerthRange(when)} will be cancelled and the time released.
            You can book again at any time.
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" disabled={busy} onClick={() => setMode("view")} className="consult-secondary">Keep my consultation</button>
            <button type="button" disabled={busy} aria-busy={busy} onClick={() => void submit("cancel")} className="consult-primary consult-primary-danger">
              {busy ? <><LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Cancelling</> : "Yes, cancel it"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
