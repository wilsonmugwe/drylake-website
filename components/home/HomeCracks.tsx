import Container from "@/components/ui/Container";
import { HOME_APPROACH_EYEBROW, HOME_APPROACH_LINES, HOME_CRACKS } from "@/lib/home/copy";
import { PHILOSOPHY_STEPS } from "@/lib/brand-story";

/*
 * 03 · Find the cracks, then 04 · How we work. The dark ground breaks along a crack edge into
 * pale crust: the move from problem to answer (the "recede" transition in the motion system).
 * The approach is the approved philosophy (PHILOSOPHY_STEPS), three steps, set huge, with the
 * concept canvas's one-line descriptions.
 */
export function HomeCracks() {
  return (
    <section aria-labelledby="cracks" className="eg-crust relative">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 1440 64" preserveAspectRatio="none" className="block h-10 w-full sm:h-16">
        <path d="M0 0 H1440 V22 L1300 40 L1160 18 L980 46 L820 20 L640 50 L470 24 L320 44 L180 16 L0 38 Z" fill="#0b0b0a" />
      </svg>
      <Container className="pb-24 pt-16 sm:pb-32 sm:pt-24 lg:pb-36">
        <p className="eg-eyebrow eg-signal-text">{HOME_CRACKS.eyebrow}</p>
        <h2 id="cracks" className="eg-h2 mt-6 max-w-[14ch]">{HOME_CRACKS.title}</h2>
        <ol className="eg-rule-strong mt-14 grid sm:grid-cols-2 lg:grid-cols-4">
          {HOME_CRACKS.items.map((item, i) => (
            <li key={item} className="eg-crack-item pb-6 pt-6">
              <span aria-hidden="true" className="eg-eyebrow eg-signal-text">{String.fromCharCode(65 + i)}</span>
              <p className="eg-h3 mt-3">{item}</p>
            </li>
          ))}
        </ol>
        <p className="eg-lede eg-muted mt-12 max-w-[52ch]">{HOME_CRACKS.close}</p>
      </Container>
    </section>
  );
}

export function HomeApproach() {
  return (
    <section id="approach" aria-labelledby="approach-title" className="eg-stone scroll-mt-24">
      <Container className="py-24 sm:py-32 lg:py-36">
        <h2 id="approach-title" className="eg-eyebrow eg-signal-text">{HOME_APPROACH_EYEBROW}</h2>
        <ol className="mt-12 grid gap-12 md:grid-cols-3 md:gap-10">
          {PHILOSOPHY_STEPS.map((step, i) => (
            <li key={step} className="flex flex-col gap-5">
              <span aria-hidden="true" className="eg-numeral eg-numeral-xl eg-signal-text">0{i + 1}</span>
              <h3 className="eg-h3 eg-h3-lg">{step}</h3>
              <p className="eg-muted max-w-[34ch] text-[1.0625rem] leading-7">{HOME_APPROACH_LINES[i]}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
