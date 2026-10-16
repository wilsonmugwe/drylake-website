"use client";

import { Check, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { DISPLAY_CHOICES, REVIEW_LIMITS } from "@/lib/reviews/catalog";
import { CONTACT_EMAIL } from "@/lib/site";

type Phase =
  | { name: "loading" }
  | { name: "closed"; message: string }
  | { name: "open"; recipientName: string | null; organisationName: string | null }
  | { name: "sending"; recipientName: string | null; organisationName: string | null }
  | { name: "done"; message: string };

const TOKEN_FROM_HASH = /^#t=([A-Za-z0-9_-]{43})$/;
const RATINGS = [1, 2, 3, 4, 5] as const;

async function post(body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> | null }> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = null; // A platform error page is a failure, never a success.
    }
    return { status: response.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

/*
 * First-party feedback form. The single-use token lives in the URL fragment (never sent to a
 * server, logs or analytics); it is read once, held in memory, and removed from the address bar.
 * Publication needs its own explicit tick, separate from sending feedback, and the wording says so.
 * A rating is optional. Nothing here nudges toward a high rating or a positive comment.
 */
export default function FeedbackForm({ platform }: { platform: { href: string; host: string } | null }) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [error, setError] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [publish, setPublish] = useState(false);
  const [choice, setChoice] = useState<string>("name_and_organisation");
  const token = useRef("");
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // The fragment exists only in the browser, so it is read after mount, never during render.
      await Promise.resolve();
      if (cancelled) return;

      const match = TOKEN_FROM_HASH.exec(window.location.hash);
      if (!match) {
        setPhase({ name: "closed", message: "We could not find this feedback link. Please use the link in your email, or email us." });
        return;
      }
      token.current = match[1];
      window.history.replaceState(null, "", window.location.pathname);

      const { data } = await post({ action: "lookup", token: token.current });
      if (cancelled) return;

      if (data && data.success === true && data.state === "open") {
        setPhase({
          name: "open",
          recipientName: typeof data.recipientName === "string" ? data.recipientName : null,
          organisationName: typeof data.organisationName === "string" ? data.organisationName : null,
        });
      } else {
        setPhase({
          name: "closed",
          message: typeof data?.message === "string" ? data.message : `We could not load this form. Please try again, or email ${CONTACT_EMAIL}.`,
        });
      }
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase.name === "done") doneRef.current?.focus({ preventScroll: false });
  }, [phase.name]);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || phase.name !== "open") return;

    const comments = String(new FormData(event.currentTarget).get("comments") || "");
    if (rating === null && comments.trim() === "") {
      showError("Please add a rating or a comment before sending.");
      return;
    }
    if (publish && comments.trim() === "") {
      showError("To publish a testimonial, please write a comment.");
      return;
    }

    const open = phase;
    inFlight.current = true;
    setError("");
    setPhase({ name: "sending", recipientName: open.recipientName, organisationName: open.organisationName });

    const { status, data } = await post({
      action: "submit",
      token: token.current,
      rating,
      comments,
      publishConsent: publish,
      displayChoice: publish ? choice : null,
    });
    inFlight.current = false;

    if (status >= 200 && status < 300 && data?.success === true) {
      setPhase({ name: "done", message: typeof data.message === "string" ? data.message : "Thank you. Your feedback has been received." });
      return;
    }

    // A used, expired or withdrawn link cannot be fixed by retrying: say so. Anything else keeps the form.
    if (data?.outcome === "already_submitted" || data?.outcome === "expired" || data?.outcome === "withdrawn" || data?.outcome === "invalid") {
      setPhase({ name: "closed", message: typeof data.error === "string" ? data.error : "This link can no longer be used." });
      return;
    }

    setPhase(open);
    showError(typeof data?.error === "string" ? data.error : `We couldn't save your feedback. Please try again, or email ${CONTACT_EMAIL}.`);
  }

  if (phase.name === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-black/70">
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Loading your feedback form...
      </p>
    );
  }

  if (phase.name === "closed") {
    return (
      <div role="status" className="border border-black/10 bg-[#f4f2ec] p-6 sm:p-8">
        <p className="text-base leading-7 text-black/75">{phase.message}</p>
        <p className="mt-3 text-sm text-black/70">
          Questions? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    );
  }

  if (phase.name === "done") {
    return (
      <div ref={doneRef} role="status" tabIndex={-1} className="border border-black/10 bg-[#f4f2ec] p-7 outline-none sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <Check aria-hidden="true" size={20} />
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em]">Thank you.</h2>
        <p className="mt-3 max-w-lg leading-7 text-black/70">{phase.message}</p>
        {platform ? (
          <p className="mt-4 max-w-lg text-sm leading-6 text-black/70">
            If you would like to, you can also leave a public review on{" "}
            <a className="underline" href={platform.href} target="_blank" rel="noopener noreferrer">
              {platform.host}
            </a>
            . There is no obligation.
          </p>
        ) : null}
      </div>
    );
  }

  const sending = phase.name === "sending";
  const who = phase.recipientName;
  const org = phase.organisationName;
  const preview: Record<string, string> = {
    name_and_organisation: [who, org].filter(Boolean).join(", ") || "Your name and organisation",
    first_name_and_organisation: [who?.split(/\s+/)[0], org].filter(Boolean).join(", ") || "Your first name and organisation",
    organisation_only: org || "Your organisation",
    anonymous: "A Drylake client",
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={sending} className="space-y-8">
      <fieldset>
        <legend className="section-label text-black/60">How would you rate working with Drylake? (optional)</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {RATINGS.map((value) => (
            <label
              key={value}
              className={`relative flex min-h-[46px] min-w-[46px] cursor-pointer items-center justify-center border px-4 text-base font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                rating === value ? "border-black bg-black text-white" : "border-black/20 hover:border-black/50"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span aria-hidden="true">{value}</span>
              <span className="sr-only">{value} out of 5</span>
            </label>
          ))}
          {rating !== null ? (
            <button type="button" onClick={() => setRating(null)} className="min-h-[44px] px-3 text-sm underline">
              Clear rating
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-5 text-black/60">1 is poor, 5 is excellent. Leave it blank if you prefer to write.</p>
      </fieldset>

      <div>
        <label htmlFor="comments" className="section-label text-black/60">Your comments</label>
        <textarea
          id="comments"
          name="comments"
          rows={7}
          maxLength={REVIEW_LIMITS.comments}
          placeholder="What worked, what did not, and what we should do differently."
          className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-base leading-7 outline-none placeholder:text-black/45 focus:border-black"
        />
        <p className="mt-2 text-xs leading-5 text-black/60">
          We read everything, including the critical parts. Only Drylake sees this unless you choose to let us publish it below.
        </p>
      </div>

      <div className="border-t border-black/10 pt-6">
        <label
          className={`relative flex min-h-[44px] cursor-pointer items-start gap-3 border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
            publish ? "border-black bg-[#f4f2ec]" : "border-black/15 hover:border-black/40"
          }`}
        >
          <input
            type="checkbox"
            name="publish"
            checked={publish}
            onChange={(event) => setPublish(event.target.checked)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center border ${publish ? "border-black bg-black text-white" : "border-black/40"}`}
          >
            {publish ? <Check size={11} /> : null}
          </span>
          <span className="text-sm leading-6 text-black/75">
            You may publish my comments on the Drylake website as a testimonial. This is separate from sending feedback, it is optional, and Drylake reviews it first.
          </span>
        </label>

        {publish ? (
          <fieldset className="mt-5">
            <legend className="section-label text-black/60">How should it be credited?</legend>
            <div className="mt-3 grid gap-2">
              {DISPLAY_CHOICES.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex min-h-[44px] cursor-pointer items-start gap-3 border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                    choice === option.value ? "border-black bg-[#f4f2ec]" : "border-black/15 hover:border-black/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="displayChoice"
                    value={option.value}
                    checked={choice === option.value}
                    onChange={() => setChoice(option.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${choice === option.value ? "border-black" : "border-black/40"}`}
                  >
                    {choice === option.value ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
                  </span>
                  <span className="text-sm leading-6">
                    <span className="block font-medium text-black/85">{option.label}</span>
                    <span className="block text-black/60">Shown as: {preview[option.value]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      {error ? (
        <p ref={errorRef} role="alert" tabIndex={-1} className="flex items-start gap-2 border-l-2 border-red-700 pl-3 text-sm leading-6 text-red-700 outline-none">
          <RotateCcw aria-hidden="true" size={14} className="mt-1 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="group flex w-full items-center justify-between rounded-full bg-black px-6 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
      >
        <span>{sending ? "Sending..." : "Send feedback"}</span>
        {sending ? (
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
        ) : (
          <Send aria-hidden="true" size={17} className="transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </form>
  );
}
