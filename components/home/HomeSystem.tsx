import InView from "@/components/motion/InView";
import Container from "@/components/ui/Container";
import LakeBed from "@/components/visuals/LakeBed";
import LakeBedInteractive from "@/components/visuals/LakeBedInteractive";
import { HOME_SYSTEM } from "@/lib/home/copy";

/*
 * 01 · The One System tile on its own stage (D54: the concept gives the preserved tile a stage of
 * its own, Metalab-style). The component is used EXACTLY as before: LakeBedInteractive (plate
 * buttons + popover cards) around LakeBed, the same caption, the phone variant behind InView.
 * Only its placement changes: .eg-stage (app/exposed-ground.css) puts the figure in normal flow
 * instead of the old hero's absolute position. tests/one-system-lock.test.mjs guards the tile.
 */
export default function HomeSystem() {
  return (
    <section aria-labelledby="one-system" className="eg-ground eg-stage border-t border-[#1d1b18]">
      <Container className="grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:items-center lg:gap-16 lg:py-36">
        <div className="flex flex-col gap-6 lg:col-span-5">
          <p className="eg-eyebrow eg-signal-text">{HOME_SYSTEM.eyebrow}</p>
          <h2 id="one-system" className="eg-h2">
            {HOME_SYSTEM.title.map((line) => (
              <span key={line} className="block">
                {line}{" "}
              </span>
            ))}
          </h2>
          <p className="eg-lede eg-muted">{HOME_SYSTEM.text}</p>
        </div>

        <div className="lg:col-span-7">
          <figure className="lb-figure hidden sm:block">
            <LakeBedInteractive
              caption={
                <>
                  <span>Quotes, invoices, scheduling, enquiries: held together by copy, paste and email.</span>
                  <span className="text-white/85"> Until they work together.</span>
                </>
              }
            >
              <LakeBed />
            </LakeBedInteractive>
          </figure>

          <InView className="hz-assemble sm:hidden" threshold={0.4}>
            <LakeBedInteractive variant="phone">
              <LakeBed variant="phone" />
            </LakeBedInteractive>
          </InView>
        </div>
      </Container>
    </section>
  );
}
