import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FolderKanban, Users } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminProjectForm from "@/components/admin/AdminProjectForm";

import { readFilterParam, type AdminSearchParams } from "@/lib/admin/filters";
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

type GlobalNewProjectPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

export default async function GlobalNewProjectPage({
  searchParams,
}: GlobalNewProjectPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/projects/new");
  }

  if (!(await isPlatformAdmin())) {
    redirect("/client");
  }

  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, status")
    .order("name", { ascending: true });

  if (error) {
    console.error("Create project client list failed:", {
      code: error.code,
      message: error.message,
    });

    throw new Error("Unable to load clients.");
  }

  const clients = data ?? [];

  // Optional ?client=<uuid> preselects a client (only if it exists and is active).
  const requestedClient = readFilterParam(await searchParams, "client");
  const initialClientId =
    isUuid(requestedClient) &&
    clients.some(
      (client) => client.id === requestedClient && client.status === "ACTIVE"
    )
      ? requestedClient
      : null;

  const activeCount = clients.filter((client) => client.status === "ACTIVE").length;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          eyebrow="Projects"
          title="Create Project"
          description="Choose the client, then set up the project."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <AdminProjectForm
            mode="global"
            clients={clients}
            initialClientId={initialClientId}
          />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <FolderKanban size={18} className="text-[#f26a2e]" aria-hidden="true" />
              </div>

              <p className="mt-5 text-sm font-semibold text-neutral-950">
                Project workspace
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                After creation you land in the project workspace, where you can
                add milestones, client updates and documents.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                <Users size={18} className="text-neutral-600" aria-hidden="true" />
              </div>

              <p className="mt-5 text-sm font-semibold text-neutral-950">
                {activeCount} active {activeCount === 1 ? "client" : "clients"}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Inactive clients are listed but cannot receive new projects.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
