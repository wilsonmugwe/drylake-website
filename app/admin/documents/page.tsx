import Link from "next/link";
import { FileText, SearchX } from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  type AdminSearchParams,
  ilikePattern,
  readEnumParam,
  readFilterParam,
} from "@/lib/admin/filters";
import {
  ADMIN_LIST_LIMIT,
  findIdsByName,
  findProjectIdsForOrganizations,
  inClause,
  orFilter,
} from "@/lib/admin/search";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Documents have no type column. The upload route only accepts these three MIME types
// (app/api/admin/projects/[projectId]/documents/route.ts), so "type" filters on mime_type.
const DOCUMENT_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PNG: "image/png",
} as const;

const DOCUMENT_TYPE_KEYS = ["PDF", "DOCX", "PNG"] as const;

const VISIBILITY_KEYS = ["CLIENT", "INTERNAL"] as const;

type DocumentsPageProps = {
  searchParams: Promise<AdminSearchParams>;
};

type DocumentRow = {
  id: string;
  project_id: string;
  name: string;
  mime_type: string | null;
  visible_to_client: boolean;
};

function typeLabel(mimeType: string | null) {
  const match = DOCUMENT_TYPE_KEYS.find(
    (key) => DOCUMENT_TYPES[key] === mimeType
  );

  return match ?? mimeType ?? "File";
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const params = await searchParams;
  const q = readFilterParam(params, "q");
  const type = readEnumParam(params, "type", DOCUMENT_TYPE_KEYS);
  const visibility = readEnumParam(params, "visibility", VISIBILITY_KEYS);
  const hasFilters = Boolean(q || type || visibility);

  const supabase = createAdminSupabaseClient();

  let query = supabase
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
      `,
      { count: "exact" }
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(ADMIN_LIST_LIMIT);

  if (type) {
    query = query.eq("mime_type", DOCUMENT_TYPES[type]);
  }

  if (visibility) {
    query = query.eq("visible_to_client", visibility === "CLIENT");
  }

  if (q) {
    const pattern = ilikePattern(q);
    const [projectIdsByName, organizationIds] = await Promise.all([
      findIdsByName(supabase, "projects", pattern),
      findIdsByName(supabase, "organizations", pattern),
    ]);
    const projectIdsByClient = await findProjectIdsForOrganizations(
      supabase,
      organizationIds
    );

    query = query.or(
      orFilter([
        `name.ilike.${pattern}`,
        inClause("project_id", [...projectIdsByName, ...projectIdsByClient]),
      ])
    );
  }

  const { data, error, count } = await query;

  const documents: DocumentRow[] = data ?? [];
  const totalMatches = count ?? documents.length;

  // Project and client names for the rows on screen.
  const projectIds = [
    ...new Set(documents.map((document) => document.project_id)),
  ];

  const { data: projects } =
    projectIds.length > 0
      ? await supabase
          .from("projects")
          .select("id, name, organization_id")
          .in("id", projectIds)
      : { data: [] };

  const projectList: Array<{
    id: string;
    name: string;
    organization_id: string;
  }> = projects ?? [];

  const organizationIds = [
    ...new Set(projectList.map((project) => project.organization_id)),
  ];

  const { data: organizations } =
    organizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name")
          .in("id", organizationIds)
      : { data: [] };

  const organizationNames = new Map<string, string>(
    (organizations ?? []).map(
      (organization: { id: string; name: string }) => [
        organization.id,
        organization.name,
      ]
    )
  );

  const projectById = new Map(
    projectList.map((project) => [project.id, project])
  );

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Workspace"
          title="Documents"
          description="Central view of project documents and client-visible files."
        />

        <div className="mt-7">
          <AdminFilterBar
            searchPlaceholder="Search by document, project or client name"
            searchLabel="Search documents"
            selects={[
              {
                param: "type",
                label: "Type",
                options: DOCUMENT_TYPE_KEYS.map((key) => ({
                  value: key,
                  label: key,
                })),
                allLabel: "All types",
              },
              {
                param: "visibility",
                label: "Visibility",
                options: [
                  { value: "CLIENT", label: "Client visible" },
                  { value: "INTERNAL", label: "Internal" },
                ],
                allLabel: "All visibility",
              },
            ]}
            resultCount={error ? undefined : totalMatches}
            resultNoun={totalMatches === 1 ? "document" : "documents"}
          />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {error ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load documents.
            </p>
          ) : documents.length > 0 ? (
            documents.map((document) => {
              const project = projectById.get(document.project_id);
              const clientName = project
                ? organizationNames.get(project.organization_id)
                : undefined;
              const context = [
                typeLabel(document.mime_type),
                project?.name,
                clientName,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
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

                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {context}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                    {document.visible_to_client
                      ? "Client visible"
                      : "Internal"}
                  </span>
                </div>
              );
            })
          ) : hasFilters ? (
            <div className="p-10 text-center">
              <SearchX className="mx-auto text-[#f26a2e]" />

              <h2 className="mt-4 font-semibold text-neutral-950">
                No documents match your filters
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Try a different search term or{" "}
                <Link
                  href="/admin/documents"
                  className="font-semibold text-neutral-950 underline underline-offset-4"
                >
                  clear the filters
                </Link>
                .
              </p>
            </div>
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

          {!error && totalMatches > documents.length ? (
            <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
              Showing the newest {documents.length} of {totalMatches}.
              Narrow the search to find older documents.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
