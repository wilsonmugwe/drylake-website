"use client";

import { Check, LoaderCircle, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import TurnstileWidget, { type TurnstileHandle } from "@/components/forms/TurnstileWidget";
import {
  COLLABORATION_ACTION,
  COLLABORATION_CATEGORIES,
  COLLABORATION_LIMITS,
  type ProjectOption,
} from "@/lib/collaboration/catalog";
import { FORM_MICROCOPY } from "@/lib/collaboration/copy";
import { CONTACT_EMAIL } from "@/lib/site";

type ApiBody = { success?: boolean; error?: string };
type Status = "idle" | "sending" | "success" | "error";

const TIMEOUT_MS = 20_000;

/*
 * Collaboration proposal form. The project options arrive as props from the server page, so an
 * owner-gated project never exists in this bundle. Success is shown only after the server answered
 * 2xx with { success: true }. A failed attempt spent the single-use security token, so the
 * widget is reset; typed answers stay in the form.
 */
export default function CollaborationForm({ projects }: { projects: ProjectOption[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [securityUnavailable, setSecurityUnavailable] = useState(false);
  const [summaryLength, setSummaryLength] = useState(0);
  const [consent, setConsent] = useState(false);

  const inFlight = useRef(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (status !== "success") return;
    const panel = successRef.current;
    if (!panel) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
    panel.focus({ preventScroll: true });
  }, [status]);

  const handleToken = useCallback((value: string) => {
    setToken(value);
    setSecurityUnavailable(false);
  }, []);
  const handleTokenCleared = useCallback(() => setToken(""), []);
  const handleUnavailable = useCallback(() => setSecurityUnavailable(true), []);

  function showError(message: string) {
    setStatus("error");
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    if (!token) {
      showError(
        securityUnavailable
          ? `The security check could not load. Please refresh the page, or email ${CONTACT_EMAIL} directly.`
          : "Please complete the security check above the button, then send again."
      );
      return;
    }

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") || ""),
      organisation: String(data.get("organisation") || ""),
      email: String(data.get("email") || ""),
      category: String(data.get("category") || ""),
      project: String(data.get("project") || ""),
      summary: String(data.get("summary") || ""),
      website: String(data.get("website") || ""),
      consent: data.get("consent") === "on",
      turnstileToken: token,
    };

    inFlight.current = true;
    setStatus("sending");
    setError("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch("/api/collaboration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let body = null as ApiBody | null;
      try {
        body = (await response.json()) as ApiBody;
      } catch {
        body = null; // A platform error page is a failure, never a success.
      }

      if (response.ok && body?.success === true) {
        setStatus("success");
        return;
      }

      turnstileRef.current?.reset();
      if (response.status === 403) {
        showError("The security check didn't go through. Please complete it again and resend.");
      } else if (response.status === 429) {
        showError("Too many attempts in a short time. Please wait a few minutes and try again.");
      } else if (typeof body?.error === "string" && body.error) {
        showError(body.error);
      } else {
        showError(`We couldn't send your proposal right now. Please try again, or email ${CONTACT_EMAIL} directly.`);
      }
    } catch {
      turnstileRef.current?.reset();
      showError("We couldn't reach Drylake. Please check your connection and try again.");
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="flex min-h-[380px] scroll-mt-[calc(var(--nav-h,72px)+16px)] flex-col justify-center border border-black/10 bg-[#f4f2ec] p-7 outline-none sm:p-10"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <Check aria-hidden="true" size={20} />
        </div>
        <p className="section-label mt-7 text-black/60">Proposal received</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em]">Thanks for getting in touch.</h2>
        <p className="mt-4 max-w-lg leading-7 text-black/65">{FORM_MICROCOPY.success}</p>
        <button
          type="button"
          onClick={() => {
            setToken("");
            setSummaryLength(0);
            setConsent(false);
            setStatus("idle");
          }}
          className="mt-8 w-fit border-b border-black pb-1 text-sm font-semibold"
        >
          Send another proposal
        </button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} aria-busy={sending} className="space-y-8" noValidate={false}>
      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Your name" name="name" required maxLength={COLLABORATION_LIMITS.name} autoComplete="name" />
        <Field label="Work email" name="email" type="email" required maxLength={COLLABORATION_LIMITS.email} autoComplete="email" />
      </div>

      <Field label="Organisation" name="organisation" required maxLength={COLLABORATION_LIMITS.organisation} autoComplete="organization" />

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="section-label text-black/60">Collaboration category</label>
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
          >
            <option value="" disabled>Select a category</option>
            {COLLABORATION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="project" className="section-label text-black/60">Project of interest</label>
          <select
            id="project"
            name="project"
            required
            defaultValue=""
            className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
          >
            <option value="" disabled>Select a project</option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="section-label text-black/60">Proposal summary</label>
        <textarea
          id="summary"
          name="summary"
          required
          minLength={COLLABORATION_LIMITS.summaryMin}
          maxLength={COLLABORATION_LIMITS.summary}
          rows={7}
          onChange={(event) => setSummaryLength(event.target.value.length)}
          aria-describedby="summary-help"
          placeholder="What would you like to do together, and why does it make sense for both sides?"
          className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-base leading-7 outline-none placeholder:text-black/40 focus:border-black"
        />
        <p id="summary-help" className="mt-3 text-xs leading-5 text-black/60">
          {summaryLength} of {COLLABORATION_LIMITS.summary} characters. Keep it short; we will ask for detail if we need it.
        </p>
      </div>

      <div>
        <label htmlFor="website" className="section-label text-black/60">Website (optional)</label>
        <input
          id="website"
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          maxLength={COLLABORATION_LIMITS.website}
          placeholder="example.com.au"
          className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none placeholder:text-black/40 focus:border-black"
        />
      </div>

      <div>
        {/* The native checkbox covers the whole card: one 44px+ target with native keyboard behaviour. */}
        <label
          className={`relative flex min-h-[44px] cursor-pointer items-start gap-3 border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
            consent ? "border-black bg-[#f4f2ec]" : "border-black/15 hover:border-black/40"
          }`}
        >
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center border ${consent ? "border-black bg-black text-white" : "border-black/40"}`}
          >
            {consent ? <Check size={11} /> : null}
          </span>
          <span className="text-sm leading-6 text-black/75">
            I have read the privacy policy and agree that Drylake may use these details to respond to this proposal.
          </span>
        </label>
        <p className="mt-2 text-xs leading-5 text-black/60">
          Read the{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-black">
            privacy policy
          </Link>{" "}
          before you send.
        </p>
      </div>

      {siteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          action={COLLABORATION_ACTION}
          onToken={handleToken}
          onTokenCleared={handleTokenCleared}
          onUnavailable={handleUnavailable}
        />
      ) : (
        <p className="text-sm text-red-700">
          This form is temporarily unavailable. Please email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
        </p>
      )}

      {status === "error" && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="flex items-start gap-2 border-l-2 border-red-700 pl-3 text-sm leading-6 text-red-700 outline-none"
        >
          <RotateCcw aria-hidden="true" size={14} className="mt-1 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-5 text-black/60" data-testid="collaboration-microcopy">
          {FORM_MICROCOPY.notFormal}
        </p>

        <button
          type="submit"
          disabled={sending || !siteKey}
          className="group flex w-full items-center justify-between rounded-full bg-black px-6 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
        >
          <span>{sending ? "Sending..." : "Send proposal"}</span>
          {sending ? (
            <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          ) : (
            <Send aria-hidden="true" size={17} className="transition-transform group-hover:translate-x-1" />
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="section-label text-black/60">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none focus:border-black"
      />
    </div>
  );
}
