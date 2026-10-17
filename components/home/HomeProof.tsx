import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";
import { FOUNDERS } from "@/lib/discovery/entity";
import { HOME_FOUNDERS, HOME_WORKSPACE } from "@/lib/home/copy";

import workspaceScreen from "@/public/redesign/workspace-overview.png";

/*
 * 05 · Drylake Workspace, shown not described: a real screen of the product, rendered from the
 * Workspace's own components with SAMPLE data (captured from a local build, no client data;
 * docs/brand/asset-register.md). It tilts flat as it reaches the middle of the screen (.eg-tilt,
 * CSS only, complete at rest).
 *
 * 06 · Founders as type, never photos (D50, D54). Names and roles from lib/discovery/entity.ts.
 */
export function HomeWorkspace() {
  return (
    <section aria-labelledby="workspace" className="eg-ground">
      <Container className="grid gap-12 py-24 sm:py-32 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-36">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <p className="eg-eyebrow eg-signal-text">{HOME_WORKSPACE.eyebrow}</p>
          <h2 id="workspace" className="eg-h2">{HOME_WORKSPACE.title}</h2>
          <ul className="eg-eyebrow flex flex-col gap-3 text-[#c9c5bb]">
            {HOME_WORKSPACE.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <figure className="lg:col-span-8">
          <div className="eg-tilt eg-screen">
            <Image
              src={workspaceScreen}
              alt={HOME_WORKSPACE.imageAlt}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="block h-auto w-full"
            />
          </div>
          <figcaption className="eg-eyebrow eg-muted mt-4">{HOME_WORKSPACE.caption}</figcaption>
        </figure>
      </Container>
    </section>
  );
}

export function HomeFounders() {
  return (
    <section id="about" aria-labelledby="founders" className="eg-ground scroll-mt-24 border-t border-[#1d1b18]">
      <Container className="grid gap-10 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <p className="eg-eyebrow eg-signal-text">{HOME_FOUNDERS.eyebrow}</p>
          <h2 id="founders" className="eg-h2 mt-6">{HOME_FOUNDERS.title}</h2>
          <Link href="/about" className="eg-link mt-8 inline-flex min-h-[44px] items-center gap-2">
            {HOME_FOUNDERS.more}
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <ul className="lg:col-span-8">
          {FOUNDERS.map((f) => (
            <li key={f.id} className="eg-rule flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-7 last:border-b last:border-b-[#2a2824]">
              <span className="eg-poster-md">{f.name}</span>
              <span className="eg-eyebrow eg-muted">{f.jobTitle}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
