import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
};

export default async function NewInvoicePage({
  params,
}: NewInvoicePageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { organizationId } = await params;

  const supabase = createAdminSupabaseClient();

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("id", organizationId)
      .maybeSingle();

  if (organizationError) {
    console.error("Invoice organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load organisation.");
  }

  if (!organization) {
    notFound();
  }

  const { data: projects, error: projectsError } =
    await supabase
      .from("projects")
      .select("id, name, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

  if (projectsError) {
    console.error("Invoice project lookup failed:", {
      code: projectsError.code,
      message: projectsError.message,
    });

    throw new Error("Unable to load projects.");
  }

  const disabled = organization.status !== "ACTIVE";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-12">
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

        <section className="py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <FileText
              size={20}
              className="text-[#f26a2e]"
            />
          </div>

          <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">
            Create Invoice
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
            Create an invoice for this client. Stripe payment
            collection will be connected separately.
          </p>
        </section>

        {disabled ? (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-sm text-red-300">
            Invoices cannot be created for an inactive organisation.
          </div>
        ) : null}

        <form
          action={`/api/admin/clients/${organization.id}/invoices`}
          method="POST"
          className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="invoiceNumber"
              className="text-sm font-medium"
            >
              Invoice number
            </label>

            <input
              id="invoiceNumber"
              name="invoiceNumber"
              required
              maxLength={60}
              placeholder="DL-2026-001"
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 disabled:opacity-40"
            />
          </div>

          <div>
            <label
              htmlFor="projectId"
              className="text-sm font-medium"
            >
              Project
            </label>

            <select
              id="projectId"
              name="projectId"
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 disabled:opacity-40"
            >
              <option value="">
                No specific project
              </option>

              {(projects ?? []).map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="subtotal"
                className="text-sm font-medium"
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
                placeholder="1000.00"
                disabled={disabled}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 disabled:opacity-40"
              />
            </div>

            <div>
              <label
                htmlFor="tax"
                className="text-sm font-medium"
              >
                Tax / GST (AUD)
              </label>

              <input
                id="tax"
                name="tax"
                type="number"
                required
                min="0"
                max="9999999.99"
                step="0.01"
                defaultValue="0.00"
                disabled={disabled}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 disabled:opacity-40"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="text-sm font-medium"
            >
              Due date
            </label>

            <input
              id="dueDate"
              name="dueDate"
              type="date"
              disabled={disabled}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 disabled:opacity-40"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4">
            <input
              type="checkbox"
              name="visibleToClient"
              value="true"
              defaultChecked
              disabled={disabled}
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-medium">
                Visible to client
              </span>

              <span className="mt-1 block text-xs leading-5 text-white/35">
                Allow members of this organisation to view the invoice.
              </span>
            </span>
          </label>

          <div className="flex justify-end border-t border-white/10 pt-6">
            <button
              type="submit"
              disabled={disabled}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold !text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}