"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Archive, CheckCircle2, Loader2, PauseCircle, RotateCcw } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";
import type { StatusAction } from "@/lib/clients/status";

type Props = {
  organizationId: string;
  organizationName: string;
  actions: StatusAction[];
};

function iconFor(to: StatusAction["to"]) {
  if (to === "ARCHIVED") return Archive;
  if (to === "INACTIVE") return PauseCircle;
  return RotateCcw;
}

/*
 * Lifecycle buttons for one client. Archiving asks for the client name to be typed
 * before the confirm button enables; the API also requires confirm=true.
 */
export default function AdminClientStatusControl({
  organizationId,
  organizationName,
  actions,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<StatusAction["to"] | null>(null);
  const [confirming, setConfirming] = useState<StatusAction | null>(null);
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(action: StatusAction) {
    if (pending) {
      return;
    }

    setPending(action.to);
    setError("");
    setMessage("");

    const body = new FormData();
    body.set("status", action.to);

    if (action.requiresConfirmation) {
      body.set("confirm", "true");
    }

    try {
      const response = await fetch(`/api/admin/clients/${organizationId}/status`, {
        method: "POST",
        body,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to change the client status."));
      }

      const result = (await response.json()) as { message?: string };

      setMessage(result.message ?? "Status updated.");
      setConfirming(null);
      setTypedName("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change the client status.");
    } finally {
      setPending(null);
    }
  }

  const nameMatches = typedName.trim() === organizationName.trim();

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

      <ul className="space-y-3">
        {actions.map((action) => {
          const Icon = iconFor(action.to);
          const isConfirming = confirming?.to === action.to;

          return (
            <li key={action.to} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-950">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{action.description}</p>
                </div>

                {!isConfirming ? (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() =>
                      action.requiresConfirmation ? setConfirming(action) : submit(action)
                    }
                    className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      action.to === "ARCHIVED"
                        ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                        : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                    }`}
                  >
                    {pending === action.to ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Icon size={15} />
                    )}
                    {action.label}
                  </button>
                ) : null}
              </div>

              {isConfirming ? (
                <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
                  <label htmlFor={`confirm-${action.to}`} className="block text-xs font-medium text-neutral-700">
                    Type <span className="font-semibold">{organizationName}</span> to confirm
                  </label>
                  <input
                    id={`confirm-${action.to}`}
                    type="text"
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    autoComplete="off"
                    disabled={pending !== null}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={pending !== null}
                      onClick={() => {
                        setConfirming(null);
                        setTypedName("");
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!nameMatches || pending !== null}
                      onClick={() => submit(action)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending === action.to ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                      Confirm {action.label.toLowerCase()}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
