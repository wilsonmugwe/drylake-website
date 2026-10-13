"use client";

import { CalendarClock, CalendarX, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import SlotPicker from "@/components/consultations/SlotPicker";
import { readApiError } from "@/components/admin/read-api-error";
import { fetchAvailability } from "@/lib/consultations/client";
import { type DaySlots, formatPerthDate, formatPerthRange } from "@/lib/consultations/rules";

/*
 * Admin actions for one consultation. Every action has a confirmation step; every request sends
 * the version this screen loaded, so a change made meanwhile (by the customer or another admin)
 * is refused rather than overwritten, and the page reloads with the latest state. The customer
 * and both founders are emailed by the server; nothing changes silently.
 */

type Mode = "idle" | "reschedule" | "confirm-reschedule" | "confirm-cancel" | "confirm-complete";

export default function AdminConsultationActions({
  bookingId,
  version,
  start,
  active,
  started,
}: {
  bookingId: string;
  version: number;
  start: string;
  active: boolean;
  started: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [newStart, setNewStart] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inFlight = useRef(false);

  // Each step replaces the button that had focus: keep keyboard users in the panel, and land
  // them on the outcome when there is one. Not on first render (the page opens normally).
  const panelRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (message) messageRef.current?.focus();
    else panelRef.current?.focus();
  }, [mode, message]);

  async function openReschedule() {
    setMessage(null);
    setMode("reschedule");
    setDays(null);
    // Always fresh: never confirm a reschedule against a stale list.
    const result = await fetchAvailability();
    if (result.ok) setDays(result.data.days);
    else setMessage({ tone: "error", text: result.message });
  }

  async function submit(action: "reschedule" | "cancel" | "complete") {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage(null);

    let response: Response | null = null;
    try {
      response = await fetch(`/api/admin/consultations/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version, ...(action === "reschedule" ? { newStart } : {}), ...(action === "cancel" ? { reason } : {}) }),
      });
    } catch {
      response = null;
    }

    inFlight.current = false;
    setBusy(false);

    if (response?.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMode("idle");
      setMessage({
        tone: "ok",
        text: `${body?.message ?? "Saved."}${action === "complete" ? "" : " The customer and both founders are being emailed."}`,
      });
      router.refresh();
      return;
    }

    const text = response ? await readApiError(response, "The change could not be saved.") : "Network error. Nothing was changed.";
    setMessage({ tone: "error", text });
    if (response?.status === 409) {
      // Someone else changed it, or the slot was taken: show the latest state.
      router.refresh();
      if (action === "reschedule") void openReschedule();
    }
  }

  const current = new Date(start);

  return (
    <div ref={panelRef} tabIndex={-1} className="mt-4 space-y-4 outline-none">
      {message && (
        <p ref={messageRef} tabIndex={-1} role={message.tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.tone === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message.text}
        </p>
      )}

      {!active && <p className="text-sm text-neutral-600">This consultation is closed. No further changes can be made.</p>}

      {active && mode === "idle" && (
        <div className="grid gap-2">
          <button type="button" onClick={() => void openReschedule()} className="admin-action">
            <CalendarClock aria-hidden="true" size={16} /> Reschedule
          </button>
          <button type="button" onClick={() => setMode("confirm-cancel")} className="admin-action admin-action-danger">
            <CalendarX aria-hidden="true" size={16} /> Cancel consultation
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-complete")}
            disabled={!started}
            className="admin-action"
            aria-describedby={started ? undefined : "complete-hint"}
          >
            <CheckCircle2 aria-hidden="true" size={16} /> Mark completed
          </button>
          {!started && (
            <p id="complete-hint" className="text-xs text-neutral-500">
              Available once the consultation has started.
            </p>
          )}
        </div>
      )}

      {mode === "reschedule" && (
        <div className="space-y-4">
          {days === null ? (
            <p role="status" className="flex items-center gap-2 text-sm text-neutral-600">
              <LoaderCircle aria-hidden="true" size={15} className="animate-spin" /> Loading available times
            </p>
          ) : (
            <SlotPicker
              tone="admin"
              days={days}
              date={date}
              start={newStart}
              excludeStart={start}
              onDateChange={(d) => {
                setDate(d);
                setNewStart(null);
              }}
              onStartChange={setNewStart}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-action" onClick={() => setMode("idle")}>Back</button>
            <button type="button" className="admin-action admin-action-primary" disabled={!newStart} onClick={() => setMode("confirm-reschedule")}>
              Review change
            </button>
          </div>
        </div>
      )}

      {mode === "confirm-reschedule" && newStart && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Move this consultation?</p>
          <p>
            From {formatPerthDate(current)}, {formatPerthRange(current)}
            <br />
            To <strong>{formatPerthDate(new Date(newStart))}, {formatPerthRange(new Date(newStart))}</strong> (Perth time)
          </p>
          <p>The customer will be emailed that Drylake changed the time, with a link to change it again. Both founders are notified.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-action" disabled={busy} onClick={() => setMode("reschedule")}>Choose another time</button>
            <button type="button" className="admin-action admin-action-primary" disabled={busy} aria-busy={busy} onClick={() => void submit("reschedule")}>
              {busy ? "Saving" : "Confirm reschedule"}
            </button>
          </div>
        </div>
      )}

      {mode === "confirm-cancel" && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-semibold">Cancel this consultation?</p>
          <p>The time is released and the customer and both founders are emailed. The record and its history are kept.</p>
          <label htmlFor="cancel-reason" className="block text-xs font-semibold uppercase tracking-[0.1em]">
            Reason for the customer (optional)
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-lg border border-red-200 bg-white p-2 text-sm text-neutral-900"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-action" disabled={busy} onClick={() => setMode("idle")}>Keep consultation</button>
            <button type="button" className="admin-action admin-action-danger-solid" disabled={busy} aria-busy={busy} onClick={() => void submit("cancel")}>
              {busy ? "Cancelling" : "Confirm cancellation"}
            </button>
          </div>
        </div>
      )}

      {mode === "confirm-complete" && (
        <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-semibold">Mark this consultation as completed?</p>
          <p>Records you as the person who completed it. No email is sent.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin-action" disabled={busy} onClick={() => setMode("idle")}>Back</button>
            <button type="button" className="admin-action admin-action-primary" disabled={busy} aria-busy={busy} onClick={() => void submit("complete")}>
              {busy ? "Saving" : "Mark completed"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
