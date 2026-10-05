/*
 * Outcome codes the admin Issue / Resend routes redirect back with (?notice=CODE), and the
 * copy the admin invoice page shows for each. Codes, not raw messages, travel in the URL so
 * nothing user-controlled or provider-generated is ever rendered from the query string.
 */

export type AdminNoticeTone = "success" | "warning" | "error";

export type AdminNotice = { tone: AdminNoticeTone; message: string };

const NOTICES: Record<string, AdminNotice> = {
  ISSUED: { tone: "success", message: "Invoice issued and emailed to the billing contact." },
  ISSUED_EMAIL_FAILED: {
    tone: "warning",
    message:
      "Invoice issued, but the email could not be sent. It remains open for the client. Check the billing email, then use Resend Invoice Email.",
  },
  ISSUED_EMAIL_NOT_RECORDED: {
    tone: "warning",
    message:
      "Invoice issued, but the email could not be recorded or sent. Use Resend Invoice Email.",
  },
  RESENT: { tone: "success", message: "Invoice email sent to the billing contact." },
  RESEND_FAILED: {
    tone: "error",
    message: "The invoice email could not be sent. Check the billing email and try again.",
  },
  RESEND_NOT_RECORDED: {
    tone: "error",
    message: "The invoice email could not be recorded, so it was not sent. Try again.",
  },
  NOT_DRAFT: { tone: "error", message: "Only draft invoices can be issued." },
  STATUS_CHANGED: {
    tone: "error",
    message: "The invoice changed before this action completed. Review it and try again.",
  },
  NOT_OUTSTANDING: { tone: "error", message: "Only open or overdue invoices can be resent." },
  INTERNAL_INVOICE: {
    tone: "error",
    message: "Internal invoices cannot be issued or emailed. Make it client visible first.",
  },
  INVALID_TOTAL: { tone: "error", message: "Invoice total must be greater than zero." },
  ORGANIZATION_NOT_FOUND: { tone: "error", message: "The invoice organisation was not found." },
  ORGANIZATION_INACTIVE: {
    tone: "error",
    message: "Invoices cannot be issued or emailed for an inactive organisation.",
  },
  BILLING_EMAIL_MISSING: {
    tone: "error",
    message: "Add a billing email for this organisation before issuing or resending.",
  },
  BILLING_EMAIL_INVALID: {
    tone: "error",
    message: "The organisation billing email is invalid. Correct it and try again.",
  },
  PROJECT_MISMATCH: {
    tone: "error",
    message: "The invoice project does not belong to this organisation.",
  },
  LOOKUP_FAILED: { tone: "error", message: "Something went wrong loading the invoice. Try again." },
  UPDATE_FAILED: { tone: "error", message: "The invoice could not be updated. Try again." },
};

export function adminNoticeFor(code: unknown): AdminNotice | null {
  if (typeof code !== "string" || !Object.hasOwn(NOTICES, code)) {
    return null;
  }

  return NOTICES[code];
}
