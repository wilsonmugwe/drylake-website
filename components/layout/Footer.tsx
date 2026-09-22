import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";

const links = [
  { label: "Solutions", href: "/solutions" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] py-8 text-white">
      <Container>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Drylake home">
            <Image
              src="/brand/drylake-logo-white.png"
              alt="Drylake"
              width={150}
              height={50}
              className="h-auto w-[115px]"
            />
          </Link>

          <nav className="flex flex-wrap gap-x-6 gap-y-3">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-white/45 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Drylake Pty Ltd.</p>

          <p>Tomorrow Starts Here.</p>
        </div>
      </Container>
    </footer>
  );
}