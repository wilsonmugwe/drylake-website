import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";

export default function ContactCTA() {
  return (
    <section className="relative overflow-hidden bg-[#090909] py-20 text-white sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full border border-white/[0.06]" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-[20rem] w-[20rem] rounded-full border border-white/[0.06]" />

      <Container className="relative z-10">
        <p className="section-label text-white/35">Start a Project</p>

        <div className="mt-6 flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-5xl text-[clamp(3.2rem,8vw,8rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
              Tell us what is
              <br />
              <span className="text-white/30">slowing you down.</span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/45">
              Describe the problem in your own words. We&apos;ll start there.
            </p>
          </div>

          <Link
            href="/contact"
            className="group flex w-full items-center justify-between rounded-full bg-white px-6 py-4 font-semibold text-black transition-transform hover:scale-[1.02] sm:w-fit sm:min-w-[230px]"
          >
            Start a conversation
            <ArrowUpRight
              size={18}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </Container>
    </section>
  );
}