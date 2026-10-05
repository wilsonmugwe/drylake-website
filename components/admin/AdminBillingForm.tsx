"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  User,
} from "lucide-react";

import { readApiError } from "@/components/admin/read-api-error";

type AdminBillingFormProps = {
  organizationId: string;
  billingContactName: string | null;
  billingEmail: string | null;
  disabled?: boolean;
};

export default function AdminBillingForm({
  organizationId,
  billingContactName,
  billingEmail,
  disabled = false,
}: AdminBillingFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting || disabled) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSaved(false);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(
        `/api/admin/clients/${organizationId}/billing`,
        {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        // The route answers { success: false, error }; never show the raw JSON body.
        throw new Error(
          await readApiError(response, "Unable to save billing contact.")
        );
      }

      setSaved(true);

      router.push(`/admin/clients/${organizationId}`);
      router.refresh();
    } catch (caughtError) {
      console.error(
        "Billing contact submission failed:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save billing contact."
      );

      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
    >
      <div className="border-b border-neutral-200 px-5 py-5 sm:px-6">
        <h2 className="text-base font-semibold text-neutral-950">
          Billing contact
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          Invoice notifications and payment correspondence
          for this client will be sent to this contact.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Billing contact was not saved
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2
              size={18}
              className="text-emerald-600"
            />

            <p className="text-sm font-medium text-emerald-800">
              Billing contact saved.
            </p>
          </div>
        ) : null}

        {disabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Billing details cannot be changed while this
            client is inactive.
          </div>
        ) : null}

        <div>
          <label
            htmlFor="billingContactName"
            className="text-sm font-medium text-neutral-800"
          >
            Billing contact name
          </label>

          <div className="relative mt-2">
            <User
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              id="billingContactName"
              name="billingContactName"
              type="text"
              maxLength={100}
              defaultValue={billingContactName ?? ""}
              disabled={disabled || submitting}
              placeholder="Accounts Payable"
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>

          <p className="mt-2 text-xs text-neutral-400">
            Optional. Use a person&apos;s name or department.
          </p>
        </div>

        <div>
          <label
            htmlFor="billingEmail"
            className="text-sm font-medium text-neutral-800"
          >
            Billing email
          </label>

          <div className="relative mt-2">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />

            <input
              id="billingEmail"
              name="billingEmail"
              type="email"
              required
              autoComplete="email"
              defaultValue={billingEmail ?? ""}
              disabled={disabled || submitting}
              placeholder="accounts@example.com"
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>

          <p className="mt-2 text-xs text-neutral-400">
            Required before an invoice can be issued.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-neutral-200 bg-neutral-50/70 px-5 py-4 sm:px-6">
        <p className="hidden text-xs text-neutral-400 sm:block">
          Changes apply to future invoice correspondence.
        </p>

        <button
          type="submit"
          disabled={disabled || submitting}
          className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Billing Contact
            </>
          )}
        </button>
      </div>
    </form>
  );
}