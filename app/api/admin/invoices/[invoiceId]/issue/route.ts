import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getEmailFromAddress,
  getResendClient,
} from "@/lib/email/resend";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

function noStoreResponse(
  message: string,
  status: number
) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function formatMoney(
  cents: number,
  currency: string
) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    return noStoreResponse("Unauthorized", 401);
  }

  // ---------------------------------------------------------
  // Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    return noStoreResponse("Forbidden", 403);
  }

  const { invoiceId } = await context.params;

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Load invoice
  // ---------------------------------------------------------

  const { data: invoice, error: invoiceError } =
    await supabase
      .from("invoices")
      .select(
        `
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
        `
      )
      .eq("id", invoiceId)
      .maybeSingle();

  if (invoiceError) {
    console.error("Issue invoice lookup failed:", {
      code: invoiceError.code,
      message: invoiceError.message,
    });

    return noStoreResponse(
      "Unable to issue invoice.",
      500
    );
  }

  if (!invoice) {
    return noStoreResponse(
      "Invoice not found.",
      404
    );
  }

  // ---------------------------------------------------------
  // Validate invoice lifecycle
  //
  // This endpoint permits one transition only:
  //
  // DRAFT -> OPEN
  // ---------------------------------------------------------

  if (invoice.status !== "DRAFT") {
    return noStoreResponse(
      "Only draft invoices can be issued.",
      409
    );
  }

  if (!invoice.visible_to_client) {
    return noStoreResponse(
      "Internal invoices cannot be issued.",
      409
    );
  }

  if (
    !Number.isSafeInteger(invoice.total_cents) ||
    invoice.total_cents <= 0
  ) {
    return noStoreResponse(
      "Invoice total must be greater than zero.",
      409
    );
  }

  // ---------------------------------------------------------
  // Load organisation and billing recipient
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select(
      `
        id,
        name,
        status,
        billing_contact_name,
        billing_email
      `
    )
    .eq("id", invoice.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Issue invoice organisation lookup failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    return noStoreResponse(
      "Unable to issue invoice.",
      500
    );
  }

  if (!organization) {
    return noStoreResponse(
      "Invoice organisation not found.",
      404
    );
  }

  if (organization.status !== "ACTIVE") {
    return noStoreResponse(
      "Invoices cannot be issued for an inactive organisation.",
      409
    );
  }

  const billingEmail =
    organization.billing_email?.trim().toLowerCase();

  if (!billingEmail) {
    return noStoreResponse(
      "A billing email must be configured before this invoice can be issued.",
      409
    );
  }

  if (
    billingEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      billingEmail
    )
  ) {
    return noStoreResponse(
      "The organisation billing email is invalid.",
      409
    );
  }

  // ---------------------------------------------------------
  // Optional linked project
  //
  // Explicit organisation constraint prevents accidentally
  // using a project belonging to another tenant.
  // ---------------------------------------------------------

  let projectName: string | null = null;

  if (invoice.project_id) {
    const {
      data: project,
      error: projectError,
    } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", invoice.project_id)
      .eq(
        "organization_id",
        invoice.organization_id
      )
      .maybeSingle();

    if (projectError) {
      console.error(
        "Issue invoice project lookup failed:",
        {
          code: projectError.code,
          message: projectError.message,
        }
      );

      return noStoreResponse(
        "Unable to issue invoice.",
        500
      );
    }

    if (!project) {
      return noStoreResponse(
        "The invoice project does not belong to this organisation.",
        409
      );
    }

    projectName = project.name;
  }

  // ---------------------------------------------------------
  // Atomic invoice transition
  //
  // Update only if the invoice is STILL DRAFT.
  // ---------------------------------------------------------

  const {
    data: issuedInvoice,
    error: updateError,
  } = await supabase
    .from("invoices")
    .update({
      status: "OPEN",
    })
    .eq("id", invoice.id)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Issue invoice update failed:", {
      code: updateError.code,
      message: updateError.message,
    });

    return noStoreResponse(
      "Unable to issue invoice.",
      500
    );
  }

  if (!issuedInvoice) {
    return noStoreResponse(
      "Invoice status changed before it could be issued.",
      409
    );
  }

  // ---------------------------------------------------------
  // Audit invoice lifecycle transition
  // ---------------------------------------------------------

  const { error: auditError } = await supabase
    .from("audit_logs")
    .insert({
      actor_clerk_user_id: userId,
      action: "INVOICE_ISSUED",
      entity_type: "invoice",
      entity_id: invoice.id,
      metadata: {
        organization_id:
          invoice.organization_id,
        invoice_number:
          invoice.invoice_number,
        previous_status: "DRAFT",
        new_status: "OPEN",
        total_cents: invoice.total_cents,
      },
    });

  if (auditError) {
    console.error(
      "Invoice issue audit failed:",
      {
        code: auditError.code,
        message: auditError.message,
      }
    );
  }

  // ---------------------------------------------------------
  // Create notification record BEFORE sending
  //
  // This gives us a durable record even if Resend fails.
  // ---------------------------------------------------------

  const {
    data: notification,
    error: notificationError,
  } = await supabase
    .from("invoice_notifications")
    .insert({
      invoice_id: invoice.id,
      organization_id:
        invoice.organization_id,
      notification_type:
        "INVOICE_ISSUED",
      recipient_email: billingEmail,
      recipient_name:
        organization.billing_contact_name ||
        null,
      delivery_status: "PENDING",
      provider: "resend",
    })
    .select("id")
    .single();

  if (notificationError || !notification) {
    console.error(
      "Invoice notification creation failed:",
      {
        code: notificationError?.code,
        message: notificationError?.message,
      }
    );

    // The invoice is already legitimately OPEN.
    // Do not roll it back to DRAFT.
    return NextResponse.redirect(
      new URL(
        `/admin/invoices/${invoice.id}`,
        request.url
      ),
      303
    );
  }

  // ---------------------------------------------------------
  // Prepare invoice email
  // ---------------------------------------------------------

  const formattedTotal = formatMoney(
    invoice.total_cents,
    invoice.currency
  );

  const formattedSubtotal = formatMoney(
    invoice.subtotal_cents,
    invoice.currency
  );

  const formattedTax = formatMoney(
    invoice.tax_cents,
    invoice.currency
  );

  const formattedDueDate = formatDate(
    invoice.due_date
  );

  const safeOrganizationName = escapeHtml(
    organization.name
  );

  const safeInvoiceNumber = escapeHtml(
    invoice.invoice_number
  );

  const safeProjectName = projectName
    ? escapeHtml(projectName)
    : null;

  const safeContactName =
    organization.billing_contact_name
      ? escapeHtml(
          organization.billing_contact_name
        )
      : null;

  // ---------------------------------------------------------
  // Send transactional invoice email
  // ---------------------------------------------------------

  try {
    const resend = getResendClient();
    const from = getEmailFromAddress();

    const { data, error } =
      await resend.emails.send({
        from,
        to: [billingEmail],

        subject: `Invoice ${invoice.invoice_number} from Drylake`,

        html: `
          <!doctype html>
          <html>
            <body
              style="
                margin:0;
                padding:40px 20px;
                background:#080808;
                font-family:Arial,Helvetica,sans-serif;
                color:#ffffff;
              "
            >
              <div
                style="
                  max-width:620px;
                  margin:0 auto;
                  border:1px solid #262626;
                  border-radius:20px;
                  background:#101010;
                  overflow:hidden;
                "
              >
                <div
                  style="
                    padding:32px;
                    border-bottom:1px solid #262626;
                  "
                >
                  <div
                    style="
                      font-size:12px;
                      letter-spacing:2px;
                      text-transform:uppercase;
                      color:#f26a2e;
                    "
                  >
                    Drylake
                  </div>

                  <h1
                    style="
                      margin:20px 0 8px;
                      font-size:28px;
                      font-weight:500;
                    "
                  >
                    Invoice ${safeInvoiceNumber}
                  </h1>

                  <p
                    style="
                      margin:0;
                      color:#a3a3a3;
                      font-size:14px;
                      line-height:1.7;
                    "
                  >
                    ${
                      safeContactName
                        ? `Hi ${safeContactName},`
                        : "Hello,"
                    }
                  </p>

                  <p
                    style="
                      margin:10px 0 0;
                      color:#a3a3a3;
                      font-size:14px;
                      line-height:1.7;
                    "
                  >
                    A new invoice has been issued
                    to ${safeOrganizationName}.
                  </p>
                </div>

                <div style="padding:32px;">
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    style="
                      border-collapse:collapse;
                      font-size:14px;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:10px 0;
                          color:#737373;
                        "
                      >
                        Invoice
                      </td>

                      <td
                        align="right"
                        style="
                          padding:10px 0;
                          color:#ffffff;
                        "
                      >
                        ${safeInvoiceNumber}
                      </td>
                    </tr>

                    ${
                      safeProjectName
                        ? `
                          <tr>
                            <td
                              style="
                                padding:10px 0;
                                color:#737373;
                              "
                            >
                              Project
                            </td>

                            <td
                              align="right"
                              style="
                                padding:10px 0;
                                color:#ffffff;
                              "
                            >
                              ${safeProjectName}
                            </td>
                          </tr>
                        `
                        : ""
                    }

                    <tr>
                      <td
                        style="
                          padding:10px 0;
                          color:#737373;
                        "
                      >
                        Subtotal
                      </td>

                      <td
                        align="right"
                        style="
                          padding:10px 0;
                          color:#ffffff;
                        "
                      >
                        ${formattedSubtotal}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:10px 0;
                          color:#737373;
                        "
                      >
                        Tax
                      </td>

                      <td
                        align="right"
                        style="
                          padding:10px 0;
                          color:#ffffff;
                        "
                      >
                        ${formattedTax}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:10px 0;
                          color:#737373;
                        "
                      >
                        Due date
                      </td>

                      <td
                        align="right"
                        style="
                          padding:10px 0;
                          color:#ffffff;
                        "
                      >
                        ${formattedDueDate}
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:18px 0 0;
                          border-top:1px solid #262626;
                          color:#ffffff;
                          font-weight:600;
                        "
                      >
                        Total
                      </td>

                      <td
                        align="right"
                        style="
                          padding:18px 0 0;
                          border-top:1px solid #262626;
                          color:#f26a2e;
                          font-size:20px;
                          font-weight:600;
                        "
                      >
                        ${formattedTotal}
                      </td>
                    </tr>
                  </table>

                  <p
                    style="
                      margin:28px 0 0;
                      color:#737373;
                      font-size:12px;
                      line-height:1.6;
                    "
                  >
                    Online payment will be available
                    through the secure Drylake client
                    portal once payment processing is
                    enabled.
                  </p>
                </div>

                <div
                  style="
                    padding:20px 32px;
                    border-top:1px solid #262626;
                    color:#737373;
                    font-size:12px;
                  "
                >
                  Drylake Pty Ltd · ABN 70 702 662 557
                </div>
              </div>
            </body>
          </html>
        `,

        text: [
          "Drylake",
          "",
          `Invoice ${invoice.invoice_number}`,
          "",
          organization.billing_contact_name
            ? `Hi ${organization.billing_contact_name},`
            : "Hello,",
          "",
          `A new invoice has been issued to ${organization.name}.`,
          "",
          `Invoice: ${invoice.invoice_number}`,
          projectName
            ? `Project: ${projectName}`
            : null,
          `Subtotal: ${formattedSubtotal}`,
          `Tax: ${formattedTax}`,
          `Total: ${formattedTotal}`,
          `Due date: ${formattedDueDate}`,
          "",
          "Online payment will be available through the secure Drylake client portal once payment processing is enabled.",
          "",
          "Drylake Pty Ltd",
          "ABN 70 702 662 557",
        ]
          .filter(
            (
              line
            ): line is string =>
              line !== null
          )
          .join("\n"),
      });

    // -------------------------------------------------------
    // Provider rejected message
    // -------------------------------------------------------

    if (error) {
      console.error(
        "Invoice email rejected by Resend:",
        {
          name: error.name,
          message: error.message,
        }
      );

      await supabase
        .from("invoice_notifications")
        .update({
          delivery_status: "FAILED",
          error_message:
            "Email provider rejected the message.",
        })
        .eq("id", notification.id);

      return NextResponse.redirect(
        new URL(
          `/admin/invoices/${invoice.id}`,
          request.url
        ),
        303
      );
    }

    // -------------------------------------------------------
    // Provider accepted message
    // -------------------------------------------------------

    const {
      error: notificationUpdateError,
    } = await supabase
      .from("invoice_notifications")
      .update({
        delivery_status: "SENT",
        provider_message_id:
          data?.id ?? null,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", notification.id);

    if (notificationUpdateError) {
      console.error(
        "Invoice notification status update failed:",
        {
          code:
            notificationUpdateError.code,
          message:
            notificationUpdateError.message,
        }
      );
    }

    // -------------------------------------------------------
    // Audit email acceptance
    // -------------------------------------------------------

    const {
      error: emailAuditError,
    } = await supabase
      .from("audit_logs")
      .insert({
        actor_clerk_user_id: userId,
        action: "INVOICE_EMAIL_SENT",
        entity_type: "invoice",
        entity_id: invoice.id,
        metadata: {
          organization_id:
            invoice.organization_id,
          invoice_number:
            invoice.invoice_number,
          notification_id:
            notification.id,
        },
      });

    if (emailAuditError) {
      console.error(
        "Invoice email audit failed:",
        {
          code: emailAuditError.code,
          message: emailAuditError.message,
        }
      );
    }
  } catch (error) {
    console.error(
      "Invoice email delivery failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    const {
      error: failedUpdateError,
    } = await supabase
      .from("invoice_notifications")
      .update({
        delivery_status: "FAILED",
        error_message:
          "Transactional email delivery failed.",
      })
      .eq("id", notification.id);

    if (failedUpdateError) {
      console.error(
        "Failed notification status update failed:",
        {
          code: failedUpdateError.code,
          message: failedUpdateError.message,
        }
      );
    }
  }

  // ---------------------------------------------------------
  // Return to invoice
  // ---------------------------------------------------------

  return NextResponse.redirect(
    new URL(
      `/admin/invoices/${invoice.id}`,
      request.url
    ),
    303
  );
}