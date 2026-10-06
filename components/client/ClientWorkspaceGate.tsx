import type { ReactNode } from "react";

import type { NotReadyWorkspace } from "@/lib/auth/client-context";

import ClientAccessState from "./ClientAccessState";
import ClientInvitationCompleter from "./ClientInvitationCompleter";
import ClientOrganizationPicker from "./ClientOrganizationPicker";
import ClientShell from "./ClientShell";

/*
 * Everything the portal shows when the workspace is not ready, rendered from the ONE
 * authoritative resolution (getClientWorkspace). Content emptiness never reaches here:
 * a ready workspace with no projects or invoices renders the normal portal.
 *
 * `returnTo` is the page the user asked for, so activation or invitation completion
 * lands them back on it (an invoice link stays an invoice link).
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
            <PendingFrame
              label={single ? "Opening workspace" : "Choose workspace"}
              title={single ? "Opening your workspace." : "Which workspace would you like to open?"}
              body={
                single
                  ? "One moment while we connect your account to your Drylake client workspace. If nothing happens, select it below."
                  : "Your account has access to more than one Drylake client workspace. You can switch at any time from the portal."
              }
            >
              <ClientOrganizationPicker
                options={workspace.options.map(({ clerkOrgId, name }) => ({ clerkOrgId, name }))}
                autoActivate={single}
                returnTo={returnTo}
              />
            </PendingFrame>
          );
        }

        case "accept-invitation":
          return (
            <PendingFrame
              label="Finishing setup"
              title="Connecting your workspace."
              body="Drylake invited this email address to a client workspace. We are linking your account to it now."
            >
              <ClientInvitationCompleter returnTo={returnTo} />
            </PendingFrame>
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

function PendingFrame({
  label,
  title,
  body,
  children,
}: {
  label: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <ClientShell showNav={false}>
      <div className="flex min-h-[60svh] flex-col justify-center py-14 sm:py-20">
        <div className="section-label flex items-center gap-3 text-white/55">
          <span aria-hidden="true" className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
          {label}
        </div>

        <h1 className="mt-5 max-w-[18ch] text-[clamp(2.4rem,9vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
          {title}
        </h1>

        <p className="mt-6 max-w-[36rem] text-[0.95rem] leading-7 text-white/60">{body}</p>

        {children}
      </div>
    </ClientShell>
  );
}
