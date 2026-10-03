import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";

const whatWeDo = [
  { label: "Custom Software", href: "/solutions" },
  { label: "Automation", href: "/solutions" },
  { label: "Systems Integration", href: "/solutions" },
  { label: "Web & Digital", href: "/solutions" },
];

const drylakeLinks = [
  { label: "About", href: "/about" },
  { label: "How We Work", href: "/#approach" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "160px 160px",
        }}
      />

      <Container className="relative z-10">
        <div className="grid gap-7 py-8 sm:gap-10 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-14">
          {/* Brand */}
          <div>
            <Link
              href="/"
              aria-label="Drylake home"
              className="inline-flex"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake"
                width={1536}
                height={1024}
                className="h-[80px] w-[125px] object-contain object-center sm:h-[105px] sm:w-[160px]"
              />
            </Link>

            <p className="mt-2 max-w-md text-lg font-medium leading-6 tracking-[-0.025em] text-white/75 sm:mt-3 sm:text-xl sm:leading-7">
              Practical software for businesses that have outgrown workarounds.
            </p>

            {/* Direct contact */}
            <div className="mt-4 flex flex-col gap-1.5 text-sm sm:mt-5">
              <a
                href="tel:+61420565457"
                className="w-fit text-white/50 transition-colors hover:text-white"
              >
                +61 420 565 457
              </a>

              <a
                href="mailto:hello@drylake.com.au"
                className="w-fit text-white/50 transition-colors hover:text-white"
              >
                hello@drylake.com.au
              </a>
            </div>

            {/* Company identity */}
            <div className="mt-4 text-xs leading-5 text-white/30 sm:mt-5">
              <p>Perth, Western Australia</p>
              <p>
                Drylake Pty Ltd · ABN 70 702 662 557
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6 lg:border-t-0 lg:pt-0">
            <div>
              <p className="section-label text-white/25">
                What We Do
              </p>

              <nav
                className="mt-3 flex flex-col gap-2.5"
                aria-label="What We Do links"
              >
                {whatWeDo.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="w-fit text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="section-label text-white/25">
                Drylake
              </p>

              <nav
                className="mt-3 flex flex-col gap-2.5"
                aria-label="Drylake links"
              >
                {drylakeLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="w-fit text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between gap-4 border-t border-white/10 py-4 text-[0.68rem] text-white/25 sm:py-5 sm:text-xs">
          <p>
            © {new Date().getFullYear()} Drylake Pty Ltd.
          </p>

          <Link
            href="/privacy"
            className="transition-colors hover:text-white"
          >
            Privacy
          </Link>
        </div>
      </Container>
    </footer>
  );
}