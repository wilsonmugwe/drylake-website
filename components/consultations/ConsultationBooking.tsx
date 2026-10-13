"use client";

import { ArrowLeft, ArrowRight, CalendarCheck, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import SlotPicker from "@/components/consultations/SlotPicker";
import TurnstileWidget, { type TurnstileHandle } from "@/components/forms/TurnstileWidget";
import { CONSULTATION_ACTION } from "@/lib/contact/turnstile-action";
import { type BookingConfirmation, fetchAvailability, newIdempotencyKey, requestBooking } from "@/lib/consultations/client";
import {
  CONSULTATION_MINUTES,
  CONSULTATION_TIMEZONE_LABEL,
  type DaySlots,
  formatPerthDate,
  formatPerthRange,
} from "@/lib/consultations/rules";
import { CONTACT_EMAIL } from "@/lib/site";

/*
 * The public booking flow: choose a slot -> your details -> review and confirm -> confirmed.
 *
 * Safety properties (the server enforces all of them again):
 *   - one idempotency key per booking attempt, kept across retries, so a refresh, double click
 *     or network retry can never create a second appointment;
 *   - a synchronous in-flight guard plus a disabled button against double submission;
 *   - on "slot taken" the availability is reloaded and the visitor is sent back to choose again,
 *     with the exact message from the brief;
 *   - the Turnstile token is single use, so the widget is reset after every server round trip.
 * No account, no sign-in.
 */

type Step = "pick" | "details" | "review" | "done";

type Details = { name: string; email: string; phone: string; businessName: string; description: string };

const EMPTY: Details = { name: "", email: "", phone: "", businessName: "", description: "" };

const inputClass =
  "mt-2 w-full border-b border-black/15 bg-transparent py-3.5 text-base outline-none transition-colors placeholder:text-black/30 focus:border-black aria-[invalid=true]:border-red-700";

export default function ConsultationBooking() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [step, setStep] = useState<Step>("pick");
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(EMPTY);
  const [fieldError, setFieldError] = useState<{ field: keyof Details | null; message: string }>({ field: null, message: "" });
  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [token, setToken] = useState("");
  const [securityUnavailable, setSecurityUnavailable] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<BookingConfirmation["booking"] | null>(null);

  const idempotencyKey = useRef<string>("");
  const inFlight = useRef(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const applyAvailability = useCallback((result: Awaited<ReturnType<typeof fetchAvailability>>) => {
    if (result.ok) {
      setLoadError("");
      setDays(result.data.days);
      // Keep the visitor's choice only if it is still free.
      setStart((current) => (current && result.data.days.some((d) => d.slots.includes(current)) ? current : null));
    } else {
      setLoadError(result.message);
    }
  }, []);

  const load = useCallback(async () => applyAvailability(await fetchAvailability()), [applyAvailability]);

  // State is set only in the promise callback, never synchronously in the effect.
  useEffect(() => {
    let live = true;
    fetchAvailability().then((result) => {
      if (live) applyAvailability(result);
    });
    return () => {
      live = false;
    };
  }, [applyAvailability]);

  // Move focus to each step's heading so keyboard and screen-reader users follow the flow.
  // Not on first load: the page must open at its introduction, not scrolled to the picker.
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step]);

  const update = (key: keyof Details) => (event: { target: { value: string } }) => {
    setDetails((current) => ({ ...current, [key]: event.target.value }));
    if (fieldError.field === key) setFieldError({ field: null, message: "" });
  };

  function continueToDetails() {
    if (!start) return;
    setNotice("");
    setStep("details");
  }

  function continueToReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = details.name.trim();
    const email = details.email.trim();
    if (!name) return setFieldError({ field: "name", message: "Please enter your full name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFieldError({ field: "email", message: "Please enter a valid email address." });
    if (details.phone.trim() && !/^[0-9+()\-. ]{6,40}$/.test(details.phone.trim())) {
      return setFieldError({ field: "phone", message: "Please enter a valid phone number, or leave it blank." });
    }
    if (!details.description.trim()) {
      return setFieldError({ field: "description", message: "Please tell us a little about your business or project." });
    }
    setFieldError({ field: null, message: "" });
    setSubmitError("");
    setStep("review");
  }

  async function confirm() {
    if (inFlight.current || !start) return;
    if (!token) {
      setSubmitError("Please complete the security check above, then confirm.");
      return;
    }

    inFlight.current = true;
    setSending(true);
    setSubmitError("");
    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();

    const result = await requestBooking({
      idempotencyKey: idempotencyKey.current,
      start,
      name: details.name.trim(),
      email: details.email.trim(),
      phone: details.phone.trim(),
      businessName: details.businessName.trim(),
      description: details.description.trim(),
      turnstileToken: token,
    });

    // Single-use token: always request a fresh one after a round trip.
    turnstileRef.current?.reset();
    inFlight.current = false;
    setSending(false);

    if (result.ok) {
      setConfirmed(result.data.booking);
      setStep("done");
      return;
    }

    if (result.code === "slot_taken" || result.code === "too_soon" || result.code === "invalid_slot") {
      setNotice(result.message);
      setStart(null);
      await load();
      setStep("pick");
      return;
    }

    setSubmitError(result.message);
  }

  function bookAnother() {
    idempotencyKey.current = "";
    setConfirmed(null);
    setStart(null);
    setDate(null);
    setDetails(EMPTY);
    setStep("pick");
    void load();
  }

  const summary = start ? (
    <div className="border border-black/10 bg-[#f4f2ec] p-5 text-sm sm:p-6">
    <dl className="grid gap-3 sm:grid-cols-2">
      <div>
        <dt className="section-label text-black/60">Consultation</dt>
        <dd className="mt-1 font-semibold">Free {CONSULTATION_MINUTES}-minute consultation</dd>
      </div>
      <div>
        <dt className="section-label text-black/60">Date</dt>
        <dd className="mt-1 font-semibold">{formatPerthDate(new Date(start))}</dd>
      </div>
      <div>
        <dt className="section-label text-black/60">Time</dt>
        <dd className="mt-1 font-semibold">{formatPerthRange(new Date(start))}</dd>
      </div>
      <div>
        <dt className="section-label text-black/60">Timezone</dt>
        <dd className="mt-1 font-semibold">{CONSULTATION_TIMEZONE_LABEL}</dd>
      </div>
    </dl>
      <p className="mt-3 text-xs leading-5 text-black/60">No obligation to proceed. Any work is quoted before it begins.</p>
    </div>
  ) : null;

  if (step === "done" && confirmed) {
    const when = new Date(confirmed.start);
    return (
      <div className="border border-black/10 bg-[#f4f2ec] p-6 sm:p-10" data-testid="consultation-confirmed">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <CalendarCheck aria-hidden="true" size={20} />
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-3xl font-semibold tracking-[-0.05em] outline-none sm:text-4xl">
          You&apos;re booked in.
        </h2>
        <p className="mt-4 max-w-lg leading-7 text-black/65">
          Thanks, {details.name.trim().split(/\s+/)[0]}. Your free {CONSULTATION_MINUTES}-minute consultation is confirmed for{" "}
          <strong className="text-black">{formatPerthDate(when)}</strong>, {formatPerthRange(when)} ({CONSULTATION_TIMEZONE_LABEL}).
        </p>
        <p className="mt-3 text-sm leading-6 text-black/65">
          Booking reference <strong className="font-mono text-black">{confirmed.reference}</strong>. A confirmation email is on its way to{" "}
          <strong className="text-black">{details.email.trim()}</strong> with a link to reschedule or cancel.
        </p>
        <p className="mt-3 text-sm leading-6 text-black/65">
          No email within a few minutes? Check your spam folder, or write to{" "}
          <a className="underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and quote your reference.
        </p>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <Link href="/" className="border-b border-black pb-1">Back to the homepage</Link>
          <button type="button" onClick={bookAnother} className="border-b border-black/30 pb-1 text-black/70 hover:text-black">
            Book another time
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ol aria-label="Booking steps" className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-black/60">
        {(["pick", "details", "review"] as const).map((s, i) => (
          <li key={s} aria-current={step === s ? "step" : undefined} className={step === s ? "text-black" : undefined}>
            {String(i + 1).padStart(2, "0")} {s === "pick" ? "Time" : s === "details" ? "Your details" : "Confirm"}
          </li>
        ))}
      </ol>

      {step === "pick" && (
        <section aria-labelledby="consult-pick" className="space-y-6">
          <h2 id="consult-pick" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Choose a time
          </h2>
          {notice && (
            <p role="alert" className="flex items-start gap-2 border-l-2 border-red-700 pl-3 text-sm leading-6 text-red-700">
              <RotateCcw aria-hidden="true" size={14} className="mt-1 shrink-0" />
              {notice}
            </p>
          )}
          {loadError ? (
            <div role="alert" className="space-y-3 text-sm leading-6 text-black/70">
              <p>{loadError}</p>
              <button type="button" onClick={() => void load()} className="inline-flex min-h-[44px] items-center border-b border-black font-semibold">
                Try again
              </button>
            </div>
          ) : days === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-black/60">
              <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Loading available times
            </p>
          ) : (
            <SlotPicker
              days={days}
              date={date}
              start={start}
              onDateChange={(d) => {
                setDate(d);
                setStart(null);
              }}
              onStartChange={setStart}
            />
          )}
          <div className="flex justify-end border-t border-black/10 pt-5">
            <button type="button" onClick={continueToDetails} disabled={!start} className="consult-primary">
              Continue <ArrowRight aria-hidden="true" size={17} />
            </button>
          </div>
        </section>
      )}

      {step === "details" && (
        <form aria-labelledby="consult-details" noValidate onSubmit={continueToReview} className="space-y-6">
          <h2 id="consult-details" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Your details
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="consult-name" label="Full name" required error={fieldError.field === "name" ? fieldError.message : ""}>
              <input id="consult-name" name="name" autoComplete="name" maxLength={120} value={details.name} onChange={update("name")}
                aria-invalid={fieldError.field === "name"} aria-describedby={fieldError.field === "name" ? "consult-name-error" : undefined}
                aria-required="true" className={inputClass} />
            </Field>
            <Field id="consult-email" label="Email address" required error={fieldError.field === "email" ? fieldError.message : ""}>
              <input id="consult-email" name="email" type="email" autoComplete="email" maxLength={254} value={details.email} onChange={update("email")}
                aria-invalid={fieldError.field === "email"} aria-describedby={fieldError.field === "email" ? "consult-email-error" : undefined}
                aria-required="true" className={inputClass} />
            </Field>
            <Field id="consult-phone" label="Phone number (optional)" error={fieldError.field === "phone" ? fieldError.message : ""}>
              <input id="consult-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={details.phone} onChange={update("phone")}
                aria-invalid={fieldError.field === "phone"} aria-describedby={fieldError.field === "phone" ? "consult-phone-error" : undefined}
                className={inputClass} />
            </Field>
            <Field id="consult-business" label="Business name (optional)">
              <input id="consult-business" name="businessName" autoComplete="organization" maxLength={160} value={details.businessName}
                onChange={update("businessName")} className={inputClass} />
            </Field>
          </div>
          <Field id="consult-description" label="About your business or project" required error={fieldError.field === "description" ? fieldError.message : ""}>
            <textarea id="consult-description" name="description" rows={4} maxLength={2000} value={details.description} onChange={update("description")}
              aria-invalid={fieldError.field === "description"}
              aria-describedby={`consult-description-hint${fieldError.field === "description" ? " consult-description-error" : ""}`}
              aria-required="true" className={`${inputClass} resize-y leading-7`} />
            <p id="consult-description-hint" className="mt-2 text-xs leading-5 text-black/60">
              A sentence or two is enough: what the business does and what you would like to talk about.
            </p>
          </Field>
          <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setStep("pick")} className="consult-secondary">
              <ArrowLeft aria-hidden="true" size={16} /> Change time
            </button>
            <button type="submit" className="consult-primary">
              Review booking <ArrowRight aria-hidden="true" size={17} />
            </button>
          </div>
        </form>
      )}

      {step === "review" && (
        <section aria-labelledby="consult-review" className="space-y-6">
          <h2 id="consult-review" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-[-0.04em] outline-none">
            Check and confirm
          </h2>
          {summary}
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-black/60">Name</dt><dd className="font-medium">{details.name.trim()}</dd></div>
            <div><dt className="text-black/60">Email</dt><dd className="break-all font-medium">{details.email.trim()}</dd></div>
            {details.phone.trim() && <div><dt className="text-black/60">Phone</dt><dd className="font-medium">{details.phone.trim()}</dd></div>}
            {details.businessName.trim() && <div><dt className="text-black/60">Business</dt><dd className="font-medium">{details.businessName.trim()}</dd></div>}
          </dl>
          {siteKey ? (
            <TurnstileWidget
              ref={turnstileRef}
              siteKey={siteKey}
              action={CONSULTATION_ACTION}
              onToken={(value) => {
                setToken(value);
                setSecurityUnavailable(false);
              }}
              onTokenCleared={() => setToken("")}
              onUnavailable={() => setSecurityUnavailable(true)}
            />
          ) : null}
          {siteKey && !token && !securityUnavailable && (
            <p id="consult-security-wait" className="text-xs leading-5 text-black/60">
              Confirm becomes available once the security check above is complete.
            </p>
          )}
          {(securityUnavailable || !siteKey) && (
            <p className="text-sm text-red-700">
              The security check could not load. Please refresh the page, or email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a> and we will arrange a time.
            </p>
          )}
          {submitError && (
            <p role="alert" className="flex items-start gap-2 border-l-2 border-red-700 pl-3 text-sm leading-6 text-red-700">
              <RotateCcw aria-hidden="true" size={14} className="mt-1 shrink-0" />
              {submitError}
            </p>
          )}
          <p className="text-xs leading-5 text-black/60">
            We use your details only to arrange and hold this consultation. See our{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-black">Privacy Policy</Link>.
          </p>
          <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setStep("details")} disabled={sending} className="consult-secondary">
              <ArrowLeft aria-hidden="true" size={16} /> Edit details
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={sending || (Boolean(siteKey) && !token)}
              aria-busy={sending}
              aria-describedby={siteKey && !token ? "consult-security-wait" : undefined}
              className="consult-primary"
            >
              {sending ? (
                <>
                  <LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> Booking
                </>
              ) : (
                <>
                  Confirm free consultation <ArrowRight aria-hidden="true" size={17} />
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="section-label text-black/60">
        {label}
        {required && <span aria-hidden="true" className="text-[#b83f0c]"> *</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
