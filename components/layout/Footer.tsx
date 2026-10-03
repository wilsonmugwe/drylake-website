import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";

const groups = [
  {
    title: "What We Do",
    links: [
      { label: "Custom Software", href: "/solutions" },
      { label: "Automation", href: "/solutions" },
      { label: "Systems Integration", href: "/solutions" },
      { label: "Web & Digital", href: "/solutions" },
    ],
  },
  {
    title: "Drylake",
    links: [
      { label: "About", href: "/about" },
      { label: "How We Work", href: "/#approach" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacy", href: "/privacy" }],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black text-white">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "160px 160px",
        }}
      />

      <Container className="relative z-10">
        {/* Main footer */}
        <div className="grid gap-12 py-12 lg:grid-cols-[1.2fr_1.8fr] lg:gap-20 lg:py-16">
          {/* Brand */}
          <div>
            <Link
              href="/"
              aria-label="Drylake home"
              className="inline-flex items-center"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake"
                width={1536}
                height={1024}
                className="
                  h-[110px]
                  w-[165px]
                  object-contain
                  object-center
                  sm:h-[125px]
                  sm:w-[190px]
                  lg:h-[135px]
                  lg:w-[205px]
                "
              />
            </Link>

            <p className="mt-3 max-w-sm text-lg font-medium leading-7 tracking-[-0.025em] text-white/80">
              Practical software for businesses that have outgrown
              workarounds.
            </p>

            <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
              Custom software, automation and connected systems for Australian
              businesses.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]" />

              <p className="text-sm text-white/45">
                Perth, Western Australia
              </p>
            </div>

            <div className="mt-5 space-y-1 text-xs leading-5 text-white/30">
              <p>Drylake Pty Ltd</p>
              <p>ABN 70 702 662 557</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-3 lg:gap-x-12">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="section-label text-white/30">
                  {group.title}
                </p>

                <nav
                  className="mt-4 flex flex-col gap-3"
                  aria-label={`${group.title} links`}
                >
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="w-fit text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Drylake Pty Ltd. All rights reserved.
          </p>

          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            <p>
              Founder-led · Perth, Western Australia
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}