"use client";

import { FormEvent, useState } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";

type AdminInvoiceActionProps = {
  invoiceId: string;
  action: "issue" | "resend";
  disabled?: boolean;
};

export default function AdminInvoiceAction({
  invoiceId,
  action,
  disabled = false,
}: AdminInvoiceActionProps) {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (disabled || submitting) {
      event.preventDefault();
      return;
    }

    setSubmitting(true);
  }

  const isIssue = action === "issue";

  return (
    <form
      action={`/api/admin/invoices/${invoiceId}/${action}`}
      method="POST"
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        disabled={disabled || submitting}
        className={
          isIssue
            ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {submitting ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />

            {isIssue ? "Issuing..." : "Sending..."}
          </>
        ) : isIssue ? (
          <>
            <Send size={16} />
            Issue Invoice
          </>
        ) : (
          <>
            <RefreshCw size={16} />
            Resend Invoice Email
          </>
        )}
      </button>
    </form>
  );
}