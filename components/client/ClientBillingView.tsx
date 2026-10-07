import Link from "next/link";
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react";

import { formatDate, formatMoney, isPayableInvoice, sumByCurrency } from "./format";
import MessageDrylake from "./MessageDrylake";
import { SupportCard } from "./portal-sections";
import { EmptyState, ErrorState, FigureBand, PageHeader, Panel, StatusPill, UNAVAILABLE } from "./portal-ui";
import type { ClientInvoiceSummary, Loadable } from "./types";

export type ClientBillingViewProps = {
  organizationName: string;
  /* Statuses arrive as the client should read them (OPEN past due is OVERDUE, lib/invoices). */
  invoices: Loadable<ClientInvoiceSummary[]>;
};

export default function ClientBillingView({ organizationName, invoices }: ClientBillingViewProps) {
  const list = invoices.ok ? invoices.data : [];
  const outstanding = list
    .filter((invoice) => isPayableInvoice(invoice.status))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "OVERDUE" ? -1 : 1;
      return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    });
  const history = list.filter((invoice) => !isPayableInvoice(invoice.status));
  const balance = sumByCurrency(outstanding);
  const balanceLabel =
    balance.length === 0
      ? formatMoney(0, list[0]?.currency ?? "AUD")
      : balance.map((b) => formatMoney(b.cents, b.currency)).join(" + ");
  const overdue = outstanding.filter((invoice) => invoice.status === "OVERDUE").length;
  const nextDue = outstanding.find((invoice) => invoice.dueDate)?.dueDate ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Invoices and payments"
        description={`Every invoice Drylake has issued to ${organizationName}. Open one to see the breakdown or pay online.`}
      />

      <FigureBand
        label="Billing summary"
        figures={[
          {
            label: "Balance due",
            value: invoices.ok ? balanceLabel : UNAVAILABLE,
            detail: !invoices.ok
              ? "Refresh to try again"
              : outstanding.length > 0
                ? "Pay online from the invoice page"
                : "Nothing to pay right now",
          },
          {
            label: "To pay",
            value: invoices.ok ? outstanding.length : UNAVAILABLE,
            detail: invoices.ok && overdue > 0 ? `${overdue} overdue` : undefined,
          },
          {
            label: "Next due",
            value: invoices.ok ? (nextDue ? formatDate(nextDue) : "None") : UNAVAILABLE,
          },
          {
            label: "Issued",
            value: invoices.ok ? list.length : UNAVAILABLE,
            detail: invoices.ok ? "Invoices in total" : undefined,
          },
        ]}
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            labelledBy="to-pay-heading"
            anchor="to-pay"
            title="To pay"
            count={invoices.ok ? outstanding.length : undefined}
            description="Overdue first, then by due date"
          >
            {!invoices.ok ? (
              <ErrorState subject="your invoices" />
            ) : list.length === 0 ? (
              <EmptyState
                icon={<ReceiptText size={17} />}
                title="No invoices yet."
                action={<MessageDrylake variant="inline" />}
              >
                Invoices Drylake issues to your organisation will appear here, ready to pay online.
              </EmptyState>
            ) : outstanding.length === 0 ? (
              <EmptyState icon={<ReceiptText size={17} />} title="Nothing to pay right now.">
                Every invoice is settled. New invoices from Drylake will appear here.
              </EmptyState>
            ) : (
              <InvoiceTable items={outstanding} />
            )}
          </Panel>

          {/* Always rendered once invoices load, so /client/billing#invoice-history always
              lands somewhere real: the list, or an honest empty state. */}
          {invoices.ok ? (
            <Panel
              labelledBy="history-heading"
              anchor="invoice-history"
              title="Invoice history"
              count={history.length}
              description="Paid and closed invoices, newest first"
            >
              {history.length > 0 ? (
                <InvoiceTable items={history} />
              ) : (
                <EmptyState icon={<ReceiptText size={17} />} title="No paid invoices yet.">
                  Invoices appear here once they are paid or closed.
                </EmptyState>
              )}
            </Panel>
          ) : null}

          {invoices.ok && list.length > 0 ? (
            <p className="px-1 text-xs leading-5 text-neutral-600">
              Totals are the amounts payable and include GST where it was charged. Open an invoice
              for its subtotal and GST.
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section id="paying-online" aria-labelledby="payments-heading" className="cp-card cp-anchor p-5 sm:p-6">
            <p className="cp-label flex items-center gap-2">
              <LockKeyhole aria-hidden="true" size={13} />
              Payments
            </p>
            <h2 id="payments-heading" className="cp-section-title mt-3">
              Pay online, securely
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-neutral-600">
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

const COLUMNS =
  "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_20px]";

function InvoiceTable({ items }: { items: ClientInvoiceSummary[] }) {
  return (
    <>
      {/* Column headings for the table layout; rows stack into cards below md. */}
      <div
        aria-hidden="true"
        className={`cp-label hidden gap-4 border-b border-neutral-200/80 bg-canvas/60 px-6 py-2.5 md:grid ${COLUMNS}`}
      >
        <span>Invoice</span>
        <span>Status</span>
        <span>Issued</span>
        <span>Due</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <ul>
        {items.map((invoice) => (
          <li key={invoice.id} className="cp-row">
            <Link
              href={`/client/billing/${invoice.id}`}
              className={`cp-row-link group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-5 py-4 md:items-center md:px-6 ${COLUMNS}`}
            >
              <span className="truncate font-mono text-sm font-semibold text-neutral-900">
                {invoice.invoiceNumber}
              </span>

              <span className="text-right text-sm font-semibold tabular-nums text-neutral-950 md:order-5">
                {formatMoney(invoice.totalCents, invoice.currency)}
              </span>

              <span className="col-span-2 md:order-2 md:col-span-1">
                <StatusPill status={invoice.status} />
              </span>

              <span className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 md:contents">
                <span className="md:order-3 md:text-sm">
                  <span className="md:hidden">Issued </span>
                  {formatDate(invoice.issuedAt, "-")}
                </span>
                <span
                  className={`md:order-4 md:text-sm ${invoice.status === "OVERDUE" ? "font-semibold text-red-700" : ""}`}
                >
                  <span className="md:hidden">Due </span>
                  {formatDate(invoice.dueDate, "-")}
                </span>
              </span>

              <ArrowRight
                aria-hidden="true"
                size={16}
                className="cp-nudge hidden text-neutral-400 group-hover:text-neutral-950 md:order-6 md:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
