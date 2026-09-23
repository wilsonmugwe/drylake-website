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
  },
  {
    title: "Design",
    code: "MODEL",
    text: "Turn what we learned into the simplest useful system, workflow or technical approach.",
  },
  {
    title: "Build",
    code: "SYSTEM",
    text: "Develop the software, automation, integration or setup required to make the solution real.",
  },
  {
    title: "Deploy",
    code: "LIVE",
    text: "Put it into the real environment, connect what needs connecting and make sure it works where it matters.",
  },
  {
    title: "Evolve",
    code: "LOOP",
    text: "Learn from real use, remove friction and improve the system as the business changes.",
  },
];

export default function Approach() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="approach"
      className="relative overflow-hidden bg-[#0a0a0a] py-20 text-white sm:py-24 lg:py-28"
    >
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-20" />

      <Container className="relative z-10">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <p className="section-label text-white/45">
            04 / How We Work
          </p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Start with
              <span className="text-white/35"> the problem.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/60">
              We learn how the operation actually runs before we choose the
              technology. Choosing the tool first is how businesses end up
              adapting themselves to software that never properly fit.
            </p>
          </div>
        </div>

        {/* =====================================================
            DESKTOP PROCESS MAP
            ===================================================== */}
        <div className="mt-14 hidden lg:block">
          <div className="tech-panel-dark micro-grid-dark relative px-8 py-10">
            <div className="mb-10 flex items-center justify-between">
              <span className="tech-label text-white/35">
                DELIVERY SYSTEM / 001
              </span>

              <span className="tech-label flex items-center gap-2 text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />
                ACTIVE
              </span>
            </div>

            <div className="relative">
              {/* base line */}
              <div className="absolute left-[8%] right-[8%] top-6 h-px bg-white/15" />

              {/* progress */}
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
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-[#0a0a0a] transition-all ${
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

            <div className="mt-12 grid grid-cols-[0.7fr_1.3fr] border-t border-white/10 pt-8">
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
                  <h3 className="text-4xl font-semibold tracking-[-0.05em]">
                    {stages[active].title}
                  </h3>

                  <p className="mt-4 max-w-2xl leading-7 text-white/60">
                    {stages[active].text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* =====================================================
            MOBILE / TABLET PROCESS
            ===================================================== */}
        <div className="mt-12 lg:hidden">
          <div className="relative border-l border-white/15 pl-6">
            {stages.map((stage, index) => {
              const selected = active === index;

              return (
                <button
                  key={stage.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className="relative block w-full border-b border-white/10 py-5 text-left"
                >
                  <span
                    className={`absolute -left-[29px] top-[27px] h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] ${
                      selected ? "bg-[#f26a2e]" : "bg-white/30"
                    }`}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span
                        className={`font-mono text-xs ${
                          selected
                            ? "text-[#f26a2e]"
                            : "text-white/30"
                        }`}
                      >
                        0{index + 1}
                      </span>

                      <h3
                        className={`mt-2 text-2xl font-medium tracking-[-0.04em] ${
                          selected ? "text-white" : "text-white/60"
                        }`}
                      >
                        {stage.title}
                      </h3>
                    </div>

                    <ArrowRight
                      size={17}
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
                        <p className="max-w-lg pt-4 text-sm leading-6 text-white/60">
                          {stage.text}
                        </p>

                        <span className="tech-label mt-4 block text-[#f26a2e]">
                          {stage.code}
                        </span>
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