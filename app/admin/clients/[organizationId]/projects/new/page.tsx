import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminProjectForm from "@/components/admin/AdminProjectForm";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const metadata = {
  title: "Create Project | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type NewProjectPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function NewProjectPage({
  params,
}: NewProjectPageProps) {
  // ---------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/clients");
  }

  // ---------------------------------------------------------
  // Platform admin authorization
  // ---------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  // ---------------------------------------------------------
  // Route parameters
  // ---------------------------------------------------------

  const { organizationId } = await params;

  if (!isUuid(organizationId)) {
    notFound();
  }

  // ---------------------------------------------------------
  // Load client organisation
  // ---------------------------------------------------------

  const supabase = createAdminSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      status
    `)
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error(
      "Create project organisation lookup failed:",
      {
        code: error.code,
        message: error.message,
      }
    );

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <main className="min-h-full bg-[#f4f4f1] text-neutral-950">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {/* ---------------------------------------------------
            Page header
        ---------------------------------------------------- */}

        <AdminPageHeader
          eyebrow={organization.name}
          title="Create Project"
          description="Create and configure a new client project."
        />

        {/* ---------------------------------------------------
            Workspace
        ---------------------------------------------------- */}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main form */}

          <AdminProjectForm
            organizationId={organization.id}
            organizationStatus={organization.status}
          />

          {/* Sidebar information */}

          <aside className="space-y-4">
            {/* Project workspace information */}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <FolderKanban
                  size={18}
                  className="text-[#f26a2e]"
                />
              </div>

              <p className="mt-5 text-sm font-semibold text-neutral-950">
                Project workspace
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                After creation, you can add milestones,
                client updates and project documents from
                the project workspace.
              </p>
            </div>

            {/* Client information */}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Client
              </p>

              <p className="mt-2 text-sm font-semibold text-neutral-950">
                {organization.name}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span
                  className={
                    organization.status === "ACTIVE"
                      ? "h-2 w-2 rounded-full bg-emerald-500"
                      : "h-2 w-2 rounded-full bg-amber-500"
                  }
                />

                <span className="text-sm text-neutral-600">
                  {organization.status}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}