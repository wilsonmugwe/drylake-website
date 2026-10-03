"use client";

import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  ArrowRight,
  Check,
} from "lucide-react";
import { useState } from "react";

import Container from "@/components/ui/Container";

const stages = [
  {
    title: "Understand",
    text: "We learn how the business works today, where time is being lost and what actually needs to improve.",
    visual: ["BUSINESS", "PROBLEM", "GOAL"],
  },
  {
    title: "Design",
    text: "We work out the simplest useful solution and how it should fit with the systems and processes already in the business.",
    visual: ["PROBLEM", "DESIGN", "PLAN"],
  },
  {
    title: "Build",
    text: "We develop the software, automation or integration in manageable stages around the real business workflow.",
    visual: ["PLAN", "BUILD", "SYSTEM"],
  },
  {
    title: "Launch",
    text: "We put the solution into the real environment, connect what matters and make sure the people using it can rely on it.",
    visual: ["SYSTEM", "LAUNCH", "USE"],
  },
];

const productionDetails = [
  "Authentication",
  "Permissions",
  "Integrations",
  "Data validation",
  "Monitoring",
  "Backups & recovery",
];

export default function Approach() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="approach"
      className="relative overflow-hidden bg-[#f2f0e9] py-10 text-black sm:py-20 lg:py-28"
    >
      <Container className="relative z-10">
        {/* =====================================================
            HEADER
            ===================================================== */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <div>
            <p className="section-label text-black/45">
              04 / How We Work
            </p>

            <div className="mt-2.5 flex items-center gap-2 sm:mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

              <span className="tech-label text-black/30">
                PROBLEM → PRODUCTION
              </span>
            </div>
          </div>

          <div>
            <h2 className="max-w-4xl text-[2.4rem] font-semibold leading-[0.93] tracking-[-0.055em] sm:text-[clamp(2.7rem,6vw,6rem)] sm:leading-[0.92] sm:tracking-[-0.065em]">
              Understand first.
              <br />

              <span className="text-black/30">
                Build second.
              </span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-5 text-black/60 sm:mt-5 sm:text-base sm:leading-7">
              No technical specification required. We start with the business
              problem and work forward from there.
            </p>
          </div>
        </div>

        {/* =====================================================
            DESKTOP PROCESS
            ===================================================== */}
        <div className="mt-12 hidden lg:block">
          <div className="border border-black/10 bg-white/40 px-8 py-9">
            <div className="relative">
              <div className="absolute left-[10%] right-[10%] top-6 h-px bg-black/10" />

              <motion.div
                animate={{
                  width: `${(active / (stages.length - 1)) * 80}%`,
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute left-[10%] top-6 h-px bg-[#f26a2e]"
              />

              <div className="relative grid grid-cols-4">
                {stages.map((stage, index) => {
                  const selected = active === index;
                  const passed = index <= active;

                  return (
                    <button
                      key={stage.title}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onClick={() => setActive(index)}
                      className="group flex flex-col items-center text-center"
                    >
                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-[#f2f0e9] transition-all ${
                          selected
                            ? "border-[#f26a2e]"
                            : passed
                              ? "border-[#f26a2e]/50"
                              : "border-black/15"
                        }`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            selected
                              ? "bg-[#f26a2e]"
                              : passed
                                ? "bg-[#f26a2e]/50"
                                : "bg-black/20"
                          }`}
                        />
                      </div>

                      <span
                        className={`mt-5 text-xl font-medium tracking-[-0.035em] ${
                          selected
                            ? "text-black"
                            : "text-black/45"
                        }`}
                      >
                        {stage.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-[0.55fr_1.45fr] border-t border-black/10 pt-8">
              <div>
                <span className="font-mono text-xs text-[#f26a2e]">
                  0{active + 1}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -12,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                >
                  <div className="grid grid-cols-[1fr_0.8fr] gap-12">
                    <div>
                      <h3 className="text-4xl font-semibold tracking-[-0.05em]">
                        {stages[active].title}
                      </h3>

                      <p className="mt-4 max-w-2xl leading-7 text-black/60">
                        {stages[active].text}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <div className="flex w-full items-center">
                        {stages[active].visual.map(
                          (item, index) => (
                            <div
                              key={item}
                              className="flex min-w-0 flex-1 items-center"
                            >
                              <div className="flex min-w-0 flex-col">
                                <div
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    index === 1
                                      ? "bg-[#f26a2e]"
                                      : "bg-black/25"
                                  }`}
                                />

                                <span className="tech-label mt-2 truncate text-[0.48rem] text-black/30">
                                  {item}
                                </span>
                              </div>

                              {index <
                                stages[active].visual.length -
                                  1 && (
                                <div className="mx-3 h-px flex-1 bg-black/10" />
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* =====================================================
            COMPACT MOBILE PROCESS
            ===================================================== */}
        <div className="mt-6 lg:hidden">
          <div className="relative border-l border-black/15 pl-4 sm:mt-8 sm:pl-6">
            {stages.map((stage, index) => {
              const selected = active === index;

              return (
                <button
                  key={stage.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className="relative block w-full border-b border-black/10 py-3 text-left sm:py-5"
                >
                  <span
                    className={`absolute -left-[19px] top-[18px] h-2 w-2 rounded-full border-2 border-[#f2f0e9] sm:-left-[29px] sm:top-[27px] sm:h-2.5 sm:w-2.5 ${
                      selected
                        ? "bg-[#f26a2e]"
                        : "bg-black/20"
                    }`}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono text-[0.6rem] ${
                          selected
                            ? "text-[#f26a2e]"
                            : "text-black/30"
                        }`}
                      >
                        0{index + 1}
                      </span>

                      <h3
                        className={`text-lg font-medium tracking-[-0.035em] sm:text-2xl ${
                          selected
                            ? "text-black"
                            : "text-black/50"
                        }`}
                      >
                        {stage.title}
                      </h3>
                    </div>

                    <ArrowRight
                      size={14}
                      className={
                        selected
                          ? "text-[#f26a2e]"
                          : "text-black/20"
                      }
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.div
                        initial={{
                          height: 0,
                          opacity: 0,
                        }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                        }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-lg pb-1 pt-2 text-xs leading-5 text-black/55 sm:pt-3 sm:text-sm sm:leading-6">
                          {stage.text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            PRODUCTION ENGINEERING
            Former "Production Matters" section compressed into
            the process rather than taking another full section.
            ===================================================== */}
        <div className="mt-8 border-t border-black/10 pt-6 sm:mt-14 sm:pt-10 lg:mt-16">
          <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
            <div>
              <p className="section-label text-black/35">
                Production Matters
              </p>

              <p className="mt-2 hidden max-w-xs text-sm leading-6 text-black/40 sm:block">
                A working demo is only the beginning.
              </p>
            </div>

            <div>
              <h3 className="text-[2rem] font-semibold leading-[0.95] tracking-[-0.055em] sm:text-[clamp(2.7rem,5vw,5rem)]">
                The boring part
                <span className="text-black/25">
                  {" "}is the hard part.
                </span>
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-5 text-black/55 sm:mt-4 sm:leading-6">
                We engineer the less visible parts that make software
                dependable when the business starts relying on it.
              </p>

              {/* Mobile: compact 2-column list.
                  Desktop retains more generous spacing. */}
              <div className="mt-4 grid grid-cols-2 border-t border-black/10 sm:mt-6 sm:grid-cols-3">
                {productionDetails.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 border-b border-black/10 py-2.5 sm:py-3"
                  >
                    <Check
                      size={11}
                      strokeWidth={2}
                      className="shrink-0 text-[#f26a2e] sm:h-[13px] sm:w-[13px]"
                    />

                    <span className="text-xs text-black/50 sm:text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}