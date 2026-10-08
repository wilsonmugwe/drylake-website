"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Mail, RotateCw, Send, XCircle } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";
import type { InvitationSummary } from "@/lib/clients/invitations";

type Props = {
  organizationId: string;
  defaultEmail: string | null;
  /* False when the client is not ACTIVE: invitations are refused server-side too. */
  canInvite: boolean;
  invitations: InvitationSummary[];
};

const STATUS_STYLES: Record<InvitationSummary["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  revoked: "bg-neutral-100 text-neutral-600",
  expired: "bg-neutral-100 text-neutral-600",
};

// TODO(2026-10-08): pin the time zone to Australia/Perth. This client component is rendered on
// the server (UTC on Vercel) and then hydrated in the admin's browser (AWST, UTC+8), so any
// timestamp between 16:00 and 24:00 UTC formats to a different day on each side: a hydration
// mismatch warning and a brief flash of the wrong date. Fix deferred (C2 review R2, with the
// shared admin date formatter) because it changes rendered output; formatting left as is.
function formatDate(epochMs: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(epochMs));
}

export default function AdminClientInvitePanel({
  organizationId,
  defaultEmail,
  canInvite,
  invitations,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function post(url: string, body: FormData, key: string, fallback: string) {
    setBusy(key);
    setError("");
    setMessage("");

    try {
      const response = await fetch(url, {
        method: "POST",
        body,
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, fallback));
      }

      const result = (await response.json()) as { message?: string };

      setMessage(result.message ?? "Done.");
      router.refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !canInvite) {
      return;
    }

    const form = event.currentTarget;
    const sent = await post(
      `/api/admin/clients/${organizationId}/invitations`,
      new FormData(form),
      "invite",
      "Unable to send the invitation."
    );

    if (sent) {
      form.reset();
    }
  }

  function invitationAction(invitationId: string, action: "resend" | "revoke") {
    if (busy) {
      return;
    }

    const body = new FormData();
    body.set("action", action);

    void post(
      `/api/admin/clients/${organizationId}/invitations/${invitationId}`,
      body,
      `${action}:${invitationId}`,
      action === "revoke" ? "Unable to revoke the invitation." : "Unable to resend the invitation."
    );
  }

  return (
    <div className="space-y-5">
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

      <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="invite-email" className="text-sm font-medium text-neutral-800">
            Invite a client user
          </label>
          <div className="relative mt-2">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              defaultValue={defaultEmail ?? ""}
              placeholder="contact@example.com"
              disabled={!canInvite || busy !== null}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canInvite || busy !== null}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "invite" ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          {busy === "invite" ? "Sending..." : "Send invitation"}
        </button>
      </form>

      {!canInvite ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Invitations are paused while this client is not active.
        </p>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Invitations
        </h3>

        {invitations.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No invitations sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-950">
                    {invitation.emailAddress}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Sent {formatDate(invitation.createdAt)}
                    {invitation.status === "pending" && invitation.expiresAt
                      ? `, expires ${formatDate(invitation.expiresAt)}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[invitation.status]}`}
                  >
                    {invitation.status}
                  </span>

                  {canInvite && invitation.status !== "accepted" ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => invitationAction(invitation.id, "resend")}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {busy === `resend:${invitation.id}` ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCw size={13} />
                      )}
                      Resend
                    </button>
                  ) : null}

                  {invitation.status === "pending" ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => invitationAction(invitation.id, "revoke")}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {busy === `revoke:${invitation.id}` ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <XCircle size={13} />
                      )}
                      Revoke
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
