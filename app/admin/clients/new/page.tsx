import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@clerk/nextjs/server";

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
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/clients"
          className="text-sm text-white/60 transition hover:text-white"
        >
          ← Back to clients
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
            Drylake Administration
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Create Client
          </h1>

          <p className="mt-4 max-w-2xl text-white/60">
            Create a client organisation in the Drylake platform.
          </p>
        </div>

        <form
          action="/api/admin/clients"
          method="POST"
          className="mt-10 space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-white"
            >
              Client organisation name
            </label>

            <p className="mt-1 text-sm text-white/50">
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
              className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-6">
            <Link
              href="/admin/clients"
              className="rounded-xl px-5 py-3 text-sm font-medium text-white/60 transition hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Create Client
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}