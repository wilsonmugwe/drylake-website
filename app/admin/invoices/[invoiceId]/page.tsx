import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Mail,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import AdminInvoiceAction from "@/components/admin/AdminInvoiceAction";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isGstRegistered, NO_GST_NOTE } from "@/lib/tax";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Invoice | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type InvoicePageProps = {
  params: Promise<{
    invoiceId: string;
  }>;
};

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
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationLabel(type: string) {
  switch (type) {
    case "INVOICE_ISSUED":
      return "Invoice issued";

    case "PAYMENT_RECEIPT":
      return "Payment receipt";

    case "PAYMENT_REMINDER":
      return "Payment reminder";

    case "OVERDUE_NOTICE":
      return "Overdue notice";

    default:
      return type.replaceAll("_", " ");
  }
}

function notificationStatusClasses(
  status: string
) {
  switch (status) {
    case "DELIVERED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "SENT":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
  }
}

function invoiceStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "OPEN":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "OVERDUE":
      return "border-red-200 bg-red-50 text-red-700";

    case "DRAFT":
      return "border-neutral-200 bg-neutral-100 text-neutral-600";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
  }
}

function NotificationIcon({
  status,
}: {
  status: string;
}) {
  if (status === "FAILED") {
    return (
      <CircleAlert
        size={17}
        className="text-red-600"
      />
    );
  }

  if (status === "DELIVERED") {
    return (
      <CheckCircle2
        size={17}
        className="text-emerald-600"
      />
    );
  }

  if (status === "SENT") {
    return (
      <Mail
        size={17}
        className="text-blue-600"
      />
    );
  }

  return (
    <Clock3
      size={17}
      className="text-amber-600"
    />
  );
}

export default async function AdminInvoicePage({
  params,
}: InvoicePageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  // ---------------------------------------------------------
  // Invoice ID
  // ---------------------------------------------------------

  const { invoiceId } = await params;

  if (!isUuid(invoiceId)) {
    notFound();
  }

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Invoice
  // ---------------------------------------------------------

  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .select(
      `
        id,
        organization_id,
        project_id,
        invoice_number,
        stripe_invoice_id,
        status,
        currency,
        subtotal_cents,
        tax_cents,
        total_cents,
        due_date,
        paid_at,
        visible_to_client,
        created_at,
        updated_at
      `
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    console.error("Admin invoice lookup failed:", {
      code: invoiceError.code,
      message: invoiceError.message,
    });

    throw new Error("Unable to load invoice.");
  }

  if (!invoice) {
    notFound();
  }

  // ---------------------------------------------------------
  // Organisation
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
      "Invoice organisation lookup failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    throw new Error(
      "Unable to load invoice organisation."
    );
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Optional project
  // ---------------------------------------------------------

  let project: {
    id: string;
    name: string;
  } | null = null;

  if (invoice.project_id) {
    const {
      data,
      error,
    } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", invoice.project_id)
      .eq(
        "organization_id",
        organization.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Invoice project lookup failed:",
        {
          code: error.code,
          message: error.message,
        }
      );

      throw new Error(
        "Unable to load invoice project."
      );
    }

    project = data;
  }

  // ---------------------------------------------------------
  // Notification history
  // ---------------------------------------------------------

  const {
    data: notifications,
    error: notificationsError,
  } = await supabase
    .from("invoice_notifications")
    .select(
      `
        id,
        notification_type,
        recipient_email,
        recipient_name,
        delivery_status,
        provider,
        provider_message_id,
        error_message,
        sent_at,
        delivered_at,
        created_at
      `
    )
    .eq("invoice_id", invoice.id)
    .eq(
      "organization_id",
      organization.id
    )
    .order("created_at", {
      ascending: false,
    });

  if (notificationsError) {
    console.error(
      "Invoice notifications lookup failed:",
      {
        code: notificationsError.code,
        message: notificationsError.message,
      }
    );
  }

  const notificationList =
    notifications ?? [];

  const latestInvoiceEmail =
    notificationList.find(
      (notification) =>
        notification.notification_type ===
        "INVOICE_ISSUED"
    ) ?? null;

  // ---------------------------------------------------------
  // Action eligibility
  // ---------------------------------------------------------

  const hasBillingEmail =
    typeof organization.billing_email ===
      "string" &&
    organization.billing_email.trim().length >
      0;

  const canIssue =
    invoice.status === "DRAFT" &&
    invoice.total_cents > 0 &&
    invoice.visible_to_client &&
    organization.status === "ACTIVE" &&
    hasBillingEmail;

  const canResend =
    (invoice.status === "OPEN" ||
      invoice.status === "OVERDUE") &&
    invoice.visible_to_client &&
    invoice.total_cents > 0 &&
    organization.status === "ACTIVE" &&
    hasBillingEmail;

  const isPaid = invoice.status === "PAID";

  // ---------------------------------------------------------
  // Page
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1100px] p-5 sm:p-8 lg:p-10">
        {/* Back navigation */}

        <Link
          href={`/admin/clients/${organization.id}`}
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={15} />
          {organization.name}
        </Link>

        {/* Header */}

        <section className="flex flex-col gap-6 border-b border-neutral-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={14}
                className="text-[#f26a2e]"
              />

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f26a2e]">
                Invoice
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
              {invoice.invoice_number}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${invoiceStatusClasses(
                  invoice.status
                )}`}
              >
                {invoice.status}
              </span>

              <span
                className={
                  invoice.visible_to_client
                    ? "inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d9541f]"
                    : "inline-flex rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
                }
              >
                {invoice.visible_to_client
                  ? "Client visible"
                  : "Internal"}
              </span>

              {latestInvoiceEmail ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${notificationStatusClasses(
                    latestInvoiceEmail.delivery_status
                  )}`}
                >
                  Email{" "}
                  {
                    latestInvoiceEmail.delivery_status
                  }
                </span>
              ) : null}
            </div>
          </div>

          {/* Actions */}

          <div className="flex flex-wrap gap-3">
            {invoice.status === "DRAFT" ? (
              <AdminInvoiceAction
                invoiceId={invoice.id}
                action="issue"
                disabled={!canIssue}
              />
            ) : null}

            {canResend ? (
              <AdminInvoiceAction
                invoiceId={invoice.id}
                action="resend"
              />
            ) : null}
          </div>
        </section>

        {/* Paid state */}

        {isPaid ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Payment received
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                This invoice was paid
                {invoice.paid_at
                  ? ` on ${formatDateTime(
                      invoice.paid_at
                    )}.`
                  : "."}
              </p>
            </div>
          </div>
        ) : null}

        {/* Missing billing contact */}

        {!hasBillingEmail ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-900">
                  Billing email required
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  Add a billing email before
                  issuing or resending this
                  invoice.
                </p>

                <Link
                  href={`/admin/clients/${organization.id}/billing`}
                  className="mt-3 inline-flex text-sm font-semibold text-red-800 underline underline-offset-4"
                >
                  Configure billing contact
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Internal warning */}

        {!invoice.visible_to_client &&
        invoice.status === "DRAFT" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            This invoice cannot be issued while
            it is marked as internal.
          </div>
        ) : null}

        {/* Email failure */}

        {latestInvoiceEmail?.delivery_status ===
        "FAILED" ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-900">
                  Invoice email delivery failed
                </p>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  The invoice remains{" "}
                  {invoice.status}. Correct the
                  billing email if necessary and
                  use Resend Invoice Email.
                </p>

                <p className="mt-2 text-xs text-red-600">
                  Previous recipient:{" "}
                  {
                    latestInvoiceEmail.recipient_email
                  }
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Overview */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <Receipt
              size={18}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Client
            </p>

            <p className="mt-2 font-semibold text-neutral-950">
              {organization.name}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <FileText
              size={18}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Project
            </p>

            <p className="mt-2 font-semibold text-neutral-950">
              {project?.name ??
                "No specific project"}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <CalendarDays
              size={18}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Due date
            </p>

            <p className="mt-2 font-semibold text-neutral-950">
              {formatDate(invoice.due_date)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Total
            </p>

            <p className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
              {formatMoney(
                invoice.total_cents,
                invoice.currency
              )}
            </p>

            <p className="mt-1 text-xs text-neutral-400">
              {invoice.currency}
            </p>
          </div>
        </section>

        {/* Billing recipient */}

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail
                  size={17}
                  className="text-[#f26a2e]"
                />

                <h2 className="font-semibold text-neutral-950">
                  Billing Recipient
                </h2>
              </div>

              {hasBillingEmail ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-neutral-900">
                    {organization.billing_contact_name ||
                      "Billing contact"}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    {organization.billing_email}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-500">
                  No billing email configured.
                </p>
              )}
            </div>

            <Link
              href={`/admin/clients/${organization.id}/billing`}
              className="inline-flex min-h-10 w-fit items-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950"
            >
              Edit Billing Contact
            </Link>
          </div>
        </section>

        {/* Invoice summary */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-5">
            <h2 className="font-semibold text-neutral-950">
              Invoice Summary
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Financial breakdown for this
              invoice.
            </p>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="flex justify-between gap-6 text-sm">
              <span className="text-neutral-500">
                Subtotal
              </span>

              <span className="font-medium text-neutral-900">
                {formatMoney(
                  invoice.subtotal_cents,
                  invoice.currency
                )}
              </span>
            </div>

            {isGstRegistered() ? (
              <div className="flex justify-between gap-6 text-sm">
                <span className="text-neutral-500">
                  GST
                </span>

                <span className="font-medium text-neutral-900">
                  {formatMoney(
                    invoice.tax_cents,
                    invoice.currency
                  )}
                </span>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                {NO_GST_NOTE}
              </p>
            )}

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between gap-6">
                <span className="font-semibold text-neutral-950">
                  Total
                </span>

                <span className="text-xl font-semibold text-neutral-950">
                  {formatMoney(
                    invoice.total_cents,
                    invoice.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Email history */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Email History
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Invoice, reminder and receipt
                notifications.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {notificationList.length}{" "}
              {notificationList.length === 1
                ? "event"
                : "events"}
            </span>
          </div>

          {notificationsError ? (
            <div className="px-6 py-8">
              <p className="text-sm text-red-600">
                Unable to load email history.
              </p>
            </div>
          ) : notificationList.length > 0 ? (
            <div>
              {notificationList.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className="border-b border-neutral-200 px-6 py-5 last:border-b-0"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
                          <NotificationIcon
                            status={
                              notification.delivery_status
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900">
                            {notificationLabel(
                              notification.notification_type
                            )}
                          </p>

                          <p className="mt-1 break-all text-xs text-neutral-500">
                            {
                              notification.recipient_email
                            }
                          </p>

                          {notification.recipient_name ? (
                            <p className="mt-1 text-xs text-neutral-400">
                              {
                                notification.recipient_name
                              }
                            </p>
                          ) : null}

                          {notification.error_message ? (
                            <p className="mt-3 text-xs leading-5 text-red-600">
                              {
                                notification.error_message
                              }
                            </p>
                          ) : null}

                          {notification.provider_message_id ? (
                            <p className="mt-3 break-all text-[11px] text-neutral-400">
                              Provider ID:{" "}
                              {
                                notification.provider_message_id
                              }
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${notificationStatusClasses(
                            notification.delivery_status
                          )}`}
                        >
                          {
                            notification.delivery_status
                          }
                        </span>

                        <p className="mt-2 text-xs text-neutral-400">
                          {notification.sent_at
                            ? formatDateTime(
                                notification.sent_at
                              )
                            : formatDateTime(
                                notification.created_at
                              )}
                        </p>

                        {notification.delivered_at ? (
                          <p className="mt-1 text-[11px] text-emerald-600">
                            Delivered{" "}
                            {formatDateTime(
                              notification.delivered_at
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="px-6 py-10">
              <Mail
                size={21}
                className="text-[#f26a2e]"
              />

              <h3 className="mt-4 text-sm font-semibold text-neutral-900">
                No email activity
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                Email events for this invoice
                will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}