import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LifeBuoy } from "lucide-react";

import { CONTACT_EMAIL, RESPONSE_TIME } from "@/lib/site";

import { ClientAccountButton, ClientNav, type ClientSection } from "./ClientNav";

type ClientShellProps = {
  children: ReactNode;
  /** Shown in the header when the user belongs to an active organisation. */
  organizationName?: string | null;
  /** Hide the portal nav for states where the portal routes would only redirect back. */
  showNav?: boolean;
  /** Active nav fallback for renders outside /client (preview harness). */
  section?: ClientSection;
};

/*
 * Shared frame for every client portal page: a private section of drylake.com.au rather
 * than a generic dashboard. Same black ground, signal grid, contour rings and logo as the
 * public hero. Purely presentational; pages do all auth and data loading.
 */
export default function ClientShell({
  children,
  organizationName,
  showNav = true,
  section,
}: ClientShellProps) {
  return (
    <div className="client-portal relative flex min-h-[100svh] flex-col overflow-x-clip bg-[#050505] text-white">
      <div
        aria-hidden="true"
        className="signal-grid-dark pointer-events-none absolute inset-0 opacity-40"
      />
      <div
        aria-hidden="true"
        className="drylake-contours pointer-events-none absolute inset-x-0 top-0 h-[880px] opacity-60"
      />

      <a href="#portal-main" className="cp-skip-link">
        Skip to content
      </a>

      <header className="relative z-20 border-b border-white/[0.08] bg-black/85 backdrop-blur-md">
        <div className="cp-container">
          <div className="flex h-[68px] items-center justify-between gap-4 sm:h-[76px]">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <Link
                href="/"
                aria-label="Drylake home"
                className="flex shrink-0 items-center"
              >
                <Image
                  src="/brand/drylake-logo-black.png"
                  alt="Drylake"
                  width={1536}
                  height={1024}
                  priority
                  className="h-[56px] w-[86px] object-contain sm:h-[64px] sm:w-[98px]"
                />
              </Link>

              <span aria-hidden="true" className="hidden h-6 w-px bg-white/15 sm:block" />

              <span className="tech-label hidden items-center gap-2 whitespace-nowrap text-white/60 sm:flex">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]"
                />
                Client Portal
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              {organizationName ? (
                <span
                  title={organizationName}
                  className="hidden max-w-[16rem] truncate text-sm text-white/60 md:block"
                >
                  {organizationName}
                </span>
              ) : null}

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex min-h-[44px] items-center gap-2 px-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
              >
                <LifeBuoy aria-hidden="true" size={16} />
                <span>Support</span>
              </a>

              <ClientAccountButton />
            </div>
          </div>

          {showNav ? (
            <div className="flex items-center justify-between gap-4">
              <ClientNav fallback={section} />

              <span className="tech-label truncate text-white/50 sm:hidden">
                Client Portal
              </span>
            </div>
          ) : null}
        </div>
      </header>

      <main id="portal-main" tabIndex={-1} className="relative z-10 flex-1 outline-none">
        <div className="cp-container pb-16">{children}</div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="cp-container flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Drylake Pty Ltd. Secure client environment.</span>
          <span>
            Questions? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-white/75 underline decoration-white/25 underline-offset-4 hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            . We reply within {RESPONSE_TIME}.
          </span>
        </div>
      </footer>
    </div>
  );
}
