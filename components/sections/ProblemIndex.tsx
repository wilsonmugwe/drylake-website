import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import Container from "@/components/ui/Container";
import { findService } from "@/lib/discovery/entity";
import { BUSINESS_PROBLEMS } from "@/lib/discovery/problems";

/*
 * Problem-led discovery on /solutions (final refinement PR, 2026-10-08). Each row is a problem in
 * the owner's words, the outcome the work produces, and real links to the service pages that fix
 * it: PROBLEM -> SOLUTION -> SERVICE. Rows carry ids so service pages can link back to them.
 * Server-rendered list, so the whole problem -> service map is in the initial HTML for crawlers.
 */
export default function ProblemIndex() {
  return (
    <section id="problems" aria-labelledby="problems-heading" className="bg-white py-(--section-y-compact) text-black">
      <Container>
        <div className="grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
          <p className="section-label text-black/60">Common problems</p>

          <div>
            <h2 id="problems-heading" className="max-w-4xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">
              Where the work usually starts.
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-black/65">
              Most conversations begin with one of these. Each one links to the service that usually
              solves it.
            </p>
          </div>
        </div>

        <ul className="mt-8 border-t border-black/10 sm:mt-10">
          {BUSINESS_PROBLEMS.map((item) => (
            <li
              key={item.id}
              id={item.id}
              className="grid scroll-mt-[calc(var(--nav-h)+24px)] gap-2 border-b border-black/10 py-5 sm:py-6 lg:grid-cols-[0.9fr_1.1fr_auto] lg:items-baseline lg:gap-8"
            >
              <h3 className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">{item.problem}</h3>

              <p className="text-sm leading-6 text-black/65 sm:text-base sm:leading-7">{item.outcome}</p>

              <ul aria-label="Relevant services" className="flex flex-wrap gap-x-5 lg:justify-end">
                {item.services.map((slug) => {
                  const service = findService(slug);
                  if (!service) return null;

                  return (
                    <li key={slug}>
                      <Link
                        href={service.path}
                        className="group/link inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-sm font-semibold"
                      >
                        <span className="link-underline">{service.name}</span>
                        <ArrowUpRight
                          aria-hidden="true"
                          size={14}
                          className="text-(--orange-ink) transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
