"use client";

import { motion, useReducedMotion } from "motion/react";

import Container from "@/components/ui/Container";

const systems = [
  {
    label: "Microsoft 365",
    desktop: "left-[3%] top-[14%]",
  },
  {
    label: "Xero",
    desktop: "right-[6%] top-[12%]",
  },
  {
    label: "MYOB",
    desktop: "left-[1%] bottom-[16%]",
  },
  {
    label: "Payments",
    desktop: "right-[1%] bottom-[17%]",
  },
  {
    label: "CRM",
    desktop: "left-[12%] top-1/2",
  },
  {
    label: "APIs",
    desktop: "right-[13%] top-1/2",
  },
];

export default function Integrations() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-black py-12 text-white sm:py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="signal-grid-dark pointer-events-none absolute inset-0 opacity-25"
      />

      <Container className="relative z-10">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
          <div>
            <p className="section-label flex items-center gap-2.5 text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              Work With What You Have
            </p>

            <h2 className="mt-5 max-w-2xl text-[clamp(2.5rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(3.8rem,5.5vw,5.7rem)]">
              Don&apos;t replace
              <br />

              <span className="text-white/28">
                what already works.
              </span>
            </h2>

            <p className="mt-4 max-w-lg text-sm leading-6 text-white/50 sm:mt-6 sm:text-base sm:leading-7">
              We can connect, extend and build around the systems your
              business already depends on.
            </p>
          </div>

          {/* Desktop network */}
          <div className="relative hidden h-[430px] lg:block">
            {/* horizontal routing */}
            <div className="absolute left-[10%] right-[10%] top-1/2 h-px bg-white/10" />

            {/* vertical routing */}
            <div className="absolute bottom-[12%] left-1/2 top-[12%] w-px bg-white/10" />

            {/* branch lines */}
            <div className="absolute left-[10%] top-[14%] h-[36%] w-px bg-white/10" />
            <div className="absolute right-[10%] top-[12%] h-[38%] w-px bg-white/10" />
            <div className="absolute bottom-[16%] left-[10%] h-[34%] w-px bg-white/10" />
            <div className="absolute bottom-[17%] right-[10%] h-[33%] w-px bg-white/10" />

            <div className="absolute left-[10%] top-[14%] h-px w-[40%] bg-white/10" />
            <div className="absolute right-[10%] top-[12%] h-px w-[40%] bg-white/10" />
            <div className="absolute bottom-[16%] left-[10%] h-px w-[40%] bg-white/10" />
            <div className="absolute bottom-[17%] right-[10%] h-px w-[40%] bg-white/10" />

            {/* Core */}
            <div className="absolute left-1/2 top-1/2 z-10 flex h-[132px] w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border border-[#f26a2e]/35 bg-black">
              <span className="signal-dot h-2 w-2 rounded-full bg-[#f26a2e]" />

              <span className="mt-4 text-sm font-semibold">
                DRYLAKE
              </span>

              <span className="tech-label mt-1 text-white/25">
                Connected workflow
              </span>
            </div>

            {systems.map((system) => (
              <div
                key={system.label}
                className={`absolute ${system.desktop}`}
              >
                <div className="flex items-center gap-2 border border-white/10 bg-black px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/25" />

                  <span className="tech-label whitespace-nowrap text-white/40">
                    {system.label}
                  </span>
                </div>
              </div>
            ))}

            {/* moving data signal */}
            <motion.span
              animate={
                reduceMotion
                  ? undefined
                  : {
                      left: ["10%", "50%", "90%"],
                      opacity: [0, 1, 0],
                    }
              }
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute top-[calc(50%-3px)] h-1.5 w-1.5 rounded-full bg-[#f26a2e]"
            />
          </div>

          {/* Mobile network */}
          <div className="lg:hidden">
            <div className="grid grid-cols-2 border-l border-t border-white/10">
              {systems.map((system) => (
                <div
                  key={system.label}
                  className="flex min-h-[48px] items-center gap-2 border-b border-r border-white/10 px-3"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/25" />

                  <span className="tech-label text-white/40">
                    {system.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mx-auto h-6 w-px bg-[#f26a2e]/40" />

            <div className="flex min-h-[64px] items-center justify-between border border-[#f26a2e]/30 bg-[#f26a2e]/[0.04] px-4">
              <div>
                <span className="tech-label text-[#f26a2e]">
                  DRYLAKE
                </span>

                <p className="mt-1 text-sm font-medium text-white/70">
                  One connected workflow
                </p>
              </div>

              <span className="signal-dot h-2 w-2 rounded-full bg-[#f26a2e]" />
            </div>
          </div>
        </div>

        <p className="mt-6 border-t border-white/[0.08] pt-4 text-[0.65rem] leading-5 text-white/22 sm:text-xs">
          Integrations depend on the capabilities and access provided by each
          platform.
        </p>
      </Container>
    </section>
  );
}