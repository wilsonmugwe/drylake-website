import Link from "next/link";

import DryLakebedTexture from "@/components/brand/DryLakebedTexture";
import Container from "@/components/ui/Container";
import {
  BRAND_STORY_PARAGRAPHS,
  BRAND_STORY_SHORT,
  BRAND_STORY_STEPS,
  PHILOSOPHY_STEPS,
  TAGLINE,
} from "@/lib/brand-story";

/*
 * The brand story (2026-10-16). The ONE metaphor-led block on each page it appears on.
 *
 * variant "home": a short band between Founders and Approach. It sits below the hero and the
 *   service chapters, so the first screen still says "websites, software and automation".
 * variant "page": the full story on /about (why the name, what the metaphor stands for, why
 *   understanding comes first, how Drylake approaches a problem).
 *
 * Server component: no client JS. The cracked-ground texture is decorative (aria-hidden, static).
 */
export default function BrandStory({ variant = "home" }: { variant?: "home" | "page" }) {
  const page = variant === "page";

  return (
    <section
      id={page ? "our-name" : "the-name"}
      aria-labelledby={page ? "our-name-heading" : "the-name-heading"}
      className="surface-ink relative isolate overflow-hidden"
    >
      <DryLakebedTexture className="-z-10 text-white opacity-[0.09]" />

      <Container className="py-(--section-y)">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <p className="section-label text-white/62 lg:col-span-3 lg:pt-4">{page ? "About / The name" : "The name"}</p>

          <div className="lg:col-span-9">
            <h2 id={page ? "our-name-heading" : "the-name-heading"} className="type-section text-white">
              {PHILOSOPHY_STEPS.map((step, index) => (
                <span key={step} className={`block ${index === 0 ? "" : index === 1 ? "text-white/72" : "text-white/50"}`}>
                  {step}
                </span>
              ))}
            </h2>

            {page ? (
              <div className="type-body mt-7 max-w-2xl space-y-5 text-white/72">
                {BRAND_STORY_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <>
                <p className="type-lede mt-6 max-w-2xl text-white/72">{BRAND_STORY_SHORT}</p>
                <Link
                  href="/about#our-name"
                  prefetch={false}
                  className="mt-6 inline-flex min-h-[44px] items-center text-sm font-medium text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
                >
                  Why we are called Drylake
                </Link>
              </>
            )}
          </div>
        </div>

        {page && (
          <>
            <div className="mt-10 grid border-t border-white/16 sm:mt-14 md:grid-cols-3">
              {BRAND_STORY_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="border-b border-white/16 py-7 md:border-b-0 md:p-8 md:first:pl-0 md:not-last:border-r"
                >
                  <p className="font-mono text-sm text-signal">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">{step.text}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-pretty text-[clamp(1.3rem,4vw,2rem)] font-medium leading-[1.15] tracking-[-0.03em] text-white">
              {TAGLINE}
            </p>
          </>
        )}
      </Container>
    </section>
  );
}
