"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Loader2 } from "lucide-react";

/*
 * Message shown after Stripe Checkout redirects back (?payment=success|cancelled).
 *
 * The redirect is NOT proof of payment. On "success" this only says the payment is being
 * confirmed and re-renders the server page (router.refresh) until the database, updated by
 * the Stripe webhook, says PAID. It never marks anything paid itself.
 */

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

type PaymentReturnNoticeProps = {
  outcome: "success" | "cancelled";
  paid: boolean;
};

export default function PaymentReturnNotice({ outcome, paid }: PaymentReturnNoticeProps) {
  const router = useRouter();
  const [polls, setPolls] = useState(0);
  const waiting = outcome === "success" && !paid;
  const gaveUp = waiting && polls >= MAX_POLLS;

  useEffect(() => {
    if (!waiting || gaveUp) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPolls((count) => count + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [waiting, gaveUp, polls, router]);

  if (outcome === "cancelled") {
    if (paid) {
      return null;
    }

    return (
      <div role="status" className="cp-card mb-4 flex items-start gap-3 p-4 text-sm leading-6 text-neutral-700 sm:mb-6 sm:p-5">
        <Info aria-hidden="true" size={17} className="mt-1 shrink-0 text-neutral-400" />
        <p>
          Payment cancelled. You have not been charged and this invoice is still open. You can
          pay again whenever you are ready.
        </p>
      </div>
    );
  }

  if (paid) {
    return (
      <div role="status" className="cp-card mb-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 sm:mb-6 sm:p-5">
        <CheckCircle2 aria-hidden="true" size={17} className="mt-1 shrink-0" />
        <p>Payment confirmed. Thank you, this invoice is now paid.</p>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="cp-card mb-4 flex items-start gap-3 p-4 text-sm leading-6 text-neutral-700 sm:mb-6 sm:p-5">
      {gaveUp ? (
        <Info aria-hidden="true" size={17} className="mt-1 shrink-0 text-neutral-400" />
      ) : (
        <Loader2 aria-hidden="true" size={17} className="mt-1 shrink-0 animate-spin text-[#f26a2e]" />
      )}
      <p>
        {gaveUp
          ? "We are still waiting for Stripe to confirm your payment. Some payment methods take longer to clear. Refresh this page later, or contact us if it does not update. Please do not pay again."
          : "Thanks, we are confirming your payment with Stripe. This page will update automatically."}
      </p>
    </div>
  );
}
