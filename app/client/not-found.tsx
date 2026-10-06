import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import ClientStateCard from "@/components/client/ClientStateCard";

/*
 * notFound() from any /client page lands here, inside the portal frame. The copy is the
 * same whether the record is missing, hidden or another organisation's.
 */
export default function ClientNotFound() {
  return (
    <ClientStateCard
      icon={<SearchX size={20} />}
      eyebrow="Not found"
      title="We couldn't find that page."
      actions={
        <>
          <Link href="/client" className="cp-button-primary min-h-12 sm:min-w-[160px]">
            <ArrowLeft aria-hidden="true" size={15} />
            Overview
          </Link>
          <Link href="/client/billing" className="cp-button-secondary min-h-12 sm:min-w-[160px]">
            Billing
          </Link>
        </>
      }
    >
      <p>
        The link may be out of date, or the item is not shared with your organisation. Your
        projects and invoices are on the overview and billing pages.
      </p>
    </ClientStateCard>
  );
}
