import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import PaymentReturnNotice from "@/components/billing/PaymentReturnNotice";
import PayInvoiceButton from "@/components/billing/PayInvoiceButton";
import type { InvoiceTaxPresentation } from "@/lib/invoices/gst";

import { formatDate, formatMoney, humanizeStatus, isPayableInvoice } from "./format";
import { SupportCard } from "./portal-sections";
import { BackLink, Fact, PageHeader, Panel, StatusPill } from "./portal-ui";

export type ClientInvoiceViewProps = {
  organizationName: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    /* Status as shown to the client: OPEN past its due date reads OVERDUE (lib/invoices). */
    displayStatus: string;
    currency: string;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    dueDate: string | null;
    paidAt: string | null;
    issuedAt: string | null;
  };
  project: { id: string; name: string } | null;
  /*
   * Tax labels from presentInvoiceTax (lib/invoices/gst.ts), derived from the STORED amounts:
   * the same function the admin page and the invoice email use.
   */
  tax: InvoiceTaxPresentation;
  /* Supplier identity for the tax invoice (lib/business.ts). */
  business: { legalName: string; abn: string };
  /* Set when Stripe Checkout redirected back here (?payment=success|cancelled). */
  paymentReturn: "success" | "cancelled" | null;
};

export default function ClientInvoiceView({
  organizationName,
  invoice,
  project,
  tax,
  business,
  paymentReturn,
}: ClientInvoiceViewProps) {
  const total = formatMoney(invoice.totalCents, invoice.currency);
  const paid = invoice.status === "PAID";
  // While a just-completed Checkout is being confirmed, do not offer a second payment.
  const confirming = paymentReturn === "success" && !paid;
  const payable = isPayableInvoice(invoice.status) && !confirming;
  const overdue = invoice.displayStatus === "OVERDUE";

  return (
    <>
      <PageHeader
        back={<BackLink href="/client/billing" label="Billing" />}
        eyebrow={`${tax.documentTitle} · ${organizationName}`}
        title={invoice.invoiceNumber}
        meta={<StatusPill status={invoice.displayStatus} />}
      />

      {paymentReturn ? <PaymentReturnNotice outcome={paymentReturn} paid={paid} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* The amount and the pay action come first on a phone, beside the detail on desktop. */}
        <div className="flex min-w-0 flex-col gap-6 lg:order-2">
          <section
            aria-labelledby="amount-heading"
            className="cp-card cp-amount overflow-hidden p-5 sm:p-6"
            data-state={payable ? (overdue ? "overdue" : "due") : paid ? "paid" : undefined}
          >
            <p id="amount-heading" className="cp-label">
              {paid ? "Amount paid" : payable || confirming ? "Amount due" : "Invoice total"}
            </p>
            <p className="cp-figure-value mt-3 break-words text-[2.25rem]">{total}</p>
            {payable && invoice.dueDate ? (
              <p className={`mt-2 text-sm ${overdue ? "font-semibold text-red-700" : "text-neutral-600"}`}>
                {overdue ? "Overdue since" : "Due"} {formatDate(invoice.dueDate)}
              </p>
            ) : null}

            {payable ? (
              <div className="mt-6">
                <PayInvoiceButton invoiceId={invoice.id} amount={total} />
                {/* The button already says "Secure payment powered by Stripe". */}
                <p className="mt-2 text-xs leading-5 text-neutral-600">
                  Drylake does not collect or store your card details on this page.
                </p>
              </div>
            ) : null}

            {paid ? (
              <p className="mt-5 flex items-start gap-2 rounded-app border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-6 text-emerald-800">
                <CheckCircle2 aria-hidden="true" size={16} className="mt-1 shrink-0" />
                <span>
                  Payment received{invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ""}. Thank you.
                </span>
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          <Panel labelledBy="invoice-details-heading" title="Invoice details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-3 sm:px-6">
              <Fact label="Issued" value={formatDate(invoice.issuedAt, "-")} />
              <Fact
                label="Due"
                value={
                  <span className={overdue ? "font-semibold text-red-700" : undefined}>
                    {formatDate(invoice.dueDate, "-")}
                  </span>
                }
              />
              <Fact
                label="Payment"
                value={
                  paid
                    ? `Paid ${formatDate(invoice.paidAt, "")}`.trim()
                    : humanizeStatus(invoice.displayStatus)
                }
              />
            </dl>
          </Panel>

          <Panel labelledBy="invoice-summary-heading" title="Billing summary" description={tax.documentTitle}>
            <dl className="px-5 sm:px-6">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-200/80 py-3.5">
                <dt className="text-sm text-neutral-600">Subtotal</dt>
                <dd className="text-sm font-medium tabular-nums text-neutral-900">
                  {formatMoney(invoice.subtotalCents, invoice.currency)}
                </dd>
              </div>

              {tax.showGstLine ? (
                <div className="flex items-center justify-between gap-4 border-b border-neutral-200/80 py-3.5">
                  <dt className="text-sm text-neutral-600">{tax.gstLabel}</dt>
                  <dd className="text-sm font-medium tabular-nums text-neutral-900">
                    {formatMoney(invoice.taxCents, invoice.currency)}
                  </dd>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="font-semibold text-neutral-950">
                  {tax.totalLabel}{" "}
                  <span className="text-xs font-normal text-neutral-600">
                    ({invoice.currency.toUpperCase()})
                  </span>
                </dt>
                <dd className="text-xl font-semibold tabular-nums tracking-[-0.03em] text-neutral-950">
                  {total}
                </dd>
              </div>
            </dl>

            {tax.noGstNote ? (
              <p className="border-t border-neutral-200/80 px-5 py-3.5 text-xs leading-5 text-neutral-600 sm:px-6">
                {tax.noGstNote}
              </p>
            ) : null}

            <p className="border-t border-neutral-200/80 bg-canvas/60 px-5 py-3.5 text-xs leading-5 text-neutral-600 sm:px-6">
              {tax.documentTitle} issued by {business.legalName}, ABN {business.abn}
            </p>
          </Panel>

          {project ? (
            <Link
              href={`/client/projects/${project.id}`}
              className="cp-card cp-card-link group flex items-center justify-between gap-4 p-5 sm:p-6"
            >
              <span className="min-w-0">
                <span className="cp-label block">Related project</span>
                <span className="mt-1.5 block break-words text-sm font-semibold text-neutral-950">
                  {project.name}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="cp-nudge shrink-0 text-neutral-400 group-hover:text-neutral-950"
              />
            </Link>
          ) : null}

          <SupportCard />
        </div>
      </div>
    </>
  );
}
