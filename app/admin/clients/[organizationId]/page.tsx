import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Mail,
  Plus,
  Receipt,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Client",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ClientPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normaliseStatus(status: string) {
  return status.replaceAll("_", " ");
}

// Display-only tint for an invoice status chip. Unknown statuses fall back to neutral.
function invoiceStatusClassName(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700";
    case "OVERDUE":
      return "bg-red-50 text-red-700";
    case "ISSUED":
    case "SENT":
    case "OPEN":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

// Used on <Link>: the unlayered global `a { color: inherit }` beats Tailwind utilities,
// so the white label needs the important modifier to survive.
const primaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold !text-white transition hover:bg-neutral-800 disabled:opacity-50";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950";

const smallSecondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950";

const iconTileClassName =
  "flex h-10 w-10 items-center justify-center rounded-xl bg-[#f26a2e]/10";

export default async function AdminClientPage({
  params,
}: ClientPageProps) {
  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/clients");
  }

  // ==========================================================
  // PLATFORM ADMIN AUTHORIZATION
  // ==========================================================

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { organizationId } = await params;

  // A malformed ID can never match a row: 404 before the query, not a database error.
  if (!isUuid(organizationId)) {
    notFound();
  }

  // ==========================================================
  // PRIVILEGED DATABASE CLIENT
  // Created only after platform-admin authorization.
  // ==========================================================

  const supabase = createAdminSupabaseClient();

  // ==========================================================
  // ORGANISATION
  // ==========================================================

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select(
        `
          id,
          clerk_org_id,
          name,
          status,
          billing_contact_name,
          billing_email,
          created_at,
          updated_at
        `
      )
      .eq("id", organizationId)
      .maybeSingle();

  if (organizationError) {
    console.error("Admin client detail failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  // ==========================================================
  // PROJECTS
  // ==========================================================

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(
      "id, name, status, progress_override, start_date, target_end_date, created_at"
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Admin client projects failed:", {
      code: projectsError.code,
      message: projectsError.message,
    });
  }

  const projectList = projects ?? [];
  const projectCount = projectList.length;

  // ==========================================================
  // INVOICES
  // ==========================================================

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select(
      `
        id,
        project_id,
        invoice_number,
        status,
        currency,
        subtotal_cents,
        tax_cents,
        total_cents,
        due_date,
        paid_at,
        visible_to_client,
        created_at
      `
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (invoicesError) {
    console.error("Admin client invoices failed:", {
      code: invoicesError.code,
      message: invoicesError.message,
    });
  }

  const invoiceList = invoices ?? [];
  const invoiceCount = invoiceList.length;

  const visibleInvoiceCount = invoiceList.filter(
    (invoice) => invoice.visible_to_client
  ).length;

  const outstandingInvoiceCount = invoiceList.filter(
    (invoice) =>
      invoice.status !== "PAID" &&
      invoice.status !== "VOID" &&
      invoice.status !== "CANCELLED"
  ).length;

  const billingConfigured = Boolean(organization.billing_email);

  const active = organization.status === "ACTIVE";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <Link
          href="/admin/clients"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={15} />
          Clients
        </Link>

        {/* ====================================================
            CLIENT HEADER
        ==================================================== */}

        <AdminPageHeader
          eyebrow="Client Organisation"
          title={organization.name}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/admin/clients/${organization.id}/invoices/new`}
                className={secondaryButtonClassName}
              >
                <Receipt size={15} />
                Create Invoice
              </Link>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className={primaryButtonClassName}
              >
                <Plus size={16} />
                Create Project
              </Link>
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                active ? "bg-emerald-500" : "bg-neutral-400"
              }`}
            />
            {organization.status}
          </span>

          <span className="max-w-full truncate font-mono text-[11px] text-neutral-400 sm:max-w-[400px]">
            {organization.clerk_org_id}
          </span>

          {organization.created_at && (
            <span>
              Client since {formatDateTime(organization.created_at)}
            </span>
          )}

          {organization.updated_at && (
            <span>
              Updated {formatDateTime(organization.updated_at)}
            </span>
          )}
        </div>

        {/* ====================================================
            OVERVIEW
        ==================================================== */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-950">
              Overview
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Current client workspace status
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Projects */}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <span className={iconTileClassName}>
                  <FolderKanban
                    size={16}
                    className="text-[#f26a2e]"
                  />
                </span>

                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Projects
                </span>
              </div>

              <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                {projectCount}
              </p>

              <p className="mt-2 text-xs text-neutral-500">
                {projectCount === 1
                  ? "Project in this workspace"
                  : "Projects in this workspace"}
              </p>
            </div>

            {/* Invoices */}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <span className={iconTileClassName}>
                  <Receipt
                    size={16}
                    className="text-[#f26a2e]"
                  />
                </span>

                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Billing
                </span>
              </div>

              <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                {invoiceCount}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                <span>
                  {visibleInvoiceCount} client visible
                </span>

                {outstandingInvoiceCount > 0 && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-[#c2541f]">
                    {outstandingInvoiceCount} open
                  </span>
                )}
              </div>
            </div>

            {/* Billing contact */}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <span className={iconTileClassName}>
                  <Mail
                    size={16}
                    className="text-[#f26a2e]"
                  />
                </span>

                <span
                  className={
                    billingConfigured
                      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700"
                      : "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700"
                  }
                >
                  {billingConfigured ? "Configured" : "Not set"}
                </span>
              </div>

              <p className="mt-6 truncate text-sm font-semibold text-neutral-950">
                {organization.billing_contact_name ||
                  (billingConfigured
                    ? "Billing contact"
                    : "No billing contact")}
              </p>

              <p className="mt-2 truncate text-xs text-neutral-500">
                {organization.billing_email ||
                  "Add a billing contact before issuing invoices"}
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            PROJECTS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Projects
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Delivery work for {organization.name}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-400">
                {projectCount} {projectCount === 1 ? "project" : "projects"}
              </span>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className={smallSecondaryButtonClassName}
              >
                <Plus size={14} />
                New
              </Link>
            </div>
          </div>

          {projectsError ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Unable to load projects.
              </p>
            </div>
          ) : projectList.length > 0 ? (
            <div>
              {projectList.map((project) => {
                const progress = project.progress_override;

                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="group block border-b border-neutral-100 px-5 py-4 transition last:border-b-0 hover:bg-neutral-50 sm:px-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                          <FolderKanban
                            size={17}
                            className="text-[#f26a2e]"
                          />
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-950">
                            {project.name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                            <span className="capitalize">
                              {normaliseStatus(project.status).toLowerCase()}
                            </span>

                            {project.target_end_date && (
                              <>
                                <span aria-hidden="true">·</span>

                                <span>
                                  Target {formatDate(project.target_end_date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <div className="w-full min-w-[130px] sm:w-36">
                          <div className="flex items-center justify-between gap-4 text-xs text-neutral-500">
                            <span>Progress</span>

                            <span className="font-medium text-neutral-700">
                              {progress !== null
                                ? `${progress}%`
                                : "Auto"}
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                            {progress !== null ? (
                              <div
                                className="h-full rounded-full bg-[#f26a2e]"
                                style={{
                                  width: `${Math.min(
                                    Math.max(progress, 0),
                                    100
                                  )}%`,
                                }}
                              />
                            ) : (
                              <div className="h-full w-1/3 rounded-full bg-neutral-300" />
                            )}
                          </div>
                        </div>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-500"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center sm:p-10">
              <FolderKanban className="mx-auto text-[#f26a2e]" />

              <h3 className="mt-4 font-semibold text-neutral-950">
                No projects yet
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
                Create the first project for this client to begin tracking
                milestones, progress, updates and documents.
              </p>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className={`mt-6 ${secondaryButtonClassName}`}
              >
                <Plus size={15} />
                Create Project
              </Link>
            </div>
          )}
        </section>

        {/* ====================================================
            BILLING AREA
        ==================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          {/* Billing contact */}

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className={iconTileClassName}>
                <Mail
                  size={17}
                  className="text-[#f26a2e]"
                />
              </span>

              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Billing contact
              </span>
            </div>

            {organization.billing_email ? (
              <div className="mt-6">
                <p className="text-base font-semibold text-neutral-950">
                  {organization.billing_contact_name || "Billing contact"}
                </p>

                <p className="mt-2 break-all text-sm text-neutral-600">
                  {organization.billing_email}
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-base font-semibold text-neutral-950">
                  No billing contact
                </p>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Add a billing contact before issuing client invoices.
                </p>
              </div>
            )}

            <Link
              href={`/admin/clients/${organization.id}/billing`}
              className={`mt-6 ${smallSecondaryButtonClassName}`}
            >
              {organization.billing_email ? "Edit contact" : "Add contact"}

              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Invoice summary */}

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className={iconTileClassName}>
                <CircleDollarSign
                  size={17}
                  className="text-[#f26a2e]"
                />
              </span>

              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Invoice overview
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-xl bg-neutral-50 p-3 sm:p-4">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                  {invoiceCount}
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Total
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-3 sm:p-4">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                  {visibleInvoiceCount}
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Client visible
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-3 sm:p-4">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                  {outstandingInvoiceCount}
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  Open
                </p>
              </div>
            </div>

            <Link
              href={`/admin/clients/${organization.id}/invoices/new`}
              className={`mt-6 ${smallSecondaryButtonClassName}`}
            >
              <Plus size={14} />
              Create invoice
            </Link>
          </div>
        </section>

        {/* ====================================================
            INVOICES
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Recent invoices
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Billing activity for {organization.name}
              </p>
            </div>

            <Link
              href={`/admin/clients/${organization.id}/invoices/new`}
              className={`w-fit ${smallSecondaryButtonClassName}`}
            >
              <Plus size={14} />
              New invoice
            </Link>
          </div>

          {invoicesError ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Unable to load invoices.
              </p>
            </div>
          ) : invoiceList.length > 0 ? (
            <div>
              {invoiceList.map((invoice) => {
                const linkedProject = projectList.find(
                  (project) => project.id === invoice.project_id
                );

                return (
                  <Link
                    key={invoice.id}
                    href={`/admin/invoices/${invoice.id}`}
                    className="group flex flex-col gap-4 border-b border-neutral-100 px-5 py-4 transition last:border-b-0 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                        <Receipt
                          size={17}
                          className="text-[#f26a2e]"
                        />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950">
                          {invoice.invoice_number}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                          <span className="font-medium text-neutral-700">
                            {formatMoney(
                              invoice.total_cents,
                              invoice.currency
                            )}
                          </span>

                          <span aria-hidden="true">·</span>

                          <span>
                            {invoice.due_date
                              ? `Due ${formatDate(invoice.due_date)}`
                              : "No due date"}
                          </span>

                          <span aria-hidden="true">·</span>

                          <span className="truncate">
                            {linkedProject
                              ? linkedProject.name
                              : "No project"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={
                          invoice.visible_to_client
                            ? "rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c2541f]"
                            : "rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600"
                        }
                      >
                        {invoice.visible_to_client
                          ? "Client visible"
                          : "Internal"}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${invoiceStatusClassName(
                          invoice.status
                        )}`}
                      >
                        {normaliseStatus(invoice.status)}
                      </span>

                      <ChevronRight
                        size={16}
                        className="ml-1 hidden text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-neutral-500 sm:block"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center sm:p-10">
              <Receipt className="mx-auto text-[#f26a2e]" />

              <h3 className="mt-4 font-semibold text-neutral-950">
                No invoices yet
              </h3>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">
                Create the first invoice for this client when billing is ready.
              </p>

              <Link
                href={`/admin/clients/${organization.id}/invoices/new`}
                className={`mt-6 ${secondaryButtonClassName}`}
              >
                <Plus size={15} />
                Create Invoice
              </Link>
            </div>
          )}
        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-10 flex flex-col gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{organization.name}</span>

            <span>Restricted administration</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
