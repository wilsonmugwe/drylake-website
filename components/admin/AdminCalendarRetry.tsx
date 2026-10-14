"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { readApiError } from "@/components/admin/read-api-error";

/*
 * "Retry calendar sync" for a consultation whose Microsoft 365 sync gave up (FAILED). Puts the
 * booking back on the calendar queue with a fresh attempt budget and runs it straight away;
 * the page then reloads to show the outcome. Audited server-side with the admin's id.
 */
export default function AdminCalendarRetry({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inFlight = useRef(false);

  async function retry() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/consultations/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_calendar", version: 1 }),
      });
      if (response.ok) {
        setMessage({ tone: "ok", text: "Calendar sync queued. Refreshing in a moment." });
        setTimeout(() => router.refresh(), 2500);
      } else {
        setMessage({ tone: "error", text: await readApiError(response, "The retry could not be queued. Please try again.") });
      }
    } catch {
      setMessage({ tone: "error", text: "The retry could not be queued. Please check your connection." });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void retry()}
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
      >
        {busy ? <LoaderCircle aria-hidden="true" size={15} className="animate-spin" /> : <RefreshCw aria-hidden="true" size={15} />}
        Retry calendar sync
      </button>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.tone === "error" ? "text-red-700" : "text-emerald-800"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
