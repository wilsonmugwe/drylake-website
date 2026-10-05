"use client";

import { FormEvent, useRef, useState } from "react";
import { Hash, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AdminDateInput from "@/components/admin/AdminDateInput";

/*
 * Create Draft Invoice form.
 *
 * Contract:
 * - Posts the same field names as before (projectId, subtotal, tax, dueDate,
 *   visibleToClient) plus requestId to /api/admin/clients/[id]/invoices, asking for JSON.
 * - requestId is created once per form and kept across retries, so a retry after a
 *   timeout (where the insert may in fact have succeeded) returns the existing invoice
 *   instead of creating a duplicate. It changes only after a success.
 * - A synchronous ref guard blocks double submits before React re-renders.
 * - On success it navigates straight to the new invoice.
 * - Errors shown are the server's fixed, safe messages or our own; never raw output.
 * - Without JavaScript the form still works as a plain POST (redirect mode).
 */

type Project = { id: string; name: string };

type AdminInvoiceFormProps = {
  organizationId: string;
  projects: Project[];
  gstRegistered: boolean;
  disabled: boolean;
  initialError?: string | null;
};

type ApiResult = {
  success?: boolean;
  invoiceId?: string;
  invoiceNumber?: string | null;
  error?: string;
  field?: string;
};

const CLIENT_TIMEOUT_MS = 30_000;

const INPUT_CLASS =
  "mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100";

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "";
}

export default function AdminInvoiceForm({
  organizationId,
  projects,
  gstRegistered,
  disabled,
  initialError,
}: AdminInvoiceFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [requestId] = useState(newRequestId);

  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const locked = disabled || submitting;

  function showError(message: string) {
    setError(message);
    setSubmitting(false);
    inFlight.current = false;
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || disabled) {
      return;
    }

    // Read the fields before the submitting state disables them (disabled inputs are
    // left out of FormData).
    const formData = new FormData(event.currentTarget);

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(`/api/admin/clients/${organizationId}/invoices`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timer);

      const timedOut = fetchError instanceof DOMException && fetchError.name === "AbortError";

      showError(
        timedOut
          ? "This is taking longer than expected. The invoice may still have been created: check the client's invoices, or press Create again (it will not create a duplicate)."
          : "Drylake could not be reached. Check your connection and try again."
      );
      return;
    }

    clearTimeout(timer);

    let result: ApiResult | null = null;

    try {
      result = (await response.json()) as ApiResult;
    } catch {
      result = null;
    }

    if (response.ok && result?.success && result.invoiceId) {
      router.push(`/admin/invoices/${result.invoiceId}`);
      router.refresh();
      return;
    }

    if (response.status === 401) {
      showError("Your session has expired. Please sign in again, then retry.");
      return;
    }

    showError(
      typeof result?.error === "string" && result.error
        ? result.error
        : "The invoice could not be created. Please try again."
    );
  }

  return (
    <form
      action={`/api/admin/clients/${organizationId}/invoices`}
      method="POST"
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <input type="hidden" name="requestId" value={requestId} />

      {error ? (
        <div
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 outline-none"
        >
          <p className="text-sm font-semibold text-red-800">Invoice could not be created</p>
          <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
        </div>
      ) : null}

      <div>
        <div className="flex items-center gap-2">
          <Hash size={15} className="text-[#f26a2e]" aria-hidden="true" />
          <span className="text-sm font-semibold text-neutral-900">Invoice number</span>
        </div>

        <div className="mt-3 rounded-xl border border-neutral-200 bg-[#f4f4f1] px-4 py-3">
          <p className="text-sm text-neutral-600">Assigned automatically when the invoice is created</p>
        </div>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Drylake uses sequential invoice numbers such as DL-2026-009.
        </p>
      </div>

      <div>
        <label htmlFor="projectId" className="block text-sm font-semibold text-neutral-900">
          Project
        </label>

        <select id="projectId" name="projectId" disabled={locked} className={INPUT_CLASS}>
          <option value="">No specific project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className={gstRegistered ? "grid gap-6 sm:grid-cols-2" : ""}>
        <div>
          <label htmlFor="subtotal" className="block text-sm font-semibold text-neutral-900">
            Amount (AUD)
          </label>

          <input
            id="subtotal"
            name="subtotal"
            type="number"
            required
            min="0.01"
            max="9999999.99"
            step="0.01"
            inputMode="decimal"
            placeholder="1000.00"
            disabled={locked}
            className={INPUT_CLASS}
          />
        </div>

        {gstRegistered ? (
          <div>
            <label htmlFor="tax" className="block text-sm font-semibold text-neutral-900">
              GST (AUD)
            </label>

            <input
              id="tax"
              name="tax"
              type="number"
              required
              min="0"
              max="9999999.99"
              step="0.01"
              inputMode="decimal"
              defaultValue="0.00"
              disabled={locked}
              className={INPUT_CLASS}
            />
          </div>
        ) : (
          <input type="hidden" name="tax" value="0" />
        )}
      </div>

      <AdminDateInput id="dueDate" name="dueDate" label="Due date" disabled={locked} />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 transition hover:bg-neutral-50">
        <input
          type="checkbox"
          name="visibleToClient"
          value="true"
          defaultChecked
          disabled={locked}
          className="mt-1 h-4 w-4 accent-[#f26a2e]"
        />

        <span>
          <span className="block text-sm font-semibold text-neutral-900">Visible to client</span>
          <span className="mt-1 block text-xs leading-5 text-neutral-500">
            Allow members of this organisation to view the invoice after it is issued.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href={`/admin/clients/${organizationId}`}
          aria-disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={locked}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Creating invoice...
            </>
          ) : (
            "Create Draft Invoice"
          )}
        </button>
      </div>
    </form>
  );
}
