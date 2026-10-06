import type { ReactNode } from "react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import type { ClientSection } from "./ClientNav";
import { ClientMobileNav, ClientSidebar } from "./ClientRail";

type ClientShellProps = {
  children: ReactNode;
  /** Shown in the rail when the user is in (or blocked from) an organisation. */
  organizationName?: string | null;
  /** Hide portal navigation for states where the portal routes would only lead back. */
  showNav?: boolean;
  /** Streamed "Switch workspace" link (server node). */
  switcher?: ReactNode;
  /** Active nav item for renders outside /client (the workspace switcher page). */
  section?: ClientSection;
};

/*
 * The client portal frame: Admin's dark navigation rail beside the #f4f4f1 workspace.
 *
 * app/client/layout.tsx renders it ONCE, so the rail stays mounted while a page loads:
 * a click changes the content area (and shows that route's skeleton) without the frame
 * blinking or freezing. Purely presentational; pages and the layout do all auth.
 */
export default function ClientShell({
  children,
  organizationName,
  showNav = true,
  switcher,
  section,
}: ClientShellProps) {
  return (
    <div className="client-portal min-h-[100svh]">
      <a href="#portal-main" className="cp-skip-link">
        Skip to content
      </a>

      <ClientMobileNav
        organizationName={organizationName}
        showNav={showNav}
        switcher={switcher}
        fallback={section}
      />

      <div className="flex min-h-[100svh]">
        <ClientSidebar
          organizationName={organizationName}
          showNav={showNav}
          switcher={switcher}
          fallback={section}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="portal-main" tabIndex={-1} className="flex-1 outline-none">
            <div className="cp-container py-7 sm:py-10">{children}</div>
          </main>

          <footer className="border-t border-neutral-200">
            <div className="cp-container flex flex-col gap-2 py-5 text-xs leading-5 text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
              <span>&copy; {new Date().getFullYear()} Drylake Pty Ltd. Secure client environment.</span>
              {/* Plain text on purpose: the portal's contact action is "Start a conversation". */}
              <span>
                Questions? Use Start a conversation, or write to{" "}
                <span className="font-medium text-neutral-700">{CONTACT_EMAIL}</span>. We reply
                within {RESPONSE_TIME}.
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
