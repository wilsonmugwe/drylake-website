import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

import ClientOrganizationPicker from "@/components/client/ClientOrganizationPicker";
import ClientShell from "@/components/client/ClientShell";
import ClientStateCard from "@/components/client/ClientStateCard";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { getClientWorkspace, getSwitchableWorkspaces } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";
import { logRouteTiming, startRequestTiming } from "@/lib/perf/request-timing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Switch workspace | Drylake Workspace" },
  robots: {
    index: false,
    follow: false,
  },
};

/*
 * Workspace switcher for users who belong to several Drylake client organisations.
 * Options are the user's own Clerk memberships mapped to ACTIVE client rows; selecting
 * one makes it the session's active org (Clerk enforces membership again), and the next
 * request re-resolves access through getClientWorkspace().
 *
 * Lives outside /client, so it renders its own copy of the portal frame.
 */
export default async function WorkspacesPage() {
  startRequestTiming();

  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl("/portal/workspaces"));
  }

  if (workspace.state !== "ready") {
    logRouteTiming("/portal/workspaces", workspace.state);

    return (
      <ClientShell showNav={false}>
        <ClientWorkspaceGate workspace={workspace} returnTo="/client" />
      </ClientShell>
    );
  }

  const current = workspace.organization;
  const others = (await getSwitchableWorkspaces()).filter(
    (option) => option.organizationId !== current.id
  );

  logRouteTiming("/portal/workspaces", workspace.state);

  return (
    <ClientShell organizationName={current.name}>
      <ClientStateCard
        icon={<ArrowLeftRight size={20} />}
        tone="signal"
        eyebrow="Switch workspace"
        title={others.length > 0 ? "Choose a workspace." : "You have one workspace."}
        actions={
          <Link href="/client" className="cp-button-secondary min-h-12 sm:min-w-[180px]">
            <ArrowLeft aria-hidden="true" size={15} />
            Back to {current.name}
          </Link>
        }
      >
        <p>
          You are currently in <span className="font-medium text-neutral-900">{current.name}</span>.
        </p>

        {others.length > 0 ? (
          <ClientOrganizationPicker
            options={others.map(({ clerkOrgId, name }) => ({ clerkOrgId, name }))}
            autoActivate={false}
            returnTo="/client"
          />
        ) : null}
      </ClientStateCard>
    </ClientShell>
  );
}
