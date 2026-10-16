import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAuditLog } from "@/lib/auth/audit";
import { sendReviewRequest } from "@/lib/email/review-request";
import {
  type Candidate,
  type ConsultationRow,
  type EngagementKind,
  type OrganizationRow,
  type ProjectRow,
  buildCandidates,
  findCandidate,
} from "@/lib/reviews/eligibility";
import { issueToken, tokenExpiry } from "@/lib/reviews/tokens";
import { redactSensitive } from "@/lib/security/redact";

const STUCK_QUEUE_MS = 5 * 60_000;

/* The most rows read per source. A solo agency has dozens of engagements; this is a safety cap. */
const READ_LIMIT = 500;

export async function loadCandidates(supabase: SupabaseClient): Promise<Candidate[]> {
  const [projects, consultations, requests, suppressions] = await Promise.all([
    supabase.from("projects").select("id, name, status, organization_id").eq("status", "COMPLETED").limit(READ_LIMIT),
    supabase
      .from("consultation_bookings")
      .select("id, reference, status, customer_name, customer_email, business_name")
      .eq("status", "COMPLETED")
      .limit(READ_LIMIT),
    supabase.from("review_requests").select("engagement_kind, engagement_id, recipient_email").limit(READ_LIMIT * 4),
    supabase.from("review_suppressions").select("email_lower").limit(READ_LIMIT * 4),
  ]);

  for (const [label, result] of [["projects", projects], ["consultations", consultations], ["requests", requests], ["suppressions", suppressions]] as const) {
    if (result.error) throw new Error(`${label}: ${result.error.code ?? ""} ${redactSensitive(result.error.message)}`);
  }

  const projectRows = (projects.data ?? []) as ProjectRow[];
  const orgIds = [...new Set(projectRows.map((p) => p.organization_id))];
  let organizations: OrganizationRow[] = [];

  if (orgIds.length > 0) {
    const orgs = await supabase
      .from("organizations")
      .select("id, name, status, billing_contact_name, billing_email")
      .in("id", orgIds);
    if (orgs.error) throw new Error(`organizations: ${orgs.error.code ?? ""} ${redactSensitive(orgs.error.message)}`);
    organizations = (orgs.data ?? []) as OrganizationRow[];
  }

  return buildCandidates({
    projects: projectRows,
    organizations,
    consultations: (consultations.data ?? []) as ConsultationRow[],
    requests: (requests.data ?? []) as Array<{ engagement_kind: string; engagement_id: string; recipient_email: string }>,
    suppressed: new Set(((suppressions.data ?? []) as Array<{ email_lower: string }>).map((s) => s.email_lower)),
  });
}

export type SendOutcome = "sent" | "duplicate" | "suppressed" | "not_eligible" | "email_failed";

/*
 * Send ONE review request. The eligibility is re-derived here from the database: the browser's
 * view of who is eligible is never trusted. Order: derive -> database function (duplicate guard
 * and suppression, atomically) -> email -> mark sent. A row exists as "queued" before the email,
 * so a crash between the two leaves a visible, retryable row instead of a silent gap; the token
 * cannot be used until the email has been accepted (review_lookup refuses "queued").
 */
export async function sendRequest(
  supabase: SupabaseClient,
  params: { kind: EngagementKind; engagementId: string; actorClerkUserId: string }
): Promise<{ outcome: SendOutcome; requestId?: string }> {
  const candidates = await loadCandidates(supabase);
  const candidate = findCandidate(candidates, params.kind, params.engagementId);

  if (!candidate) return { outcome: "not_eligible" };
  if (candidate.blocked === "suppressed") return { outcome: "suppressed" };
  if (candidate.blocked === "already_requested") return { outcome: "duplicate" };

  const feedback = issueToken();
  const unsubscribe = issueToken();

  const { data, error } = await supabase.rpc("review_create_request", {
    p_kind: candidate.kind,
    p_engagement_id: candidate.engagementId,
    p_organization_id: candidate.organizationId,
    p_organisation_name: candidate.organisationName,
    p_recipient_name: candidate.recipientName,
    p_recipient_email: candidate.recipientEmail,
    p_token_hash: feedback.hash,
    p_unsubscribe_token_hash: unsubscribe.hash,
    p_expires_at: tokenExpiry().toISOString(),
    p_sent_by: params.actorClerkUserId,
  });

  if (error) throw new Error(`create request: ${error.code ?? ""} ${redactSensitive(error.message)}`);
  const row = (Array.isArray(data) ? data[0] : data) as { outcome: string; request_id: string | null } | null;
  if (!row) throw new Error("create request: empty result");
  if (row.outcome === "suppressed") return { outcome: "suppressed" };
  if (row.outcome === "duplicate" || !row.request_id) return { outcome: "duplicate" };

  const requestId = row.request_id;
  return deliver(supabase, {
    requestId,
    actorClerkUserId: params.actorClerkUserId,
    action: "review_request.sent",
    to: candidate.recipientEmail,
    recipientName: candidate.recipientName,
    engagementLabel: candidate.engagementLabel,
    token: feedback.token,
    unsubscribeToken: unsubscribe.token,
    kind: candidate.kind,
  });
}

async function deliver(
  supabase: SupabaseClient,
  p: {
    requestId: string;
    actorClerkUserId: string;
    action: string;
    to: string;
    recipientName: string;
    engagementLabel: string;
    token: string;
    unsubscribeToken: string;
    kind: string;
  }
): Promise<{ outcome: SendOutcome; requestId: string }> {
  try {
    await sendReviewRequest({
      to: p.to,
      recipientName: p.recipientName,
      engagementLabel: p.engagementLabel,
      token: p.token,
      unsubscribeToken: p.unsubscribeToken,
    });
  } catch (error) {
    const message = redactSensitive(error instanceof Error ? error.message : "unknown error");
    console.error("Review request email failed:", message);
    await supabase.from("review_requests").update({ status: "failed", last_error: message }).eq("id", p.requestId);
    await writeAuditLog(supabase, {
      actorClerkUserId: p.actorClerkUserId,
      action: "review_request.failed",
      entityType: "review_request",
      entityId: p.requestId,
      metadata: { engagement_kind: p.kind },
    });
    return { outcome: "email_failed", requestId: p.requestId };
  }

  // sent_at and sent_by are the record of who asked and when.
  await supabase
    .from("review_requests")
    .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
    .eq("id", p.requestId);
  await writeAuditLog(supabase, {
    actorClerkUserId: p.actorClerkUserId,
    action: p.action,
    entityType: "review_request",
    entityId: p.requestId,
    metadata: { engagement_kind: p.kind },
  });
  return { outcome: "sent", requestId: p.requestId };
}

/*
 * Retry a request whose email failed, or whose link expired unused. New tokens replace the old
 * ones (the old link stops working); the row, the duplicate guard and the history stay.
 */
export async function retryRequest(
  supabase: SupabaseClient,
  params: { requestId: string; actorClerkUserId: string }
): Promise<{ outcome: "sent" | "email_failed" | "duplicate" | "suppressed" | "not_eligible" | "not_retryable" | "not_found"; requestId?: string }> {
  const { data: row, error } = await supabase
    .from("review_requests")
    .select("id, engagement_kind, engagement_id, recipient_name, recipient_email, status, token_expires_at, created_at")
    .eq("id", params.requestId)
    .maybeSingle();

  if (error) throw new Error(`read request: ${error.code ?? ""} ${redactSensitive(error.message)}`);
  if (!row) return { outcome: "not_found" };

  const expiredUnused = row.status === "sent" && new Date(row.token_expires_at).getTime() <= Date.now();
  // A row still "queued" long after it was created means the server stopped between saving it and
  // sending the email (the duplicate guard would otherwise make that engagement unaskable).
  const stuckQueued = row.status === "queued" && Date.now() - new Date(row.created_at).getTime() > STUCK_QUEUE_MS;
  if (row.status !== "failed" && !expiredUnused && !stuckQueued) return { outcome: "not_retryable" };

  const { data: suppressed } = await supabase.from("review_suppressions").select("email_lower").eq("email_lower", String(row.recipient_email).toLowerCase()).maybeSingle();
  if (suppressed) return { outcome: "suppressed" };

  const candidates = await loadCandidates(supabase);
  const candidate = candidates.find((c) => c.kind === row.engagement_kind && c.engagementId === row.engagement_id);

  const feedback = issueToken();
  const unsubscribe = issueToken();
  const { error: updateError } = await supabase
    .from("review_requests")
    .update({
      token_hash: feedback.hash,
      unsubscribe_token_hash: unsubscribe.hash,
      token_expires_at: tokenExpiry().toISOString(),
      status: "queued",
      sent_by: params.actorClerkUserId,
    })
    .eq("id", row.id);
  if (updateError) throw new Error(`reissue: ${updateError.code ?? ""} ${redactSensitive(updateError.message)}`);

  return deliver(supabase, {
    requestId: row.id,
    actorClerkUserId: params.actorClerkUserId,
    action: "review_request.retried",
    to: String(row.recipient_email),
    recipientName: String(row.recipient_name),
    engagementLabel: candidate?.engagementLabel ?? "your recent work with us",
    token: feedback.token,
    unsubscribeToken: unsubscribe.token,
    kind: String(row.engagement_kind),
  });
}

export async function withdrawRequest(
  supabase: SupabaseClient,
  params: { requestId: string; actorClerkUserId: string }
): Promise<"withdrawn" | "not_withdrawable" | "not_found"> {
  const { data: row, error } = await supabase.from("review_requests").select("id, status").eq("id", params.requestId).maybeSingle();
  if (error) throw new Error(`read request: ${error.code ?? ""} ${redactSensitive(error.message)}`);
  if (!row) return "not_found";
  if (row.status === "submitted" || row.status === "withdrawn") return "not_withdrawable";

  const { error: updateError } = await supabase.from("review_requests").update({ status: "withdrawn" }).eq("id", row.id);
  if (updateError) throw new Error(`withdraw: ${updateError.code ?? ""} ${redactSensitive(updateError.message)}`);

  await writeAuditLog(supabase, {
    actorClerkUserId: params.actorClerkUserId,
    action: "review_request.withdrawn",
    entityType: "review_request",
    entityId: row.id,
    metadata: { previous_status: row.status },
  });
  return "withdrawn";
}

export type FeedbackAction = "approve" | "unapprove" | "remove";

/*
 * Approve / unapprove / remove one piece of feedback. The database check constraints are the
 * real lock (approval needs consent, text and no removal); this maps a refusal to a clear outcome.
 * "remove" clears the written text and unapproves it in one update, and keeps the fact that
 * feedback arrived (and its rating) so the admin record stays honest.
 */
export async function actOnFeedback(
  supabase: SupabaseClient,
  params: { feedbackId: string; action: FeedbackAction; actorClerkUserId: string }
): Promise<"done" | "not_found" | "no_consent" | "nothing_to_publish"> {
  const { data: row, error } = await supabase
    .from("review_feedback")
    .select("id, publish_consent, comments, approved, removed_at")
    .eq("id", params.feedbackId)
    .maybeSingle();

  if (error) throw new Error(`read feedback: ${error.code ?? ""} ${redactSensitive(error.message)}`);
  if (!row) return "not_found";

  const now = new Date().toISOString();
  let changes: Record<string, unknown>;

  if (params.action === "approve") {
    if (!row.publish_consent) return "no_consent";
    if (!row.comments || row.removed_at) return "nothing_to_publish";
    changes = { approved: true, approved_at: now, approved_by: params.actorClerkUserId };
  } else if (params.action === "unapprove") {
    changes = { approved: false, approved_at: null, approved_by: null };
  } else {
    changes = { approved: false, approved_at: null, approved_by: null, comments: null, removed_at: now, removed_by: params.actorClerkUserId };
  }

  const { error: updateError } = await supabase.from("review_feedback").update(changes).eq("id", row.id);
  if (updateError) throw new Error(`feedback ${params.action}: ${updateError.code ?? ""} ${redactSensitive(updateError.message)}`);

  await writeAuditLog(supabase, {
    actorClerkUserId: params.actorClerkUserId,
    action: `review_feedback.${params.action === "approve" ? "approved" : params.action === "unapprove" ? "unapproved" : "removed"}`,
    entityType: "review_feedback",
    entityId: row.id,
    metadata: { was_approved: row.approved },
  });
  return "done";
}
