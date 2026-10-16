"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";

type Action = { key: string; label: string; endpoint: string; destructive?: boolean; confirm?: string };

type Props = {
  /* Which actions to offer; decided by the server page from the row's current state. */
  actions: Action[];
};

/*
 * Row actions for a review request (retry, withdraw) or a piece of feedback (approve, unapprove,
 * remove). The server decides which actions are offered and re-checks every one; this component
 * only posts. Destructive actions ask once more, in words.
 */
export default function AdminReviewActions({ actions }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(action: Action) {
    if (pending) return;
    setPending(action.key);
    setError("");
    setMessage("");

    try {
      const response = await fetch(action.endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: action.key }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Unable to make that change."));
      const body = (await response.json()) as { message?: string };
      setMessage(body.message ?? "Done.");
      setAsking(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to make that change.");
    } finally {
      setPending(null);
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      {error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}
      {message ? (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 aria-hidden="true" size={16} className="text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{message}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={pending !== null}
            onClick={() => (action.confirm ? setAsking(action.key) : run(action))}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              action.destructive ? "border-red-200 bg-white text-red-700 hover:bg-red-50" : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            {pending === action.key ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
            {action.label}
          </button>
        ))}
      </div>

      {actions.map((action) =>
        asking === action.key && action.confirm ? (
          <div key={action.key} role="group" aria-label={`Confirm: ${action.label}`} className="rounded-xl border border-neutral-300 bg-neutral-50 p-4">
            <p className="text-sm leading-6 text-neutral-800">{action.confirm}</p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAsking(null)}
                disabled={pending !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => run(action)}
                disabled={pending !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Confirm: {action.label.toLowerCase()}
              </button>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
