import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";

import ClientShell from "./ClientShell";
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
    <ClientShell organizationName={organizationName} section="billing">
      <PageHeader
        eyebrow={`Billing / ${organizationName}`}
        title="Invoices"
        description="Every invoice Drylake has issued to your organisation. Open one to see the breakdown or pay online."
      />

      <section aria-label="Billing summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Invoices" value={invoices.ok ? list.length : UNAVAILABLE} />
        <StatTile
          label="Outstanding"
          value={invoices.ok ? outstanding.length : UNAVAILABLE}
          detail={invoices.ok ? (outstanding.length === 1 ? "invoice to pay" : "invoices to pay") : undefined}
        />
        <StatTile className="col-span-2 sm:col-span-1" label="Balance due" value={invoices.ok ? balanceLabel : UNAVAILABLE} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel labelledBy="invoice-list-heading" title="All invoices" description="Newest first">
          {!invoices.ok ? (
            <ErrorState subject="your invoices" />
          ) : list.length === 0 ? (
            <EmptyState icon={<ReceiptText size={16} />} title="No invoices yet.">
              Invoices Drylake issues to your organisation will appear here.
            </EmptyState>
          ) : (
            <>
              {/* Column headings for the table layout; rows stack into cards below md. */}
              <div
                aria-hidden="true"
                className="tech-label hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] gap-4 border-b border-white/[0.08] px-6 py-3 text-white/50 md:grid"
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
                      className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] md:items-center md:px-6"
                    >
                      <span className="truncate font-mono text-sm text-white">{invoice.invoiceNumber}</span>

                      <span className="text-right text-sm font-semibold tracking-[-0.02em] md:order-5">
                        {formatMoney(invoice.totalCents, invoice.currency)}
                      </span>

                      <span className="col-span-2 md:order-2 md:col-span-1">
                        <StatusPill status={invoice.status} />
                      </span>

                      <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55 md:contents">
                        <span className="md:order-3 md:text-sm md:text-white/65">
                          <span className="md:hidden">Issued </span>
                          {formatDate(invoice.issuedAt, "-")}
                        </span>
                        <span className="md:order-4 md:text-sm md:text-white/65">
                          <span className="md:hidden">Due </span>
                          {formatDate(invoice.dueDate, "-")}
                        </span>
                      </span>

                      <ArrowRight
                        aria-hidden="true"
                        size={16}
                        className="hidden text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white md:order-6 md:block"
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="border-t border-white/[0.08] px-5 py-4 text-xs leading-5 text-white/55 md:px-6">
                Totals are the amounts payable and include GST where it was charged. Open an
                invoice for its subtotal and GST.
              </p>
            </>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="payments-heading" className="cp-panel p-5 sm:p-6">
            <p className="tech-label text-white/50">Payments</p>
            <h2 id="payments-heading" className="mt-3 text-lg font-semibold tracking-[-0.03em]">
              Pay online
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Open or overdue invoices can be paid from the invoice page through Stripe&apos;s secure
              checkout. Drylake does not collect or store your card details.
            </p>
          </section>
          <SupportCard />
        </div>
      </div>
    </ClientShell>
  );
}
