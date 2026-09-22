"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";
import Container from "@/components/ui/Container";

export default function Hero() {
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
    const rect = event.currentTarget.getBoundingClientRect();

    mouseX.set((event.clientX - rect.left - rect.width / 2) * 0.035);
    mouseY.set((event.clientY - rect.top - rect.height / 2) * 0.035);
  }

  return (
    <section
      onMouseMove={handleMouseMove}
      className="hero-grid relative flex min-h-[100svh] overflow-hidden bg-[#070707] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(255,255,255,0.08),transparent_30%)]" />

      <motion.div
        style={{ x, y }}
        className="pointer-events-none absolute right-[-16rem] top-[15%] hidden h-[44rem] w-[44rem] rounded-full border border-white/10 lg:block"
      >
        <div className="absolute inset-[10%] rounded-full border border-white/[0.08]" />
        <div className="absolute inset-[23%] rounded-full border border-white/[0.08]" />
        <div className="absolute inset-[36%] rounded-full border border-white/15" />

        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-[5%] rounded-full border border-dashed border-white/15"
        />

        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.8)]" />
      </motion.div>

      <div className="pointer-events-none absolute -right-28 bottom-12 h-72 w-72 rounded-full border border-white/10 lg:hidden">
        <div className="absolute inset-12 rounded-full border border-white/10" />
        <div className="absolute inset-24 rounded-full border border-white/20" />
      </div>

      <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-7 pt-28 sm:pb-10 lg:justify-center lg:pb-0 lg:pt-24">
        <div className="max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mb-5 text-white/40 sm:mb-7"
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
            className="max-w-5xl text-[clamp(3.5rem,10vw,8.7rem)] font-semibold leading-[0.85] tracking-[-0.075em]"
          >
            Build better.
            <br />
            Operate smarter.
            <br />
            Grow faster.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-7 lg:mt-10"
          >
            <p className="max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Intelligent software, AI and automation built around real
              business problems.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="group flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-black transition-transform hover:scale-[1.025]"
              >
                Start a Project
                <ArrowUpRight
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <Link
                href="#solutions"
                className="flex items-center justify-center rounded-full border border-white/20 px-6 py-4 text-sm font-semibold transition-colors hover:bg-white hover:text-black"
              >
                Explore Solutions
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 flex items-end justify-between lg:absolute lg:bottom-9 lg:left-12 lg:right-12 xl:left-16 xl:right-16">
          <p className="hidden text-xs uppercase tracking-[0.17em] text-white/30 sm:block">
            Innovation · Integrity · Impact
          </p>

          <Link
            href="#solutions"
            aria-label="View Drylake solutions"
            className="ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/20 transition-all hover:bg-white hover:text-black"
          >
            <ArrowDown size={17} />
          </Link>
        </div>
      </Container>
    </section>
  );
}