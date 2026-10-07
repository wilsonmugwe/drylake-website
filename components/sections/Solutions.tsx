"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";

const solutions = [
  {
    number: "01",
    label: "OPERATIONAL SOFTWARE",
    title: "Software that fits the business.",
    text: "Internal systems, portals and applications designed around the workflows your business actually depends on.",
    examples:
      "Internal platforms / Client & staff portals / Workflow systems / Web & mobile applications",
    links: [{ href: "/services/custom-software-development", label: "Custom software development" }],
  },
  {
    number: "02",
    label: "AUTOMATION + INTEGRATION",
    title: "Make the systems talk.",
    text: "Connect systems, remove duplicate handling and automate routine steps that slow teams down.",
    examples:
      "Workflow automation / System integrations / Approvals / Notifications / Data synchronisation",
    links: [
      { href: "/services/business-automation", label: "Business automation" },
      { href: "/services/systems-integration", label: "Systems integration" },
    ],
  },
  {
    number: "03",
    label: "APPLIED AI",
    title: "AI where it earns its place.",
    text: "Use AI where it can improve a real workflow, reduce work or create genuinely useful functionality.",
    examples:
      "Document processing / AI-assisted workflows / Internal tools / Decision support",
    links: [{ href: "/services/ai-automation", label: "AI automation" }],
  },
];

export default function Solutions() {
  return (
    <section
      id="solutions"
      className="relative overflow-hidden bg-[#f2f0e9] py-12 text-black sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="drylake-contours-light pointer-events-none absolute inset-0 opacity-55"
      />

      <Container className="relative z-10">
        <div className="grid gap-5 border-b border-black/10 pb-8 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16 lg:pb-12">
          <p className="section-label text-black/60">
            02 / What We Do
          </p>

          <div>
            <h2 className="max-w-5xl text-[clamp(2.55rem,11vw,4rem)] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[clamp(4rem,6.5vw,6.5rem)]">
              Less workaround.
              <br />

              <span className="text-black/45">
                More workflow.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60 sm:mt-6 sm:text-base sm:leading-7">
              We build and connect technology that helps growing Australian
              businesses operate more effectively.
            </p>
          </div>
        </div>

        <div>
          {solutions.map((solution, index) => (
            <motion.article
              key={solution.number}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                delay: index * 0.04,
              }}
              className="
                group
                grid
                border-b
                border-black/10
                py-7
                sm:py-9
                lg:grid-cols-[0.15fr_0.55fr_1fr]
                lg:gap-12
                lg:py-11
              "
            >
              <div className="flex items-start justify-between lg:block">
                <span className="font-mono text-xs text-[#f26a2e]">
                  {solution.number}
                </span>

                <span className="tech-label text-black/60 lg:hidden">
                  {solution.label}
                </span>
              </div>

              <div className="mt-4 lg:mt-0">
                <span className="tech-label hidden text-black/60 lg:block">
                  {solution.label}
                </span>

                <h3 className="mt-1 max-w-lg text-[1.9rem] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[2.5rem] lg:mt-4 lg:text-[3rem]">
                  {solution.title}
                </h3>
              </div>

              <div className="mt-4 lg:mt-0 lg:pt-7">
                <p className="max-w-xl text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
                  {solution.text}
                </p>

                <p className="mt-4 max-w-xl font-mono text-[0.62rem] uppercase leading-5 tracking-[0.08em] text-black/60 sm:text-[0.68rem]">
                  {solution.examples}
                </p>

                {/* Crawlable links to the service pages (no orphan pages, checklist #3). */}
                <div className="mt-5 flex flex-wrap gap-x-6">
                  {solution.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group/link inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      {link.label}
                      <ArrowUpRight
                        aria-hidden="true"
                        size={15}
                        className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-x-8 pt-6">
          <Link
            href="/services"
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          >
            All services

            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

          <Link
            href="/solutions"
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          >
            Explore what we do

            <ArrowUpRight
              size={15}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}