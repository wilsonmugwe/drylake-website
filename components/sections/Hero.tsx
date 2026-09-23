"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";
import Container from "@/components/ui/Container";

export default function Hero() {
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const x = useSpring(mouseX, {
    stiffness: 45,
    damping: 20,
  });

  const y = useSpring(mouseY, {
    stiffness: 45,
    damping: 20,
  });

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;

    const rect = event.currentTarget.getBoundingClientRect();

    mouseX.set((event.clientX - rect.left - rect.width / 2) * 0.035);
    mouseY.set((event.clientY - rect.top - rect.height / 2) * 0.035);
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="light-grid relative flex min-h-[100svh] overflow-hidden bg-white text-black"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_35%,rgba(0,0,0,0.055),transparent_28%)]" />

      <motion.div
        style={{ x, y }}
        className="pointer-events-none absolute right-[-17rem] top-[14%] hidden h-[46rem] w-[46rem] rounded-full border border-black/10 lg:block"
      >
        <div className="absolute inset-[10%] rounded-full border border-black/[0.07]" />
        <div className="absolute inset-[23%] rounded-full border border-black/[0.07]" />
        <div className="absolute inset-[36%] rounded-full border border-black/15" />

        <motion.div
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[5%] rounded-full border border-dashed border-black/15"
        />

        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
      </motion.div>

      <div className="pointer-events-none absolute -right-24 bottom-24 h-64 w-64 rounded-full border border-black/10 lg:hidden">
        <div className="absolute inset-10 rounded-full border border-black/10" />
        <div className="absolute inset-20 rounded-full border border-black/15" />
      </div>

      <Container className="relative z-10 flex min-h-[100svh] flex-col justify-center pb-12 pt-32 lg:pt-28">
        <div className="max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="section-label mb-6 text-black/40"
          >
            Tomorrow Starts Here.
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.85,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="max-w-5xl text-[clamp(3.6rem,10vw,9rem)] font-semibold leading-[0.84] tracking-[-0.075em]"
          >
            The boring part
            <br />
            <span className="text-black/30">is the hard part.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8"
          >
            <p className="max-w-xl text-base leading-7 text-black/55 sm:text-lg">
              Drylake builds software and handles the technical work that gets
              in the way of the work you actually do.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#solutions"
                className="group flex items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.025]"
              >
                See what we do
                <ArrowDown size={16} />
              </Link>

              <Link
                href="/contact"
                className="group flex items-center justify-center gap-2 rounded-full border border-black/15 px-6 py-4 text-sm font-semibold transition-all hover:bg-black hover:text-white"
              >
                Bring us a problem
                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </motion.div>
        </div>

        <p className="absolute bottom-8 hidden text-xs uppercase tracking-[0.17em] text-black/30 sm:block">
          Innovation · Integrity · Impact
        </p>
      </Container>
    </section>
  );
}