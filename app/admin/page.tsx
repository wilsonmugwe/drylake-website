import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderKanban,
  Receipt,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createAdminSupabaseClient();

  const [clients, projects, invoices, documents] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("projects")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("invoices")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("documents")
        .select("*", {
          count: "exact",
          head: true,
        }),
    ]);

  const { data: recentClients } = await supabase
    .from("organizations")
    .select("id, name, status, created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Dashboard"
          description="Clients, delivery, documents and billing in one operational workspace."
        />

        <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <AdminStatCard
            label="Clients"
            value={clients.count ?? 0}
            icon={<Building2 size={17} />}
          />

          <AdminStatCard
            label="Projects"
            value={projects.count ?? 0}
            icon={<FolderKanban size={17} />}
          />

          <AdminStatCard
            label="Invoices"
            value={invoices.count ?? 0}
            icon={<Receipt size={17} />}
          />

          <AdminStatCard
            label="Documents"
            value={documents.count ?? 0}
            icon={<FileText size={17} />}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Recent clients
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Latest organisations added to Drylake
              </p>
            </div>

            <Link
              href="/admin/clients"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          {(recentClients ?? []).length > 0 ? (
            recentClients?.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Building2
                      size={17}
                      className="text-[#f26a2e]"
                    />
                  </span>

                  <div>
                    <p className="text-sm font-medium text-neutral-950">
                      {client.name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      {client.status}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  className="text-neutral-300"
                />
              </Link>
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <Building2
                size={22}
                className="mx-auto text-[#f26a2e]"
              />

              <p className="mt-3 text-sm font-medium text-neutral-800">
                No clients yet
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}