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
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

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

function statusClasses(status: string) {
  switch (status) {
    case "DELIVERED":
      return "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300";

    case "SENT":
      return "border-blue-500/30 bg-blue-500/[0.06] text-blue-300";

    case "FAILED":
      return "border-red-500/30 bg-red-500/[0.06] text-red-300";

    case "PENDING":
      return "border-amber-500/30 bg-amber-500/[0.06] text-amber-300";

    default:
      return "border-white/10 bg-white/[0.03] text-white/45";
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
        className="text-red-400"
      />
    );
  }

  if (status === "DELIVERED") {
    return (
      <CheckCircle2
        size={17}
        className="text-emerald-400"
      />
    );
  }

  if (status === "SENT") {
    return (
      <Mail
        size={17}
        className="text-blue-400"
      />
    );
  }

  return (
    <Clock3
      size={17}
      className="text-amber-400"
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

  // ---------------------------------------------------------
  // Platform-admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { invoiceId } = await params;

  const supabase = createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Invoice
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
  // Organisation + billing contact
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
    const { data, error } = await supabase
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
  // Email / notification history
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
    .eq("organization_id", organization.id)
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
  // Actions
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

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href={`/admin/clients/${organization.id}`}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            {organization.name}
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <span className="text-xs uppercase tracking-[0.18em] text-white/35">
              Platform Admin
            </span>
          </div>
        </header>

        {/* Invoice heading */}
        <section className="flex flex-col gap-6 py-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              Invoice
            </p>

            <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
              {invoice.invoice_number}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-white/55">
                {invoice.status}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${
                  invoice.visible_to_client
                    ? "border-[#f26a2e]/30 text-[#f26a2e]"
                    : "border-white/10 text-white/35"
                }`}
              >
                {invoice.visible_to_client
                  ? "Client visible"
                  : "Internal"}
              </span>

              {latestInvoiceEmail ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${statusClasses(
                    latestInvoiceEmail.delivery_status
                  )}`}
                >
                  Email{" "}
                  {latestInvoiceEmail.delivery_status}
                </span>
              ) : null}
            </div>
          </div>

          {/* Invoice actions */}
          <div className="flex flex-wrap gap-3">
            {invoice.status === "DRAFT" ? (
              <form
                action={`/api/admin/invoices/${invoice.id}/issue`}
                method="POST"
              >
                <button
                  type="submit"
                  disabled={!canIssue}
                  className="rounded-xl bg-white px-6 py-3 text-sm font-semibold !text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Issue Invoice
                </button>
              </form>
            ) : null}

            {canResend ? (
              <form
                action={`/api/admin/invoices/${invoice.id}/resend`}
                method="POST"
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  <RefreshCw size={15} />
                  Resend Invoice Email
                </button>
              </form>
            ) : null}
          </div>
        </section>

        {/* Missing billing contact warning */}
        {!hasBillingEmail ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Billing email required
                </p>

                <p className="mt-1 text-sm leading-6 text-red-200/60">
                  Add a billing email before
                  issuing or resending this
                  invoice.
                </p>

                <Link
                  href={`/admin/clients/${organization.id}/billing`}
                  className="mt-3 inline-flex text-sm font-medium text-red-200 underline underline-offset-4"
                >
                  Configure billing contact
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Internal draft warning */}
        {!invoice.visible_to_client &&
        invoice.status === "DRAFT" ? (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5 text-sm leading-6 text-amber-200">
            This invoice cannot be issued while
            it is internal.
          </div>
        ) : null}

        {/* Latest email failure */}
        {latestInvoiceEmail?.delivery_status ===
        "FAILED" ? (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <div>
                <p className="text-sm font-medium text-red-200">
                  Invoice email delivery failed
                </p>

                <p className="mt-1 text-sm leading-6 text-red-200/60">
                  The invoice remains{" "}
                  {invoice.status}. Correct the
                  billing email if necessary and
                  use Resend Invoice Email.
                </p>

                <p className="mt-2 text-xs text-red-200/40">
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
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Receipt
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Client
            </p>

            <p className="mt-2 text-lg font-medium">
              {organization.name}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <FileText
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Project
            </p>

            <p className="mt-2 text-lg font-medium">
              {project?.name ??
                "No specific project"}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Due Date
            </p>

            <p className="mt-2 text-lg font-medium">
              {formatDate(invoice.due_date)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Total
            </p>

            <p className="mt-5 text-3xl font-medium">
              {formatMoney(
                invoice.total_cents,
                invoice.currency
              )}
            </p>

            <p className="mt-1 text-xs text-white/35">
              {invoice.currency}
            </p>
          </div>
        </section>

        {/* Billing recipient */}
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail
                  size={17}
                  className="text-[#f26a2e]"
                />

                <h2 className="font-medium">
                  Billing Recipient
                </h2>
              </div>

              {hasBillingEmail ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">
                    {organization.billing_contact_name ||
                      "Billing contact"}
                  </p>

                  <p className="mt-1 text-sm text-white/40">
                    {organization.billing_email}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/40">
                  No billing email configured.
                </p>
              )}
            </div>

            <Link
              href={`/admin/clients/${organization.id}/billing`}
              className="inline-flex w-fit rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
            >
              Edit Billing Contact
            </Link>
          </div>
        </section>

        {/* Invoice summary */}
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">
              Invoice Summary
            </h2>
          </div>

          <div className="space-y-4 px-6 py-6 sm:px-8">
            <div className="flex justify-between gap-6 text-sm">
              <span className="text-white/40">
                Subtotal
              </span>

              <span>
                {formatMoney(
                  invoice.subtotal_cents,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="flex justify-between gap-6 text-sm">
              <span className="text-white/40">
                Tax / GST
              </span>

              <span>
                {formatMoney(
                  invoice.tax_cents,
                  invoice.currency
                )}
              </span>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex justify-between gap-6">
                <span className="font-medium">
                  Total
                </span>

                <span className="text-xl font-medium">
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
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-medium">
                Email History
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Invoice, reminder and receipt
                notifications.
              </p>
            </div>

            <span className="text-xs uppercase tracking-[0.15em] text-white/30">
              {notificationList.length}{" "}
              {notificationList.length === 1
                ? "event"
                : "events"}
            </span>
          </div>

          {notificationsError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load email history.
              </p>
            </div>
          ) : notificationList.length > 0 ? (
            <div>
              {notificationList.map(
                (notification) => (
                  <div
                    key={notification.id}
                    className="border-b border-white/10 px-6 py-5 last:border-b-0 sm:px-8"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
                          <NotificationIcon
                            status={
                              notification.delivery_status
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {notificationLabel(
                              notification.notification_type
                            )}
                          </p>

                          <p className="mt-1 break-all text-xs text-white/40">
                            {
                              notification.recipient_email
                            }
                          </p>

                          {notification.recipient_name ? (
                            <p className="mt-1 text-xs text-white/25">
                              {
                                notification.recipient_name
                              }
                            </p>
                          ) : null}

                          {notification.error_message ? (
                            <p className="mt-3 text-xs leading-5 text-red-300/70">
                              {
                                notification.error_message
                              }
                            </p>
                          ) : null}

                          {notification.provider_message_id ? (
                            <p className="mt-3 break-all text-[0.7rem] text-white/20">
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
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] ${statusClasses(
                            notification.delivery_status
                          )}`}
                        >
                          {
                            notification.delivery_status
                          }
                        </span>

                        <p className="mt-2 text-xs text-white/30">
                          {notification.sent_at
                            ? formatDateTime(
                                notification.sent_at
                              )
                            : formatDateTime(
                                notification.created_at
                              )}
                        </p>

                        {notification.delivered_at ? (
                          <p className="mt-1 text-[0.7rem] text-emerald-300/50">
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
            <div className="px-6 py-10 sm:px-8">
              <Mail
                size={21}
                className="text-[#f26a2e]"
              />

              <h3 className="mt-4 text-sm font-medium">
                No email activity
              </h3>

              <p className="mt-2 text-sm text-white/40">
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