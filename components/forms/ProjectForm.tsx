"use client";

import {
  Check,
  LoaderCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import TurnstileWidget, {
  type TurnstileHandle,
} from "@/components/forms/TurnstileWidget";
import { submitEnquiry } from "@/lib/contact/submit-enquiry";
import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

/*
 * Declarative WebMCP: lets a browser agent discover this form as a tool and fill it with the
 * user's consent. Attributes only; the form behaves exactly as before. Spread from typed
 * records because React's JSX types do not know these attributes yet.
 */
type ToolAttributes = Record<string, string>;

const FORM_TOOL: ToolAttributes = {
  toolname: "request_conversation",
  tooldescription: `Ask Drylake about a software, automation or integration problem. A person at Drylake replies within ${RESPONSE_TIME}.`,
};

function toolParam(description: string): ToolAttributes {
  return { toolparamdescription: description };
}

type Status = "idle" | "sending" | "success" | "error";

export default function ProjectForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [securityUnavailable, setSecurityUnavailable] = useState(false);

  // Synchronous guard: state updates are async, so a fast double click could otherwise
  // send two requests before the button re-renders as disabled.
  const inFlight = useRef(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  /*
   * The confirmation replaces a tall form, so after a send the visitor would otherwise be left
   * looking at whatever slid up under the viewport (on phones, the footer). Bring
   * "Thanks for reaching out" into view and move focus to it so screen readers announce it.
   * Instant under reduced motion; preventScroll on focus so the two calls never fight.
   */
  useEffect(() => {
    if (status !== "success") return;
    const panel = successRef.current;
    if (!panel) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
    panel.focus({ preventScroll: true });
  }, [status]);

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleToken = useCallback((value: string) => {
    setToken(value);
    setSecurityUnavailable(false);
  }, []);

  const handleTokenCleared = useCallback(() => setToken(""), []);

  const handleUnavailable = useCallback(() => {
    setSecurityUnavailable(true);
  }, []);

  function showError(message: string) {
    setStatus("error");
    setError(message);
    // Move focus to the message so keyboard and screen reader users hear it.
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (inFlight.current) {
      return;
    }

    if (!token) {
      showError(
        securityUnavailable
          ? `The security check could not load. Please refresh the page, or email ${CONTACT_EMAIL} directly.`
          : "Please complete the security check above the button, then send again."
      );
      return;
    }

    const formData = new FormData(event.currentTarget);

    /*
     * projectType is the area of the problem; helpType the kind of help wanted. (helpType was
     * sent as "budget" until 2026-10-08; the server still reads the old key from stale tabs.)
     */
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || ""),
      projectType: String(formData.get("projectType") || ""),
      helpType: String(formData.get("helpType") || ""),
      message: String(formData.get("message") || ""),
      turnstileToken: token,
    };

    inFlight.current = true;
    setStatus("sending");
    setError("");

    const result = await submitEnquiry(payload);

    inFlight.current = false;

    if (result.ok) {
      setStatus("success");
      return;
    }

    // The token was spent on this attempt (Turnstile tokens are single-use), so issue a new
    // challenge. The visitor's typed answers stay in the form: nothing is reset on failure.
    if (result.securityFailed) {
      turnstileRef.current?.reset();
    }

    showError(result.message);
  }

  /* =====================================================
     SUCCESS STATE
     Only reachable after the server confirmed { success: true }.
     ===================================================== */

  if (status === "success") {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="flex min-h-[440px] scroll-mt-[calc(var(--nav-h,72px)+16px)] outline-none flex-col justify-center border border-black/10 bg-[#f4f2ec] p-7 sm:p-10"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <Check size={20} />
        </div>

        <p className="section-label mt-7 text-black/60">
          Enquiry received
        </p>

        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Thanks for reaching out.
        </h2>

        <p className="mt-4 max-w-lg leading-7 text-black/60">
          Drylake has received your enquiry. A founder will review what
          you&apos;ve shared and reply within {RESPONSE_TIME}.
        </p>

        <button
          type="button"
          onClick={() => {
            setToken("");
            setStatus("idle");
          }}
          className="mt-8 w-fit border-b border-black pb-1 text-sm font-semibold"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form
      {...FORM_TOOL}
      onSubmit={handleSubmit}
      aria-busy={sending}
      className="space-y-8"
    >
      {/* Name + email */}
      <div className="grid gap-7 sm:grid-cols-2">
        <Field
          label="Your name"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Your name"
          toolParamDescription="The full name of the person asking."
        />

        <Field
          label="Work email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          placeholder="you@company.com"
          toolParamDescription="Work email address Drylake should reply to."
        />
      </div>

      {/* Company */}
      <Field
        label="Business / organisation"
        name="company"
        maxLength={160}
        autoComplete="organization"
        placeholder="Company name"
        toolParamDescription="Business or organisation name. Optional."
      />

      {/* Problem category */}
      <div>
        <label
          htmlFor="projectType"
          className="section-label text-black/60"
        >
          Where is the friction?
        </label>

        <select
          id="projectType"
          name="projectType"
          {...toolParam("Where the friction is, chosen from the listed options. Optional.")}
          defaultValue=""
          className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
        >
          <option value="" disabled>
            Select the closest option
          </option>
          <option value="Manual processes">Too much manual work</option>
          <option value="Disconnected systems">
            Our systems don&apos;t work well together
          </option>
          <option value="Existing software">
            We&apos;ve outgrown our current software
          </option>
          <option value="Customer experience">
            Customers should be able to do more online
          </option>
          <option value="Reporting and data">
            Reporting or data is difficult to manage
          </option>
          <option value="Website and digital">
            Website or digital presence
          </option>
          <option value="AI opportunity">
            We&apos;re exploring where AI could help
          </option>
          <option value="Other">Something else</option>
          <option value="Not sure">Not sure yet</option>
        </select>
      </div>

      {/* Engagement */}
      <div>
        <label
          htmlFor="helpType"
          className="section-label text-black/60"
        >
          What kind of help are you looking for?
        </label>

        <select
          id="helpType"
          name="helpType"
          {...toolParam("The kind of help wanted, chosen from the listed options. Optional.")}
          defaultValue=""
          className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
        >
          <option value="" disabled>
            Optional
          </option>
          <option value="Solve a specific problem">
            Solve a specific problem
          </option>
          <option value="Build a new system">Build a new system</option>
          <option value="Improve an existing system">
            Improve something we already use
          </option>
          <option value="Ongoing technical support">
            Ongoing technical work
          </option>
          <option value="Explore options">
            Help us work out what makes sense
          </option>
          <option value="Not sure">Not sure yet</option>
        </select>
      </div>

      {/* Main problem */}
      <div>
        <label
          htmlFor="message"
          className="section-label text-black/60"
        >
          Tell us what&apos;s happening
        </label>

        <textarea
          id="message"
          name="message"
          {...toolParam("What is happening today and what should work better, in plain language. 10 to 5000 characters.")}
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          placeholder="What happens today? What is taking too long, creating extra work or causing problems? What would you like to work better?"
          className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-base leading-7 outline-none placeholder:text-black/25 focus:border-black"
        />

        <p className="mt-3 text-xs leading-5 text-black/60">
          Don&apos;t worry about technical terminology. Describe
          the problem the way you would explain it to someone
          inside the business.
        </p>
      </div>

      {/* Security */}
      {turnstileSiteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onToken={handleToken}
          onTokenCleared={handleTokenCleared}
          onUnavailable={handleUnavailable}
        />
      ) : (
        <p className="text-sm text-red-700">
          The enquiry form is temporarily unavailable. Please email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      )}

      {/* Error: stays until the next attempt; typed answers are preserved */}
      {status === "error" && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="flex items-start gap-2 border-l-2 border-red-700 pl-3 text-sm leading-6 text-red-700 outline-none"
        >
          <RotateCcw size={14} className="mt-1 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Submit */}
      <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xs space-y-2 text-xs leading-5 text-black/60">
          <p>
            No technical specification required. Just give us
            enough context to understand where to start.
          </p>
          {/* APP 5 collection notice: said where the details are collected, not only in the policy. */}
          <p data-testid="enquiry-privacy-notice">
            We use these details to reply to your enquiry. See our{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-black">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || !turnstileSiteKey}
          className="group flex w-full items-center justify-between rounded-full bg-black px-6 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
        >
          <span>
            {sending ? "Sending..." : "Start the conversation"}
          </span>

          {sending ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Send
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          )}
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   REUSABLE TEXT FIELD
   ========================================================= */

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
  toolParamDescription?: string;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  maxLength,
  autoComplete,
  toolParamDescription,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="section-label text-black/60"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        {...(toolParamDescription ? toolParam(toolParamDescription) : {})}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none placeholder:text-black/25 focus:border-black"
      />
    </div>
  );
}
