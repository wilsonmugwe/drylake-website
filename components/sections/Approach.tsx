"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const stages = [
  {
    title: "Discover",
    text: "Understand the problem, the people experiencing it and how the operation actually works.",
  },
  {
    title: "Design",
    text: "Turn what we learned into the simplest useful system, workflow or technical approach.",
  },
  {
    title: "Build",
    text: "Develop the software, automation, integration or setup required to make the solution real.",
  },
  {
    title: "Deploy",
    text: "Put it into the real environment, connect what needs connecting and make sure it works where it matters.",
  },
  {
    title: "Evolve",
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
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <p className="section-label text-white/35">04 / How We Work</p>

          <div>
            <h2 className="max-w-4xl text-[clamp(2.8rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.065em]">
              Start with
              <span className="text-white/30"> the problem.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50">
              We learn how the operation actually runs before we choose the
              technology. Choosing the tool first is how businesses end up
              adapting themselves to software that never properly fit.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="border-t border-white/10">
            {stages.map((stage, index) => (
              <button
                key={stage.title}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className="group grid w-full grid-cols-[55px_1fr_auto] items-center border-b border-white/10 py-5 text-left sm:grid-cols-[80px_1fr_auto] lg:py-6"
              >
                <span className="font-mono text-xs text-white/25">
                  0{index + 1}
                </span>

                <span
                  className={`text-2xl font-medium tracking-[-0.04em] transition-all sm:text-3xl ${
                    active === index ? "translate-x-2 text-white" : "text-white/55"
                  }`}
                >
                  {stage.title}
                </span>

                <ArrowRight
                  size={17}
                  className={`transition-all ${
                    active === index
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-2 opacity-20"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex min-h-[220px] items-end rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 sm:p-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <span className="font-mono text-xs text-white/25">
                  0{active + 1}
                </span>

                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
                  {stages[active].title}
                </h3>

                <p className="mt-4 max-w-md leading-7 text-white/45">
                  {stages[active].text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}