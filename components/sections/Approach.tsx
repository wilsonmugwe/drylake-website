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
    number: "01",
    title: "Understand",
    text: "We learn how the business works today, where time is being lost and what actually needs to improve.",
  },
  {
    number: "02",
    title: "Design",
    text: "We work out the simplest useful solution and how it should fit with the systems and processes already in the business.",
  },
  {
    number: "03",
    title: "Build",
    text: "We develop the software, automation or integration in manageable stages around the real business workflow.",
  },
  {
    number: "04",
    title: "Launch",
    text: "We put the solution into the real environment, connect what matters and make sure the people using it can rely on it.",
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
      className="relative overflow-hidden bg-[#f2f0e9] py-12 text-black sm:py-20 lg:py-24"
    >
      <Container>
        <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <div>
            <p className="section-label text-black/60">
              04 / How We Work
            </p>
          </div>

          <div>
            <h2 className="max-w-5xl text-[clamp(2.55rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(4rem,6.5vw,6.5rem)]">
              Understand first.
              <br />

              <span className="text-black/45">
                Build second.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/60 sm:mt-6 sm:text-base sm:leading-7">
              No technical specification required. We start with the business
              problem and work forward from there.
            </p>
          </div>
        </div>

        {/* Process */}
        <div className="mt-9 border-t border-black/10 sm:mt-12">
          {stages.map((stage, index) => {
            const selected = active === index;

            return (
              <div
                key={stage.number}
                className="border-b border-black/10"
              >
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className="
                    group
                    grid
                    w-full
                    grid-cols-[42px_1fr_auto]
                    items-center
                    gap-3
                    py-4
                    text-left
                    sm:grid-cols-[70px_1fr_auto]
                    sm:py-6
                    lg:grid-cols-[0.15fr_0.55fr_1fr]
                    lg:gap-12
                  "
                >
                  <span
                    className={`font-mono text-[0.62rem] sm:text-xs ${
                      selected
                        ? "text-(--orange-ink)"
                        : "text-black/60"
                    }`}
                  >
                    {stage.number}
                  </span>

                  <h3
                    className={`text-xl font-semibold tracking-[-0.04em] transition-colors sm:text-2xl lg:text-[2.5rem] ${
                      selected
                        ? "text-black"
                        : "text-black/60"
                    }`}
                  >
                    {stage.title}
                  </h3>

                  <div className="lg:hidden">
                    <ArrowRight
                      size={15}
                      className={
                        selected
                          ? "text-[#f26a2e]"
                          : "text-black/20"
                      }
                    />
                  </div>

                  <p
                    className={`
                      hidden
                      max-w-xl
                      text-sm
                      leading-6
                      transition-colors
                      lg:block
                      ${
                        selected
                          ? "text-black/60"
                          : "text-black/60"
                      }
                    `}
                  >
                    {stage.text}
                  </p>
                </button>

                {/* Mobile description */}
                <AnimatePresence initial={false}>
                  {selected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden lg:hidden"
                    >
                      <p className="pb-5 pl-[55px] pr-4 text-sm leading-6 text-black/60 sm:pl-[83px]">
                        {stage.text}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Production */}
        <div className="mt-10 grid gap-5 border-t border-black/10 pt-8 sm:mt-14 sm:pt-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <div>
            <p className="section-label text-black/60">
              Production Matters
            </p>
          </div>

          <div>
            <h3 className="max-w-4xl text-[2.2rem] font-semibold leading-[0.95] tracking-[-0.055em] sm:text-[clamp(3rem,5vw,5rem)]">
              The boring part
              <br />

              <span className="text-black/45">
                is the hard part.
              </span>
            </h3>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/60 sm:text-base">
              We engineer the less visible parts that make software dependable
              when the business starts relying on it.
            </p>

            <div className="mt-6 grid grid-cols-2 border-l border-t border-black/10 sm:grid-cols-3">
              {productionDetails.map((item) => (
                <div
                  key={item}
                  className="flex min-h-[48px] items-center gap-2 border-b border-r border-black/10 px-3"
                >
                  <Check
                    size={12}
                    className="shrink-0 text-[#f26a2e]"
                  />

                  <span className="text-xs text-black/60 sm:text-sm">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}