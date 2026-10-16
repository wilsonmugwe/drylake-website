"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CONTACT_EMAIL } from "@/lib/site";

type ApiBody = { success?: boolean; message?: string; error?: string };
type State = { name: "working" } | { name: "done"; message: string } | { name: "failed"; message: string };

const TOKEN_FROM_HASH = /^#t=([A-Za-z0-9_-]{43})$/;

/*
 * Unsubscribe from feedback requests. The token is in the URL fragment (never sent to a server),
 * and the request is a POST made here, so a mail scanner that only fetches the page cannot
 * unsubscribe anyone by accident. Opening the link from the email does it straight away: the
 * visitor asked for exactly that, and a second confirmation click would be a hurdle (Spam Act
 * 2003: the unsubscribe must be simple). A retry button covers a failed attempt.
 */
export default function UnsubscribeClient() {
  const [state, setState] = useState<State>({ name: "working" });
  const [hasToken, setHasToken] = useState(false);
  const token = useRef("");

  async function submit() {
    setState({ name: "working" });
    try {
      const response = await fetch("/api/feedback/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.current }),
      });
      let data = null as ApiBody | null;
      try {
        data = (await response.json()) as ApiBody;
      } catch {
        data = null;
      }
      if (response.ok && data?.success === true) {
        setState({ name: "done", message: data.message ?? "You will not receive feedback requests from Drylake again." });
      } else {
        setState({ name: "failed", message: data?.error ?? `We couldn't process this. Please email ${CONTACT_EMAIL} and we will remove you.` });
      }
    } catch {
      setState({ name: "failed", message: `We couldn't reach Drylake. Please try again, or email ${CONTACT_EMAIL} and we will remove you.` });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // The fragment exists only in the browser, so it is read after mount, never during render.
      await Promise.resolve();
      if (cancelled) return;

      const match = TOKEN_FROM_HASH.exec(window.location.hash);
      if (!match) {
        setState({ name: "failed", message: `We could not find this unsubscribe link. Please email ${CONTACT_EMAIL} and we will remove you.` });
        return;
      }
      token.current = match[1];
      setHasToken(true);
      window.history.replaceState(null, "", window.location.pathname);
      await submit();
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div role="status" className="border border-black/10 bg-[#f4f2ec] p-6 sm:p-8">
      {state.name === "working" ? (
        <p className="flex items-center gap-2 text-base text-black/75">
          <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> Updating your preferences...
        </p>
      ) : null}

      {state.name === "done" ? (
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white">
            <Check aria-hidden="true" size={13} />
          </span>
          <p className="text-base leading-7 text-black/80">{state.message}</p>
        </div>
      ) : null}

      {state.name === "failed" ? (
        <div>
          <p className="text-base leading-7 text-black/80">{state.message}</p>
          {hasToken ? (
            <button type="button" onClick={() => void submit()} className="mt-4 min-h-[44px] rounded-full bg-black px-6 font-semibold text-white">
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
