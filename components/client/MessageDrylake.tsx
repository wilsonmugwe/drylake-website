"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Check,
  LifeBuoy,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import TurnstileWidget, {
  type TurnstileHandle,
} from "@/components/forms/TurnstileWidget";
import { submitEnquiry } from "@/lib/contact/submit-enquiry";
import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

/*
 * "Start a conversation" for signed-in clients: the portal's only support action. It
 * replaces every mailto: link so a message is sent from inside the portal and no email
 * application (Outlook, Gmail, Apple Mail) is ever opened.
 *
 * Contract: it reuses the public contact pipeline unchanged. The message posts to
 * /api/contact through submitEnquiry() with a Turnstile token (same action, same
 * single-use replay protection, same Resend delivery to the Drylake inbox). Field
 * mapping keeps the API's existing names: company = the client's organisation,
 * projectType = "Client portal: <topic>" so the inbox shows where it came from.
 * Success is shown ONLY after the server confirms delivery.
 */

type Variant = "card" | "header" | "cta";

/* The portal's one support action label; every contact entry point uses it. */
export const START_CONVERSATION = "Start a conversation";

type MessageDrylakeProps = {
  variant: Variant;
  organizationName?: string | null;
};

type Status = "idle" | "sending" | "success" | "error";

const TOPICS = [
  "My project",
  "An invoice or payment",
  "Access for a colleague",
  "Something else",
] as const;

const MESSAGE_MAX = 5000;

const FIELD_CLASS =
  "mt-2 min-h-11 w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#f26a2e] focus:ring-2 focus:ring-[#f26a2e]/25 disabled:opacity-60";

export default function MessageDrylake({
  variant,
  organizationName,
}: MessageDrylakeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function openDialog() {
    setOpen(true);
  }

  // Open/close the native modal after render so the form is mounted first.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      {variant === "card" || variant === "cta" ? (
        <button
          type="button"
          onClick={openDialog}
          className={
            variant === "card"
              ? "button-light group mt-5 flex min-h-[48px] w-full items-center justify-between gap-4 bg-white px-5 text-sm font-semibold"
              : "button-light group flex min-h-[50px] items-center justify-between gap-4 bg-white px-5 text-sm font-semibold sm:w-fit sm:min-w-[240px] sm:px-6"
          }
        >
          <span className="flex items-center gap-2.5">
            <MessageSquare aria-hidden="true" size={16} />
            {START_CONVERSATION}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            size={16}
            className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex min-h-[44px] items-center gap-2 px-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
        >
          <LifeBuoy aria-hidden="true" size={16} />
          <span className="whitespace-nowrap">{START_CONVERSATION}</span>
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="message-drylake-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Click on the backdrop (the dialog element itself) closes it.
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg border border-white/10 bg-[#0b0b0a] p-0 text-white shadow-2xl backdrop:bg-black/70"
      >
        {open ? (
          <MessageForm
            organizationName={organizationName}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </dialog>
    </>
  );
}

function MessageForm({
  organizationName,
  onClose,
}: {
  organizationName?: string | null;
  onClose: () => void;
}) {
  const { user, isLoaded } = useUser();
  const { organization } = useOrganization();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [securityUnavailable, setSecurityUnavailable] = useState(false);

  const inFlight = useRef(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const defaultName = user?.fullName ?? "";
  const defaultEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const company = organizationName || organization?.name || "";

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

    if (inFlight.current) {
      return;
    }

    if (!token) {
      showError(
        securityUnavailable
          ? `The security check could not load. Please refresh the page, or email ${CONTACT_EMAIL}.`
          : "Please complete the security check, then send again."
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const topic = String(formData.get("topic") || TOPICS[0]);

    inFlight.current = true;
    setStatus("sending");
    setError("");

    const result = await submitEnquiry({
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company,
      projectType: `Client portal: ${topic}`,
      budget: "",
      message: String(formData.get("message") || ""),
      turnstileToken: token,
    });

    inFlight.current = false;

    if (result.ok) {
      setStatus("success");
      return;
    }

    // The single-use token was spent; issue a fresh challenge. Typed text is kept.
    if (result.securityFailed) {
      turnstileRef.current?.reset();
    }

    showError(result.message);
  }

  const sending = status === "sending";

  // Wait for Clerk so the name and email prefill is in place before the inputs mount.
  if (!isLoaded) {
    return (
      <div className="flex min-h-48 items-center justify-center p-8 text-white/60">
        <LoaderCircle size={20} className="animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div role="status" className="p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
          <Check size={20} aria-hidden="true" />
        </div>

        <h2 id="message-drylake-title" className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
          Message sent
        </h2>

        <p className="mt-3 text-sm leading-6 text-white/65">
          The Drylake team has your message and will reply by email within{" "}
          {RESPONSE_TIME}.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="button-light mt-7 inline-flex min-h-[44px] items-center justify-center bg-white px-6 text-sm font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="tech-label text-white/50">Support</p>
          <h2
            id="message-drylake-title"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
          >
            {START_CONVERSATION}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Sent straight to the Drylake team. We reply by email within{" "}
            {RESPONSE_TIME}.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="md-name" className="text-sm font-medium text-white/85">
            Your name
          </label>
          <input
            id="md-name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            defaultValue={defaultName}
            disabled={sending}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="md-email" className="text-sm font-medium text-white/85">
            Reply to
          </label>
          <input
            id="md-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            defaultValue={defaultEmail}
            disabled={sending}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="md-topic" className="text-sm font-medium text-white/85">
          About
        </label>
        <select
          id="md-topic"
          name="topic"
          defaultValue={TOPICS[0]}
          disabled={sending}
          className={FIELD_CLASS}
        >
          {TOPICS.map((topic) => (
            <option key={topic} value={topic} className="bg-[#0b0b0a]">
              {topic}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="md-message" className="text-sm font-medium text-white/85">
          Message
        </label>
        <textarea
          id="md-message"
          name="message"
          required
          rows={5}
          maxLength={MESSAGE_MAX}
          disabled={sending}
          placeholder="How can we help?"
          className={`${FIELD_CLASS} resize-y`}
        />
      </div>

      <div className="mt-5">
        {siteKey ? (
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={siteKey}
            onToken={handleToken}
            onTokenCleared={handleTokenCleared}
            onUnavailable={handleUnavailable}
          />
        ) : (
          <p className="text-sm text-red-300">
            Messaging is temporarily unavailable. Please email {CONTACT_EMAIL}.
          </p>
        )}
      </div>

      {status === "error" ? (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="mt-4 flex items-start gap-2 border-l-2 border-red-400 pl-3 text-sm leading-6 text-red-300 outline-none"
        >
          <RotateCcw size={14} className="mt-1 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          className="inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-medium text-white/65 transition hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={sending || !siteKey}
          className="button-light inline-flex min-h-[44px] items-center justify-center gap-2 bg-white px-6 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? (
            <>
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : (
            <>
              <Send size={15} aria-hidden="true" />
              Send message
            </>
          )}
        </button>
      </div>
    </form>
  );
}
