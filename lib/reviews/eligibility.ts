/*
 * Who can be asked for feedback. PURE (unit-tested): the database reads live in service.ts; this
 * file holds the rule so it can be read, argued with and tested in one place.
 *
 * THE RULE. A recipient is eligible for ONE request per engagement, where an engagement is either
 *   - a COMPLETED project: the recipient is the client organisation's billing contact
 *     (organizations.billing_contact_name + billing_email), provided the organisation is not
 *     ARCHIVED, or
 *   - a COMPLETED consultation: the recipient is the person who booked it
 *     (consultation_bookings.customer_name + customer_email). Consultations are not tied to a
 *     client organisation, so the business name they gave is used as the organisation label.
 * Not eligible: a cancelled or in-progress engagement, a recipient with no valid email, an
 * archived organisation, an address that opted out (review_suppressions), or an engagement that
 * already has a request for that recipient. An admin always makes the final call, one request at a
 * time, after a confirm step; nothing is sent in bulk and nothing is sent automatically.
 */

export type EngagementKind = "project" | "consultation";

export type ProjectRow = { id: string; name: string; status: string; organization_id: string };
export type OrganizationRow = {
  id: string;
  name: string;
  status: string;
  billing_contact_name: string | null;
  billing_email: string | null;
};
export type ConsultationRow = {
  id: string;
  reference: string;
  status: string;
  customer_name: string;
  customer_email: string;
  business_name: string | null;
};
export type ExistingRequest = { engagement_kind: string; engagement_id: string; recipient_email: string };

export type Candidate = {
  kind: EngagementKind;
  engagementId: string;
  engagementLabel: string;
  organizationId: string | null;
  organisationName: string | null;
  recipientName: string;
  recipientEmail: string;
  /* Why a candidate cannot be asked right now; null when it can. */
  blocked: "already_requested" | "suppressed" | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) && !/[\r\n]/.test(email) ? email : null;
}

export function buildCandidates(input: {
  projects: readonly ProjectRow[];
  organizations: readonly OrganizationRow[];
  consultations: readonly ConsultationRow[];
  requests: readonly ExistingRequest[];
  suppressed: ReadonlySet<string>;
}): Candidate[] {
  const orgs = new Map(input.organizations.map((o) => [o.id, o]));
  const asked = new Set(input.requests.map((r) => `${r.engagement_kind}:${r.engagement_id}:${r.recipient_email.toLowerCase()}`));
  const out: Candidate[] = [];

  const block = (kind: EngagementKind, id: string, email: string): Candidate["blocked"] => {
    if (input.suppressed.has(email)) return "suppressed";
    if (asked.has(`${kind}:${id}:${email}`)) return "already_requested";
    return null;
  };

  for (const project of input.projects) {
    if (project.status !== "COMPLETED") continue;
    const org = orgs.get(project.organization_id);
    if (!org || org.status === "ARCHIVED") continue;
    const email = normaliseEmail(org.billing_email);
    if (!email) continue;
    out.push({
      kind: "project",
      engagementId: project.id,
      engagementLabel: project.name,
      organizationId: org.id,
      organisationName: org.name,
      recipientName: (org.billing_contact_name ?? "").trim() || org.name,
      recipientEmail: email,
      blocked: block("project", project.id, email),
    });
  }

  for (const booking of input.consultations) {
    if (booking.status !== "COMPLETED") continue;
    const email = normaliseEmail(booking.customer_email);
    if (!email) continue;
    out.push({
      kind: "consultation",
      engagementId: booking.id,
      engagementLabel: `Consultation ${booking.reference}`,
      organizationId: null,
      organisationName: booking.business_name?.trim() || null,
      recipientName: booking.customer_name.trim(),
      recipientEmail: email,
      blocked: block("consultation", booking.id, email),
    });
  }

  return out;
}

/* Re-derives ONE candidate so the send path never trusts what the browser displayed. */
export function findCandidate(candidates: readonly Candidate[], kind: EngagementKind, engagementId: string): Candidate | null {
  return candidates.find((c) => c.kind === kind && c.engagementId === engagementId) ?? null;
}
