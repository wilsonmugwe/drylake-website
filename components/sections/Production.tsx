import type { CSSProperties } from "react";

import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";

/*
 * The engineering under a finished product, in order of depth: what each layer does for the
 * business, in one plain sentence. Descriptions of purpose, not claims of results.
 */
const strata = [
  { name: "Authentication", text: "Only the right people get in." },
  { name: "Permissions", text: "Each person sees and changes only what their role allows." },
  { name: "Data validation", text: "Wrong or missing information is caught before it is saved." },
  { name: "Integrations", text: "Information moves between your systems without retyping." },
  { name: "Monitoring", text: "Errors and slowdowns noticed early, as agreed per project." },
  { name: "Backups & recovery", text: "Backup and recovery arranged to your agreed scope." },
];

/*
 * Production matters (experience polish, 2026-10-07). Not boxes feeding a logo: a cross-section.
 * On top, a light surface band: what your team sees. Beneath it, six layers in order of depth,
 * each one stepping further in and darker, like strata under a dry lake, so "surface vs what is
 * underneath" is visible at a glance. Each layer is a real list item (name + sentence); nothing
 * lives only in the picture. Motion: on arrival the layers settle down in turn (transform only,
 * InView); without JavaScript or under reduced motion they are simply there. Heading left,
 * section right on desktop.
 */
export default function Production() {
  return (
    <section className="surface-ink-2 relative overflow-hidden">
      <div aria-hidden="true" className="grid-ink pointer-events-none absolute inset-0" />

      <Container className="relative py-(--section-y)">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <p className="section-label flex items-center gap-2.5 text-white/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
              Production Matters
            </p>

            <h2 className="type-statement mt-6">
              The boring part{" "}
              <br />
              <span className="text-white/40">is the hard part.</span>
            </h2>

            <p className="type-lede mt-5 max-w-md text-white/66 sm:mt-6">
              We engineer the less visible parts that make software dependable
              when the business starts relying on it.
            </p>
          </div>

          <InView className="core relative lg:col-span-7" threshold={0.2}>
            <div className="core-surface flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
              <span className="text-sm font-semibold">What your team sees</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-black/60">
                The app / the portal / the website
              </span>
            </div>

            <p aria-hidden="true" className="core-under font-mono text-[0.6rem] uppercase tracking-[0.14em] text-white/50">
              What it stands on
            </p>

            <ol className="core-strata">
              {strata.map((layer, i) => (
                <li
                  key={layer.name}
                  className="core-stratum grid gap-x-6 gap-y-1 py-3 pl-4 pr-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] sm:items-baseline sm:py-3.5 sm:pl-5"
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="flex items-baseline gap-3">
                    <span aria-hidden="true" className="font-mono text-[0.62rem] text-white/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[1.02rem] font-semibold tracking-[-0.015em] text-white">{layer.name}</span>
                  </span>
                  <span className="text-sm leading-6 text-white/72">{layer.text}</span>
                </li>
              ))}
            </ol>
          </InView>
        </div>
      </Container>
    </section>
  );
}
