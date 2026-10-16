"use client";

import { useRef, useState } from "react";

import TurnstileWidget, { type TurnstileHandle } from "@/components/forms/TurnstileWidget";
import { ESCALATION_NOTE } from "@/lib/assistant/constants";
import { submitEnquiry } from "@/lib/contact/submit-enquiry";
import { RESPONSE_TIME } from "@/lib/site";

/*
 * In-panel message form. It posts to the EXISTING contact pipeline (/api/contact: same
 * validation, Turnstile, rate limit and Resend delivery to the existing inbox), tagged
 * source "assistant" with a wantsHuman flag. It is a message, not a live chat, and says so.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const input =
  "mt-1 w-full min-w-0 border border-black/25 bg-white px-3 py-2.5 text-base text-black outline-none focus:border-black";

export default function AssistantEscalationForm({ wantsHuman, onBack }: { wantsHuman: boolean; onBack: () => void }) {
  const turnstile = useRef<TurnstileHandle>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div role="status" className="p-4 text-sm leading-6 text-black">
        <p className="font-semibold">Message sent.</p>
        <p className="mt-1 text-black/70">We reply within {RESPONSE_TIME}. This was a message to the team, not a live chat.</p>
        <button type="button" onClick={onBack} className="mt-4 min-h-[44px] border border-black px-4 text-sm font-semibold">
          Back to chat
        </button>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    if (!token) {
      setError("Please wait for the security check to finish.");
      return;
    }

    setBusy(true);
    setError("");
    const result = await submitEnquiry({
      name: text("name"),
      email: text("email"),
      company: "",
      projectType: "AI assistant",
      helpType: wantsHuman ? "Speak to a representative" : "Send an enquiry",
      message: text("message"),
      turnstileToken: token,
      phone: text("phone"),
      source: "assistant",
      wantsHuman,
      consent: data.get("consent") === "on",
    });
    setBusy(false);

    if (result.ok) {
      setSent(true);
      return;
    }

    setError(result.message);
    turnstile.current?.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-4 text-sm text-black" aria-label={wantsHuman ? "Speak to a representative" : "Send an enquiry"}>
      <p className="leading-6 text-black/70">{ESCALATION_NOTE}</p>
      <label className="block font-semibold">
        Your name
        <input name="name" required maxLength={120} autoComplete="name" className={input} />
      </label>
      <label className="block font-semibold">
        Email
        <input name="email" type="email" required maxLength={200} autoComplete="email" className={input} />
      </label>
      <label className="block font-semibold">
        Phone (optional)
        <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={input} />
      </label>
      <label className="block font-semibold">
        Message
        <textarea name="message" required maxLength={2000} rows={4} className={`${input} resize-none`} />
      </label>
      <label className="flex items-start gap-2 leading-5">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />
        <span>I agree that Drylake may reply to me about this message. See the <a href="/privacy" className="underline">Privacy Policy</a>.</span>
      </label>
      {SITE_KEY && (
        <TurnstileWidget
          ref={turnstile}
          siteKey={SITE_KEY}
          onToken={setToken}
          onTokenCleared={() => setToken("")}
          onUnavailable={() => setError("The security check could not load. Please email us instead.")}
        />
      )}
      {error && (
        <p role="alert" className="border-l-2 border-red-700 pl-3 leading-5 text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="min-h-[44px] bg-black px-5 font-semibold text-white disabled:opacity-60">
          {busy ? "Sending" : "Send message"}
        </button>
        <button type="button" onClick={onBack} className="min-h-[44px] border border-black/30 px-4 font-semibold">
          Back to chat
        </button>
      </div>
    </form>
  );
}
