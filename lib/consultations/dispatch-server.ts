import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { senderAddress } from "@/lib/email/contact-enquiry-sender";
import { getResendClient } from "@/lib/email/resend";
import { appBaseUrl } from "@/lib/invoices/invoice-url";
import { CONTACT_EMAIL } from "@/lib/site";

import { calendarSetting } from "./calendar/provider";
import { type BookingRow, type DispatchSummary, type OutboxRow, dispatchConsultationNotifications } from "./dispatch";
import { tokenSecret } from "./token";

export const CONSULTATION_SENDER_NAME = "Drylake consultations";

/* "Drylake consultations <address>" on the shared verified sender; CONSULTATION_EMAIL_FROM wins. */
export function consultationFromAddress(env: { CONSULTATION_EMAIL_FROM?: string; EMAIL_FROM?: string }): string {
  const explicit = env.CONSULTATION_EMAIL_FROM?.trim();
  if (explicit) return explicit;
  const address = env.EMAIL_FROM ? senderAddress(env.EMAIL_FROM) : null;
  if (!address) throw new Error("Missing EMAIL_FROM");
  return `${CONSULTATION_SENDER_NAME} <${address}>`;
}

const BOOKING_COLUMNS =
  "id, reference, customer_name, customer_email, customer_phone, business_name, project_description, start_time, status, version, cancellation_reason, management_token_hash, assigned_representative, meeting_method, calendar_join_url, calendar_synced_version, calendar_sync_state, calendar_last_error";

/*
 * Runs one outbox pass with the service-role client the CALLER created (route handlers only:
 * tests/security-hardening.test.mjs confines createAdminSupabaseClient to app/api and app/admin).
 * Never throws: a failure is logged and reported as an empty pass, because callers run this
 * after the response (after()) or from a cron, where a throw helps nobody.
 */
export async function runConsultationDispatch(supabase: SupabaseClient, limit = 25): Promise<DispatchSummary | null> {
  try {
    return await dispatchConsultationNotifications(
      {
        async claim(n) {
          const { data, error } = await supabase.rpc("consultation_claim_notifications", { p_limit: n, p_lease: "2 minutes" });
          if (error) throw new Error(`claim failed: ${error.code ?? ""} ${error.message}`);
          return (data ?? []) as OutboxRow[];
        },
        async loadBookings(ids) {
          const { data, error } = await supabase.from("consultation_bookings").select(BOOKING_COLUMNS).in("id", ids);
          if (error) throw new Error(`booking load failed: ${error.code ?? ""} ${error.message}`);
          return (data ?? []) as BookingRow[];
        },
        async finish(id, outcome, providerId, message, retryAfterMinutes) {
          const { error } = await supabase.rpc("consultation_finish_notification", {
            p_id: id,
            p_outcome: outcome,
            p_provider_message_id: providerId,
            p_error: message,
            p_retry_after: `${retryAfterMinutes} minutes`,
          });
          // The lease expires and the row is retried; the provider idempotency key prevents a resend.
          if (error) console.error("Consultation outbox: finish failed:", error.code ?? "", error.message);
        },
        async send(email) {
          const { data, error } = await getResendClient().emails.send(
            {
              from: consultationFromAddress({ CONSULTATION_EMAIL_FROM: process.env.CONSULTATION_EMAIL_FROM, EMAIL_FROM: process.env.EMAIL_FROM }),
              to: email.to,
              replyTo: email.replyTo,
              subject: email.subject,
              html: email.html,
              text: email.text,
            },
            { idempotencyKey: email.idempotencyKey }
          );
          // Same key, different body: an earlier attempt WAS accepted (its ack was lost and the
          // booking changed since, so the re-render differs). Count it as sent, never resend.
          if (error?.name === "invalid_idempotent_request") return { id: null };
          if (error) throw new Error(`${error.name}: ${error.message}`);
          return { id: data?.id ?? null };
        },
        async defer(id, minutes) {
          const { error } = await supabase.rpc("consultation_defer_notification", { p_id: id, p_delay: `${minutes} minutes` });
          if (error) console.error("Consultation outbox: defer failed:", error.code ?? "", error.message);
        },
        calendarConnected: calendarSetting(process.env).mode === "microsoft",
        tokenSecret: () => tokenSecret(process.env),
        baseUrl: appBaseUrl(process.env),
        replyTo: CONTACT_EMAIL,
        now: () => new Date(),
      },
      limit
    );
  } catch (error) {
    console.error("Consultation outbox pass failed:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}
