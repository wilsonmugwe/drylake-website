import {
  ArrowDown,
  ArrowRight,
  Braces,
  CreditCard,
  Database,
} from "lucide-react";

import Container from "@/components/ui/Container";

const systems = [
  "Microsoft 365",
  "Xero",
  "MYOB",
  "Payments",
  "CRM",
  "APIs",
];

export default function Integrations() {
  return (
    <section className="relative overflow-hidden bg-black py-9 text-white sm:py-16 lg:py-20">
      <div
        aria-hidden="true"
        className="micro-grid-dark pointer-events-none absolute inset-0 opacity-40"
      />

      <Container className="relative z-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          {/* Message */}
          <div>
            <p className="section-label flex items-center gap-2 text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
              Work With What You Have
            </p>

            <h2 className="mt-3 max-w-2xl text-[2.25rem] font-semibold leading-[0.94] tracking-[-0.055em] sm:mt-5 sm:text-[clamp(3rem,5vw,5rem)] sm:leading-[0.9]">
              Don&apos;t replace what&apos;s
              <span className="text-white/30"> already working.</span>
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50 sm:mt-5 sm:text-base sm:leading-7">
              We can connect, extend and build around the systems your
              business already depends on.
            </p>
          </div>

          {/* Compact system visual */}
          <div className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="grid grid-cols-3 gap-2">
              {systems.map((system) => (
                <div
                  key={system}
                  className="flex min-h-[54px] items-center justify-center border border-white/10 bg-white/[0.025] px-2 text-center"
                >
                  <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-white/45 sm:text-xs">
                    {system}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile connector */}
            <div className="flex justify-center py-2.5 lg:hidden">
              <ArrowDown
                size={15}
                className="text-[#f26a2e]"
              />
            </div>

            {/* Desktop connector */}
            <div className="hidden justify-center py-3 lg:flex">
              <ArrowDown
                size={16}
                className="text-[#f26a2e]"
              />
            </div>

            <div className="flex items-center justify-between border border-[#f26a2e]/30 bg-[#f26a2e]/[0.06] px-4 py-3">
              <div>
                <p className="tech-label text-[#f26a2e]">
                  DRYLAKE
                </p>

                <p className="mt-1 text-sm font-medium text-white/75">
                  One connected workflow
                </p>
              </div>

              <div className="flex items-center gap-2 text-white/25">
                <Database size={14} />
                <ArrowRight size={13} />
                <Braces size={14} />
                <ArrowRight size={13} />
                <CreditCard size={14} />
              </div>
            </div>

            <p className="mt-3 text-[0.65rem] leading-5 text-white/25 sm:text-xs">
              Integrations depend on the capabilities and access provided by
              each platform.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}