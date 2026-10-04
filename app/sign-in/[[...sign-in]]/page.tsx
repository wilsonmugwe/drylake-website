import Image from "next/image";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";

export default function SignInPage() {
  return (
    <main className="min-h-[100svh] bg-black text-white">
      <div className="grid min-h-[100svh] lg:grid-cols-[0.8fr_1.2fr]">
        {/* =====================================================
            BRAND / LEFT PANEL
            ===================================================== */}
        <section className="relative hidden overflow-hidden border-r border-white/[0.08] lg:flex lg:flex-col lg:justify-between">
          {/* Architectural background */}
          <div
            aria-hidden="true"
            className="hero-large-grid pointer-events-none absolute inset-0 opacity-35"
          />

          {/* Orange glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-[28%] h-[420px] w-[420px] rounded-full bg-[#f26a2e]/[0.035] blur-3xl"
          />

          {/* Large technical circle */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px]"
          >
            <div className="absolute inset-0 rounded-full border border-white/[0.035]" />
            <div className="absolute inset-[18%] rounded-full border border-white/[0.05]" />
            <div className="absolute inset-[36%] rounded-full border border-white/[0.07]" />

            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26a2e]" />
          </div>

          {/* Top */}
          <div className="relative z-10 px-10 pt-8 xl:px-14 xl:pt-10">
            <Link
              href="/"
              aria-label="Return to Drylake home"
              className="inline-flex"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake Technologies"
                width={1536}
                height={1024}
                priority
                className="h-[84px] w-[132px] object-contain"
              />
            </Link>
          </div>

          {/* Main brand statement */}
          <div className="relative z-10 px-10 xl:px-14">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-white/35">
                CLIENT ACCESS
              </span>
            </div>

            <h1 className="mt-6 max-w-xl text-[clamp(3.6rem,5vw,6.5rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
              Welcome
              <br />

              <span className="text-white/30">
                back.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-white/45">
              Sign in to access your Drylake workspace and continue
              where you left off.
            </p>
          </div>

          {/* Bottom */}
          <div className="relative z-10 px-10 pb-10 xl:px-14">
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-5">
              <span className="tech-label text-white/25">
                DRYLAKE TECHNOLOGIES
              </span>

              <span className="tech-label flex items-center gap-2 text-white/25">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                PERTH / WA
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            AUTHENTICATION / RIGHT PANEL
            ===================================================== */}
        <section className="relative flex min-h-[100svh] flex-col bg-[#f2f0e9] text-black">
          {/* Mobile header */}
          <header className="flex h-[86px] items-center justify-between border-b border-black/[0.08] px-5 sm:px-8 lg:hidden">
            <Link
              href="/"
              aria-label="Drylake home"
              className="flex items-center"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake Technologies"
                width={1536}
                height={1024}
                priority
                className="h-[64px] w-[100px] object-contain brightness-0"
              />
            </Link>

            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center border border-black/10"
              aria-label="Back to Drylake"
            >
              <ArrowLeft size={16} />
            </Link>
          </header>

          {/* Subtle background structure */}
          <div
            aria-hidden="true"
            className="micro-grid pointer-events-none absolute inset-0 opacity-[0.16]"
          />

          <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12 xl:px-20">
            <div className="w-full max-w-[520px]">
              {/* Mobile title */}
              <div className="mb-7 lg:hidden">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

                  <span className="tech-label text-black/35">
                    CLIENT ACCESS
                  </span>
                </div>

                <h1 className="mt-4 text-[2.8rem] font-semibold leading-[0.9] tracking-[-0.06em]">
                  Welcome back.
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-black/50">
                  Sign in to continue to your Drylake workspace.
                </p>
              </div>

              {/* Desktop context */}
              <div className="mb-6 hidden items-center justify-between lg:flex">
                <span className="section-label text-black/35">
                  Secure sign in
                </span>

                <span className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-black/30">
                  <LockKeyhole size={12} />
                  Protected access
                </span>
              </div>

              {/* Clerk */}
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/portal"
                appearance={{
                  variables: {
                    colorPrimary: "#000000",
                    colorBackground: "#f2f0e9",
                    colorText: "#0a0a0a",
                    colorTextSecondary:
                      "rgba(10, 10, 10, 0.48)",
                    colorInputBackground: "transparent",
                    colorInputText: "#0a0a0a",
                    borderRadius: "0px",
                  },

                  elements: {
                    rootBox: "w-full",

                    cardBox:
                      "w-full shadow-none bg-transparent",

                    card:
                      "w-full bg-transparent shadow-none border border-black/10 p-5 sm:p-8",

                    headerTitle:
                      "text-left text-[2rem] sm:text-[2.4rem] font-semibold tracking-[-0.055em] text-black",

                    headerSubtitle:
                      "text-left text-sm leading-6 text-black/45",

                    socialButtonsBlockButton:
                      "h-12 border border-black/10 bg-white/50 shadow-none hover:bg-white transition-colors",

                    socialButtonsBlockButtonText:
                      "font-medium text-black/65",

                    dividerLine:
                      "bg-black/10",

                    dividerText:
                      "text-black/30 text-xs",

                    formFieldLabel:
                      "text-[0.68rem] uppercase tracking-[0.1em] font-medium text-black/40",

                    formFieldInput:
                      "h-12 rounded-none border-x-0 border-t-0 border-b border-black/15 bg-transparent px-0 shadow-none text-black focus:border-black focus:ring-0",

                    formButtonPrimary:
                      "h-12 rounded-none bg-black text-white shadow-none hover:bg-black/85 normal-case text-sm font-semibold",

                    footer:
                      "bg-transparent",

                    footerActionText:
                      "text-black/40",

                    footerActionLink:
                      "font-semibold text-black hover:text-[#f26a2e]",

                    identityPreview:
                      "rounded-none border border-black/10 bg-white/40 shadow-none",

                    formFieldInputShowPasswordButton:
                      "text-black/35 hover:text-black",

                    formResendCodeLink:
                      "text-black font-semibold",

                    otpCodeFieldInput:
                      "rounded-none border-black/15",

                    alert:
                      "rounded-none border border-black/10 bg-white/50",

                    formFieldErrorText:
                      "text-red-700 text-xs",
                  },
                }}
              />

              {/* Bottom security detail */}
              <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                <span className="tech-label flex items-center gap-2 text-black/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                  SECURE ACCESS
                </span>

                <Link
                  href="/"
                  className="group flex items-center gap-1.5 text-xs font-medium text-black/35 transition-colors hover:text-black"
                >
                  drylake.com.au

                  <ArrowUpRight
                    size={11}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}