import Link from "next/link";
import { ArrowRight, CircleDollarSign, LockKeyhole, ReceiptText, Wallet } from "lucide-react";

import { formatDate, formatMoney, isPayableInvoice, sumByCurrency } from "./format";
import { SupportCard } from "./portal-sections";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  StatTile,
  StatusPill,
  UNAVAILABLE,
} from "./portal-ui";
import type { ClientInvoiceSummary, Loadable } from "./types";

export type ClientBillingViewProps = {
  organizationName: string;
  invoices: Loadable<ClientInvoiceSummary[]>;
};

export default function ClientBillingView({ organizationName, invoices }: ClientBillingViewProps) {
  const list = invoices.ok ? invoices.data : [];
  const outstanding = list.filter((invoice) => isPayableInvoice(invoice.status));
  const balance = sumByCurrency(outstanding);
  const balanceLabel =
    balance.length === 0
      ? formatMoney(0, list[0]?.currency ?? "AUD")
      : balance.map((b) => formatMoney(b.cents, b.currency)).join(" + ");

  return (
    <>
      <PageHeader
        eyebrow={`Billing · ${organizationName}`}
        title="Invoices"
        description="Every invoice Drylake has issued to your organisation. Open one to see the breakdown or pay online."
      />

      <section aria-label="Billing summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatTile
          label="Balance due"
          icon={<Wallet size={16} />}
          className="col-span-2 lg:col-span-1"
          value={invoices.ok ? balanceLabel : UNAVAILABLE}
          detail={
            invoices.ok
              ? outstanding.length > 0
                ? "Pay online from the invoice page"
                : "Nothing to pay right now"
              : "Refresh to try again"
          }
        />
        <StatTile
          label="Outstanding"
          icon={<CircleDollarSign size={16} />}
          value={invoices.ok ? outstanding.length : UNAVAILABLE}
          detail={invoices.ok ? (outstanding.length === 1 ? "invoice to pay" : "invoices to pay") : undefined}
        />
        <StatTile
          label="Invoices"
          icon={<ReceiptText size={16} />}
          value={invoices.ok ? list.length : UNAVAILABLE}
          detail={invoices.ok ? "Issued to your organisation" : undefined}
        />
      </section>

      <div className="mt-4 grid items-start gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          labelledBy="invoice-list-heading"
          title="All invoices"
          description="Newest first"
          icon={<ReceiptText size={16} />}
        >
          {!invoices.ok ? (
            <ErrorState subject="your invoices" />
          ) : list.length === 0 ? (
            <EmptyState icon={<ReceiptText size={17} />} title="No invoices yet.">
              Invoices Drylake issues to your organisation will appear here.
            </EmptyState>
          ) : (
            <>
              {/* Column headings for the table layout; rows stack into cards below md. */}
              <div
                aria-hidden="true"
                className="cp-label hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] gap-4 border-b border-neutral-200/80 bg-[#fafaf8] px-6 py-2.5 md:grid"
              >
                <span>Invoice</span>
                <span>Status</span>
                <span>Issued</span>
                <span>Due</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              <ul>
                {list.map((invoice) => (
                  <li key={invoice.id} className="cp-row">
                    <Link
                      href={`/client/billing/${invoice.id}`}
                      className="cp-row-link group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] md:items-center md:px-6"
                    >
                      <span className="truncate font-mono text-sm font-medium text-neutral-900">
                        {invoice.invoiceNumber}
                      </span>

                      <span className="text-right text-sm font-semibold tabular-nums text-neutral-950 md:order-5">
                        {formatMoney(invoice.totalCents, invoice.currency)}
                      </span>

                      <span className="col-span-2 md:order-2 md:col-span-1">
                        <StatusPill status={invoice.status} />
                      </span>

                      <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 md:contents">
                        <span className="md:order-3 md:text-sm md:text-neutral-600">
                          <span className="md:hidden">Issued </span>
                          {formatDate(invoice.issuedAt, "-")}
                        </span>
                        <span className="md:order-4 md:text-sm md:text-neutral-600">
                          <span className="md:hidden">Due </span>
                          {formatDate(invoice.dueDate, "-")}
                        </span>
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                        size={16}
                        className="hidden text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-[#f26a2e] md:order-6 md:block"
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="border-t border-neutral-200/80 px-5 py-3.5 text-xs leading-5 text-neutral-500 md:px-6">
                Totals are the amounts payable and include GST where it was charged. Open an
                invoice for its subtotal and GST.
              </p>
            </>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <section aria-labelledby="payments-heading" className="cp-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-lg cp-tint text-[#f26a2e]"
              >
                <LockKeyhole size={16} />
              </span>
              <p className="cp-label">Payments</p>
            </div>
            <h2 id="payments-heading" className="mt-4 text-base font-semibold tracking-[-0.02em] text-neutral-950">
              Pay online
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-neutral-500">
              Open or overdue invoices can be paid from the invoice page through Stripe&apos;s secure
              checkout. Drylake does not collect or store your card details.
            </p>
          </section>
          <SupportCard />
        </div>
      </div>
    </>
  );
}
