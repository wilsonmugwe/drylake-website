import { auth } from "@clerk/nextjs/server";
import {
  notFound,
  redirect,
} from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminInvoiceForm from "@/components/admin/AdminInvoiceForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  CREATE_ERROR_MESSAGES,
  isCreateErrorCode,
} from "@/lib/invoice-creation/validate";
import { isUuid } from "@/lib/validation/uuid";
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

  // No-JavaScript fallback: the API redirects back with a fixed error code; only known
  // codes map to text, so nothing from the URL is ever rendered.
  const { error: errorCode } = await searchParams;
  const initialError = isCreateErrorCode(errorCode)
    ? CREATE_ERROR_MESSAGES[errorCode]
    : null;

  if (!isUuid(organizationId)) {
    notFound();
  }

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
          {disabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Invoices cannot be created for an inactive client.
            </div>
          ) : null}

          <AdminInvoiceForm
            organizationId={organization.id}
            projects={(projects ?? []).map((project) => ({
              id: project.id,
              name: project.name,
            }))}
            gstRegistered={gstRegistered}
            disabled={disabled}
            initialError={initialError}
          />
        </div>
      </div>
    </main>
  );
}
