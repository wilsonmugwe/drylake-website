/*
 * Invoice email rendering (issue + resend). Pure: no env reads, no SDK, relative imports
 * only, so the copy rules are unit tested (tests/invoice-email.test.mjs):
 *   - every interpolated value is HTML-escaped,
 *   - GST lines come from the STORED amounts via presentInvoiceTax (lib/invoices/gst.ts),
 *     the same function the admin and client views use,
 *   - business identity (legal name, ABN) comes from lib/business.ts,
 *   - no em dashes in client-facing copy,
 *   - the email links to the invoice in Drylake Workspace, where payment happens. The
 *     button and the plain link are the SAME string (portalUrl), built by
 *     lib/invoices/invoice-url.ts.
 */

import { DRYLAKE_BUSINESS } from "../business.ts";
import { presentInvoiceTax } from "../invoices/gst.ts";

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

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
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

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

const LABEL = "padding:10px 0;color:#737373;";
const VALUE = "padding:10px 0;color:#171717;";

function row(label: string, value: string): string {
  return `<tr><td style="${LABEL}">${label}</td><td align="right" style="${VALUE}">${value}</td></tr>`;
}

function introLine(input: InvoiceEmailInput): string {
  if (input.kind === "ISSUED") {
    return `A new invoice has been issued to ${input.organizationName}.`;
  }

  return input.overdue
    ? `This is a reminder that invoice ${input.invoiceNumber} for ${input.organizationName} is now overdue.`
    : `Here is a copy of invoice ${input.invoiceNumber} for ${input.organizationName}.`;
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
  const business = `${DRYLAKE_BUSINESS.legalName} · ABN ${DRYLAKE_BUSINESS.abn}`;
  const total = formatEmailMoney(input.totalCents, input.currency);
  const due = formatEmailDate(input.dueDate);
  const greeting = input.contactName ? `Hi ${input.contactName},` : "Hello,";
  const intro = introLine(input);
  const payLine =
    "You can review the invoice and pay securely online in Drylake Workspace.";

  const subject =
    input.kind === "REMINDER" && input.overdue
      ? `Overdue: invoice ${input.invoiceNumber} from Drylake`
      : `Invoice ${input.invoiceNumber} from Drylake`;

  const e = escapeHtml;
  const portalUrl = e(input.portalUrl);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:40px 20px;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <div style="max-width:620px;margin:0 auto;border:1px solid #e5e5e5;border-radius:20px;background:#ffffff;overflow:hidden;">
      <div style="padding:32px;border-bottom:1px solid #e5e5e5;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f26a2e;font-weight:600;">Drylake · ${e(presentation.documentTitle)}</div>
        <h1 style="margin:20px 0 8px;font-size:28px;font-weight:600;color:#171717;">Invoice ${e(input.invoiceNumber)}</h1>
        <p style="margin:0;color:#737373;font-size:14px;line-height:1.7;">${e(greeting)}</p>
        <p style="margin:10px 0 0;color:#737373;font-size:14px;line-height:1.7;">${e(intro)}</p>
      </div>
      <div style="padding:32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;">
          ${row("Invoice", e(input.invoiceNumber))}
          ${input.projectName ? row("Project", e(input.projectName)) : ""}
          ${row("Subtotal", e(subtotal))}
          ${presentation.showGstLine ? row(e(presentation.gstLabel), e(tax)) : ""}
          ${row(input.overdue ? "Due date (overdue)" : "Due date", e(due))}
          <tr>
            <td style="padding:18px 0 0;border-top:1px solid #e5e5e5;color:#171717;font-weight:600;">${e(presentation.totalLabel)} (${e(input.currency.toUpperCase())})</td>
            <td align="right" style="padding:18px 0 0;border-top:1px solid #e5e5e5;color:#f26a2e;font-size:20px;font-weight:600;">${e(total)}</td>
          </tr>
        </table>
        ${
          presentation.noGstNote
            ? `<p style="margin:16px 0 0;color:#737373;font-size:12px;line-height:1.6;">${e(presentation.noGstNote)}</p>`
            : ""
        }
        <p style="margin:28px 0 0;color:#525252;font-size:13px;line-height:1.7;">${e(payLine)}</p>
        <p style="margin:20px 0 0;">
          <a href="${portalUrl}" style="display:inline-block;padding:12px 22px;border-radius:12px;background:#f26a2e;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">View and pay invoice</a>
        </p>
        <p style="margin:16px 0 0;color:#737373;font-size:12px;line-height:1.6;word-break:break-all;">${portalUrl}</p>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e5e5e5;color:#737373;font-size:12px;">${e(business)}</div>
    </div>
  </body>
</html>`;

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
    `${presentation.totalLabel} (${input.currency.toUpperCase()}): ${total}`,
    `Due date: ${due}${input.overdue ? " (overdue)" : ""}`,
    "",
    payLine,
    input.portalUrl,
    "",
    business,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { subject, html, text };
}
