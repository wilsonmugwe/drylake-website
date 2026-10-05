import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
} from "lucide-react";

import AdminBillingForm from "@/components/admin/AdminBillingForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

type BillingPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export const metadata = {
  title: "Billing Contact | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params,
}: BillingPageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { organizationId } = await params;

  await requirePlatformAdmin(
    isUuid(organizationId)
      ? `/admin/clients/${organizationId}/billing`
      : "/admin/clients"
  );

  // ---------------------------------------------------------
  // Organisation
  // ---------------------------------------------------------

  if (!isUuid(organizationId)) {
    notFound();
  }

  const supabase = createAdminSupabaseClient();

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
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "Billing page organisation lookup failed:",
      {
        code: organizationError.code,
        message: organizationError.message,
      }
    );

    throw new Error(
      "Unable to load the client billing contact."
    );
  }

  if (!organization) {
    notFound();
  }

  const active = organization.status === "ACTIVE";

  // ---------------------------------------------------------
  // Page
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href={`/admin/clients/${organization.id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={15} />
          Back to client
        </Link>

        <AdminPageHeader
          eyebrow="Client Billing"
          title="Billing Contact"
          description={`Manage invoice and payment correspondence for ${organization.name}.`}
        />

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <AdminBillingForm
            organizationId={organization.id}
            billingContactName={
              organization.billing_contact_name
            }
            billingEmail={organization.billing_email}
            disabled={!active}
          />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f26a2e]/10">
                <Building2
                  size={17}
                  className="text-[#f26a2e]"
                />
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Client
              </p>

              <p className="mt-1 font-semibold text-neutral-950">
                {organization.name}
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {organization.status}
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <Mail
                size={17}
                className="text-[#f26a2e]"
              />

              <h2 className="mt-4 text-sm font-semibold text-neutral-950">
                Invoice delivery
              </h2>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                This address is used when Drylake issues or
                resends an invoice. Clients can then review
                the invoice and complete payment through
                their secure client portal.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}