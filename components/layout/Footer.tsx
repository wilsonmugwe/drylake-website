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
      { label: "Technical Setup", href: "/solutions" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
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
      {/* =====================================================
          SUBTLE BACKGROUND GRID
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "160px 160px",
        }}
      />

      {/* =====================================================
          DECORATIVE SYSTEM RINGS
          ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 hidden h-80 w-80 lg:block"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.05]" />

        <div className="absolute inset-12 rounded-full border border-white/[0.06]" />

        <div className="absolute inset-24 rounded-full border border-white/[0.08]" />
      </div>

      <Container className="relative z-10">
        {/* =====================================================
            MAIN FOOTER
            ===================================================== */}

        <div className="grid gap-10 py-10 sm:py-12 lg:grid-cols-[1.25fr_1.75fr] lg:gap-16 lg:py-14">
          {/* =================================================
              BRAND
              ================================================= */}

          <div>
            <Link
              href="/"
              aria-label="Drylake home"
              className="inline-flex items-center"
            >
              <Image
                src="/brand/drylake-logo-black.png"
                alt="Drylake Technologies"
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

            <p className="mt-1 text-sm font-semibold text-white">
              Tomorrow Starts Here.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]" />

              <p className="text-sm text-white/45">
                Perth, Western Australia
              </p>
            </div>
          </div>

          {/* =================================================
              NAVIGATION
              ================================================= */}

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:gap-x-12">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="section-label text-white/35">
                  {group.title}
                </p>

                <nav className="mt-4 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="w-fit text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================
            BOTTOM BAR
            ===================================================== */}

        <div className="flex flex-col gap-3 border-t border-white/10 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Drylake.
          </p>

          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26a2e]" />

            <p>
              Innovation · Integrity · Impact
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}