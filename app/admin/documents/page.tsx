import { FileText } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
        id,
        project_id,
        name,
        mime_type,
        size_bytes,
        visible_to_client,
        created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  const documents = data ?? [];

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Workspace"
          title="Documents"
          description="Central view of project documents and client-visible files."
        />

        <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load documents.
            </p>
          ) : documents.length > 0 ? (
            documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                    <FileText
                      size={17}
                      className="text-[#f26a2e]"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {document.name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {document.mime_type ?? "File"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                  {document.visible_to_client
                    ? "Client visible"
                    : "Internal"}
                </span>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <FileText className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No documents yet
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Project documents will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}