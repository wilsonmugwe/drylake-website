import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ilikePattern, readEnumParam, readFilterParam, type AdminSearchParams } from "@/lib/admin/filters";
import { ADMIN_LIST_LIMIT } from "@/lib/admin/search";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import {
  CONSULTATION_FILTER_OPTIONS,
  CONSULTATION_FILTERS,
  CONSULTATION_SORT_OPTIONS,
  CONSULTATION_SORTS,
  STATUS_BADGE,
  STATUS_LABELS,
} from "@/lib/consultations/admin-view";
import { formatPerthDate, formatPerthRange } from "@/lib/consultations/rules";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultations" };

type Row = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  business_name: string | null;
  start_time: string;
  status: string;
  created_at: string;
};

const createdFormat = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", day: "numeric", month: "short", year: "numeric" });

/*
 * Every consultation booking, from the same table the public booking system writes, so a
 * customer's own cancel or reschedule shows here on the next load (force-dynamic, no cache).
 * Filters, search and sort are URL parameters (AdminFilterBar), applied in the database.
 */
export default async function AdminConsultationsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requirePlatformAdmin("/admin/consultations");

  const params = await searchParams;
  const status = readEnumParam(params, "status", CONSULTATION_FILTERS);
  const sort = readEnumParam(params, "sort", CONSULTATION_SORTS) || "SOONEST";
  const q = readFilterParam(params, "q");

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("consultation_bookings")
    .select("id, reference, customer_name, customer_email, business_name, start_time, status, created_at", { count: "exact" });

  if (status === "UPCOMING") {
    query = query.in("status", ["CONFIRMED", "RESCHEDULED"]).gt("start_time", new Date().toISOString());
  } else if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const pattern = ilikePattern(q);
    query = query.or(
      `customer_name.ilike.${pattern},customer_email.ilike.${pattern},business_name.ilike.${pattern},reference.ilike.${pattern}`
    );
  }

  query =
    sort === "NEWEST"
      ? query.order("created_at", { ascending: false })
      : query.order("start_time", { ascending: sort === "SOONEST" });

  const { data, count, error } = await query.limit(ADMIN_LIST_LIMIT);
  if (error) console.error("Admin consultations list failed:", { code: error.code, message: error.message });
  const rows = (data ?? []) as Row[];

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1450px]">
        <AdminPageHeader
          eyebrow="Drylake Administration"
          title="Consultations"
          description="Free 30-minute consultations booked on drylake.com.au. All times are Perth time (AWST)."
        />

        <div className="mt-7">
          <AdminFilterBar
            searchPlaceholder="Search name, email, business or reference"
            selects={[
              { param: "status", label: "Status", options: CONSULTATION_FILTER_OPTIONS, allLabel: "All appointments" },
              {
                param: "sort",
                label: "Sort",
                // "Soonest first" is the default (no parameter), so it is the select's empty option.
                options: CONSULTATION_SORT_OPTIONS.filter((option) => option.value !== "SOONEST"),
                allLabel: "Appointment: soonest first",
              },
            ]}
            resultCount={count ?? rows.length}
            resultNoun="consultations"
          />
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Consultations could not be loaded. If this is the first deploy, check that the consultation migration has been applied.
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white px-5 py-12 text-center shadow-sm">
            <CalendarClock aria-hidden="true" size={22} className="mx-auto text-[#f26a2e]" />
            <p className="mt-3 text-sm font-medium text-neutral-800">No consultations match these filters</p>
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Consultation bookings</caption>
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-600">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Appointment</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Business</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Booked</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const start = new Date(row.start_time);
                    return (
                      <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-neutral-950">{formatPerthDate(start)}</p>
                          <p className="mt-0.5 text-xs text-neutral-600">{formatPerthRange(start)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-neutral-950">{row.customer_name}</p>
                          <p className="mt-0.5 break-all text-xs text-neutral-600">{row.customer_email}</p>
                        </td>
                        <td className="px-5 py-4 text-neutral-700">{row.business_name || "Not provided"}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-600">{createdFormat.format(new Date(row.created_at))}</td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/consultations/${row.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-950"
                          >
                            View <span className="sr-only">{row.customer_name}&apos;s consultation</span>
                            <ArrowRight aria-hidden="true" size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="mt-6 grid gap-3 md:hidden">
              {rows.map((row) => {
                const start = new Date(row.start_time);
                return (
                  <li key={row.id}>
                    <Link
                      href={`/admin/consultations/${row.id}`}
                      className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-950">{row.customer_name}</p>
                          <p className="mt-0.5 truncate text-xs text-neutral-600">{row.business_name || row.customer_email}</p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-3 text-sm text-neutral-800">{formatPerthDate(start)}</p>
                      <p className="text-xs text-neutral-600">{formatPerthRange(start)} · {row.reference}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[status] ?? STATUS_BADGE.CANCELLED}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
