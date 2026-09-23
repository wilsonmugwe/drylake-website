"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Container from "@/components/ui/Container";

const items = [
  {
    title: "Domain & Email",
    text: "Get your domain, DNS and business email configured properly so messages send, arrive and represent the business professionally.",
  },
  {
    title: "Websites",
    text: "A fast, responsive website that clearly explains what you do and gives customers a useful next step.",
  },
  {
    title: "Forms & Bookings",
    text: "Enquiries, bookings and forms configured so information reaches the right place instead of disappearing into a broken workflow.",
  },
  {
    title: "Payments",
    text: "Connect the payment flow to the systems around it and remove unnecessary friction for customers and staff.",
  },
  {
    title: "Platform Migration",
    text: "Move data, accounts and workflows from systems that no longer fit the way your business operates.",
  },
];

export default function SmallThings() {
  const [active, setActive] = useState<number | null>(0);

  return (
    <section className="bg-[#090909] py-20 text-white sm:py-24 lg:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="section-label text-white/35">02 / The Small Things</p>

            <h2 className="mt-6 max-w-xl text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              An hour you will
              <span className="text-white/30"> never get back.</span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/50">
              A domain that will not connect. Email that will not send. A form
              that quietly stops delivering enquiries. Small technical problems
              have a habit of consuming an entire afternoon.
            </p>

            <p className="mt-4 max-w-lg text-base leading-7 text-white/75">
              That is where we come in.
            </p>
          </div>

          <div className="border-t border-white/10">
            {items.map((item, index) => {
              const isOpen = active === index;

              return (
                <div key={item.title} className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setActive(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="group flex w-full items-center gap-5 py-6 text-left"
                  >
                    <span className="font-mono text-xs text-white/25">
                      0{index + 1}
                    </span>

                    <span className="flex-1 text-xl font-medium tracking-[-0.035em] sm:text-2xl">
                      {item.title}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`text-white/40 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-xl pb-6 pl-10 text-sm leading-6 text-white/45 sm:text-base sm:leading-7">
                          {item.text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}