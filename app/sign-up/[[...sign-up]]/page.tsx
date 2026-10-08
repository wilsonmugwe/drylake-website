import type { Metadata } from "next";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import SiteLink from "@/components/navigation/SiteLink";
import { SignUp } from "@clerk/nextjs";

import SkipLink from "@/components/layout/SkipLink";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LockKeyhole,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your secure Drylake account.",
  robots: {
    index: false,
    follow: false,
  },
};

const accessItems = [
  "Secure account access",
  "Protected Drylake Workspace",
  "One place for project access",
];

export default function SignUpPage() {
  return (
    <>
    <SkipLink />

    <div className="min-h-[100svh] bg-black text-white">
      {/* One <h1> per page: Clerk renders it as the card title ("Sign in to ..."). */}
      <div className="grid min-h-[100svh] lg:grid-cols-[0.9fr_1.1fr]">
        {/* =====================================================
            DRYLAKE BRAND PANEL
        ====================================================== */}
        <aside
          aria-label="Drylake Workspace"
          className="relative hidden overflow-hidden border-r border-white/[0.08] lg:flex lg:flex-col">
          {/* Background grid */}
          <div
            aria-hidden="true"
            className="hero-large-grid pointer-events-none absolute inset-0 opacity-40"
          />

          {/* Architectural structure */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute bottom-0 left-[18%] top-0 w-px bg-white/[0.04]" />
            <div className="absolute bottom-0 left-[72%] top-0 w-px bg-white/[0.04]" />

            <div className="absolute left-0 right-0 top-[24%] h-px bg-white/[0.04]" />
            <div className="absolute bottom-[18%] left-0 right-0 h-px bg-white/[0.04]" />
          </div>

          {/* Orange atmosphere */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 top-[35%] h-[420px] w-[420px] rounded-full bg-[#f26a2e]/[0.04] blur-[120px]"
          />

          {/* -------------------------------------------------
              Top
          -------------------------------------------------- */}
          <div className="relative z-10 flex items-center justify-between px-10 py-9 xl:px-14">
            <SiteLink
              href="/"
              aria-label="Drylake home"
              className="group inline-flex min-h-[44px] items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-white/[0.12] transition-colors group-hover:border-white/30">
                <ArrowLeft
                  aria-hidden="true"
                  size={14}
                  className="text-white/55 transition-transform group-hover:-translate-x-0.5 group-hover:text-white"
                />
              </span>

              <DrylakeWordmark tone="dark" height={22} label={null} />
            </SiteLink>

            <span className="flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Perth / WA
            </span>
          </div>

          {/* -------------------------------------------------
              Main
          -------------------------------------------------- */}
          <div className="relative z-10 flex flex-1 items-center px-10 xl:px-14">
            <div className="max-w-[620px]">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#f26a2e]" />

                <span className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55">
                  Drylake Access
                </span>
              </div>

              <p className="mt-7 text-[clamp(4.3rem,6.2vw,7.2rem)] font-semibold leading-[0.84] tracking-[-0.075em]">
                One account.{" "}
                <br />

                <span className="text-white/45">
                  One workspace.
                </span>
              </p>

              <p className="mt-7 max-w-md text-[0.95rem] leading-7 text-white/55">
                Create your account for secure access to the
                systems and workflows Drylake builds with you.
              </p>

              {/* Benefits */}
              <div className="mt-11 max-w-md border-t border-white/[0.08]">
                {accessItems.map((item, index) => (
                  <div
                    key={item}
                    className="grid grid-cols-[auto_auto_1fr] items-center gap-x-4 border-b border-white/[0.08] py-4"
                  >
                    <span className="font-mono text-[0.62rem] text-white/55">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <Check
                      size={13}
                      strokeWidth={1.8}
                      className="text-[#f26a2e]"
                    />

                    <span className="text-xs uppercase tracking-[0.12em] text-white/55">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------
              Bottom
          -------------------------------------------------- */}
          <div className="relative z-10 px-10 pb-9 xl:px-14">
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
              <span className="text-[0.58rem] uppercase tracking-[0.15em] text-white/55">
                Drylake Pty Ltd
              </span>

              <span className="text-[0.58rem] uppercase tracking-[0.15em] text-white/55">
                Technology / Software / AI
              </span>
            </div>
          </div>
        </aside>

        {/* =====================================================
            SIGN-UP PANEL
        ====================================================== */}
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#f2f0e9] text-black outline-none"
        >
          {/* Background */}
          <div
            aria-hidden="true"
            className="micro-grid pointer-events-none absolute inset-0 opacity-[0.12]"
          />

          {/* -------------------------------------------------
              Mobile header
          -------------------------------------------------- */}
          <header className="relative z-10 flex h-[78px] items-center justify-between border-b border-black/[0.08] px-5 sm:px-8 lg:hidden">
            <SiteLink
              href="/"
              aria-label="Drylake home"
              className="group flex min-h-[44px] items-center gap-3"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-black/10">
                <ArrowLeft
                  aria-hidden="true"
                  size={14}
                  className="transition-transform group-hover:-translate-x-0.5"
                />
              </span>

              <DrylakeWordmark tone="light" height={22} label={null} />
            </SiteLink>

            <span className="flex items-center gap-2 text-[0.58rem] font-medium uppercase tracking-[0.14em] text-black/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Secure
            </span>
          </header>

          {/* -------------------------------------------------
              Form
          -------------------------------------------------- */}
          <div className="relative z-10 flex flex-1 items-start justify-center px-5 py-8 sm:items-center sm:px-8 sm:py-14 lg:px-12 xl:px-20">
            <div className="w-full max-w-[460px]">
              {/* Mobile intro */}
              <div className="mb-7 lg:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-6 bg-[#f26a2e]" />

                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-black/60">
                    Create Account
                  </span>
                </div>

                <p className="mt-4 text-[3rem] font-semibold leading-[0.9] tracking-[-0.065em] sm:text-[3.6rem]">
                  Get
                  <span className="text-black/45"> started.</span>
                </p>

                <p className="mt-4 max-w-sm text-sm leading-6 text-black/60">
                  Create an account for secure access to
                  Drylake Workspace.
                </p>
              </div>

              {/* Desktop form label */}
              <div className="mb-5 hidden items-center justify-between lg:flex">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-black/60">
                  Create Account
                </span>

                <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.12em] text-black/60">
                  <LockKeyhole size={12} />
                  Protected access
                </span>
              </div>

              {/* Clerk */}
              <div className="w-full">
                <SignUp
                  // No return URL given: /portal routes admins to /admin and clients to /client.
                  fallbackRedirectUrl="/portal"
                  appearance={{
                    elements: {
                      rootBox:
                        "w-full",

                      cardBox:
                        "w-full shadow-none",

                      card:
                        "w-full rounded-none border border-black/10 bg-white/40 shadow-none",

                      headerTitle:
                        "text-black tracking-[-0.04em]",

                      headerSubtitle:
                        "text-black/45",

                      socialButtonsBlockButton:
                        "rounded-none border-black/10 shadow-none",

                      formButtonPrimary:
                        "rounded-none bg-black shadow-none hover:bg-black/85",

                      formFieldInput:
                        "rounded-none border-black/15 shadow-none",

                      footerActionLink:
                        "text-black font-semibold hover:text-[#f26a2e]",
                    },
                  }}
                />
              </div>

              {/* Bottom */}
              <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                <span className="flex items-center gap-2 text-[0.58rem] font-medium uppercase tracking-[0.13em] text-black/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  Secure access
                </span>

                <SiteLink
                  href="/"
                  className="group flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-black/55 transition-colors hover:text-black"
                >
                  Back to Drylake

                  <ArrowUpRight
                    size={11}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </SiteLink>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}