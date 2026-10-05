import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminClientCreateForm from "@/components/admin/AdminClientCreateForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requirePlatformAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create Client | Drylake",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await requirePlatformAdmin("/admin/clients/new");

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/clients"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft size={15} />
          Back to clients
        </Link>

        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Create Client"
          description="Create the client organisation, record its primary contact and invite them to the client portal."
        />

        <AdminClientCreateForm />
      </div>
    </main>
  );
}
