import Image from "next/image";
import Link from "next/link";

import Container from "@/components/ui/Container";

const links = [
  {
    label: "What We Do",
    href: "/solutions",
  },
  {
    label: "How We Work",
    href: "/#approach",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Contact",
    href: "/contact",
  },
  {
    label: "Privacy",
    href: "/privacy",
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <Container>
        <div className="grid gap-6 py-7 sm:grid-cols-[0.8fr_1.2fr] sm:items-end sm:py-9 lg:grid-cols-[0.55fr_1.45fr]">
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
                className="h-[64px] w-[100px] object-contain sm:h-[72px] sm:w-[112px]"
              />
            </Link>

            <p className="mt-1 text-xs text-white/30">
              Perth, Western Australia
            </p>
          </div>

          <div className="sm:text-right">
            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end"
            >
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-white/45 transition-colors hover:text-white sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-1 text-xs text-white/28 sm:items-end">
              <a
                href="mailto:hello@drylake.com.au"
                className="transition-colors hover:text-white"
              >
                hello@drylake.com.au
              </a>

              <a
                href="tel:+61420565457"
                className="transition-colors hover:text-white"
              >
                +61 420 565 457
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-white/[0.08] py-4 text-[0.65rem] text-white/22 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>
            Drylake Pty Ltd · ABN 70 702 662 557
          </p>

          <p>
            © {new Date().getFullYear()} Drylake Pty Ltd.
          </p>
        </div>
      </Container>
    </footer>
  );
}