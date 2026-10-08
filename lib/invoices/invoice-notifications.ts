import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";
import {
  normaliseBillingEmail,
  renderInvoiceEmail,
  type InvoiceEmailKind,
} from "@/lib/email/invoice-email";
import { isOverdue } from "@/lib/invoices/lifecycle";
import { CONTACT_EMAIL } from "@/lib/site";

/*
 * Shared I/O for the admin Issue and Resend routes: load what the invoice email needs,
 * record a notification row, send through Resend, and record the outcome.
 *
 * Failure policy (decided, do not change casually): an email failure NEVER rolls back an
 * issued invoice. The invoice stays OPEN, the notification row records FAILED, and the admin
 * page offers Resend. A missing notification row is logged and reported as NOT_RECORDED.
 */

export type InvoiceEmailRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  invoice_number: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  due_date: string | null;
  visible_to_client: boolean;
};

export const INVOICE_EMAIL_SELECT = `
  id,
  organization_id,
  project_id,
  invoice_number,
  status,
  currency,
  subtotal_cents,
  tax_cents,
  total_cents,
  due_date,
  visible_to_client
`;

export type InvoiceEmailContext = {
  organizationName: string;
  contactName: string | null;
  billingEmail: string;
  projectName: string | null;
};

export type ContextResult =
  | { ok: true; context: InvoiceEmailContext }
  | { ok: false; code: string; transient: boolean };

/*
 * Organisation must be ACTIVE with a valid billing email; project must belong to the org.
 * On failure, transient true means a lookup failed and a retry may succeed; false means the
 * data itself must be fixed (missing or invalid billing email, inactive client, mismatch).
 */
export async function loadInvoiceEmailContext(
  supabase: SupabaseClient,
  invoice: InvoiceEmailRow
): Promise<ContextResult> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, status, billing_contact_name, billing_email")
    .eq("id", invoice.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error("Invoice email organisation lookup failed:", {
      code: organizationError.code,
    });
    return { ok: false, code: "LOOKUP_FAILED", transient: true };
  }

  if (!organization) {
    return { ok: false, code: "ORGANIZATION_NOT_FOUND", transient: false };
  }

  if (organization.status !== "ACTIVE") {
    return { ok: false, code: "ORGANIZATION_INACTIVE", transient: false };
  }

  const billingEmail = normaliseBillingEmail(organization.billing_email);

  if (!billingEmail) {
    return {
      ok: false,
      code: organization.billing_email?.trim() ? "BILLING_EMAIL_INVALID" : "BILLING_EMAIL_MISSING",
      transient: false,
    };
  }

  let projectName: string | null = null;

  if (invoice.project_id) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", invoice.project_id)
      .eq("organization_id", invoice.organization_id)
      .maybeSingle();

    if (projectError) {
      console.error("Invoice email project lookup failed:", { code: projectError.code });
      return { ok: false, code: "LOOKUP_FAILED", transient: true };
    }

    if (!project) {
      return { ok: false, code: "PROJECT_MISMATCH", transient: false };
    }

    projectName = project.name;
  }

  return {
    ok: true,
    context: {
      organizationName: organization.name,
      contactName: organization.billing_contact_name || null,
      billingEmail,
      projectName,
    },
  };
}

export type DeliveryOutcome = "SENT" | "FAILED" | "NOT_RECORDED";

const POSTGRES_CHECK_VIOLATION = "23514";
const POSTGRES_INVALID_ENUM = "22P02";

/*
 * Inserts the PENDING notification row. A resend is recorded as PAYMENT_REMINDER or
 * OVERDUE_NOTICE (labels the admin page already understands). If the production schema
 * constrains notification_type to a narrower set, fall back to INVOICE_ISSUED rather than
 * failing the send.
 */
async function insertNotification(
  supabase: SupabaseClient,
  invoice: InvoiceEmailRow,
  context: InvoiceEmailContext,
  notificationType: string
) {
  const row = {
    invoice_id: invoice.id,
    organization_id: invoice.organization_id,
    recipient_email: context.billingEmail,
    recipient_name: context.contactName,
    delivery_status: "PENDING",
    provider: "resend",
  };

  const first = await supabase
    .from("invoice_notifications")
    .insert({ ...row, notification_type: notificationType })
    .select("id")
    .single();

  if (
    first.error &&
    notificationType !== "INVOICE_ISSUED" &&
    (first.error.code === POSTGRES_CHECK_VIOLATION || first.error.code === POSTGRES_INVALID_ENUM)
  ) {
    return supabase
      .from("invoice_notifications")
      .insert({ ...row, notification_type: "INVOICE_ISSUED" })
      .select("id")
      .single();
  }

  return first;
}

async function markNotification(
  supabase: SupabaseClient,
  notificationId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase
    .from("invoice_notifications")
    .update(patch)
    .eq("id", notificationId);

  if (error) {
    console.error("Invoice notification status update failed:", { code: error.code });
  }
}

/**
 * Sends one invoice email and records it: a notification row, the Resend send, the row's
 * final status, and an audit entry on success.
 * @returns SENT, FAILED (send failed; row marked FAILED) or NOT_RECORDED (no notification
 *   row could be created, so nothing was sent).
 * Delivery failures are reported through the outcome, not thrown, and the invoice status is
 * never changed here.
 */
export async function deliverInvoiceEmail(
  supabase: SupabaseClient,
  invoice: InvoiceEmailRow,
  context: InvoiceEmailContext,
  options: { kind: InvoiceEmailKind; actorUserId: string; portalUrl: string }
): Promise<DeliveryOutcome> {
  const overdue = isOverdue(invoice);
  const notificationType =
    options.kind === "ISSUED" ? "INVOICE_ISSUED" : overdue ? "OVERDUE_NOTICE" : "PAYMENT_REMINDER";

  const { data: notification, error: notificationError } = await insertNotification(
    supabase,
    invoice,
    context,
    notificationType
  );

  if (notificationError || !notification) {
    console.error("Invoice notification creation failed:", { code: notificationError?.code });
    return "NOT_RECORDED";
  }

  const email = renderInvoiceEmail({
    kind: options.kind,
    invoiceNumber: invoice.invoice_number,
    organizationName: context.organizationName,
    contactName: context.contactName,
    projectName: context.projectName,
    currency: invoice.currency,
    subtotalCents: Number(invoice.subtotal_cents),
    taxCents: Number(invoice.tax_cents),
    totalCents: Number(invoice.total_cents),
    dueDate: invoice.due_date,
    overdue,
    portalUrl: options.portalUrl,
  });

  try {
    const { data, error } = await getResendClient().emails.send({
      from: getEmailFromAddress(),
      to: [context.billingEmail],
      // The sender address (billing@) has no mailbox: without this, a client replying to an
      // invoice gets a bounce (verified 2026-10-08, "billing wasn't found at drylake.com.au").
      replyTo: CONTACT_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      console.error("Invoice email rejected by Resend:", { name: error.name });
      await markNotification(supabase, notification.id, {
        delivery_status: "FAILED",
        error_message: "Email provider rejected the message.",
      });
      return "FAILED";
    }

    await markNotification(supabase, notification.id, {
      delivery_status: "SENT",
      provider_message_id: data?.id ?? null,
      sent_at: new Date().toISOString(),
      error_message: null,
    });
  } catch (error) {
    // Configuration errors (missing key / from address) land here too. Never log the key.
    console.error(
      "Invoice email delivery failed:",
      error instanceof Error ? error.name : "Unknown error"
    );
    await markNotification(supabase, notification.id, {
      delivery_status: "FAILED",
      error_message: "Transactional email delivery failed.",
    });
    return "FAILED";
  }

  // Same row shape as the shared audit helper; kept inline (see deferred-findings PR 4).
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_clerk_user_id: options.actorUserId,
    action: "INVOICE_EMAIL_SENT",
    entity_type: "invoice",
    entity_id: invoice.id,
    metadata: {
      organization_id: invoice.organization_id,
      invoice_number: invoice.invoice_number,
      notification_id: notification.id,
      email_kind: options.kind,
    },
  });

  if (auditError) {
    console.error("Invoice email audit failed:", { code: auditError.code });
  }

  return "SENT";
}
