/*
 * Pure helpers for client portal invitations (Clerk organization invitations). No Clerk
 * import here: the server wrapper (lib/auth/client-onboarding.ts) maps Clerk resources to
 * these plain shapes, and tests/client-invitations.test.mjs covers the decisions.
 */

/* Every invited client contact joins as a plain member. Client users never administer
 * their Clerk organisation (no inviting others, no deleting it); Drylake does that. */
export const CLIENT_INVITATION_ROLE = "org:member";

/* Clerk's default is 30 days; 14 keeps a stale link from granting access months later. */
export const CLIENT_INVITATION_EXPIRY_DAYS = 14;

/* Landing route that forwards Clerk's ticket to the right sign-in or sign-up screen. */
export const INVITATION_LANDING_PATH = "/portal/accept-invitation";

const INVITATION_ID_PATTERN = /^orginv_[A-Za-z0-9]{10,64}$/;
const CLERK_TICKET_PATTERN = /^[A-Za-z0-9._-]{10,4096}$/;

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type InvitationSummary = {
  id: string;
  emailAddress: string;
  status: InvitationStatus;
  createdAt: number;
  expiresAt: number | null;
};

export function isClerkInvitationId(value: unknown): value is string {
  return typeof value === "string" && INVITATION_ID_PATTERN.test(value);
}

/* Clerk reports an expired invitation as still "pending" until it is swept; treat a
 * pending invitation past expiresAt as expired so the admin sees the truth. */
export function effectiveInvitationStatus(
  status: string | null | undefined,
  expiresAt: number | null | undefined,
  now: number
): InvitationStatus {
  if (status === "accepted" || status === "revoked" || status === "expired") {
    return status;
  }

  if (typeof expiresAt === "number" && expiresAt > 0 && expiresAt <= now) {
    return "expired";
  }

  return "pending";
}

export function findPendingInvitation(
  invitations: readonly InvitationSummary[],
  email: string
): InvitationSummary | null {
  const target = email.trim().toLowerCase();

  return (
    invitations.find(
      (invitation) =>
        invitation.status === "pending" &&
        invitation.emailAddress.trim().toLowerCase() === target
    ) ?? null
  );
}

/* Newest first; pending ahead of everything else so the actionable rows sit on top. */
export function sortInvitations(
  invitations: readonly InvitationSummary[]
): InvitationSummary[] {
  return [...invitations].sort((a, b) => {
    const aPending = a.status === "pending" ? 0 : 1;
    const bPending = b.status === "pending" ? 0 : 1;

    return aPending - bPending || b.createdAt - a.createdAt;
  });
}

export function invitationRedirectUrl(origin: string): string {
  return new URL(INVITATION_LANDING_PATH, origin).toString();
}

/*
 * Where an invitation link should land. Clerk appends __clerk_ticket and __clerk_status
 * (sign_in | sign_up | complete) to the redirect URL. The prebuilt <SignIn> and <SignUp>
 * components consume the ticket, so we forward the query to the matching screen.
 * Anything malformed falls back to /portal, which never grants access by itself.
 */
export function invitationLandingTarget(params: {
  ticket?: string | null;
  status?: string | null;
}): string {
  const ticket = params.ticket ?? "";
  const status = params.status ?? "";

  if (status === "complete" || !ticket || !CLERK_TICKET_PATTERN.test(ticket)) {
    return "/portal";
  }

  const query = new URLSearchParams({
    __clerk_ticket: ticket,
    __clerk_status: status,
  }).toString();

  if (status === "sign_in") {
    return `/sign-in?${query}`;
  }

  if (status === "sign_up") {
    return `/sign-up?${query}`;
  }

  return "/portal";
}

/* Clerk Backend API errors carry `errors[].code`; read it without importing Clerk. */
export function clerkErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("errors" in error)) {
    return null;
  }

  const errors = (error as { errors?: unknown }).errors;

  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  const code = (errors[0] as { code?: unknown })?.code;

  return typeof code === "string" ? code : null;
}

/* Safe, admin-facing message for a failed invitation call. Never echoes Clerk detail. */
export function invitationErrorMessage(code: string | null): string {
  switch (code) {
    case "already_a_member_in_organization":
    case "organization_membership_already_exists":
      return "This person is already a member of the client workspace.";
    case "duplicate_record":
    case "organization_invitation_already_exists":
      return "An invitation is already pending for this email address.";
    case "form_param_format_invalid":
    case "form_identifier_not_found":
      return "Clerk rejected this email address. Check it and try again.";
    case "organization_domain_mismatch":
      return "This email domain is not allowed for the client workspace.";
    case "resource_not_found":
      return "The invitation no longer exists in Clerk.";
    default:
      return "Unable to send the invitation. Please try again.";
  }
}
