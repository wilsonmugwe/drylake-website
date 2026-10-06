import { Suspense } from "react";

import ClientShell from "@/components/client/ClientShell";
import WorkspaceSwitchLink from "@/components/client/WorkspaceSwitchLink";
import { getClientWorkspace } from "@/lib/auth/client-context";

/*
 * Persistent client portal frame. Rendered on a full page load and kept mounted across
 * client-side navigations between /client routes, so the rail never freezes or blinks
 * while a page's data loads (each route's loading.tsx fills the content area instead).
 *
 * This layout grants nothing. It reads the SAME per-request resolution the page reads
 * (getClientWorkspace is memoised per request), only to decide what the frame shows:
 * navigation for a ready workspace, a bare frame for every access state. Every page still
 * resolves and enforces the workspace itself before it loads any data.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getClientWorkspace();
  const ready = workspace.state === "ready";

  const organizationName = ready
    ? workspace.organization.name
    : workspace.state === "blocked"
      ? workspace.organizationName
      : null;

  return (
    <ClientShell
      organizationName={organizationName}
      showNav={ready}
      switcher={
        ready ? (
          <Suspense fallback={null}>
            <WorkspaceSwitchLink />
          </Suspense>
        ) : null
      }
    >
      {children}
    </ClientShell>
  );
}
