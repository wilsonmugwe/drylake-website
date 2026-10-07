import { redirect } from "next/navigation";

import ClientDashboardView from "@/components/client/ClientDashboardView";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import type {
  ClientDocumentSummary,
  ClientInvoiceSummary,
  ClientProjectSummary,
  ClientUpdateSummary,
  Loadable,
} from "@/components/client/types";
import { isClientVisibleInvoice } from "@/lib/auth/access";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  logRouteTiming,
  startRequestTiming,
  timed,
} from "@/lib/perf/request-timing";

export const metadata = {
  title: { absolute: "Overview | Drylake Workspace" },
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const RECENT_UPDATES_LIMIT = 5;
const RECENT_DOCUMENTS_LIMIT = 5;

function logQueryError(
  label: string,
  error: { code?: string; message?: string } | null,
) {
  if (error) {
    console.error(label, { code: error.code, message: error.message });
  }
}

export default async function ClientDashboardPage() {
  startRequestTiming();

  // ---------------------------------------------------------
  // The ONE authoritative workspace resolution
  // (lib/auth/client-context.ts -> decideClientWorkspace).
  //
  // Clerk membership -> active Clerk org -> organizations.clerk_org_id
  // -> RLS re-read with the user's Clerk token. An email address never
  // grants access. "ready" already includes the RLS check, so nothing
  // below can send a ready client back to a setup screen.
  // ---------------------------------------------------------

  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl("/client"));
  }

  if (workspace.state !== "ready") {
    // A Drylake admin with no client membership belongs in the admin workspace, not on
    // the client "no access" screen. An admin who IS a client member still gets the gate.
    if (workspace.state === "no-organisation" && (await isPlatformAdmin())) {
      redirect("/admin");
    }

    logRouteTiming("/client", workspace.state);

    return <ClientWorkspaceGate workspace={workspace} returnTo="/client" />;
  }

  // RLS-scoped client that just verified this organisation with the user's token.
  const { supabase, organization } = workspace;

  // Two waves, timed together: projects, then everything keyed by their IDs (plus invoices).
  const {
    projectsError,
    projectList,
    projectNames,
    milestoneResult,
    updatesResult,
    documentsResult,
    invoicesResult,
  } = await timed("content", async () => {
    // ---------------------------------------------------------
    // Load projects
    //
    // Explicit organization filter + RLS.
    // ---------------------------------------------------------

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        status,
        progress_override,
        start_date,
        target_end_date,
        created_at
      `,
      )
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    const projectList = projects ?? [];
    const projectIds = projectList.map((project) => project.id);
    const projectNames = new Map(
      projectList.map((project) => [project.id, project.name] as const),
    );

    // ---------------------------------------------------------
    // Org-scoped reads that only depend on the project ID list.
    //
    // Every query is constrained to this organisation's project IDs
    // (or organisation ID) in addition to RLS, and client-facing
    // tables also require visible_to_client = true.
    // When the org has no projects, these return empty without a query.
    // ---------------------------------------------------------

    const hasProjects = projectIds.length > 0;

    const [milestoneResult, updatesResult, documentsResult, invoicesResult] =
      await Promise.all([
        hasProjects
          ? supabase
              .from("milestones")
              .select("id, project_id, status")
              .in("project_id", projectIds)
          : Promise.resolve({ data: [], error: null }),

        hasProjects
          ? supabase
              .from("project_updates")
              .select("id, project_id, title, published_at")
              .in("project_id", projectIds)
              .eq("visible_to_client", true)
              .not("published_at", "is", null)
              .order("published_at", { ascending: false })
              .limit(RECENT_UPDATES_LIMIT)
          : Promise.resolve({ data: [], error: null }),

        hasProjects
          ? supabase
              .from("documents")
              .select(
                "id, project_id, name, mime_type, size_bytes, created_at",
                {
                  count: "exact",
                },
              )
              .in("project_id", projectIds)
              .eq("visible_to_client", true)
              .order("created_at", { ascending: false })
              .limit(RECENT_DOCUMENTS_LIMIT)
          : Promise.resolve({ data: [], error: null, count: 0 }),

        supabase
          .from("invoices")
          .select(
            "id, invoice_number, status, currency, total_cents, due_date, created_at, visible_to_client",
          )
          .eq("organization_id", organization.id)
          .eq("visible_to_client", true)
          .neq("status", "DRAFT")
          .order("created_at", { ascending: false }),
      ]);

    return {
      projectsError,
      projectList,
      projectNames,
      milestoneResult,
      updatesResult,
      documentsResult,
      invoicesResult,
    };
  });

  logQueryError("Client projects lookup failed:", projectsError);
  logQueryError("Client dashboard milestones failed:", milestoneResult.error);
  logQueryError("Client dashboard updates failed:", updatesResult.error);
  logQueryError("Client dashboard documents failed:", documentsResult.error);
  logQueryError("Client dashboard invoices failed:", invoicesResult.error);

  const milestones = milestoneResult.data ?? [];

  // ---------------------------------------------------------
  // Calculate project progress
  // (progress_override wins, else completed / total milestones)
  // ---------------------------------------------------------

  function getProjectProgress(
    projectId: string,
    progressOverride: number | null,
  ) {
    if (progressOverride !== null) {
      return progressOverride;
    }

    const projectMilestones = milestones.filter(
      (milestone) => milestone.project_id === projectId,
    );

    if (projectMilestones.length === 0) {
      return 0;
    }

    const completed = projectMilestones.filter(
      (milestone) => milestone.status === "COMPLETED",
    ).length;

    return Math.round((completed / projectMilestones.length) * 100);
  }

  // ---------------------------------------------------------
  // Map rows into the view's plain props
  // ---------------------------------------------------------

  const projectsProp: Loadable<ClientProjectSummary[]> =
    projectsError || milestoneResult.error
      ? { ok: false }
      : {
          ok: true,
          data: projectList.map((project) => ({
            id: project.id,
            name: project.name,
            status: project.status,
            progress: getProjectProgress(project.id, project.progress_override),
            startDate: project.start_date,
            targetEndDate: project.target_end_date,
          })),
        };

  const updatesProp: Loadable<ClientUpdateSummary[]> =
    projectsError || updatesResult.error
      ? { ok: false }
      : {
          ok: true,
          data: (updatesResult.data ?? []).map((update) => ({
            id: update.id,
            projectId: update.project_id,
            projectName: projectNames.get(update.project_id) ?? "Project",
            title: update.title,
            publishedAt: update.published_at,
          })),
        };

  const documentRows = documentsResult.data ?? [];

  const documentsProp: Loadable<{
    items: ClientDocumentSummary[];
    total: number;
  }> =
    projectsError || documentsResult.error
      ? { ok: false }
      : {
          ok: true,
          data: {
            total: documentsResult.count ?? documentRows.length,
            items: documentRows.map((document) => ({
              id: document.id,
              name: document.name,
              projectName: projectNames.get(document.project_id) ?? null,
              mimeType: document.mime_type,
              sizeBytes:
                document.size_bytes === null
                  ? null
                  : Number(document.size_bytes),
              createdAt: document.created_at,
            })),
          },
        };

  const invoicesProp: Loadable<ClientInvoiceSummary[]> = invoicesResult.error
    ? { ok: false }
    : {
        ok: true,
        data: (invoicesResult.data ?? [])
          .filter(isClientVisibleInvoice)
          .map((invoice) => ({
            id: invoice.id,
            invoiceNumber: invoice.invoice_number,
            status: invoice.status,
            currency: invoice.currency,
            totalCents: Number(invoice.total_cents),
            dueDate: invoice.due_date,
            issuedAt: invoice.created_at,
          })),
      };

  logRouteTiming("/client", workspace.state);

  return (
    <ClientDashboardView
      organizationName={organization.name}
      projects={projectsProp}
      updates={updatesProp}
      documents={documentsProp}
      invoices={invoicesProp}
    />
  );
}
