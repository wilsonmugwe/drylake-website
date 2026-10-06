import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import PaymentReturnNotice from "@/components/billing/PaymentReturnNotice";
import PayInvoiceButton from "@/components/billing/PayInvoiceButton";
import type { InvoiceTaxPresentation } from "@/lib/invoices/gst";

import ClientShell from "./ClientShell";
import { formatDate, formatMoney, humanizeStatus, isPayableInvoice } from "./format";
import { SupportCard } from "./portal-sections";
import { PageHeader, Panel, StatusPill } from "./portal-ui";

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

  return (
    <ClientShell organizationName={organizationName} section="billing">
      <div className="pt-6">
        <Link
          href="/client/billing"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft aria-hidden="true" size={15} />
          Billing
        </Link>
      </div>

      <PageHeader
        eyebrow={`Invoice / ${organizationName}`}
        title={invoice.invoiceNumber}
        meta={<StatusPill status={invoice.displayStatus} />}
      />

      {paymentReturn ? <PaymentReturnNotice outcome={paymentReturn} paid={paid} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel labelledBy="invoice-details-heading" title="Invoice details">
            <dl className="grid gap-px bg-white/[0.08] sm:grid-cols-3">
              <Detail label="Issued" value={formatDate(invoice.issuedAt, "-")} />
              <Detail label="Due" value={formatDate(invoice.dueDate, "-")} />
              <Detail
                label="Payment"
                value={paid ? `Paid ${formatDate(invoice.paidAt, "")}`.trim() : humanizeStatus(invoice.displayStatus)}
              />
            </dl>
          </Panel>

          <Panel
            labelledBy="invoice-summary-heading"
            title="Billing summary"
            description={tax.documentTitle}
          >
            <dl className="px-5 sm:px-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] py-4">
                <dt className="text-sm text-white/60">Subtotal</dt>
                <dd className="text-sm font-medium">{formatMoney(invoice.subtotalCents, invoice.currency)}</dd>
              </div>

              {tax.showGstLine ? (
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] py-4">
                  <dt className="text-sm text-white/60">{tax.gstLabel}</dt>
                  <dd className="text-sm font-medium">{formatMoney(invoice.taxCents, invoice.currency)}</dd>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="font-semibold">
                  {tax.totalLabel} <span className="text-xs font-normal text-white/55">({invoice.currency.toUpperCase()})</span>
                </dt>
                <dd className="text-xl font-semibold tracking-[-0.03em]">{total}</dd>
              </div>
            </dl>

            {tax.noGstNote ? (
              <p className="border-t border-white/[0.08] px-5 py-4 text-xs leading-5 text-white/55 sm:px-6">
                {tax.noGstNote}
              </p>
            ) : null}

            <p className="border-t border-white/[0.08] px-5 py-4 text-xs leading-5 text-white/55 sm:px-6">
              {tax.documentTitle} issued by {business.legalName}, ABN {business.abn}
            </p>
          </Panel>

          {project ? (
            <Link
              href={`/client/projects/${project.id}`}
              className="cp-panel group flex items-center justify-between gap-4 p-5 transition-colors hover:border-white/20 sm:p-6"
            >
              <span className="min-w-0">
                <span className="tech-label block text-white/50">Related project</span>
                <span className="mt-2 block break-words font-medium">{project.name}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={17}
                className="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white"
              />
            </Link>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-labelledby="amount-heading"
            className={`cp-panel p-5 sm:p-6 ${payable ? "border-t-2 border-t-[#f26a2e]" : ""}`}
          >
            <p id="amount-heading" className="tech-label text-white/50">
              {paid ? "Amount paid" : payable || confirming ? "Amount due" : "Invoice total"}
            </p>
            <p className="mt-3 break-words text-[2.4rem] font-semibold leading-none tracking-[-0.05em]">
              {total}
            </p>

            {payable ? (
              <div className="mt-6">
                <PayInvoiceButton invoiceId={invoice.id} amount={total} />
                <p className="mt-4 text-xs leading-5 text-white/55">
                  Payments are processed securely through Stripe. Drylake does not collect or
                  store your card details on this page.
                </p>
              </div>
            ) : null}

            {paid ? (
              <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-emerald-300">
                <CheckCircle2 aria-hidden="true" size={16} className="mt-1 shrink-0" />
                <span>
                  Payment received{invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ""}. Thank you.
                </span>
              </p>
            ) : null}
          </section>

          <SupportCard />
        </div>
      </div>
    </ClientShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0a] px-5 py-4 sm:px-6 sm:py-5">
      <dt className="tech-label text-white/50">{label}</dt>
      <dd className="mt-2 font-medium">{value || "-"}</dd>
    </div>
  );
}
