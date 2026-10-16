"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";

type Props = {
  kind: "project" | "consultation";
  engagementId: string;
  engagementLabel: string;
  recipientName: string;
  recipientEmail: string;
};

/*
 * "Send request" for ONE engagement, with a confirm step. The server re-derives eligibility,
 * the duplicate guard and the suppression list; this button only asks, and confirm:true in the
 * body is what the API requires, so a request cannot be sent by a single stray click.
 */
export default function AdminReviewSend({ kind, engagementId, engagementLabel, recipientName, recipientEmail }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function send() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/reviews/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind, engagementId, confirm: true }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Unable to send the request."));
      setMessage("Sent.");
      setConfirming(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send the request.");
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 aria-hidden="true" size={15} /> {message}
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
      >
        <Send aria-hidden="true" size={14} /> Send request
        <span className="sr-only"> to {recipientName} about {engagementLabel}</span>
      </button>
    );
  }

  return (
    <div role="group" aria-label={`Confirm review request to ${recipientName}`} className="max-w-md rounded-xl border border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm leading-6 text-neutral-800">
        Send a review request to <strong>{recipientName}</strong> ({recipientEmail}) about <strong>{engagementLabel}</strong>?
      </p>
      <p className="mt-2 text-xs leading-5 text-neutral-600">
        The email asks for honest feedback, offers nothing in return and includes an unsubscribe link. It cannot be unsent.
      </p>

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-red-700">
          <AlertCircle aria-hidden="true" size={15} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <Send aria-hidden="true" size={14} />}
          Confirm and send
        </button>
      </div>
    </div>
  );
}
