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
    <footer className="border-t border-black/10 bg-white py-10 text-black">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1.8fr]">
          <div>
            <Link href="/" aria-label="Drylake home">
              <Image
                src="/brand/drylake-logo-white.png"
                alt="Drylake"
                width={170}
                height={60}
                className="h-auto w-[130px]"
              />
            </Link>

            <p className="mt-5 text-sm text-black/40">
              Tomorrow Starts Here.
            </p>

            <p className="mt-2 text-sm text-black/30">
              Perth, Western Australia
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="section-label text-black/35">{group.title}</p>

                <nav className="mt-4 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="w-fit text-sm text-black/55 transition-colors hover:text-black"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-black/10 pt-6 text-xs text-black/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Drylake.</p>
          <p>Innovation · Integrity · Impact</p>
        </div>
      </Container>
    </footer>
  );
}