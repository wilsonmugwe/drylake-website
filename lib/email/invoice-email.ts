/*
 * Invoice email rendering (issue + resend). Pure: no env reads, no SDK, relative imports
 * only, so the copy rules are unit tested (tests/invoice-email.test.mjs):
 *   - layout, footer and escaping come from the shared design system (lib/email/layout.ts),
 *   - GST lines come from the STORED amounts via presentInvoiceTax (lib/invoices/gst.ts),
 *     the same function the admin and client views use,
 *   - business identity (legal name, ABN) comes from lib/business.ts and stays in the footer:
 *     a GST tax invoice must show the supplier's ABN,
 *   - no em dashes in client-facing copy,
 *   - the email links to the invoice in Drylake Workspace, where payment happens. The button
 *     and the fallback hyperlink are the SAME string (portalUrl), built by
 *     lib/invoices/invoice-url.ts.
 */

import { DRYLAKE_BUSINESS } from "../business.ts";
import { presentInvoiceTax } from "../invoices/gst.ts";
import {
  type DetailRow,
  type RenderedEmail,
  button,
  detailTable,
  fallbackLink,
  paragraph,
  renderEmailLayout,
  textFooter,
} from "./layout.ts";

export { escapeHtml, type RenderedEmail } from "./layout.ts";

export type InvoiceEmailKind = "ISSUED" | "REMINDER";

export type InvoiceEmailInput = {
  kind: InvoiceEmailKind;
  invoiceNumber: string;
  organizationName: string;
  contactName: string | null;
  projectName: string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  dueDate: string | null;
  overdue: boolean;
  portalUrl: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Trimmed, lower-cased billing email, or null when absent or not a plausible address. */
export function normaliseBillingEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  return email;
}

export function formatEmailMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatEmailDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export const INVOICE_CTA = "View and pay invoice";

export const INVOICE_FALLBACK_TEXT = "Open your invoice in your browser";

function introLine(input: InvoiceEmailInput): string {
  if (input.kind === "ISSUED") {
    return `A new invoice has been issued to ${input.organizationName}.`;
  }

  return input.overdue
    ? `This is a reminder that invoice ${input.invoiceNumber} for ${input.organizationName} is now overdue.`
    : `Here is a copy of invoice ${input.invoiceNumber} for ${input.organizationName}.`;
}

/* "Tax invoice" (GST charged) or "Invoice" must stay visible on every send, reminders included. */
function eyebrow(input: InvoiceEmailInput, documentTitle: string): string {
  return input.overdue ? `${documentTitle} · overdue` : documentTitle;
}

export function renderInvoiceEmail(input: InvoiceEmailInput): RenderedEmail {
  const subtotal = formatEmailMoney(input.subtotalCents, input.currency);
  const tax = formatEmailMoney(input.taxCents, input.currency);
  // Emails are only sent for issued invoices.
  const presentation = presentInvoiceTax({
    status: "OPEN",
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
  });
  // The shared footer already names Drylake Pty Ltd; a tax invoice also needs the ABN.
  const business = `ABN ${DRYLAKE_BUSINESS.abn}`;
  const total = formatEmailMoney(input.totalCents, input.currency);
  const due = formatEmailDate(input.dueDate);
  const greeting = input.contactName ? `Hi ${input.contactName},` : "Hello,";
  const intro = introLine(input);
  const payLine = "You can review the invoice and pay securely online in Drylake Workspace.";
  const totalLabel = `${presentation.totalLabel} (${input.currency.toUpperCase()})`;

  const subject =
    input.kind === "REMINDER" && input.overdue
      ? `Overdue: invoice ${input.invoiceNumber} from Drylake`
      : `Invoice ${input.invoiceNumber} from Drylake`;

  const rows: DetailRow[] = [
    { label: "Invoice", value: input.invoiceNumber },
    ...(input.projectName ? [{ label: "Project", value: input.projectName }] : []),
    { label: "Subtotal", value: subtotal },
    ...(presentation.showGstLine ? [{ label: presentation.gstLabel, value: tax }] : []),
    { label: input.overdue ? "Due date (overdue)" : "Due date", value: due },
    { label: totalLabel, value: total, emphasis: true },
  ];

  const html = renderEmailLayout({
    title: subject,
    preheader: `${intro} ${presentation.totalLabel}: ${total}.`,
    eyebrow: eyebrow(input, presentation.documentTitle),
    heading: `Invoice ${input.invoiceNumber}`,
    assetOrigin: new URL(input.portalUrl).origin,
    legalLine: business,
    bodyHtml: [
      paragraph(greeting),
      paragraph(intro),
      detailTable(rows),
      presentation.noGstNote ? paragraph(presentation.noGstNote, { muted: true, small: true }) : "",
      paragraph(payLine),
      button({ href: input.portalUrl, label: INVOICE_CTA }),
      fallbackLink({ href: input.portalUrl, linkText: INVOICE_FALLBACK_TEXT }),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const text = [
    `Drylake · ${presentation.documentTitle}`,
    "",
    `Invoice ${input.invoiceNumber}`,
    "",
    greeting,
    "",
    intro,
    "",
    `Invoice: ${input.invoiceNumber}`,
    input.projectName ? `Project: ${input.projectName}` : null,
    `Subtotal: ${subtotal}`,
    presentation.showGstLine ? `${presentation.gstLabel}: ${tax}` : presentation.noGstNote,
    `${totalLabel}: ${total}`,
    `Due date: ${due}${input.overdue ? " (overdue)" : ""}`,
    "",
    payLine,
    input.portalUrl,
    "",
    ...textFooter(business),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { subject, html, text };
}
