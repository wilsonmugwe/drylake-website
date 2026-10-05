import { auth } from "@clerk/nextjs/server";
import {
  notFound,
  redirect,
} from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Hash,
} from "lucide-react";

import AdminDateInput from "@/components/admin/AdminDateInput";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isGstRegistered } from "@/lib/tax";

export const metadata = {
  title: "Create Invoice | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type NewInvoicePageProps = {
  params: Promise<{
    organizationId: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

const inputClassName =
  "min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100";

export default async function NewInvoicePage({
  params,
  searchParams,
}: NewInvoicePageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    redirect(
      "/sign-in?redirect_url=/admin"
    );
  }

  const platformAdmin =
    await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { organizationId } =
    await params;

  const { error } =
    await searchParams;

  const supabase =
    createAdminSupabaseClient();

  // ---------------------------------------------------------
  // Organisation
  // ---------------------------------------------------------

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
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
      "Unable to load organisation."
    );
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Projects
  // ---------------------------------------------------------

  const {
    data: projects,
    error: projectsError,
  } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq(
      "organization_id",
      organization.id
    )
    .order(
      "created_at",
      { ascending: false }
    );

  if (projectsError) {
    console.error(
      "Invoice project lookup failed:",
      {
        code: projectsError.code,
        message: projectsError.message,
      }
    );

    throw new Error(
      "Unable to load projects."
    );
  }

  const disabled =
    organization.status !== "ACTIVE";

  const gstRegistered =
    isGstRegistered();

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/clients/${organization.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={15} />
          {organization.name}
        </Link>

        <AdminPageHeader
          eyebrow={organization.name}
          title="Create Invoice"
          description="Create a draft invoice for this client. The invoice number is assigned automatically by Drylake."
        />

        <div className="mt-7 space-y-6">
          {/* Error */}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-red-800">
                Invoice could not be created
              </p>

              <p className="mt-1 text-sm leading-6 text-red-700">
                {error}
              </p>
            </div>
          ) : null}

          {/* Inactive organisation */}

          {disabled ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Invoices cannot be created for an
              inactive organisation.
            </div>
          ) : null}

          {/* Form */}

          <form
            action={`/api/admin/clients/${organization.id}/invoices`}
            method="POST"
            className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Automatic invoice number */}

            <div>
              <div className="flex items-center gap-2">
                <Hash
                  size={15}
                  className="text-[#f26a2e]"
                />

                <span className="text-sm font-semibold text-neutral-900">
                  Invoice number
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="text-sm text-neutral-600">
                  Automatically assigned when
                  the invoice is created
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Drylake uses sequential invoice
                numbers such as DL-2026-009.
              </p>
            </div>

            {/* Project */}

            <div>
              <label
                htmlFor="projectId"
                className="block text-sm font-semibold text-neutral-900"
              >
                Project
              </label>

              <select
                id="projectId"
                name="projectId"
                disabled={disabled}
                className={`mt-3 ${inputClassName}`}
              >
                <option value="">
                  No specific project
                </option>

                {(projects ?? []).map(
                  (project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Amounts */}

            <div
              className={
                gstRegistered
                  ? "grid gap-6 sm:grid-cols-2"
                  : ""
              }
            >
              <div>
                <label
                  htmlFor="subtotal"
                  className="block text-sm font-semibold text-neutral-900"
                >
                  Subtotal (AUD)
                </label>

                <input
                  id="subtotal"
                  name="subtotal"
                  type="number"
                  required
                  min="0.01"
                  max="9999999.99"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="1000.00"
                  disabled={disabled}
                  className={`mt-3 ${inputClassName}`}
                />
              </div>

              {gstRegistered ? (
                <div>
                  <label
                    htmlFor="tax"
                    className="block text-sm font-semibold text-neutral-900"
                  >
                    GST (AUD)
                  </label>

                  <input
                    id="tax"
                    name="tax"
                    type="number"
                    required
                    min="0"
                    max="9999999.99"
                    step="0.01"
                    inputMode="decimal"
                    defaultValue="0.00"
                    disabled={disabled}
                    className={`mt-3 ${inputClassName}`}
                  />
                </div>
              ) : (
                <input
                  type="hidden"
                  name="tax"
                  value="0"
                />
              )}
            </div>

            {/* Due date */}

            <AdminDateInput
              id="dueDate"
              name="dueDate"
              label="Due date"
              disabled={disabled}
            />

            {/* Client visibility */}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 transition hover:bg-neutral-50">
              <input
                type="checkbox"
                name="visibleToClient"
                value="true"
                defaultChecked
                disabled={disabled}
                className="mt-1 h-4 w-4 accent-[#f26a2e]"
              />

              <span>
                <span className="block text-sm font-semibold text-neutral-900">
                  Visible to client
                </span>

                <span className="mt-1 block text-xs leading-5 text-neutral-500">
                  Allow members of this
                  organisation to view the
                  invoice after it is issued.
                </span>
              </span>
            </label>

            {/* Submit */}

            <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/clients/${organization.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={disabled}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Draft Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
