import type { ClientResolution } from "@/lib/auth/access";

import ClientAccessState from "./ClientAccessState";
import ClientOrganizationPicker from "./ClientOrganizationPicker";
import ClientShell from "./ClientShell";

type NotReady = Exclude<ClientResolution, { kind: "ready" }>;

/*
 * Everything the portal shows when the user cannot open a workspace yet: auto-activation
 * of a single membership, a chooser for several, and the blocked / no-access states.
 * Server component; the picker is the only client piece.
 */
export default function ClientWorkspaceGate({
  resolution,
  returnTo,
}: {
  resolution: NotReady;
  returnTo: string;
}) {
  switch (resolution.kind) {
    case "activate":
    case "choose": {
      const options =
        resolution.kind === "activate"
          ? [resolution.option]
          : resolution.options;

      return (
        <ClientShell showNav={false}>
          <div className="flex min-h-[60svh] flex-col justify-center py-14 sm:py-20">
            <div className="section-label flex items-center gap-3 text-white/55">
              <span aria-hidden="true" className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              {resolution.kind === "activate" ? "Opening workspace" : "Choose workspace"}
            </div>

            <h1 className="mt-5 max-w-[18ch] text-[clamp(2.4rem,9vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.06em]">
              {resolution.kind === "activate"
                ? "Opening your workspace."
                : "Which workspace would you like to open?"}
            </h1>

            <p className="mt-6 max-w-[36rem] text-[0.95rem] leading-7 text-white/60">
              {resolution.kind === "activate"
                ? "One moment while we connect your account to your Drylake client workspace. If nothing happens, select it below."
                : "Your account has access to more than one Drylake client workspace. You can switch at any time from the portal."}
            </p>

            <ClientOrganizationPicker
              options={options.map(({ clerkOrgId, name }) => ({ clerkOrgId, name }))}
              autoActivate={resolution.kind === "activate"}
              returnTo={returnTo}
            />
          </div>
        </ClientShell>
      );
    }

    case "blocked":
      return (
        <ClientAccessState
          variant={resolution.status === "ARCHIVED" ? "client-archived" : "client-inactive"}
          organizationName={resolution.organizationName}
        />
      );

    case "not-linked":
      return <ClientAccessState variant="access-pending" />;

    case "no-membership":
      return <ClientAccessState variant="no-organisation" />;
  }
}
