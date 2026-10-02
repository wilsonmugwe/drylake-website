"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

type PayInvoiceButtonProps = {
  invoiceId: string;
  amount: string;
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
      const response = await fetch(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start payment"
        );
      }

      if (!data.url) {
        throw new Error(
          "Checkout URL was not returned"
        );
      }

      window.location.href = data.url;
    } catch (paymentError) {
      console.error(paymentError);

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
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f26a2e] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />
            Opening checkout...
          </>
        ) : (
          <>
            Pay {amount}
            <ArrowUpRight size={16} />
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}