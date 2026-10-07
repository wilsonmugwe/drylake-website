"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, Loader2, Mail, Plus, User } from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";

const inputClassName =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400";

/*
 * Create a client from human-readable details only: organisation name and the primary
 * contact (stored as the billing contact). The server creates and links the Clerk and
 * Supabase organisations and invites the contact in the same step; nobody ever types an
 * organisation id.
 */
export default function AdminClientCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        body: new FormData(event.currentTarget),
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create the client."));
      }

      const result = (await response.json()) as { redirectTo?: string };

      router.push(result.redirectTo ?? "/admin/clients");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the client.");
      setSubmitting(false);
    }
  }

  const missingEmail = !email.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
    >
      <div className="space-y-6 p-5 sm:p-8">
        {error ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Client was not created</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-neutral-900">
            Client organisation name
          </label>
          <p className="mt-1 text-sm text-neutral-500">
            Use the client&apos;s official business or organisation name.
          </p>
          <div className="relative mt-3">
            <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="organization"
              placeholder="Example Pty Ltd"
              disabled={submitting}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-semibold text-neutral-900">Primary contact</h2>
          <p className="mt-1 text-sm text-neutral-500">
            The person who signs in to Drylake Workspace. Also used as the billing contact
            until you change it.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contactName" className="text-sm font-medium text-neutral-800">
                Contact name
              </label>
              <div className="relative mt-2">
                <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="contactName"
                  name="contactName"
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Alex Citizen"
                  disabled={submitting}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="contactEmail" className="text-sm font-medium text-neutral-800">
                Contact email
              </label>
              <div className="relative mt-2">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={submitting}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <p className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 text-xs leading-5 text-neutral-600">
            Creating the client sends the Workspace invitation to this email automatically. The
            contact accepts it, signs in, and lands in their workspace. Projects and issued
            invoices for this client appear there without any further linking. Access is
            granted by workspace membership, never by the email address alone.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 bg-neutral-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
        <Link
          href="/admin/clients"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={submitting || missingEmail}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} />
              Create Client
            </>
          )}
        </button>
      </div>
    </form>
  );
}
