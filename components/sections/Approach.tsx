"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const stages = [
  {
    title: "Discover",
    code: "INPUT",
    text: "Understand the problem, the people experiencing it and how the operation actually works.",
    visual: ["CUSTOMER", "MANUAL STEP", "RESULT"],
  },
  {
    title: "Design",
    code: "MODEL",
    text: "Turn what we learned into the simplest useful system, workflow or technical approach.",
    visual: ["PROBLEM", "MODEL", "SOLUTION"],
  },
  {
    title: "Build",
    code: "SYSTEM",
    text: "Develop the software, automation, integration or setup required to make the solution real.",
    visual: ["INPUT", "BUILD", "SYSTEM"],
  },
  {
    title: "Deploy",
    code: "LIVE",
    text: "Put it into the real environment, connect what needs connecting and make sure it works where it matters.",
    visual: ["SYSTEM", "DEPLOY", "LIVE"],
  },
  {
    title: "Evolve",
    code: "LOOP",
    text: "Learn from real use, remove friction and improve the system as the business changes.",
    visual: ["USE", "LEARN", "IMPROVE"],
  },
];

export default function Approach() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="approach"
      className="relative overflow-hidden bg-black py-14 text-white sm:py-20 lg:py-28"
    >
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-20" />

      {/* background system geometry */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 xl:block"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.035]" />
        <div className="absolute inset-20 rounded-full border border-white/[0.045]" />
        <div className="absolute inset-40 rounded-full border border-white/[0.055]" />
      </div>

      <Container className="relative z-10">
        {/* heading */}
        <div className="grid gap-5 sm:gap-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12">
          <p className="section-label text-white/45">
            06 / How We Work
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.7rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Start with
              <span className="text-white/35"> the problem.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60 sm:mt-6 sm:text-base sm:leading-7">
              We learn how the operation actually runs before we choose the
              technology. Choosing the tool first is how businesses end up
              adapting themselves to software that never properly fit.
            </p>
          </div>
        </div>

        {/* =====================================================
            DESKTOP PROCESS SYSTEM
            ===================================================== */}

        <div className="mt-10 hidden lg:block lg:mt-14">
          <div className="tech-panel-dark micro-grid-dark relative px-8 py-9">
            {/* panel header */}
            <div className="mb-9 flex items-center justify-between">
              <span className="tech-label text-white/35">
                DELIVERY SYSTEM / 001
              </span>

              <span className="tech-label flex items-center gap-2 text-white/35">
                <span className="signal-dot h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                ACTIVE
              </span>
            </div>

            {/* process map */}
            <div className="relative">
              <div className="absolute left-[8%] right-[8%] top-6 h-px bg-white/15" />

              <motion.div
                animate={{
                  width: `${(active / (stages.length - 1)) * 84}%`,
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute left-[8%] top-6 h-px bg-[#f26a2e]"
              />

              <div className="relative grid grid-cols-5">
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
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-black transition-all ${
                          selected
                            ? "orange-glow border-[#f26a2e]"
                            : passed
                              ? "border-[#f26a2e]/50"
                              : "border-white/20"
                        }`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full transition-colors ${
                            selected
                              ? "bg-[#f26a2e]"
                              : passed
                                ? "bg-[#f26a2e]/60"
                                : "bg-white/30"
                          }`}
                        />
                      </div>

                      <span
                        className={`mt-5 text-xl font-medium tracking-[-0.035em] transition-colors ${
                          selected ? "text-white" : "text-white/55"
                        }`}
                      >
                        {stage.title}
                      </span>

                      <span
                        className={`tech-label mt-2 transition-colors ${
                          selected
                            ? "text-[#f26a2e]"
                            : "text-white/25"
                        }`}
                      >
                        {stage.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* selected stage detail */}
            <div className="mt-10 grid grid-cols-[0.55fr_1.45fr] border-t border-white/10 pt-7">
              <div>
                <span className="font-mono text-xs text-[#f26a2e]">
                  0{active + 1}
                </span>

                <p className="tech-label mt-3 text-white/25">
                  CURRENT STAGE
                </p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="grid grid-cols-[1fr_0.8fr] gap-12">
                    <div>
                      <h3 className="text-4xl font-semibold tracking-[-0.05em]">
                        {stages[active].title}
                      </h3>

                      <p className="mt-4 max-w-2xl leading-7 text-white/60">
                        {stages[active].text}
                      </p>
                    </div>

                    {/* dynamic system visual */}
                    <div className="flex items-center">
                      <div className="flex w-full items-center">
                        {stages[active].visual.map((item, index) => (
                          <div
                            key={item}
                            className="flex min-w-0 flex-1 items-center"
                          >
                            <div className="flex min-w-0 flex-col">
                              <div
                                className={`h-2.5 w-2.5 rounded-full ${
                                  index === 1
                                    ? "signal-dot bg-[#f26a2e]"
                                    : "bg-white/40"
                                }`}
                              />

                              <span className="tech-label mt-2 truncate text-[0.48rem] text-white/30">
                                {item}
                              </span>
                            </div>

                            {index < stages[active].visual.length - 1 && (
                              <div className="mx-3 h-px flex-1 bg-white/15">
                                <motion.div
                                  key={`${active}-${index}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: "100%" }}
                                  transition={{
                                    duration: 0.5,
                                    delay: index * 0.12,
                                  }}
                                  className="h-px bg-[#f26a2e]/60"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* =====================================================
            MOBILE / TABLET
            Compact intentionally
            ===================================================== */}

        <div className="mt-7 sm:mt-10 lg:hidden">
          <div className="relative border-l border-white/15 pl-5 sm:pl-6">
            {stages.map((stage, index) => {
              const selected = active === index;

              return (
                <button
                  key={stage.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className="relative block w-full border-b border-white/10 py-3.5 text-left sm:py-5"
                >
                  <span
                    className={`absolute -left-[24px] top-[21px] h-2 w-2 rounded-full border-2 border-black sm:-left-[29px] sm:top-[27px] sm:h-2.5 sm:w-2.5 ${
                      selected ? "bg-[#f26a2e]" : "bg-white/30"
                    }`}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span
                        className={`font-mono text-[0.65rem] ${
                          selected
                            ? "text-[#f26a2e]"
                            : "text-white/30"
                        }`}
                      >
                        0{index + 1}
                      </span>

                      <h3
                        className={`mt-1 text-xl font-medium tracking-[-0.04em] sm:mt-2 sm:text-2xl ${
                          selected ? "text-white" : "text-white/60"
                        }`}
                      >
                        {stage.title}
                      </h3>
                    </div>

                    <ArrowRight
                      size={16}
                      className={
                        selected
                          ? "text-[#f26a2e]"
                          : "text-white/25"
                      }
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-lg pt-3 text-sm leading-6 text-white/60 sm:pt-4">
                          {stage.text}
                        </p>

                        <div className="mt-4 flex max-w-sm items-center">
                          {stage.visual.map((item, itemIndex) => (
                            <div
                              key={item}
                              className="flex min-w-0 flex-1 items-center"
                            >
                              <div className="flex min-w-0 flex-col">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    itemIndex === 1
                                      ? "bg-[#f26a2e]"
                                      : "bg-white/40"
                                  }`}
                                />

                                <span className="tech-label mt-2 truncate text-[0.42rem] text-white/30">
                                  {item}
                                </span>
                              </div>

                              {itemIndex < stage.visual.length - 1 && (
                                <div className="mx-2 h-px flex-1 bg-white/15" />
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}