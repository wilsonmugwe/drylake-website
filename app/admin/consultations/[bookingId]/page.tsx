import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AdminCalendarRetry from "@/components/admin/AdminCalendarRetry";
import AdminConsultationActions from "@/components/admin/AdminConsultationActions";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import {
  CALENDAR_STATE_LABELS,
  type ConsultationEvent,
  STATUS_BADGE,
  STATUS_LABELS,
  describeEvent,
} from "@/lib/consultations/admin-view";
import { calendarSetting } from "@/lib/consultations/calendar/provider";
import { MEETING_METHOD_LABELS, representativeName } from "@/lib/consultations/representatives";
import { CONSULTATION_TIMEZONE_LABEL, formatPerthDate, formatPerthRange } from "@/lib/consultations/rules";
import { CONSULTATION_COLUMNS, type ConsultationRecord, currentJoinUrl, isActive } from "@/lib/consultations/service";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consultation" };

const stamp = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Perth",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Notification = { kind: string; recipient: string; status: string; attempts: number; send_after: string; sent_at: string | null; last_error: string | null };

const NOTIFICATION_LABEL: Record<string, string> = {
  CUSTOMER_CONFIRMATION: "Customer confirmation",
  FOUNDER_NEW_BOOKING: "Founder booking notice",
  CUSTOMER_RESCHEDULED: "Customer reschedule notice",
  FOUNDER_RESCHEDULED: "Founder reschedule notice",
  CUSTOMER_CANCELLED: "Customer cancellation notice",
  FOUNDER_CANCELLED: "Founder cancellation notice",
  CUSTOMER_REMINDER: "24-hour reminder",
  FOUNDER_CALENDAR_FAILED: "Founder calendar-failure alert",
};

export default async function AdminConsultationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  await requirePlatformAdmin(`/admin/consultations/${bookingId}`);
  if (!isUuid(bookingId)) notFound();

  const supabase = createAdminSupabaseClient();
  const [booking, events, notifications] = await Promise.all([
    supabase.from("consultation_bookings").select(CONSULTATION_COLUMNS).eq("id", bookingId).maybeSingle(),
    supabase
      .from("consultation_booking_events")
      .select("id, action, actor_type, actor_clerk_user_id, previous, next, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
    supabase
      .from("consultation_notifications")
      .select("kind, recipient, status, attempts, send_after, sent_at, last_error")
      .eq("booking_id", bookingId)
      .order("send_after", { ascending: true }),
  ]);

  if (booking.error) console.error("Admin consultation load failed:", { code: booking.error.code, message: booking.error.message });
  if (!booking.data) notFound();

  const record = booking.data as unknown as ConsultationRecord;
  const start = new Date(record.start_time);
  const history = (events.data ?? []) as ConsultationEvent[];
  const emails = (notifications.data ?? []) as Notification[];
  const started = hasStarted(start);
  const calendarMode = calendarSetting(process.env).mode;

  return (
    <main className="min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1100px]">
        <Link href="/admin/consultations" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950">
          <ArrowLeft aria-hidden="true" size={15} /> All consultations
        </Link>

        <AdminPageHeader
          eyebrow={`Consultation ${record.reference}`}
          title={record.customer_name}
          description={`${formatPerthDate(start)}, ${formatPerthRange(start)} (${CONSULTATION_TIMEZONE_LABEL})`}
          action={
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${STATUS_BADGE[record.status] ?? ""}`}>
              {STATUS_LABELS[record.status] ?? record.status}
            </span>
          }
        />

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section aria-labelledby="customer-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="customer-heading" className="font-semibold text-neutral-950">Customer and booking</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Detail label="Name" value={record.customer_name} />
              <Detail label="Email" value={<a className="break-all underline" href={`mailto:${record.customer_email}`}>{record.customer_email}</a>} />
              <Detail label="Phone" value={record.customer_phone ? <a className="underline" href={`tel:${record.customer_phone.replace(/[^0-9+]/g, "")}`}>{record.customer_phone}</a> : "Not provided"} />
              <Detail label="Business" value={record.business_name || "Not provided"} />
              <Detail label="Date" value={formatPerthDate(start)} />
              <Detail label="Time" value={`${formatPerthRange(start)} (${CONSULTATION_TIMEZONE_LABEL})`} />
              <Detail label="Representative" value={representativeName(record.assigned_representative)} />
              <Detail label="Consultation method" value={MEETING_METHOD_LABELS[record.meeting_method] ?? record.meeting_method} />
              {record.meeting_method === "TEAMS" && (
                <Detail
                  label="Teams meeting"
                  value={
                    currentJoinUrl(record) ? (
                      <a className="break-all underline" href={currentJoinUrl(record) as string} target="_blank" rel="noopener noreferrer">
                        Join link
                      </a>
                    ) : (
                      "Not created yet"
                    )
                  }
                />
              )}
              {record.meeting_method === "PHONE" && (
                <Detail label="Call the customer on" value={record.customer_phone ?? "Not provided"} />
              )}
              <Detail label="Booked" value={stamp.format(new Date(record.created_at))} />
              <Detail label="Times rescheduled" value={String(record.reschedule_count)} />
              {record.status === "CANCELLED" && (
                <Detail
                  label="Cancelled"
                  value={`${record.cancelled_at ? stamp.format(new Date(record.cancelled_at)) : ""} by ${record.cancelled_by_type === "ADMIN" ? "Drylake" : "the customer"}`}
                />
              )}
              {record.cancellation_reason && <Detail label="Cancellation reason" value={record.cancellation_reason} />}
              {record.completed_at && <Detail label="Completed" value={stamp.format(new Date(record.completed_at))} />}
            </dl>
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">About their business or project</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">{record.project_description}</p>
            </div>
          </section>

          <section aria-labelledby="actions-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="actions-heading" className="font-semibold text-neutral-950">Actions</h2>
            <div className="mb-5 rounded-xl border border-neutral-200 bg-[#fbfbf9] p-4 text-sm" data-testid="admin-calendar-status">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Microsoft 365 calendar</p>
              <p className={`mt-1 font-medium ${record.calendar_sync_state === "FAILED" ? "text-red-700" : "text-neutral-900"}`}>
                {calendarMode === "none"
                  ? "Calendar integration is off. Add this consultation to the calendar by hand."
                  : calendarMode === "misconfigured"
                    ? "Calendar integration is misconfigured. Check the Microsoft 365 settings."
                    : record.calendar_synced_version >= record.version && record.calendar_sync_state === "SYNCED"
                      ? CALENDAR_STATE_LABELS.SYNCED
                      : CALENDAR_STATE_LABELS[record.calendar_sync_state] ?? record.calendar_sync_state}
              </p>
              {record.calendar_last_error && record.calendar_sync_state !== "SYNCED" && (
                <p className="mt-1 text-xs text-red-700">Last error: {record.calendar_last_error}</p>
              )}
              {calendarMode === "microsoft" &&
                record.calendar_synced_version < record.version &&
                (record.calendar_sync_state === "FAILED" || record.calendar_sync_attempts >= 10) && <AdminCalendarRetry bookingId={record.id} />}
            </div>
            <AdminConsultationActions
              bookingId={record.id}
              version={record.version}
              start={start.toISOString()}
              active={isActive(record.status)}
              started={started}
            />
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="history-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="history-heading" className="font-semibold text-neutral-950">History</h2>
            <ol className="mt-4 space-y-3">
              {history.map((event) => (
                <li key={event.id} className="border-l-2 border-neutral-200 pl-3 text-sm">
                  <p className="text-neutral-900">{describeEvent(event)}</p>
                  {event.action === "RESCHEDULED" && typeof event.previous?.start_time === "string" && typeof event.next?.start_time === "string" && (
                    <p className="text-xs text-neutral-600">
                      {formatPerthDate(new Date(event.previous.start_time))} {formatPerthRange(new Date(event.previous.start_time))} to{" "}
                      {formatPerthDate(new Date(event.next.start_time))} {formatPerthRange(new Date(event.next.start_time))}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {stamp.format(new Date(event.created_at))}
                    {event.actor_clerk_user_id ? ` · ${event.actor_clerk_user_id}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="emails-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="emails-heading" className="font-semibold text-neutral-950">Emails</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {emails.map((email, i) => (
                <li key={`${email.kind}-${email.recipient}-${i}`} className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-neutral-900">{NOTIFICATION_LABEL[email.kind] ?? email.kind}</p>
                    <p className="truncate text-xs text-neutral-600">{email.recipient}</p>
                    {email.last_error && email.status !== "SENT" && <p className="text-xs text-red-700">Last error: {email.last_error}</p>}
                  </div>
                  <p className="shrink-0 text-right text-xs text-neutral-600">
                    <span className="font-medium text-neutral-900">{email.status === "PENDING" && email.attempts === 0 ? "Scheduled" : email.status.toLowerCase()}</span>
                    <br />
                    {email.sent_at ? stamp.format(new Date(email.sent_at)) : stamp.format(new Date(email.send_after))}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

/* Read once per request (force-dynamic); only enables the "Mark completed" button, which the
 * database re-checks against its own clock. */
function hasStarted(start: Date): boolean {
  return start.getTime() <= Date.now();
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</dt>
      <dd className="mt-1 text-neutral-900">{value}</dd>
    </div>
  );
}
