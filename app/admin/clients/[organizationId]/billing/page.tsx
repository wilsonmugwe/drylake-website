import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Billing Contact | Drylake Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type BillingPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function BillingContactPage({
  params,
}: BillingPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/clients");
  }

  const platformAdmin = await isPlatformAdmin();

  if (!platformAdmin) {
    redirect("/client");
  }

  const { organizationId } = await params;

  const supabase = createAdminSupabaseClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      `
        id,
        name,
        status,
        billing_contact_name,
        billing_email
      `
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Billing contact organisation lookup failed:", {
      code: error.code,
      message: error.message,
    });

    throw new Error("Unable to load billing contact.");
  }

  if (!organization) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link
            href={`/admin/clients/${organization.id}`}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            {organization.name}
          </Link>

          <div className="flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-[#f26a2e]"
            />

            <span className="text-xs uppercase tracking-[0.18em] text-white/35">
              Platform Admin
            </span>
          </div>
        </header>

        <section className="py-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025]">
              <Building2
                size={18}
                className="text-[#f26a2e]"
              />
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
              Client Billing
            </p>
          </div>

          <h1 className="mt-6 text-4xl font-medium tracking-[-0.04em]">
            Billing Contact
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
            Invoice notifications, payment reminders and payment
            receipts will be sent to this contact.
          </p>
        </section>

        <form
          action={`/api/admin/clients/${organization.id}/billing`}
          method="POST"
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]"
        >
          <div className="space-y-7 p-6 sm:p-8">
            <div>
              <label
                htmlFor="billingContactName"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/45"
              >
                Billing Contact Name
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  id="billingContactName"
                  name="billingContactName"
                  type="text"
                  maxLength={100}
                  defaultValue={
                    organization.billing_contact_name ?? ""
                  }
                  placeholder="Sarah Jones"
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="billingEmail"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/45"
              >
                Billing Email
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  id="billingEmail"
                  name="billingEmail"
                  type="email"
                  required
                  maxLength={254}
                  defaultValue={
                    organization.billing_email ?? ""
                  }
                  placeholder="accounts@client.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-white/30">
                This address will receive invoice and payment
                communications from Drylake.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-6 py-5 sm:px-8">
            <span className="text-xs text-white/30">
              {organization.status === "ACTIVE"
                ? "Active client"
                : "Inactive client"}
            </span>

            <button
              type="submit"
              disabled={organization.status !== "ACTIVE"}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold !text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Save size={16} />
              Save Billing Contact
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}