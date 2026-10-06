import Link from "next/link";
import { redirect } from "next/navigation";

import ClientOrganizationPicker from "@/components/client/ClientOrganizationPicker";
import ClientShell from "@/components/client/ClientShell";
import ClientWorkspaceGate from "@/components/client/ClientWorkspaceGate";
import { getClientWorkspace } from "@/lib/auth/client-context";
import { signInUrl } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Switch Workspace | Client Portal",
  robots: {
    index: false,
    follow: false,
  },
};

/*
 * Workspace switcher for users who belong to several Drylake client organisations.
 * Options are the user's own Clerk memberships mapped to ACTIVE client rows; selecting
 * one makes it the session's active org (Clerk enforces membership again).
 */
export default async function WorkspacesPage() {
  const workspace = await getClientWorkspace();

  if (workspace.state === "signed-out") {
    redirect(signInUrl("/portal/workspaces"));
  }

  if (workspace.state !== "ready") {
    return <ClientWorkspaceGate workspace={workspace} returnTo="/client" />;
  }

  const current = workspace.organization;
  const others = workspace.workspaces.filter(
    (option) => option.organizationId !== current.id
  );

  return (
    <ClientShell organizationName={current.name} showNav={false}>
      <div className="flex min-h-[60svh] flex-col justify-center py-14 sm:py-20">
        <div className="section-label flex items-center gap-3 text-white/55">
          <span aria-hidden="true" className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          Switch workspace
        </div>

        <h1 className="mt-5 max-w-[18ch] text-[clamp(2.4rem,9vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          {others.length > 0 ? "Choose a workspace." : "You have one workspace."}
        </h1>

        <p className="mt-6 max-w-[36rem] text-[0.95rem] leading-7 text-white/60">
          You are currently in {current.name}.
        </p>

        {others.length > 0 ? (
          <ClientOrganizationPicker
            options={others.map(({ clerkOrgId, name }) => ({ clerkOrgId, name }))}
            autoActivate={false}
            returnTo="/client"
          />
        ) : null}

        <div className="mt-8">
          <Link href="/client" className="cp-button-outline sm:min-w-[180px]">
            <span>Back to {current.name}</span>
          </Link>
        </div>
      </div>
    </ClientShell>
  );
}
