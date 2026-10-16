"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";

type Props = {
  proposalId: string;
  status: string;
  notes: string;
  statuses: Array<{ value: string; label: string }>;
};

/*
 * Status select and internal-notes box for one proposal. Posts to
 * /api/admin/collaborations/[id]; the server re-checks platform admin and writes the audit log.
 */
export default function AdminCollaborationPanel({ proposalId, status, notes, statuses }: Props) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [nextNotes, setNextNotes] = useState(notes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dirty = nextStatus !== status || nextNotes.trim() !== notes.trim();

  async function save() {
    if (pending || !dirty) return;
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/collaborations/${proposalId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: nextStatus, notes: nextNotes }),
      });

      if (!response.ok) throw new Error(await readApiError(response, "Unable to save the changes."));

      setMessage("Saved.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {message ? (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{message}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="proposal-status" className="block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Status
        </label>
        <select
          id="proposal-status"
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value)}
          disabled={pending}
          className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="proposal-notes" className="block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Internal notes
        </label>
        <textarea
          id="proposal-notes"
          value={nextNotes}
          onChange={(event) => setNextNotes(event.target.value)}
          disabled={pending}
          maxLength={5000}
          rows={7}
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm leading-6 text-neutral-950 outline-none focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending || !dirty}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        Save changes
      </button>
    </div>
  );
}
