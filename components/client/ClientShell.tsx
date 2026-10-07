import type { ReactNode } from "react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import ProductEnvironment from "@/components/shell/ProductEnvironment";

import type { ClientSection } from "./ClientNav";
import { ClientMobileNav, ClientSidebar } from "./ClientRail";
import { ANCHOR_STASH_SCRIPT } from "./section-anchor";
import WorkspaceAnchors from "./WorkspaceAnchors";

type ClientShellProps = {
  children: ReactNode;
  /** Shown in the rail when the user is in (or blocked from) an organisation. */
  organizationName?: string | null;
  /** Hide Workspace navigation for states where its routes would only lead back. */
  showNav?: boolean;
  /** Streamed "Switch workspace" link (server node). */
  switcher?: ReactNode;
  /** Active nav item for renders outside /client (the workspace switcher page). */
  section?: ClientSection;
};

/*
 * The Drylake Workspace frame: the dark rail (canonical wordmark, organisation, navigation,
 * account) beside the light app canvas. Below lg the rail becomes a top bar + modal drawer.
 *
 * app/client/layout.tsx renders it ONCE, so the rail stays mounted while a page loads:
 * a click changes the content area (and shows that route's skeleton) without the frame
 * blinking or freezing. Purely presentational; pages and the layout do all auth.
 *
 * The content column sits on the Drylake product environment (components/shell, the
 * "workspace" variant): background only, behind everything, no JavaScript. WorkspaceAnchors
 * moves focus to a section when the URL names one (/client#recent-activity).
 *
 * (The `client-portal` class and `portal-main` id are internal CSS/anchor hooks, kept so
 * nothing outside this component has to change.)
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
      {/* Runs during parse, before the router hydrates: see WorkspaceAnchors. */}
      <script>{ANCHOR_STASH_SCRIPT}</script>

      <a href="#portal-main" className="cp-skip-link">
        Skip to content
      </a>

      <WorkspaceAnchors />

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

        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          <ProductEnvironment variant="workspace" />

          <main id="portal-main" tabIndex={-1} className="relative z-[1] flex-1 outline-none">
            <div className="cp-container py-7 sm:py-10 lg:py-12">{children}</div>
          </main>

          <footer className="relative z-[1] border-t border-neutral-200">
            <div className="cp-container flex flex-col gap-2 py-5 text-xs leading-5 text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
              <span>&copy; {new Date().getFullYear()} Drylake Pty Ltd. Drylake Workspace, a secure client environment.</span>
              {/* Plain text on purpose: the Workspace contact action is "Start a conversation". */}
              <span>
                Questions? Use Start a conversation, or write to{" "}
                <span className="font-medium text-neutral-800">{CONTACT_EMAIL}</span>. We reply
                within {RESPONSE_TIME}.
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
