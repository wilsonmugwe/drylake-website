import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CircleDollarSign,
  FolderKanban,
  Mail,
  Plus,
  Receipt,
  ShieldCheck,
} from "lucide-react";

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

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-[4%] h-[760px] w-[760px] rounded-full bg-[#f26a2e]/[0.055] blur-[180px]" />

        <div className="absolute -right-[15%] top-[28%] h-[600px] w-[600px] rounded-full bg-[#f26a2e]/[0.018] blur-[180px]" />

        <div className="absolute bottom-[-350px] left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-white/[0.018] blur-[180px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black, transparent 92%)",
          }}
        />

        <div className="absolute left-[6%] top-[18%] h-[420px] w-px bg-gradient-to-b from-transparent via-[#f26a2e]/20 to-transparent" />

        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex items-center justify-between border-b border-white/[0.08] py-7">
          <Link
            href="/admin/clients"
            className="group flex items-center gap-2.5 text-sm text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-200 group-hover:-translate-x-1"
            />

            <span>Clients</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
              <ShieldCheck
                size={13}
                strokeWidth={1.8}
                className="text-[#f26a2e]"
              />
            </div>

            <p className="hidden text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/35 sm:block">
              Platform Admin
            </p>
          </div>
        </header>

        {/* ====================================================
            CLIENT HERO
        ==================================================== */}

        <section className="pb-12 pt-14 sm:pb-14 sm:pt-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05] px-3.5 py-2">
                <Building2
                  size={13}
                  strokeWidth={1.8}
                  className="text-[#f26a2e]"
                />

                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#f26a2e]">
                  Client Organisation
                </span>
              </div>

              <h1 className="mt-7 max-w-3xl truncate text-5xl font-medium tracking-[-0.055em] sm:text-6xl">
                {organization.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#f26a2e]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  {organization.status}
                </span>

                <span className="max-w-[400px] truncate font-mono text-[0.68rem] text-white/25">
                  {organization.clerk_org_id}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/25">
                {organization.created_at && (
                  <span>
                    Client since {formatDateTime(organization.created_at)}
                  </span>
                )}

                {organization.updated_at && (
                  <>
                    <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

                    <span>
                      Updated {formatDateTime(organization.updated_at)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/admin/clients/${organization.id}/invoices/new`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-3.5 text-sm font-medium text-white/70 transition duration-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-white"
              >
                <Receipt size={15} />

                Create Invoice
              </Link>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold !text-black transition duration-300 hover:bg-neutral-200"
              >
                <Plus
                  size={16}
                  className="transition-transform duration-200 group-hover:rotate-90"
                />

                Create Project
              </Link>
            </div>
          </div>
        </section>

        {/* ====================================================
            OVERVIEW
        ==================================================== */}

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium">
                Overview
              </p>

              <p className="mt-1 text-xs text-white/30">
                Current client workspace status
              </p>
            </div>

            <span className="hidden text-[0.58rem] uppercase tracking-[0.16em] text-white/20 sm:block">
              Live workspace
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* Projects */}

            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.018] p-6">
              <div className="absolute right-[-60px] top-[-60px] h-[160px] w-[160px] rounded-full bg-[#f26a2e]/[0.035] blur-[60px]" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <FolderKanban
                      size={16}
                      strokeWidth={1.7}
                      className="text-[#f26a2e]"
                    />
                  </div>

                  <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                    Projects
                  </span>
                </div>

                <p className="mt-7 text-3xl font-medium tracking-[-0.04em]">
                  {projectCount}
                </p>

                <p className="mt-2 text-xs text-white/30">
                  {projectCount === 1
                    ? "Project in this workspace"
                    : "Projects in this workspace"}
                </p>
              </div>
            </div>

            {/* Invoices */}

            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.018] p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <Receipt
                    size={16}
                    strokeWidth={1.7}
                    className="text-[#f26a2e]"
                  />
                </div>

                <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                  Billing
                </span>
              </div>

              <p className="mt-7 text-3xl font-medium tracking-[-0.04em]">
                {invoiceCount}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/30">
                <span>
                  {visibleInvoiceCount} client visible
                </span>

                {outstandingInvoiceCount > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />

                    <span className="text-[#f26a2e]/70">
                      {outstandingInvoiceCount} open
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Billing contact */}

            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.018] p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <Mail
                    size={16}
                    strokeWidth={1.7}
                    className="text-[#f26a2e]"
                  />
                </div>

                <span
                  className={
                    billingConfigured
                      ? "rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-2 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-[#f26a2e]"
                      : "rounded-full border border-white/[0.07] px-2 py-1 text-[0.5rem] font-medium uppercase tracking-[0.12em] text-white/25"
                  }
                >
                  {billingConfigured ? "Configured" : "Not set"}
                </span>
              </div>

              <p className="mt-7 truncate text-sm font-medium">
                {organization.billing_contact_name ||
                  (billingConfigured
                    ? "Billing contact"
                    : "No billing contact")}
              </p>

              <p className="mt-2 truncate text-xs text-white/30">
                {organization.billing_email ||
                  "Add a billing contact before issuing invoices"}
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            PROJECTS
        ==================================================== */}

        <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0a]/75 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-sm font-medium">
                Projects
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Delivery work for {organization.name}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[0.58rem] uppercase tracking-[0.15em] text-white/25">
                {projectCount} {projectCount === 1 ? "project" : "projects"}
              </span>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-white/50 transition hover:border-white/[0.15] hover:text-white"
              >
                <Plus size={13} />
                New
              </Link>
            </div>
          </div>

          {projectsError ? (
            <div className="px-6 py-9 sm:px-7">
              <p className="text-sm text-red-400">
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
                    className="group relative block border-b border-white/[0.07] px-6 py-6 transition duration-300 last:border-b-0 hover:bg-white/[0.025] sm:px-7"
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-px bg-[#f26a2e] opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] transition group-hover:border-[#f26a2e]/20 group-hover:bg-[#f26a2e]/[0.04]">
                          <FolderKanban
                            size={16}
                            strokeWidth={1.7}
                            className="text-[#f26a2e]"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium transition-colors group-hover:text-[#f26a2e] sm:text-base">
                            {project.name}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.65rem] text-white/25">
                            <span className="uppercase tracking-[0.12em]">
                              {normaliseStatus(project.status)}
                            </span>

                            {project.target_end_date && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-white/15" />

                                <span>
                                  Target {formatDate(project.target_end_date)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <div className="min-w-[130px]">
                          <div className="flex items-center justify-between gap-4 text-[0.62rem] text-white/30">
                            <span>Progress</span>

                            <span>
                              {progress !== null
                                ? `${progress}%`
                                : "Auto"}
                            </span>
                          </div>

                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
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
                              <div className="h-full w-1/3 rounded-full bg-white/15" />
                            )}
                          </div>
                        </div>

                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] transition group-hover:border-white/[0.12] group-hover:bg-white/[0.03]">
                          <ChevronRight
                            size={14}
                            className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
                <FolderKanban
                  size={17}
                  className="text-[#f26a2e]"
                />
              </div>

              <h3 className="mt-5 text-lg font-medium">
                No projects yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/35">
                Create the first project for this client to begin tracking
                milestones, progress, updates and documents.
              </p>

              <Link
                href={`/admin/clients/${organization.id}/projects/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/60 transition hover:border-white/[0.16] hover:text-white"
              >
                <Plus size={14} />
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

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.018] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <Mail
                  size={17}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />
              </div>

              <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                Billing contact
              </span>
            </div>

            {organization.billing_email ? (
              <div className="mt-7">
                <p className="text-base font-medium">
                  {organization.billing_contact_name || "Billing contact"}
                </p>

                <p className="mt-2 break-all text-sm text-white/35">
                  {organization.billing_email}
                </p>
              </div>
            ) : (
              <div className="mt-7">
                <p className="text-base font-medium">
                  No billing contact
                </p>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  Add a billing contact before issuing client invoices.
                </p>
              </div>
            )}

            <Link
              href={`/admin/clients/${organization.id}/billing`}
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 py-2.5 text-xs text-white/50 transition hover:border-white/[0.15] hover:text-white"
            >
              {organization.billing_email ? "Edit contact" : "Add contact"}

              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Invoice summary */}

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.018] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <CircleDollarSign
                  size={17}
                  strokeWidth={1.7}
                  className="text-[#f26a2e]"
                />
              </div>

              <span className="text-[0.55rem] uppercase tracking-[0.15em] text-white/20">
                Invoice overview
              </span>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-medium tracking-[-0.03em]">
                  {invoiceCount}
                </p>

                <p className="mt-1 text-[0.65rem] text-white/30">
                  Total
                </p>
              </div>

              <div>
                <p className="text-2xl font-medium tracking-[-0.03em]">
                  {visibleInvoiceCount}
                </p>

                <p className="mt-1 text-[0.65rem] text-white/30">
                  Client visible
                </p>
              </div>

              <div>
                <p className="text-2xl font-medium tracking-[-0.03em]">
                  {outstandingInvoiceCount}
                </p>

                <p className="mt-1 text-[0.65rem] text-white/30">
                  Open
                </p>
              </div>
            </div>

            <Link
              href={`/admin/clients/${organization.id}/invoices/new`}
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 py-2.5 text-xs text-white/50 transition hover:border-white/[0.15] hover:text-white"
            >
              <Plus size={13} />
              Create invoice
            </Link>
          </div>
        </section>

        {/* ====================================================
            INVOICES
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0a]/75 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 className="text-sm font-medium">
                Recent invoices
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Billing activity for {organization.name}
              </p>
            </div>

            <Link
              href={`/admin/clients/${organization.id}/invoices/new`}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-white/50 transition hover:border-white/[0.15] hover:text-white"
            >
              <Plus size={13} />
              New invoice
            </Link>
          </div>

          {invoicesError ? (
            <div className="px-6 py-9 sm:px-7">
              <p className="text-sm text-red-400">
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
                    className="group relative flex flex-col gap-5 border-b border-white/[0.07] px-6 py-5 transition duration-300 last:border-b-0 hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-7"
                  >
                    <div className="absolute bottom-0 left-0 top-0 w-px bg-[#f26a2e] opacity-0 transition-opacity group-hover:opacity-100" />

                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] transition group-hover:border-[#f26a2e]/20 group-hover:bg-[#f26a2e]/[0.04]">
                        <Receipt
                          size={16}
                          strokeWidth={1.7}
                          className="text-[#f26a2e]"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium transition-colors group-hover:text-[#f26a2e]">
                          {invoice.invoice_number}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-white/25">
                          <span>
                            {formatMoney(
                              invoice.total_cents,
                              invoice.currency
                            )}
                          </span>

                          <span className="h-1 w-1 rounded-full bg-white/15" />

                          <span>
                            {invoice.due_date
                              ? `Due ${formatDate(invoice.due_date)}`
                              : "No due date"}
                          </span>

                          <span className="hidden h-1 w-1 rounded-full bg-white/15 sm:block" />

                          <span>
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
                            ? "rounded-full border border-[#f26a2e]/15 bg-[#f26a2e]/[0.04] px-2.5 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.12em] text-[#f26a2e]"
                            : "rounded-full border border-white/[0.07] px-2.5 py-1 text-[0.52rem] font-medium uppercase tracking-[0.12em] text-white/25"
                        }
                      >
                        {invoice.visible_to_client
                          ? "Client visible"
                          : "Internal"}
                      </span>

                      <span className="rounded-full border border-white/[0.07] bg-white/[0.015] px-2.5 py-1 text-[0.52rem] font-medium uppercase tracking-[0.12em] text-white/35">
                        {normaliseStatus(invoice.status)}
                      </span>

                      <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.06] transition group-hover:border-white/[0.12] group-hover:bg-white/[0.03]">
                        <ChevronRight
                          size={14}
                          className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 sm:px-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f26a2e]/15 bg-[#f26a2e]/[0.05]">
                <Receipt
                  size={17}
                  className="text-[#f26a2e]"
                />
              </div>

              <h3 className="mt-5 text-lg font-medium">
                No invoices yet
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/35">
                Create the first invoice for this client when billing is ready.
              </p>

              <Link
                href={`/admin/clients/${organization.id}/invoices/new`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm text-white/60 transition hover:border-white/[0.16] hover:text-white"
              >
                <Plus size={14} />
                Create Invoice
              </Link>
            </div>
          )}
        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/[0.07] py-7 pt-12 text-[0.65rem] text-white/20 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Drylake Pty Ltd</span>

          <div className="flex items-center gap-5">
            <span>{organization.name}</span>

            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />

            <span>Restricted administration</span>
          </div>
        </footer>
      </div>
    </main>
  );
}