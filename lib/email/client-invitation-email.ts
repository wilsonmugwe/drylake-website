/*
 * Branded client-workspace invitation email. Pure: no env reads, no SDK, relative imports only,
 * so the copy, escaping and link rules are unit tested (tests/client-invitation-email.test.mjs).
 *
 * How the email is sent (and why it lives here and not in the Clerk Dashboard):
 *   Clerk creates the organisation invitation and its one-time ticket. With "Delivered by
 *   Clerk" switched OFF for the "Organization invitation" template, Clerk does not send its
 *   generic email; it emits an `email.created` webhook instead (Clerk's documented way to
 *   own delivery). app/api/clerk/webhook/route.ts verifies that webhook, calls
 *   buildInvitationEmail() and sends the result through the existing Resend sender.
 *   The accept link is Clerk's own `action_url`, used unchanged, so the ticket, its expiry,
 *   single use and the organisation membership all stay exactly as Clerk issues them.
 *
 * Email-client rules this markup follows: table layout and bgcolor attributes (Outlook
 * desktop ignores most CSS), every style inline (Gmail strips classes it cannot scope), one
 * <style> block only for the mobile padding tweak, a PNG logo (no client renders SVG reliably),
 * and an explicit dark colour scheme so dark-mode clients leave the palette alone.
 * Copy rules: every interpolated value is HTML-escaped; no em dashes (client-facing).
 */

import { BUSINESS_PHONE, CONTACT_EMAIL } from "../site.ts";

export const CLERK_INVITATION_TEMPLATE_SLUG = "organization_invitation";

export const INVITATION_SUBJECT = "Your Drylake client workspace is ready";

/* Published by the site itself (public/brand), so the image is always the current brand. */
export const INVITATION_LOGO_PATH = "/brand/drylake-lockup-dark-bg.png";

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
  logoUrl: string;
  expiresInDays: number;
  year: number;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

/* Brand palette (app/globals.css): ink, ink-2, ink-3 and signal orange. */
const INK = "#0b0b0a";
const CARD = "#121210";
const PANEL = "#1a1a17";
const BORDER = "#2b2b27";
const WHITE = "#ffffff";
const BODY = "#c9c7bf";
const MUTED = "#8f8d86";
const SIGNAL = "#f26a2e";
const FONT = "Arial,Helvetica,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

const IGNORE_LINE = "If you were not expecting this invitation, you can safely ignore this email.";

export function renderInvitationEmail(input: InvitationEmailInput): RenderedEmail {
  const e = escapeHtml;
  const greeting = input.recipientFirstName ? `Hi ${input.recipientFirstName},` : "Hello,";
  const intro = introLine(input.organizationName);
  const expiry = expiryLine(input.expiresInDays);
  const acceptUrl = e(input.acceptUrl);
  const preheader = input.organizationName
    ? `Activate your Drylake client workspace for ${input.organizationName}.`
    : "Activate your Drylake client workspace.";
  const copyright = `© ${input.year} Drylake Pty Ltd`;

  const highlights = WORKSPACE_HIGHLIGHTS.map(
    (item) => `<tr>
                      <td width="22" valign="top" style="padding:7px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${SIGNAL};">&#9679;</td>
                      <td style="padding:7px 0;font-family:${FONT};font-size:15px;line-height:22px;color:${WHITE};">${e(item)}</td>
                    </tr>`
  ).join("\n                    ");

  const html = `<!doctype html>
<html lang="en-AU" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${e(INVITATION_SUBJECT)}</title>
    <style>
      :root { color-scheme: dark; supported-color-schemes: dark; }
      @media only screen and (max-width: 620px) {
        .dl-pad { padding-left: 24px !important; padding-right: 24px !important; }
        .dl-h1 { font-size: 28px !important; line-height: 34px !important; }
        .dl-btn a { display: block !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${INK};" bgcolor="${INK}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${INK};">${e(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${INK}" style="background-color:${INK};">
      <tr>
        <td align="center" style="padding:40px 12px;">
          <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td class="dl-pad" style="padding:0 8px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td valign="middle"><img src="${e(input.logoUrl)}" width="160" height="40" alt="Drylake" style="display:block;border:0;outline:none;width:160px;height:40px;"></td>
                    <td align="right" valign="middle" style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:2px;color:${MUTED};">DRYLAKE TECHNOLOGIES</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${CARD}" style="background-color:${CARD};border:1px solid ${BORDER};border-radius:20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="dl-pad" style="padding:40px 40px 8px;">
                      <p style="margin:0;font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:2px;font-weight:bold;color:${SIGNAL};">YOU’RE INVITED</p>
                      <h1 class="dl-h1" style="margin:16px 0 0;font-family:${FONT};font-size:32px;line-height:38px;font-weight:bold;color:${WHITE};">Your workspace is ready.</h1>
                      <p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${BODY};">${e(greeting)}</p>
                      <p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${BODY};">${e(intro)}</p>
                      <p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${BODY};">${e(VALUE_LINE)}</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="dl-pad" style="padding:24px 40px 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PANEL}" style="background-color:${PANEL};border:1px solid ${BORDER};border-radius:14px;">
                        <tr>
                          <td style="padding:18px 22px;">
                            <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:2px;color:${MUTED};">IN YOUR WORKSPACE</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    ${highlights}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="dl-pad dl-btn" style="padding:32px 40px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td bgcolor="${SIGNAL}" style="background-color:${SIGNAL};border-radius:12px;">
                            <a href="${acceptUrl}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:bold;color:${INK};text-decoration:none;border-radius:12px;">Activate your workspace</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="dl-pad" style="padding:24px 40px 40px;">
                      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">Button not working? Copy this link into your browser:</p>
                      <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a href="${acceptUrl}" target="_blank" style="color:${SIGNAL};text-decoration:underline;">${acceptUrl}</a></p>
                      <p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${e(expiry)}</p>
                      <p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${e(IGNORE_LINE)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="dl-pad" style="padding:28px 8px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">
                <p style="margin:0;">Need assistance? Email <a href="mailto:${CONTACT_EMAIL}" style="color:${WHITE};text-decoration:underline;">${CONTACT_EMAIL}</a> or call <a href="${BUSINESS_PHONE.href}" style="color:${WHITE};text-decoration:underline;">${BUSINESS_PHONE.display}</a>.</p>
                <p style="margin:16px 0 0;color:${BODY};font-weight:bold;">Drylake Pty Ltd</p>
                <p style="margin:2px 0 0;">Perth, Western Australia</p>
                <p style="margin:2px 0 0;">${e(copyright)}</p>
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "DRYLAKE TECHNOLOGIES",
    "",
    "YOU’RE INVITED",
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
    "Activate your workspace:",
    input.acceptUrl,
    "",
    expiry,
    IGNORE_LINE,
    "",
    `Need assistance? Email ${CONTACT_EMAIL} or call ${BUSINESS_PHONE.display}.`,
    "",
    "Drylake Pty Ltd",
    "Perth, Western Australia",
    copyright,
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
  year: number;
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
        logoUrl: new URL(INVITATION_LOGO_PATH, params.appBaseUrl).toString(),
        expiresInDays: fields.expiresInDays ?? params.defaultExpiryDays,
        year: params.year,
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
