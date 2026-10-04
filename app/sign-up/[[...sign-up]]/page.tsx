import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
} from "lucide-react";

const benefits = [
  "Secure account access",
  "Access to your Drylake portal",
  "One place for future project access",
];

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Grid */}
      <div
        aria-hidden="true"
        className="hero-large-grid pointer-events-none absolute inset-0 opacity-45"
      />

      {/* Subtle orange atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-[#f26a2e]/[0.05] blur-[120px]"
      />

      {/* Architectural lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[7%] top-0 hidden w-px bg-white/[0.06] lg:block"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-[7%] top-0 hidden w-px bg-white/[0.06] lg:block"
      />

      {/* Top bar */}
      <header className="relative z-20 border-b border-white/[0.08]">
        <div className="mx-auto flex h-[78px] w-full max-w-[1440px] items-center justify-between px-5 sm:h-[88px] sm:px-8 lg:px-12 xl:px-16">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <span className="flex h-8 w-8 items-center justify-center border border-white/15">
              <ArrowLeft
                size={14}
                className="text-white/60 transition-transform group-hover:-translate-x-0.5 group-hover:text-white"
              />
            </span>

            <span className="text-sm font-medium tracking-[-0.02em] text-white/65 transition-colors group-hover:text-white">
              Drylake
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-white/30">
              Account access
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="relative z-10">
        <div className="mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-[1440px] items-center gap-10 px-5 py-10 sm:min-h-[calc(100vh-88px)] sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12 xl:px-16">
          {/* Left */}
          <div className="hidden lg:block">
            <p className="section-label flex items-center gap-2.5 text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Create an Account
            </p>

            <h1 className="mt-6 max-w-2xl text-[clamp(4rem,6vw,7rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
              Your Drylake
              <br />

              <span className="text-white/30">
                access point.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-white/45">
              Create an account for secure access to Drylake&apos;s
              client-facing systems.
            </p>

            <div className="mt-9 max-w-md border-t border-white/10">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 border-b border-white/[0.08] py-3.5"
                >
                  <Check
                    size={13}
                    className="text-[#f26a2e]"
                  />

                  <span className="text-sm text-white/45">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clerk */}
          <div className="flex flex-col items-center lg:items-end">
            {/* Mobile identity */}
            <div className="mb-7 w-full max-w-[420px] lg:hidden">
              <p className="section-label flex items-center gap-2 text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                Create an Account
              </p>

              <h1 className="mt-3 text-[2.8rem] font-semibold leading-[0.9] tracking-[-0.06em]">
                Get
                <span className="text-white/30"> started.</span>
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Create your account for secure Drylake access.
              </p>
            </div>

            <div className="w-full max-w-[420px]">
              <SignUp />
            </div>

            <div className="mt-5 flex w-full max-w-[420px] items-center justify-between border-t border-white/[0.08] pt-4">
              <span className="text-[0.6rem] uppercase tracking-[0.12em] text-white/20">
                Drylake Pty Ltd
              </span>

              <Link
                href="/"
                className="group flex items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-white"
              >
                Visit website

                <ArrowUpRight
                  size={12}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}