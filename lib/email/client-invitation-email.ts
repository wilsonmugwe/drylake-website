/*
 * Client-workspace invitation email + the Clerk webhook payload handling that feeds it. Pure:
 * no env reads, no SDK, relative imports only (tests/client-invitation-email.test.mjs).
 *
 * How the email is sent: "Delivered by Clerk" is OFF for Clerk's "Organization invitation"
 * template, so Clerk emits an `email.created` webhook instead of sending its generic email.
 * app/api/clerk/webhook/route.ts verifies it, calls buildInvitationEmail() and sends the result
 * through Resend. The accept link is Clerk's own `action_url`, used unchanged, so the ticket,
 * its expiry, single use and the organisation membership stay exactly as Clerk issues them.
 *
 * Presentation comes from the shared design system (lib/email/layout.ts). The accept URL sits
 * behind the button and a short fallback hyperlink; it is never printed (a ticket URL runs to
 * hundreds of characters).
 */

import {
  type RenderedEmail,
  button,
  checklist,
  fallbackLink,
  paragraph,
  renderEmailLayout,
  textFooter,
} from "./layout.ts";

export { escapeHtml, type RenderedEmail } from "./layout.ts";

export const CLERK_INVITATION_TEMPLATE_SLUG = "organization_invitation";

export const INVITATION_SUBJECT = "Your Drylake client workspace is ready";

export const INVITATION_CTA = "Activate your workspace";

export const INVITATION_FALLBACK_TEXT = "Open your invitation in your browser";

/* What a client can actually do in Drylake Workspace today (components/client/ClientNav.tsx). */
export const WORKSPACE_HIGHLIGHTS = [
  "Track project progress and milestones",
  "View invoices and make secure payments",
  "Access project documents and updates",
] as const;

export type InvitationEmailInput = {
  organizationName: string | null;
  recipientFirstName: string | null;
  acceptUrl: string;
  /* App base URL: the origin the logo is served from. */
  assetOrigin: string;
  expiresInDays: number;
};

/* Single line, trimmed, length-capped: payload and database values are never trusted as markup. */
export function cleanDisplayText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.replace(/\s+/g, " ").trim();

  return text ? text.slice(0, max) : null;
}

export function firstName(fullName: unknown): string | null {
  const name = cleanDisplayText(fullName, 80);

  return name ? name.split(" ")[0] : null;
}

function introLine(organizationName: string | null): string {
  return organizationName
    ? `You’ve been invited to access your dedicated Drylake client workspace for ${organizationName}.`
    : "You’ve been invited to access your dedicated Drylake client workspace.";
}

const VALUE_LINE =
  "Your workspace brings everything together in one secure place, making it easier to stay informed and connected throughout your project.";

function expiryLine(days: number): string {
  return `This invitation can be used once and expires in ${days} days. If it has expired, contact us and we will send you a new one.`;
}

const ASSIST_LINE = "Need assistance? Reply to this email and we will help.";

const IGNORE_LINE = "If you were not expecting this invitation, you can safely ignore this email.";

export function renderInvitationEmail(input: InvitationEmailInput): RenderedEmail {
  const greeting = input.recipientFirstName ? `Hi ${input.recipientFirstName},` : "Hello,";
  const intro = introLine(input.organizationName);
  const expiry = expiryLine(input.expiresInDays);

  const html = renderEmailLayout({
    title: INVITATION_SUBJECT,
    preheader: input.organizationName
      ? `Activate your Drylake client workspace for ${input.organizationName}.`
      : "Activate your Drylake client workspace.",
    eyebrow: "You’re invited",
    heading: "Your workspace is ready.",
    assetOrigin: input.assetOrigin,
    bodyHtml: [
      paragraph(greeting),
      paragraph(intro),
      paragraph(VALUE_LINE),
      checklist({ title: "In your workspace", items: WORKSPACE_HIGHLIGHTS }),
      button({ href: input.acceptUrl, label: INVITATION_CTA }),
      fallbackLink({ href: input.acceptUrl, linkText: INVITATION_FALLBACK_TEXT }),
      paragraph(expiry, { muted: true, small: true }),
      paragraph(IGNORE_LINE, { muted: true, small: true }),
      paragraph(ASSIST_LINE, { muted: true, small: true }),
    ].join("\n"),
  });

  // Plain text has no hyperlinks, so the full URL is the only way to carry the link there.
  const text = [
    "You’re invited",
    "Your workspace is ready.",
    "",
    greeting,
    "",
    intro,
    "",
    VALUE_LINE,
    "",
    "In your workspace:",
    ...WORKSPACE_HIGHLIGHTS.map((item) => `- ${item}`),
    "",
    `${INVITATION_CTA}:`,
    input.acceptUrl,
    "",
    expiry,
    IGNORE_LINE,
    "",
    ASSIST_LINE,
    "",
    ...textFooter(),
  ].join("\n");

  return { subject: INVITATION_SUBJECT, html, text };
}

/* ---------------------------------------------------------------- webhook payload handling */

/*
 * Host of the Clerk Frontend API, decoded from the publishable key
 * (pk_live_ / pk_test_ + base64("<host>$")). Accept links point at this host.
 */
export function clerkFrontendApiHost(publishableKey: string | undefined): string | null {
  const match = /^pk_(?:live|test)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey?.trim() ?? "");

  if (!match) {
    return null;
  }

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8").replace(/\$$/, "");

    return /^[a-z0-9.-]+$/i.test(decoded) ? decoded.toLowerCase() : null;
  } catch {
    return null;
  }
}

/*
 * The accept link must be an https URL on our own domain (or a subdomain, such as Clerk's
 * accounts./clerk. CNAMEs) or on the Clerk Frontend API host. Anything else is refused, so a
 * tampered or unexpected payload can never put a foreign link behind a Drylake button.
 */
export function isTrustedAcceptUrl(
  value: unknown,
  allowed: { appHost: string; clerkHost: string | null }
): value is string {
  if (typeof value !== "string" || value.length > 4096) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }

  const host = url.hostname.toLowerCase();
  const appHost = allowed.appHost.toLowerCase();

  return host === appHost || host.endsWith(`.${appHost}`) || host === allowed.clerkHost;
}

export type ClerkEmailEvent = {
  id: string;
  slug: string | null;
  toEmailAddress: string | null;
  deliveredByClerk: boolean;
  subject: string | null;
  body: string | null;
  bodyPlain: string | null;
  data: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/* Narrow a verified `email.created` event's data to the fields this feature reads. */
export function readClerkEmailEvent(data: unknown): ClerkEmailEvent | null {
  const raw = record(data);

  if (typeof raw.id !== "string" || !raw.id) {
    return null;
  }

  const str = (value: unknown) => (typeof value === "string" && value ? value : null);

  return {
    id: raw.id,
    slug: str(raw.slug),
    toEmailAddress: str(raw.to_email_address)?.trim().toLowerCase() ?? null,
    deliveredByClerk: raw.delivered_by_clerk !== false,
    subject: str(raw.subject),
    body: str(raw.body),
    bodyPlain: str(raw.body_plain),
    data: record(raw.data),
  };
}

/* Only an organisation invitation that Clerk did NOT deliver itself is ours to send. */
export function isOurInvitationEmail(event: ClerkEmailEvent): boolean {
  return emailEventDecision(event).handle;
}

/*
 * Why an email.created event is (or is not) ours. Every "no" has a named reason so the
 * webhook can return it to Clerk's delivery log and write it to the function log: a silent
 * `handled: false` hid the 9 Oct 2026 production skip.
 */
export type SkipReason =
  | "not_email_created"
  | "malformed_event"
  | "other_template"
  | "delivered_by_clerk"
  | "no_recipient";

export type EmailEventDecision = { handle: true } | { handle: false; reason: SkipReason };

export function emailEventDecision(event: ClerkEmailEvent | null): EmailEventDecision {
  if (!event) {
    return { handle: false, reason: "malformed_event" };
  }

  if (event.slug !== CLERK_INVITATION_TEMPLATE_SLUG) {
    return { handle: false, reason: "other_template" };
  }

  // Clerk sent this one itself: sending ours as well would give the client two invitations.
  if (event.deliveredByClerk) {
    return { handle: false, reason: "delivered_by_clerk" };
  }

  if (!event.toEmailAddress) {
    return { handle: false, reason: "no_recipient" };
  }

  return { handle: true };
}

const SAFE_TOKEN = /^[A-Za-z0-9_.-]{1,64}$/;

/*
 * Shape of a verified email.created payload that is safe to log: the template slug, how the
 * delivery flag arrived, whether a recipient/body exist, and the NAMES (never values) of the
 * template variables. No address, link, ticket, subject or body ever leaves this function.
 */
export function safeEmailEventShape(data: unknown): {
  slug: string;
  deliveredByClerk: string;
  hasRecipient: boolean;
  hasBody: boolean;
  dataKeys: string[];
} {
  const raw = record(data);
  const flag = raw.delivered_by_clerk;
  const keys: string[] = [];

  for (const [key, value] of Object.entries(record(raw.data))) {
    if (!SAFE_TOKEN.test(key)) {
      continue;
    }

    keys.push(key);

    for (const nested of Object.keys(record(value))) {
      if (SAFE_TOKEN.test(nested)) {
        keys.push(`${key}.${nested}`);
      }
    }
  }

  return {
    slug: typeof raw.slug === "string" && SAFE_TOKEN.test(raw.slug) ? raw.slug : raw.slug == null ? "absent" : "unrecognised",
    deliveredByClerk: typeof flag === "boolean" ? String(flag) : flag === undefined ? "absent" : `type:${typeof flag}`,
    hasRecipient: typeof raw.to_email_address === "string" && raw.to_email_address.length > 0,
    hasBody: typeof raw.body === "string" && raw.body.length > 0,
    dataKeys: keys.sort().slice(0, 40),
  };
}

/* Template variables Clerk exposes for this template (action_url, org name, expiry). */
export function invitationTemplateFields(data: Record<string, unknown>): {
  actionUrl: unknown;
  organizationName: string | null;
  expiresInDays: number | null;
} {
  const org = record(data.org);
  const organization = record(data.organization);
  const invitation = record(data.invitation);
  const days = Number(invitation.expires_in_days ?? data.expires_in_days);

  return {
    actionUrl: data.action_url,
    organizationName:
      cleanDisplayText(org.name) ?? cleanDisplayText(organization.name) ?? cleanDisplayText(data.org_name),
    expiresInDays: Number.isInteger(days) && days > 0 && days <= 365 ? days : null,
  };
}

export type ContactRow = { name: string | null; billing_contact_name: string | null };

/*
 * Personalisation from our own client records, matched on the invited address. The organisation
 * name from Clerk wins; a database row only supplies it when the match is unambiguous. The
 * contact's first name is used only when the row is the organisation being joined.
 */
export function personalise(
  payloadOrganizationName: string | null,
  rows: readonly ContactRow[]
): { organizationName: string | null; recipientFirstName: string | null } {
  const matching = payloadOrganizationName
    ? rows.filter((row) => cleanDisplayText(row.name)?.toLowerCase() === payloadOrganizationName.toLowerCase())
    : rows;
  const row = matching.length === 1 ? matching[0] : null;

  return {
    organizationName: payloadOrganizationName ?? cleanDisplayText(row?.name),
    recipientFirstName: firstName(row?.billing_contact_name),
  };
}

export type InvitationEmailPlan =
  | { kind: "branded"; email: RenderedEmail }
  /* The accept link could not be trusted or found: send Clerk's own message unchanged, so the
   * client still gets a working invitation (Clerk ships it in the same event for this case). */
  | { kind: "clerk-original"; email: RenderedEmail }
  | { kind: "undeliverable"; reason: string };

export function buildInvitationEmail(params: {
  event: ClerkEmailEvent;
  contacts: readonly ContactRow[];
  appBaseUrl: string;
  clerkHost: string | null;
  defaultExpiryDays: number;
}): InvitationEmailPlan {
  const { event } = params;
  const fields = invitationTemplateFields(event.data);
  const appHost = new URL(params.appBaseUrl).hostname;

  if (isTrustedAcceptUrl(fields.actionUrl, { appHost, clerkHost: params.clerkHost })) {
    const people = personalise(fields.organizationName, params.contacts);

    return {
      kind: "branded",
      email: renderInvitationEmail({
        ...people,
        acceptUrl: fields.actionUrl,
        assetOrigin: params.appBaseUrl,
        expiresInDays: fields.expiresInDays ?? params.defaultExpiryDays,
      }),
    };
  }

  if (event.body) {
    return {
      kind: "clerk-original",
      email: {
        subject: event.subject ?? INVITATION_SUBJECT,
        html: event.body,
        text: event.bodyPlain ?? "",
      },
    };
  }

  return { kind: "undeliverable", reason: "no trusted accept link and no Clerk body" };
}
