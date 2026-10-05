import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@clerk/nextjs/server";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata: Metadata = {
  title: "Create Client | Drylake",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewClientPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

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
          description="Create a client organisation in the Drylake platform."
        />

        <form
          action="/api/admin/clients"
          method="POST"
          className="mt-7 space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-neutral-900"
            >
              Client organisation name
            </label>

            <p className="mt-1 text-sm text-neutral-500">
              Use the client&apos;s official business or organisation name.
            </p>

            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="organization"
              placeholder="Example Pty Ltd"
              className="mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/admin/clients"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              Create Client
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
