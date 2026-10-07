import { Building2, Link2 } from "lucide-react";

import type { NotReadyWorkspace } from "@/lib/auth/client-context";

import ClientAccessState from "./ClientAccessState";
import ClientInvitationCompleter from "./ClientInvitationCompleter";
import ClientOrganizationPicker from "./ClientOrganizationPicker";
import ClientStateCard from "./ClientStateCard";

/*
 * Everything the portal shows when the workspace is not ready, rendered from the ONE
 * authoritative resolution (getClientWorkspace). Content emptiness never reaches here:
 * a ready workspace with no projects or invoices renders the normal portal.
 *
 * `returnTo` is the page the user asked for, so activation or invitation completion
 * lands them back on it (an invoice link stays an invoice link).
 *
 * Rendered inside the portal frame; the frame hides navigation for every state here.
 */
export default function ClientWorkspaceGate({
  workspace,
  returnTo,
}: {
  workspace: NotReadyWorkspace;
  returnTo: string;
}) {
  switch (workspace.state) {
    case "access-pending":
      switch (workspace.reason) {
        case "activate-membership":
        case "choose-membership": {
          const single = workspace.reason === "activate-membership";

          return (
            <ClientStateCard
              icon={<Building2 size={20} />}
              tone="signal"
              eyebrow={single ? "Opening workspace" : "Choose workspace"}
              title={single ? "Opening your workspace." : "Which workspace would you like to open?"}
            >
              <p>
                {single
                  ? "One moment while we connect your account to your Drylake client workspace. If nothing happens, select it below."
                  : "Your account has access to more than one Drylake client workspace. You can switch at any time from the Workspace menu."}
              </p>
              <ClientOrganizationPicker
                options={workspace.options.map(({ clerkOrgId, name }) => ({ clerkOrgId, name }))}
                autoActivate={single}
                returnTo={returnTo}
              />
            </ClientStateCard>
          );
        }

        case "accept-invitation":
          return (
            <ClientStateCard
              icon={<Link2 size={20} />}
              tone="signal"
              eyebrow="Finishing setup"
              title="Connecting your workspace."
            >
              <p>
                Drylake invited this email address to a client workspace. We are linking your
                account to it now.
              </p>
              <ClientInvitationCompleter returnTo={returnTo} />
            </ClientStateCard>
          );

        case "not-linked":
        case "authorization-pending":
          return <ClientAccessState variant="access-pending" />;
      }

      return <ClientAccessState variant="access-pending" />;

    case "blocked":
      return (
        <ClientAccessState
          variant={workspace.status === "ARCHIVED" ? "client-archived" : "client-inactive"}
          organizationName={workspace.organizationName}
        />
      );

    case "no-organisation":
      return <ClientAccessState variant="no-organisation" />;

    case "lookup-failed":
      return <ClientAccessState variant="lookup-failed" />;
  }
}
