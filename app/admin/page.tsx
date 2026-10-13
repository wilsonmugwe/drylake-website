import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  CalendarX,
  FileText,
  FolderKanban,
  Receipt,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { perthWeekBounds } from "@/lib/consultations/admin-view";
import { formatPerthDate, formatPerthRange } from "@/lib/consultations/rules";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Page-level gate: the layout check alone does not stop this page's service-role
  // queries from running on a direct RSC request (see lib/auth/guards.ts).
  await requirePlatformAdmin("/admin");

  const supabase = createAdminSupabaseClient();

  const [clients, projects, invoices, documents] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("projects")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("invoices")
        .select("*", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("documents")
        .select("*", {
          count: "exact",
          head: true,
        }),
    ]);

  // Consultation summary: counted in the database from real bookings, never hard-coded.
  const now = new Date();
  const week = perthWeekBounds(now);
  const ACTIVE = ["CONFIRMED", "RESCHEDULED"];
  const [upcoming, thisWeek, cancelled, nextConsultation] = await Promise.all([
    supabase.from("consultation_bookings").select("id", { count: "exact", head: true })
      .in("status", ACTIVE).gt("start_time", now.toISOString()),
    supabase.from("consultation_bookings").select("id", { count: "exact", head: true })
      .in("status", ACTIVE).gte("start_time", week.from.toISOString()).lt("start_time", week.to.toISOString()),
    supabase.from("consultation_bookings").select("id", { count: "exact", head: true }).eq("status", "CANCELLED"),
    supabase.from("consultation_bookings").select("id, customer_name, start_time")
      .in("status", ACTIVE).gt("start_time", now.toISOString()).order("start_time", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const consultationsUnavailable = Boolean(upcoming.error);
  const next = nextConsultation.data as { id: string; customer_name: string; start_time: string } | null;

  const { data: recentClients } = await supabase
    .from("organizations")
    .select("id, name, status, created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Dashboard"
          description="Clients, delivery, documents and billing in one operational workspace."
        />

        <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <AdminStatCard
            label="Clients"
            value={clients.count ?? 0}
            icon={<Building2 size={17} />}
          />

          <AdminStatCard
            label="Projects"
            value={projects.count ?? 0}
            icon={<FolderKanban size={17} />}
          />

          <AdminStatCard
            label="Invoices"
            value={invoices.count ?? 0}
            icon={<Receipt size={17} />}
          />

          <AdminStatCard
            label="Documents"
            value={documents.count ?? 0}
            icon={<FileText size={17} />}
          />
        </section>

        <section aria-labelledby="consultations-summary" className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="consultations-summary" className="font-semibold text-neutral-950">Consultations</h2>
              <p className="mt-1 text-xs text-neutral-500">Free 30-minute consultations booked on the website (Perth time)</p>
            </div>
            <Link href="/admin/consultations" className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950">
              Manage
              <ArrowRight size={14} />
            </Link>
          </div>

          {consultationsUnavailable ? (
            <p className="mt-4 text-sm text-red-800">Consultation figures are unavailable. Check that the consultation migration has been applied.</p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <AdminStatCard label="Upcoming" value={upcoming.count ?? 0} detail="Confirmed, not yet held" icon={<CalendarClock size={17} />} />
              <AdminStatCard label="This week" value={thisWeek.count ?? 0} detail="Monday to Sunday, Perth" icon={<CalendarRange size={17} />} />
              <AdminStatCard label="Cancelled" value={cancelled.count ?? 0} detail="All time" icon={<CalendarX size={17} />} />
              <AdminStatCard
                label="Next"
                value={next ? formatPerthDate(new Date(next.start_time)).replace(/ \d{4}$/, "") : "None"}
                detail={next ? `${formatPerthRange(new Date(next.start_time))}, ${next.customer_name}` : "No upcoming consultation"}
                icon={<CalendarCheck size={17} />}
              />
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-neutral-950">
                Recent clients
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Latest organisations added to Drylake
              </p>
            </div>

            <Link
              href="/admin/clients"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          {(recentClients ?? []).length > 0 ? (
            recentClients?.map((client) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 transition last:border-0 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
                    <Building2
                      size={17}
                      className="text-[#f26a2e]"
                    />
                  </span>

                  <div>
                    <p className="text-sm font-medium text-neutral-950">
                      {client.name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      {client.status}
                    </p>
                  </div>
                </div>

                <ArrowRight
                  size={15}
                  className="text-neutral-300"
                />
              </Link>
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <Building2
                size={22}
                className="mx-auto text-[#f26a2e]"
              />

              <p className="mt-3 text-sm font-medium text-neutral-800">
                No clients yet
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}