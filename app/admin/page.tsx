import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  FolderKanban,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata = {
  title: "Admin | Drylake",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const { userId } = await auth();

  // ----------------------------------------------------------
  // AUTHENTICATION BOUNDARY
  // ----------------------------------------------------------

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }

  // ----------------------------------------------------------
  // PLATFORM ADMIN AUTHORIZATION
  // ----------------------------------------------------------

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const user = await currentUser();
  const firstName = user?.firstName ?? "Admin";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Drylake
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <p className="text-xs uppercase tracking-[0.18em] text-white/35">
              Platform Admin
            </p>
          </div>
        </header>

        {/* Introduction */}
        <section className="py-16 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            Drylake Administration
          </p>

          <h1 className="mt-5 text-4xl font-medium tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Welcome, {firstName}.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">
            Manage client organisations, projects, documents,
            updates and billing from the Drylake administration
            workspace.
          </p>
        </section>

        {/* Admin Modules */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminCard
            title="Clients"
            description="Manage client organisations and access."
            icon={<Building2 size={20} />}
            href="/admin/clients"
          />

          <AdminCard
            title="Projects"
            description="Create projects and manage delivery."
            icon={<FolderKanban size={20} />}
          />

          <AdminCard
            title="Documents"
            description="Manage private client documents."
            icon={<FileText size={20} />}
          />

          <AdminCard
            title="Billing"
            description="Manage invoices and payment visibility."
            icon={<Receipt size={20} />}
          />
        </section>

        {/* Security Information */}
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <ShieldCheck
              size={20}
              className="text-[#f26a2e]"
            />

            <h2 className="text-xl font-medium">
              Platform administrator access
            </h2>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45">
            This workspace is restricted to authorised Drylake
            platform administrators. Client organisation roles do
            not grant access to this area.
          </p>
        </section>
      </div>
    </main>
  );
}

function AdminCard({
  title,
  description,
  icon,
  href,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-[#f26a2e]">
        {icon}
      </div>

      <h2 className="mt-6 text-lg font-medium">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/40">
        {description}
      </p>
    </>
  );

  // Functional admin module
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[1.6rem] border border-white/10 bg-white/[0.025] p-6 transition duration-200 hover:border-white/20 hover:bg-white/[0.04]"
      >
        {content}
      </Link>
    );
  }

  // Module not implemented yet
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.025] p-6">
      {content}
    </div>
  );
}