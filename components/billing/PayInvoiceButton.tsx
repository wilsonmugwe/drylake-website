"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

type PayInvoiceButtonProps = {
  invoiceId: string;
  amount: string;
};

type CheckoutResponse = {
  url?: string;
  error?: string;
  code?: string;
};

export default function PayInvoiceButton({
  invoiceId,
  amount,
}: PayInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
        }),
      });

      let data: CheckoutResponse;

      try {
        data = (await response.json()) as CheckoutResponse;
      } catch {
        throw new Error(
          "Unable to read the payment response. Please try again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start payment"
        );
      }

      if (
        !data.url ||
        typeof data.url !== "string"
      ) {
        throw new Error(
          "Checkout URL was not returned"
        );
      }

      let checkoutUrl: URL;

      try {
        checkoutUrl = new URL(data.url);
      } catch {
        throw new Error(
          "Invalid checkout URL returned"
        );
      }

      if (checkoutUrl.protocol !== "https:") {
        throw new Error(
          "Invalid checkout URL returned"
        );
      }

      window.location.assign(checkoutUrl.toString());
    } catch (paymentError) {
      console.error(
        "Unable to start Stripe Checkout:",
        paymentError
      );

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start payment"
      );

      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f26a2e] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2
              aria-hidden="true"
              size={16}
              className="animate-spin"
            />
            Opening checkout...
          </>
        ) : (
          <>
            Pay {amount}
            <ArrowUpRight
              aria-hidden="true"
              size={16}
            />
          </>
        )}
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-xs text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}